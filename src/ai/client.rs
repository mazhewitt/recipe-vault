use crate::ai::llm::{LlmError, LlmProvider, LlmResponse, Message, ToolCall, ToolDefinition, ToolResult};
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use std::sync::Arc;
use thiserror::Error;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

#[derive(Debug, Error)]
pub enum AiError {
    #[error("LLM error: {0}")]
    Llm(#[from] LlmError),
    #[error("MCP error: {0}")]
    Mcp(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("MCP process not running")]
    ProcessNotRunning,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChatRole {
    User,
    Assistant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: ChatRole,
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct AiAgentConfig {
    pub mcp_binary_path: String,
    pub api_base_url: String,
    pub api_key: String,
    pub system_prompt: Option<String>,
}

impl Default for AiAgentConfig {
    fn default() -> Self {
        Self {
            mcp_binary_path: "./target/release/recipe-vault-mcp".to_string(),
            api_base_url: "http://localhost:3000".to_string(),
            api_key: String::new(),
            system_prompt: Some(
                "You are a helpful cooking assistant with access to a recipe database. \
                 You can list recipes, get recipe details, create new recipes, update existing ones, \
                 and delete recipes. Use the available tools to help users manage their recipes.\n\n\
                 ## Formatting Guidelines\n\n\
                 Always use markdown formatting for clear, readable responses:\n\n\
                 **When listing multiple recipes:**\n\
                 1. **Recipe Title** - Brief description\n\
                    - Prep: X min | Cook: Y min | Servings: Z\n\n\
                 **When showing a single recipe's details:**\n\
                 ## Recipe Title\n\n\
                 Description of the dish.\n\n\
                 **Prep Time:** X min | **Cook Time:** Y min | **Servings:** Z\n\n\
                 ### Ingredients\n\
                 - Quantity unit ingredient (notes)\n\
                 - Quantity unit ingredient\n\n\
                 ### Instructions\n\
                 1. First step\n\
                 2. Second step\n\n\
                 Use **bold** for emphasis, bullet lists for ingredients, and numbered lists for steps."
                    .to_string(),
            ),
        }
    }
}

struct McpProcess {
    child: Child,
    request_id: u64,
}

pub struct AiAgent {
    llm: LlmProvider,
    config: AiAgentConfig,
    mcp_process: Arc<Mutex<Option<McpProcess>>>,
    tools: Arc<Mutex<Vec<ToolDefinition>>>,
}

#[derive(Debug, Serialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    method: String,
    params: serde_json::Value,
    id: u64,
}

#[derive(Debug, Deserialize)]
struct JsonRpcResponse {
    #[allow(dead_code)]
    jsonrpc: String,
    result: Option<serde_json::Value>,
    error: Option<JsonRpcError>,
    #[allow(dead_code)]
    id: u64,
}

#[derive(Debug, Deserialize)]
struct JsonRpcError {
    code: i32,
    message: String,
}

impl AiAgent {
    pub fn new(llm: LlmProvider, config: AiAgentConfig) -> Self {
        Self {
            llm,
            config,
            mcp_process: Arc::new(Mutex::new(None)),
            tools: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn start(&self) -> Result<(), AiError> {
        let mut process_guard = self.mcp_process.lock().await;

        if process_guard.is_some() {
            return Ok(());
        }

        let child = Command::new(&self.config.mcp_binary_path)
            .env("API_BASE_URL", &self.config.api_base_url)
            .env("API_KEY", &self.config.api_key)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()?;

        *process_guard = Some(McpProcess { child, request_id: 0 });
        drop(process_guard);

        // Initialize MCP and get tools
        self.initialize_mcp().await?;
        self.fetch_tools().await?;

        Ok(())
    }

    pub async fn stop(&self) -> Result<(), AiError> {
        let mut process_guard = self.mcp_process.lock().await;
        if let Some(mut mcp) = process_guard.take() {
            let _ = mcp.child.kill().await;
        }
        Ok(())
    }

    async fn initialize_mcp(&self) -> Result<(), AiError> {
        let _response = self
            .call_mcp(
                "initialize",
                serde_json::json!({
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {
                        "name": "recipe-vault-web",
                        "version": "0.1.0"
                    }
                }),
            )
            .await?;

        // Send initialized notification
        self.notify_mcp("notifications/initialized", serde_json::json!({}))
            .await?;

        Ok(())
    }

    async fn fetch_tools(&self) -> Result<(), AiError> {
        let response = self.call_mcp("tools/list", serde_json::json!({})).await?;

        let tools_value = response
            .get("tools")
            .cloned()
            .unwrap_or(serde_json::json!([]));

        let mcp_tools: Vec<serde_json::Value> =
            serde_json::from_value(tools_value).unwrap_or_default();

        let tool_definitions: Vec<ToolDefinition> = mcp_tools
            .into_iter()
            .filter_map(|t| {
                let name = t.get("name")?.as_str()?.to_string();
                let description = t.get("description")?.as_str()?.to_string();
                let input_schema = t.get("inputSchema").cloned().unwrap_or(serde_json::json!({
                    "type": "object",
                    "properties": {}
                }));
                Some(ToolDefinition {
                    name,
                    description,
                    input_schema,
                })
            })
            .collect();

        let mut tools_guard = self.tools.lock().await;
        *tools_guard = tool_definitions;

        Ok(())
    }

    async fn call_mcp(
        &self,
        method: &str,
        params: serde_json::Value,
    ) -> Result<serde_json::Value, AiError> {
        let mut process_guard = self.mcp_process.lock().await;
        let mcp = process_guard
            .as_mut()
            .ok_or(AiError::ProcessNotRunning)?;

        mcp.request_id += 1;
        let request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            method: method.to_string(),
            params,
            id: mcp.request_id,
        };

        let stdin = mcp.child.stdin.as_mut().ok_or(AiError::ProcessNotRunning)?;
        let request_str = serde_json::to_string(&request)?;
        stdin.write_all(request_str.as_bytes()).await?;
        stdin.write_all(b"\n").await?;
        stdin.flush().await?;

        let stdout = mcp.child.stdout.as_mut().ok_or(AiError::ProcessNotRunning)?;
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        reader.read_line(&mut line).await?;

        let response: JsonRpcResponse = serde_json::from_str(&line)?;

        if let Some(error) = response.error {
            return Err(AiError::Mcp(format!(
                "MCP error {}: {}",
                error.code, error.message
            )));
        }

        Ok(response.result.unwrap_or(serde_json::json!(null)))
    }

    async fn notify_mcp(&self, method: &str, params: serde_json::Value) -> Result<(), AiError> {
        let mut process_guard = self.mcp_process.lock().await;
        let mcp = process_guard
            .as_mut()
            .ok_or(AiError::ProcessNotRunning)?;

        let notification = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        });

        let stdin = mcp.child.stdin.as_mut().ok_or(AiError::ProcessNotRunning)?;
        let notification_str = serde_json::to_string(&notification)?;
        stdin.write_all(notification_str.as_bytes()).await?;
        stdin.write_all(b"\n").await?;
        stdin.flush().await?;

        Ok(())
    }

    async fn execute_tool(&self, tool_call: &ToolCall) -> Result<String, AiError> {
        let result = self
            .call_mcp(
                "tools/call",
                serde_json::json!({
                    "name": tool_call.name,
                    "arguments": tool_call.arguments
                }),
            )
            .await?;

        // Extract content from MCP tool result
        let content = result
            .get("content")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|item| item.get("text"))
            .and_then(|t| t.as_str())
            .unwrap_or_else(|| {
                // Fallback to stringifying the result
                &""
            });

        if content.is_empty() {
            Ok(serde_json::to_string_pretty(&result)?)
        } else {
            Ok(content.to_string())
        }
    }

