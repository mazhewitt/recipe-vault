use crate::ai::llm::{ContentBlock, LlmError, LlmProvider, LlmResponse, Message, ToolCall, ToolDefinition, ToolResult, tools};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::process::Stdio;
use std::sync::Arc;
use thiserror::Error;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

/// A single recipe entry within a meal plan artifact
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MealPlanEntry {
    pub recipe_id: String,
    pub title: String,
    pub role: String,
}

/// Data emitted when the AI calls display_meal_plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MealArtifactData {
    pub title: String,
    pub guest_count: Option<i32>,
    pub recipes: Vec<MealPlanEntry>,
}

/// Filters raw recipe arguments against a known recipe map.
/// Returns (resolved entries, dropped_count, centrepiece_invalid).
/// - Resolves recipe title from `all_recipes` map for known IDs.
/// - Drops unknown non-centrepiece entries (increments dropped_count).
/// - Returns centrepiece_invalid=true and stops processing on first unknown centrepiece.
fn filter_meal_plan_recipes(
    recipes_arg: &[serde_json::Value],
    all_recipes: &HashMap<String, String>,
) -> (Vec<MealPlanEntry>, usize, bool) {
    let mut resolved = Vec::new();
    let mut dropped_count: usize = 0;

    for recipe in recipes_arg {
        let recipe_id = recipe.get("recipe_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let role = recipe.get("role").and_then(|v| v.as_str()).unwrap_or("side").to_string();

        if let Some(title) = all_recipes.get(&recipe_id) {
            resolved.push(MealPlanEntry { recipe_id, title: title.clone(), role });
        } else if role == "centrepiece" {
            tracing::warn!("display_meal_plan: centrepiece recipe_id not found: {}", recipe_id);
            return (resolved, dropped_count, true);
        } else {
            tracing::warn!("display_meal_plan: dropping unknown recipe_id: {}", recipe_id);
            dropped_count += 1;
        }
    }

    (resolved, dropped_count, false)
}

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

#[derive(Debug, Clone, Default)]
pub struct AiAgentConfig {
    pub mcp_servers: Vec<McpServerConfig>,
    pub system_prompt: Option<String>,
}

struct McpProcess {
    #[allow(dead_code)]
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

    // MCP Architecture Decision:
    // We spawn the MCP server as a separate child process rather than calling the API directly
    // to maintain clean architectural separation and follow the MCP specification.
    // Benefits:
    // - Process isolation: MCP server crashes don't affect the main web application
    // - Protocol compliance: Follows the standard MCP JSON-RPC stdio interface
    // - Testability: MCP tools can be tested independently of the web chat
    // - Reusability: The same MCP server binary could be used by other tools if needed
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

        // Spawn servers; skip optional ones that fail to spawn
        for server_config in &self.config.mcp_servers {
            tracing::info!("Starting MCP server: {}", server_config.name);
            match self.spawn_mcp_server(server_config).await {
                Ok(process) => {
                    processes_guard.insert(server_config.name.clone(), process);
                }
                Err(e) => {
                    tracing::warn!("Failed to spawn MCP server '{}': {} - skipping", server_config.name, e);
                }
            }
        }
        drop(processes_guard);

        // Initialize each server and fetch tools; skip servers that fail to initialize
        let mut all_tools = Vec::new();
        let mut registry = HashMap::new();

        let server_names: Vec<String> = self.mcp_processes.lock().await.keys().cloned().collect();

        for server_name in &server_names {
            // Initialize this server
            if let Err(e) = self.initialize_mcp_server(server_name).await {
                tracing::warn!("Failed to initialize MCP server '{}': {} - skipping", server_name, e);
                self.mcp_processes.lock().await.remove(server_name);
                continue;
            }

            // Fetch tools from this server
            match self.fetch_tools_from_server(server_name).await {
                Ok(tools) => {
                    for tool in &tools {
                        if let Some(existing_server) = registry.get(&tool.name) {
                            tracing::warn!(
                                "Duplicate tool '{}' found in servers '{}' and '{}' - using latter",
                                tool.name, existing_server, server_name
                            );
                        }
                        registry.insert(tool.name.clone(), server_name.clone());
                    }
                    all_tools.extend(tools);
                }
                Err(e) => {
                    tracing::warn!("Failed to fetch tools from MCP server '{}': {} - skipping", server_name, e);
                    self.mcp_processes.lock().await.remove(server_name);
                }
            }
        }

        // Add native tools
        all_tools.push(tools::display_recipe_tool());
        registry.insert("display_recipe".to_string(), "native".to_string());
        all_tools.push(tools::display_meal_plan_tool());
        registry.insert("display_meal_plan".to_string(), "native".to_string());

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

    /// Fetch all recipes and return as a HashMap<recipe_id, title>
    async fn fetch_all_recipes_as_map(&self) -> HashMap<String, String> {
        let registry = self.tool_registry.lock().await;
        let server_name = match registry.get("list_recipes") {
            Some(s) => s.clone(),
            None => return HashMap::new(),
        };
        drop(registry);

        let result = match self.call_mcp_server(&server_name, "tools/call", serde_json::json!({
            "name": "list_recipes",
            "arguments": {}
        })).await {
            Ok(r) => r,
            Err(_) => return HashMap::new(),
        };

        let content = result
            .get("content")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|item| item.get("text"))
            .and_then(|t| t.as_str())
            .unwrap_or("");

        let recipes_response: serde_json::Value = match serde_json::from_str(content) {
            Ok(v) => v,
            Err(_) => return HashMap::new(),
        };

        let mut map = HashMap::new();
        if let Some(recipes) = recipes_response.get("recipes").and_then(|v| v.as_array()) {
            for recipe in recipes {
                let id = recipe.get("recipe_id").and_then(|v| v.as_str());
                let title = recipe.get("title").and_then(|v| v.as_str());
                if let (Some(id), Some(title)) = (id, title) {
                    map.insert(id.to_string(), title.to_string());
                }
            }
        }
        map
    }

    /// Handle a display_meal_plan tool call: validate IDs, resolve titles, build MealArtifactData.
    /// Drops unknown non-centrepiece IDs; returns an error string for invalid centrepiece.
    async fn handle_display_meal_plan(&self, tool_call: &ToolCall) -> Result<(String, Option<MealArtifactData>), AiError> {
        let title = tool_call.arguments.get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("Meal Plan")
            .to_string();

        let guest_count = tool_call.arguments.get("guest_count")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32);

        let recipes_arg = tool_call.arguments.get("recipes")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let all_recipes = self.fetch_all_recipes_as_map().await;

        let (resolved, dropped_count, centrepiece_invalid) =
            filter_meal_plan_recipes(&recipes_arg, &all_recipes);

        if centrepiece_invalid {
            return Ok((
                "Error: Could not find the centrepiece recipe. Please use list_recipes to get valid recipe IDs.".to_string(),
                None,
            ));
        }

        let data = MealArtifactData { title, guest_count, recipes: resolved };

        let mut result_msg = "Meal plan displayed in the side panel.".to_string();
        if dropped_count > 0 {
            result_msg.push_str(&format!(" Note: {} recipe(s) with unknown IDs were omitted.", dropped_count));
        }

        Ok((result_msg, Some(data)))
    }

    /// Execute a tool call. Returns (result_text, optional_recipe_id, optional_timer_data, optional_meal_artifact).
    /// If the tool is display_recipe, returns the recipe_id for the chat handler to emit SSE.
    /// If the tool is start_timer, returns (duration_minutes, label) for the chat handler to emit SSE.
    /// If the tool is display_meal_plan, returns MealArtifactData for the chat handler to emit SSE.
    async fn execute_tool(&self, tool_call: &ToolCall) -> Result<(String, Option<String>, Option<(f64, String)>, Option<MealArtifactData>), AiError> {
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
                    match self.find_recipe_by_title(search_title).await {
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
                    None,
                    None,
                ));
            } else {
                tracing::warn!("Failed to resolve recipe_id from args: {:?}", tool_call.arguments);
                return Ok(("Error: Could not find the recipe. Please use list_recipes first to get the correct recipe_id.".to_string(), None, None, None));
            }
        }

        if tool_call.name == "display_meal_plan" {
            tracing::info!("Tool call detected: display_meal_plan with args: {:?}", tool_call.arguments);
            let (msg, maybe_meal_plan) = self.handle_display_meal_plan(tool_call).await?;
            return Ok((msg, None, None, maybe_meal_plan));
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
            .unwrap_or("");

        // Check if this is a start_timer tool call and extract timer data
        let timer_data = if tool_call.name == "start_timer" {
            // Parse the result JSON to extract duration and label
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(content) {
                let duration = parsed.get("duration_minutes").and_then(|v| v.as_f64());
                let label = parsed.get("label").and_then(|v| v.as_str()).map(|s| s.to_string());

                match (duration, label) {
                    (Some(d), Some(l)) => {
                        tracing::info!("Timer data extracted: duration={}, label={}", d, l);
                        Some((d, l))
                    }
                    _ => None,
                }
            } else {
                None
            }
        } else {
            None
        };

        if content.is_empty() {
            Ok((serde_json::to_string_pretty(&result)?, None, timer_data, None))
        } else {
            Ok((content.to_string(), None, timer_data, None))
        }
    }

    /// Chat with the AI agent.
    /// Returns (response_text, tools_used, recipe_ids_to_display, timer_data, meal_plans, full_messages).
    /// Timer_data is Vec<(duration_minutes, label)> for start_timer tool calls.
    /// meal_plans is Vec<MealArtifactData> for display_meal_plan tool calls.
    /// The full_messages vector contains all messages from the agent loop
    /// (including tool calls and results) for persisting in the session.
    pub async fn chat(
        &self,
        conversation: &[Message],
    ) -> Result<(String, Vec<String>, Vec<String>, Vec<(f64, String)>, Vec<MealArtifactData>, Vec<Message>), AiError> {
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
        if messages.len() >= 5
            && let Some(Message::User { content }) = messages.last_mut() {
                // Find the last Text block and append the reminder to it
                if let Some(ContentBlock::Text { text }) = content.iter_mut().rev().find(|b| matches!(b, ContentBlock::Text { .. })) {
                    text.push_str(
                        "\n\n(Reminder: Use list_recipes when the user asks to see their recipes. \
                         Use display_recipe to show recipe details in the side panel. \
                         After creating a recipe, call display_recipe with the new recipe_id. \
                         If current_recipe context is provided, treat it as the active recipe and call get_recipe when needed. \
                         When guiding cooking, ask servings first, scale ingredients intelligently, break into phases, and call start_timer for waiting periods. \
                         Do not output full ingredient lists or steps in chat.)"
                    );
                }
            }

        let mut tool_uses: Vec<String> = Vec::new();
        let mut recipe_ids: Vec<String> = Vec::new();
        let mut timer_data: Vec<(f64, String)> = Vec::new();
        let mut meal_plan_data: Vec<MealArtifactData> = Vec::new();
        let mut final_text = String::new();
        let mut executed_tool_signatures: HashSet<String> = HashSet::new();

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
                let signature = format!("{}:{}", call.name, call.arguments);
                let duplicate_call = !executed_tool_signatures.insert(signature);

                let (content, is_error) = if duplicate_call {
                    tracing::warn!(
                        "Skipping duplicate tool call in same chat turn: {} with args {:?}",
                        call.name,
                        call.arguments
                    );
                    (
                        format!(
                            "Skipped duplicate {} call with the same arguments. Use the existing result, choose a different URL, or search for another source.",
                            call.name
                        ),
                        true,
                    )
                } else {
                    tool_uses.push(call.name.clone());
                    let result = self.execute_tool(call).await;
                    match result {
                        Ok((text, maybe_recipe_id, maybe_timer_data, maybe_meal_plan)) => {
                            if let Some(rid) = maybe_recipe_id {
                                recipe_ids.push(rid);
                            }
                            if let Some(timer) = maybe_timer_data {
                                timer_data.push(timer);
                            }
                            if let Some(mp) = maybe_meal_plan {
                                meal_plan_data.push(mp);
                            }
                            (text, false)
                        }
                        Err(e) => (format!("Error: {}", e), true),
                    }
                };
                tool_results.push(ToolResult {
                    tool_use_id: call.id.clone(),
                    name: Some(call.name.clone()),
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
        Ok((final_text, tool_uses, recipe_ids, timer_data, meal_plan_data, new_messages))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_recipe(id: &str, role: &str) -> serde_json::Value {
        serde_json::json!({ "recipe_id": id, "role": role })
    }

    fn make_map(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect()
    }

    // Task 5.1 — filter_meal_plan_recipes drops unknown non-centrepiece IDs
    #[test]
    fn test_filter_drops_unknown_side_recipe() {
        let map = make_map(&[("id-1", "Beef Wellington")]);
        let recipes = vec![
            make_recipe("id-1", "centrepiece"),
            make_recipe("unknown-id", "side"),
        ];

        let (resolved, dropped, centrepiece_invalid) = filter_meal_plan_recipes(&recipes, &map);

        assert!(!centrepiece_invalid, "centrepiece should be valid");
        assert_eq!(resolved.len(), 1, "Only the known recipe should be resolved");
        assert_eq!(resolved[0].recipe_id, "id-1");
        assert_eq!(resolved[0].role, "centrepiece");
        assert_eq!(dropped, 1, "Unknown side recipe should be dropped");
    }

    // Task 5.1 — filter_meal_plan_recipes returns error for invalid centrepiece
    #[test]
    fn test_filter_errors_on_invalid_centrepiece() {
        let map = make_map(&[("id-1", "Roast Potatoes")]);
        let recipes = vec![
            make_recipe("unknown-centrepiece-id", "centrepiece"),
            make_recipe("id-1", "side"),
        ];

        let (resolved, _dropped, centrepiece_invalid) = filter_meal_plan_recipes(&recipes, &map);

        assert!(centrepiece_invalid, "Unknown centrepiece should be flagged");
        assert!(resolved.is_empty(), "No recipes should be resolved when centrepiece is invalid");
    }

    // Resolves titles correctly from the map
    #[test]
    fn test_filter_resolves_titles() {
        let map = make_map(&[
            ("id-1", "Beef Wellington"),
            ("id-2", "Roast Potatoes"),
        ]);
        let recipes = vec![
            make_recipe("id-1", "centrepiece"),
            make_recipe("id-2", "side"),
        ];

        let (resolved, dropped, centrepiece_invalid) = filter_meal_plan_recipes(&recipes, &map);

        assert!(!centrepiece_invalid);
        assert_eq!(dropped, 0);
        assert_eq!(resolved[0].title, "Beef Wellington");
        assert_eq!(resolved[1].title, "Roast Potatoes");
    }

    // Empty recipe list is valid
    #[test]
    fn test_filter_empty_recipes() {
        let map = make_map(&[]);
        let (resolved, dropped, centrepiece_invalid) = filter_meal_plan_recipes(&[], &map);
        assert!(!centrepiece_invalid);
        assert_eq!(resolved.len(), 0);
        assert_eq!(dropped, 0);
    }

    // Task 5.2 — MealArtifactData serializes to expected JSON shape
    #[test]
    fn test_meal_artifact_data_serializes_correctly() {
        let data = MealArtifactData {
            title: "Sunday Roast".to_string(),
            guest_count: Some(6),
            recipes: vec![
                MealPlanEntry {
                    recipe_id: "abc-123".to_string(),
                    title: "Beef Wellington".to_string(),
                    role: "centrepiece".to_string(),
                },
                MealPlanEntry {
                    recipe_id: "def-456".to_string(),
                    title: "Roast Potatoes".to_string(),
                    role: "side".to_string(),
                },
            ],
        };

        let json = serde_json::to_string(&data).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed["title"], "Sunday Roast");
        assert_eq!(parsed["guest_count"], 6);
        assert_eq!(parsed["recipes"][0]["recipe_id"], "abc-123");
        assert_eq!(parsed["recipes"][0]["role"], "centrepiece");
        assert_eq!(parsed["recipes"][1]["title"], "Roast Potatoes");
    }

    // Task 5.2 — null guest_count serializes to null (not absent)
    #[test]
    fn test_meal_artifact_data_null_guest_count() {
        let data = MealArtifactData {
            title: "BBQ".to_string(),
            guest_count: None,
            recipes: vec![],
        };
        let json = serde_json::to_string(&data).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["guest_count"], serde_json::Value::Null);
    }
}
