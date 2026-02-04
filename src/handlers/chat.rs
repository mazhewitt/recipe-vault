use axum::{
    extract::State,
    response::{
        sse::{Event, Sse},
        IntoResponse,
    },
    Json,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::convert::Infallible;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::ai::{AiAgent, AiAgentConfig, ChatMessage, ChatRole, LlmProvider, LlmProviderType};
use crate::config::Config;

#[derive(Clone)]
pub struct ChatState {
    agent: Arc<RwLock<Option<AiAgent>>>,
    sessions: Arc<RwLock<HashMap<String, Vec<ChatMessage>>>>,
    config: Arc<Config>,
    api_key: Arc<String>,
}

impl ChatState {
    pub fn new(config: Config, api_key: String) -> Self {
        Self {
            agent: Arc::new(RwLock::new(None)),
            sessions: Arc::new(RwLock::new(HashMap::new())),
            config: Arc::new(config),
            api_key: Arc::new(api_key),
        }
    }

    async fn get_or_create_agent(&self) -> Result<(), ChatError> {
        let mut agent_guard = self.agent.write().await;
        if agent_guard.is_none() {
            let llm = if self.config.mock_llm {
                LlmProvider::mock(self.config.mock_recipe_id.clone())
            } else {
                LlmProvider::new(
                    LlmProviderType::Anthropic,
                    self.config.anthropic_api_key.clone(),
                    self.config.ai_model.clone(),
                )
            };

            let agent_config = AiAgentConfig {
                mcp_binary_path: std::env::var("MCP_BINARY_PATH")
                    .unwrap_or_else(|_| "./target/release/recipe-vault-mcp".to_string()),
                api_base_url: format!(
                    "http://127.0.0.1:{}",
                    self.config.bind_address.split(':').last().unwrap_or("3000")
                ),
                api_key: (*self.api_key).clone(),
                system_prompt: Some(
                    "You are a helpful cooking assistant with access to a recipe database. \
                     You can list recipes, get recipe details, create new recipes, update existing ones, \
                     and delete recipes. Use the available tools to help users manage their recipes.\n\n\
                     ## Recipe Display Strategy (CRITICAL)\n\n\
                     The interface has a side panel for displaying structured recipes. \
                     - **`get_recipe` vs `display_recipe`**: \
                       - `get_recipe` returns text for YOUR internal knowledge only. It does NOT show anything to the user.\n\
                       - `display_recipe` renders the visual card for the USER. \
                     - NEVER render full ingredient lists or step-by-step instructions in the chat box.\n\
                     - When the user asks to see a recipe, wants to cook something, or you are providing recipe details, \
                       ALWAYS call the `display_recipe` tool with the appropriate `recipe_id`.\n\
                     - **IMPORTANT**: Always use the exact `recipe_id` returned by the `list_recipes` or `get_recipe` tools. Do not guess IDs.\n\
                     - After calling the tool, provide a brief (1-3 sentence) summary or helpful tip in the chat.\n\
                     - Example chat response: \"I've pulled up that Pork Pie recipe in the side panel for you. It's a classic! Make sure to keep your pastry warm while working with it.\"\n\n\
                     ## Formatting Guidelines\n\n\
                     Use markdown for clear responses. When listing recipes, keep it concise (Title, Description, Times). You don't need to show IDs to the user, but remember them for tool calls."
                        .to_string(),
                ),
            };

            let agent = AiAgent::new(llm, agent_config);
            agent.start().await.map_err(|e| ChatError::Agent(e.to_string()))?;
            *agent_guard = Some(agent);
        }
        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ChatError {
    #[error("Agent error: {0}")]
    Agent(String),
    #[error("Session error: {0}")]
    Session(String),
}

impl IntoResponse for ChatError {
    fn into_response(self) -> axum::response::Response {
        let body = serde_json::json!({
            "error": self.to_string()
        });
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(body),
        )
            .into_response()
    }
}

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub conversation_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub conversation_id: String,
    pub message: String,
    pub tools_used: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum SseEvent {
    #[serde(rename = "chunk")]
    Chunk { text: String },
    #[serde(rename = "tool_use")]
    ToolUse { tool: String, status: String },
    #[serde(rename = "recipe_artifact")]
    RecipeArtifact { recipe_id: String },
    #[serde(rename = "done")]
    Done {
        conversation_id: String,
        tools_used: Vec<String>,
    },
    #[serde(rename = "error")]
    Error { message: String, recoverable: bool },
}

/// POST /api/chat - Send a message and receive a streaming response
pub async fn chat(
    State(state): State<ChatState>,
    Json(request): Json<ChatRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, ChatError> {
    // Ensure agent is running
    state.get_or_create_agent().await?;

    // Get or create conversation
    let conversation_id = request
        .conversation_id
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    // Get conversation history
    let mut sessions = state.sessions.write().await;
    let history = sessions
        .entry(conversation_id.clone())
        .or_insert_with(Vec::new);

    // Add user message to history
    history.push(ChatMessage {
        role: ChatRole::User,
        content: request.message.clone(),
    });

    let conversation = history.clone();
    let conv_id = conversation_id.clone();
    drop(sessions);

    // Create SSE stream
    let stream = async_stream::stream! {
        // Send initial chunk to acknowledge receipt
        yield Ok(Event::default()
            .event("chunk")
            .data(serde_json::json!({"text": ""}).to_string()));

        // Get agent and process message
        let agent_guard = state.agent.read().await;
        if let Some(agent) = agent_guard.as_ref() {
            match agent.chat(&conversation).await {
                Ok((response_text, tools_used, recipe_ids)) => {
                    // Send tool use events
                    for tool in &tools_used {
                        yield Ok(Event::default()
                            .event("tool_use")
                            .data(serde_json::json!({
                                "tool": tool,
                                "status": "completed"
                            }).to_string()));
                    }

                    // Send recipe artifact events (for display_recipe tool calls)
                    for recipe_id in &recipe_ids {
                        tracing::info!("Emitting recipe_artifact event for id: {}", recipe_id);
                        yield Ok(Event::default()
                            .event("recipe_artifact")
                            .data(serde_json::json!({
                                "recipe_id": recipe_id
                            }).to_string()));
                    }

                    // Stream the response text in chunks
                    // For now, send as a single chunk (real streaming would require
                    // modifying the LLM client to stream)
                    if !response_text.is_empty() {
                        yield Ok(Event::default()
                            .event("chunk")
                            .data(serde_json::json!({"text": response_text.clone()}).to_string()));
                    }

                    // Add assistant response to history
                    {
                        let mut sessions = state.sessions.write().await;
                        if let Some(history) = sessions.get_mut(&conv_id) {
                            history.push(ChatMessage {
                                role: ChatRole::Assistant,
                                content: response_text,
                            });
                        }
                    }

                    // Send done event
                    yield Ok(Event::default()
                        .event("done")
                        .data(serde_json::json!({
                            "conversation_id": conv_id,
                            "tools_used": tools_used
                        }).to_string()));
                }
                Err(e) => {
                    yield Ok(Event::default()
                        .event("error")
                        .data(serde_json::json!({
                            "message": e.to_string(),
                            "recoverable": true
                        }).to_string()));
                }
            }
        } else {
            yield Ok(Event::default()
                .event("error")
                .data(serde_json::json!({
                    "message": "Agent not initialized",
                    "recoverable": true
                }).to_string()));
        }
    };

    Ok(Sse::new(stream))
}

/// POST /api/chat/reset - Reset a conversation session
pub async fn reset_conversation(
    State(state): State<ChatState>,
    Json(request): Json<ResetRequest>,
) -> Result<Json<ResetResponse>, ChatError> {
    let mut sessions = state.sessions.write().await;
    sessions.remove(&request.conversation_id);
    Ok(Json(ResetResponse { success: true }))
}

#[derive(Debug, Deserialize)]
pub struct ResetRequest {
    pub conversation_id: String,
}

#[derive(Debug, Serialize)]
pub struct ResetResponse {
    pub success: bool,
}