    pub async fn chat(
        &self,
        conversation: &[ChatMessage],
    ) -> Result<(String, Vec<String>), AiError> {
        // Ensure MCP is running
        {
            let process_guard = self.mcp_process.lock().await;
            if process_guard.is_none() {
                drop(process_guard);
                self.start().await?;
            }
        }

        let tools = self.tools.lock().await.clone();

        // Convert conversation to LLM messages
        let mut messages: Vec<Message> = conversation
            .iter()
            .map(|m| match m.role {
                ChatRole::User => Message::User {
                    content: m.content.clone(),
                },
                ChatRole::Assistant => Message::Assistant {
                    content: Some(m.content.clone()),
                    tool_calls: None,
                },
            })
            .collect();

        let mut tool_uses: Vec<String> = Vec::new();
        let mut final_text = String::new();

        // Agent loop: keep going until we get a text-only response
        loop {
            let response = self
                .llm
                .complete(
                    &messages,
                    &tools,
                    self.config.system_prompt.as_deref(),
                )
                .await?;

            match response {
                LlmResponse::Text(text) => {
                    final_text = text;
                    break;
                }
                LlmResponse::ToolUse(tool_calls) => {
                    // Execute all tool calls
                    let mut tool_results: Vec<ToolResult> = Vec::new();
                    for call in &tool_calls {
                        tool_uses.push(call.name.clone());
                        let result = self.execute_tool(call).await;
                        let is_error = result.is_err();
                        tool_results.push(ToolResult {
                            tool_use_id: call.id.clone(),
                            content: result.unwrap_or_else(|e| format!("Error: {}", e)),
                            is_error,
                        });
                    }

                    // Add assistant message with tool calls
                    messages.push(Message::Assistant {
                        content: None,
                        tool_calls: Some(tool_calls),
                    });

                    // Add tool results
                    messages.push(Message::Tool { tool_results });
                }
                LlmResponse::TextWithToolUse { text, tool_calls } => {
                    // Execute all tool calls
                    let mut tool_results: Vec<ToolResult> = Vec::new();
                    for call in &tool_calls {
                        tool_uses.push(call.name.clone());
                        let result = self.execute_tool(call).await;
                        let is_error = result.is_err();
                        tool_results.push(ToolResult {
                            tool_use_id: call.id.clone(),
                            content: result.unwrap_or_else(|e| format!("Error: {}", e)),
                            is_error,
                        });
                    }

                    // Add assistant message with text and tool calls
                    messages.push(Message::Assistant {
                        content: Some(text),
                        tool_calls: Some(tool_calls),
                    });

                    // Add tool results
                    messages.push(Message::Tool { tool_results });
                }
            }
        }

        Ok((final_text, tool_uses))
    }
}
