use crate::ai::llm::{ContentBlock, LlmError, LlmProvider, LlmResponse, Message, ToolCall, ToolDefinition, ToolResult, tools};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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

#[derive(Debug, Clone)]
pub struct McpServerConfig {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct AiAgentConfig {
    pub mcp_servers: Vec<McpServerConfig>,
    pub system_prompt: Option<String>,
}

impl Default for AiAgentConfig {
    fn default() -> Self {
        Self {
            mcp_servers: Vec::new(),
            system_prompt: None,
        }
    }
}

struct McpProcess {
    name: String,
    child: Child,
    request_id: u64,
}

pub struct AiAgent {
    llm: LlmProvider,
    config: AiAgentConfig,
    mcp_processes: Arc<Mutex<HashMap<String, McpProcess>>>,
    tool_registry: Arc<Mutex<HashMap<String, String>>>,
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
            mcp_processes: Arc::new(Mutex::new(HashMap::new())),
            tool_registry: Arc::new(Mutex::new(HashMap::new())),
            tools: Arc::new(Mutex::new(Vec::new())),
        }
    }

    async fn spawn_mcp_server(&self, config: &McpServerConfig) -> Result<McpProcess, AiError> {
        let mut command = Command::new(&config.command);
        command.args(&config.args);

        // Set environment variables for this server
        for (key, value) in &config.env {
            command.env(key, value);
        }

        let child = command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()?;

        Ok(McpProcess {
            name: config.name.clone(),
            child,
            request_id: 0,
        })
    }

    pub async fn start(&self) -> Result<(), AiError> {
        let mut processes_guard = self.mcp_processes.lock().await;

        // If already started, return early
        if !processes_guard.is_empty() {
            return Ok(());
        }

        // Spawn and initialize each server sequentially
        for server_config in &self.config.mcp_servers {
            tracing::info!("Starting MCP server: {}", server_config.name);

            // Spawn the server process
            let process = self.spawn_mcp_server(server_config).await?;
            processes_guard.insert(server_config.name.clone(), process);
        }
        drop(processes_guard);

        // Initialize each server and fetch tools
        let mut all_tools = Vec::new();
        let mut registry = HashMap::new();

        for server_config in &self.config.mcp_servers {
            // Initialize this server
            self.initialize_mcp_server(&server_config.name).await?;

            // Fetch tools from this server
            let tools = self.fetch_tools_from_server(&server_config.name).await?;

            // Register each tool -> server mapping
            for tool in &tools {
                if let Some(existing_server) = registry.get(&tool.name) {
                    tracing::warn!(
                        "Duplicate tool '{}' found in servers '{}' and '{}' - using latter",
                        tool.name, existing_server, server_config.name
                    );
                }
                registry.insert(tool.name.clone(), server_config.name.clone());
            }

            all_tools.extend(tools);
        }

        // Add native tools
        all_tools.push(tools::display_recipe_tool());
        registry.insert("display_recipe".to_string(), "native".to_string());

        // Store registry and tools
        *self.tool_registry.lock().await = registry;
        *self.tools.lock().await = all_tools;

        Ok(())
    }

    pub async fn stop(&self) -> Result<(), AiError> {
        let mut processes_guard = self.mcp_processes.lock().await;
        for (name, mut process) in processes_guard.drain() {
            tracing::info!("Stopping MCP server: {}", name);
            let _ = process.child.kill().await;
        }
        Ok(())
    }

    async fn initialize_mcp_server(&self, server_name: &str) -> Result<(), AiError> {
        let _response = self
            .call_mcp_server(
                server_name,
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
        self.notify_mcp_server(server_name, "notifications/initialized", serde_json::json!({}))
            .await?;

        Ok(())
    }

    async fn fetch_tools_from_server(&self, server_name: &str) -> Result<Vec<ToolDefinition>, AiError> {
        let response = self.call_mcp_server(server_name, "tools/list", serde_json::json!({})).await?;

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

        Ok(tool_definitions)
    }

    async fn call_mcp_server(
        &self,
        server_name: &str,
        method: &str,
        params: serde_json::Value,
    ) -> Result<serde_json::Value, AiError> {
        let mut processes_guard = self.mcp_processes.lock().await;
        let mcp = processes_guard
            .get_mut(server_name)
            .ok_or_else(|| AiError::Mcp(format!("Server not found: {}", server_name)))?;

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

    async fn notify_mcp_server(&self, server_name: &str, method: &str, params: serde_json::Value) -> Result<(), AiError> {
        let mut processes_guard = self.mcp_processes.lock().await;
        let mcp = processes_guard
            .get_mut(server_name)
            .ok_or_else(|| AiError::Mcp(format!("Server not found: {}", server_name)))?;

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

    /// Find a recipe by title using fuzzy matching via MCP list_recipes
    async fn find_recipe_by_title(&self, search_title: &str) -> Option<String> {
        // Look up which server has list_recipes tool
        let registry = self.tool_registry.lock().await;
        let server_name = registry.get("list_recipes")?.clone();
        drop(registry);

        // Call list_recipes through MCP to get all recipes
        let result = self
            .call_mcp_server(&server_name, "tools/call", serde_json::json!({
                "name": "list_recipes",
                "arguments": {}
            }))
            .await
            .ok()?;

        // Parse the response to find matching recipe
        let content = result
            .get("content")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|item| item.get("text"))
            .and_then(|t| t.as_str())?;

        let recipes_response: serde_json::Value = serde_json::from_str(content).ok()?;
        let recipes = recipes_response.get("recipes")?.as_array()?;

        let search_lower = search_title.to_lowercase();
        
        // Find best matching recipe (case-insensitive, partial match)
        for recipe in recipes {
            if let Some(title) = recipe.get("title").and_then(|t| t.as_str()) {
                let title_lower = title.to_lowercase();
                // Match if search term is contained in title or vice versa
                if title_lower.contains(&search_lower) || search_lower.contains(&title_lower) {
                    return recipe.get("recipe_id").and_then(|id| id.as_str()).map(|s| s.to_string());
                }
            }
        }
        
        None
    }

    /// Execute a tool call. Returns (result_text, optional_recipe_id).
    /// If the tool is display_recipe, returns the recipe_id for the chat handler to emit SSE.
    async fn execute_tool(&self, tool_call: &ToolCall) -> Result<(String, Option<String>), AiError> {
        // Handle native tools (not MCP)
        if tool_call.name == "display_recipe" {
            tracing::info!("Tool call detected: display_recipe with args: {:?}", tool_call.arguments);
            
            // Try to get recipe_id directly first
            let recipe_id = tool_call
                .arguments
                .get("recipe_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            
            // If we have a title but no recipe_id (or a suspicious-looking one), search for it
            let title = tool_call
                .arguments
                .get("title")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            
            // Determine the final recipe_id to use
            let final_id = match (&recipe_id, &title) {
                // If title is provided, search for the recipe by title
                (_, Some(search_title)) => {
                    tracing::info!("Searching for recipe by title: {}", search_title);
                    match self.find_recipe_by_title(&search_title).await {
                        Some(id) => {
                            tracing::info!("Found recipe by title search: {}", id);
                            Some(id)
                        }
                        None => {
                            tracing::warn!("No recipe found matching title: {}", search_title);
                            // Fall back to recipe_id if title search failed
                            recipe_id.clone()
                        }
                    }
                }
                // No title, use recipe_id directly
                (Some(id), None) => Some(id.clone()),
                (None, None) => None,
            };

            if let Some(id) = final_id {
                tracing::info!("Successfully resolved recipe_id: {}", id);
                return Ok((
                    "Recipe displayed in side panel. STOP. Do not read the recipe out loud. Do not call get_recipe. Just provide a brief summary.".to_string(),
                    Some(id),
                ));
            } else {
                tracing::warn!("Failed to resolve recipe_id from args: {:?}", tool_call.arguments);
                return Ok(("Error: Could not find the recipe. Please use list_recipes first to get the correct recipe_id.".to_string(), None));
            }
        }

        // MCP tools - look up server from registry
        let registry = self.tool_registry.lock().await;
        let server_name = registry.get(&tool_call.name)
            .ok_or_else(|| AiError::Mcp(format!("Unknown tool: {}", tool_call.name)))?;
        let server_name = server_name.clone();
        drop(registry);

        let result = self
            .call_mcp_server(
                &server_name,
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
            Ok((serde_json::to_string_pretty(&result)?, None))
        } else {
            Ok((content.to_string(), None))
        }
    }

    /// Chat with the AI agent.
    /// Returns (response_text, tools_used, recipe_ids_to_display, full_messages).
    /// The full_messages vector contains all messages from the agent loop
    /// (including tool calls and results) for persisting in the session.
    pub async fn chat(
        &self,
        conversation: &[Message],
    ) -> Result<(String, Vec<String>, Vec<String>, Vec<Message>), AiError> {
        // Ensure MCP is running
        {
            let processes_guard = self.mcp_processes.lock().await;
            if processes_guard.is_empty() {
                drop(processes_guard);
                self.start().await?;
            }
        }

        let tools = self.tools.lock().await.clone();

        let mut messages: Vec<Message> = conversation.to_vec();

        // Inject reminder for longer conversations (5+ messages)
        // This helps the model remember critical tool-use instructions
        if messages.len() >= 5 {
            if let Some(Message::User { content }) = messages.last_mut() {
                // Find the last Text block and append the reminder to it
                if let Some(ContentBlock::Text { text }) = content.iter_mut().rev().find(|b| matches!(b, ContentBlock::Text { .. })) {
                    text.push_str(
                        "\n\n(Reminder: Use list_recipes when the user asks to see their recipes. \
                         Use display_recipe to show recipe details in the side panel. \
                         After creating a recipe, call display_recipe with the new recipe_id. \
                         If current_recipe context is provided, treat it as the active recipe and call get_recipe when needed. \
                         Do not output full ingredient lists or steps in chat.)"
                    );
                }
            }
        }

        let mut tool_uses: Vec<String> = Vec::new();
        let mut recipe_ids: Vec<String> = Vec::new();
        let mut final_text = String::new();

        // Agent loop: keep going until we get a text-only response
        const MAX_ITERATIONS: usize = 10;
        for _iteration in 0..MAX_ITERATIONS {
            let response = self
                .llm
                .complete(
                    &messages,
                    &tools,
                    self.config.system_prompt.as_deref(),
                )
                .await?;

            // Extract interim text and tool calls from response
            let (interim_text, pending_tool_calls) = match response {
                LlmResponse::Text(text) => {
                    final_text = text;
                    break;
                }
                LlmResponse::ToolUse(tool_calls) => (None, tool_calls),
                LlmResponse::TextWithToolUse { text, tool_calls } => (Some(text), tool_calls),
            };

            // Execute all tool calls
            let mut tool_results: Vec<ToolResult> = Vec::new();
            for call in &pending_tool_calls {
                tool_uses.push(call.name.clone());
                let result = self.execute_tool(call).await;
                let (content, is_error) = match result {
                    Ok((text, maybe_recipe_id)) => {
                        if let Some(rid) = maybe_recipe_id {
                            recipe_ids.push(rid);
                        }
                        (text, false)
                    }
                    Err(e) => (format!("Error: {}", e), true),
                };
                tool_results.push(ToolResult {
                    tool_use_id: call.id.clone(),
                    content,
                    is_error,
                });
            }

            // Add assistant message with tool calls (and interim text if any)
            messages.push(Message::Assistant {
                content: interim_text,
                tool_calls: Some(pending_tool_calls),
            });

            // Add tool results, then continue loop so LLM sees them
            messages.push(Message::Tool { tool_results });
        }

        // Add the final assistant text to the message sequence
        if !final_text.is_empty() {
            messages.push(Message::Assistant {
                content: Some(final_text.clone()),
                tool_calls: None,
            });
        }

        // Return messages starting after the original conversation
        let new_messages = messages[conversation.len()..].to_vec();
        Ok((final_text, tool_uses, recipe_ids, new_messages))
    }
}
