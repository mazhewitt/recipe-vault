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

use crate::ai::{AiAgent, AiAgentConfig, LlmProvider, LlmProviderType, Message, ContentBlock, ImageSource};
use crate::config::Config;

#[derive(Clone)]
pub struct ChatState {
    agent: Arc<RwLock<Option<AiAgent>>>,
    sessions: Arc<RwLock<HashMap<String, Vec<Message>>>>,
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
                                        "You are a helpful cooking assistant with access to a recipe database.\n\n\
                                         ## Image-Based Recipe Extraction\n\n\
                                         When the user sends an image with their message:\n\
                                         - If the image contains a recipe (handwritten, printed, cookbook page, recipe card), extract it\n\
                                         - Use any accompanying text from the user as additional context (e.g., for description, notes, family history)\n\
                                         - Extract: title, description, ingredients (with quantities and units), preparation steps, timing, temperature\n\
                                         - Format the extracted recipe nicely using markdown with clear sections\n\
                                         - After showing the extracted recipe, ask: \"Would you like me to edit it or add it to the book?\"\n\
                                         - If the image doesn't contain a recipe, politely say \"I couldn't find a recipe in that image\" and suggest they paste a recipe image\n\n\
                                         ## Tool Use Protocol (CRITICAL)\n\n\
                                         You MUST call the right tool for each user intent:\n\
                                         - **Listing recipes** (\"list recipes\", \"show all recipes\", \"what recipes do I have\"): \
                                             MUST call `list_recipes`. It takes no parameters. Present the results as a concise list.\n\
                                         - **Viewing a specific recipe** (\"show me\", \"view\", \"read\", \"cook\", \"what ingredients\"): \
                                             MUST call `display_recipe` with the recipe_id. This renders the recipe in the side panel for the user.\n\
                                         - **After creating a recipe**: When `create_recipe` succeeds and returns a new recipe_id, \
                                             you MUST immediately call `display_recipe` with that recipe_id so the user can see it.\n\
                                         - **`get_recipe`** returns data for YOUR internal use only. It does NOT display anything to the user.\n\
                                         - **Current recipe context**: If `current_recipe` is provided, treat it as the active recipe. \
                                             Use `get_recipe` with its recipe_id when you need full details (e.g., scaling or substitutions).\n\
                                         ## Rules\n\
                                         - NEVER output full ingredient lists or step-by-step instructions in chat. The side panel shows those.\n\
                                         - NEVER fabricate recipe IDs. Only use exact UUIDs from `list_recipes` or `create_recipe` results.\n\
                                         - After calling `display_recipe`, provide a brief (1-2 sentence) summary or tip in chat.\n\n\
                                         ## Examples\n\n\
                                         User: \"List all my recipes\"\n\
                                         Action: Call list_recipes()\n\
                                         Response: List the recipe titles and brief descriptions from the tool result.\n\n\
                                         User: \"Show me the Apple Pie recipe\"\n\
                                         Action: Call display_recipe(recipe_id=<id from previous list_recipes>)\n\
                                         Response: \"I've opened Apple Pie in the side panel! The key to a flaky crust is keeping your butter cold.\"\n\n\
                                         User: \"Create a recipe for banana bread\"\n\
                                         Action: Call create_recipe(...), then call display_recipe(recipe_id=<new id from create result>)\n\
                                         Response: \"I've saved your Banana Bread recipe and opened it in the side panel!\"\n\n\
                                         ## Formatting Guidelines\n\
                                         Use markdown. Keep chat responses concise. Do not show UUIDs to the user."
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
pub struct ImageAttachment {
    pub data: String,       // base64-encoded image data
    pub media_type: String, // MIME type (e.g., "image/jpeg", "image/png")
}

#[derive(Debug, Deserialize)]
pub struct CurrentRecipeContext {
    pub recipe_id: String,
    #[serde(default)]
    pub title: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub conversation_id: Option<String>,
    #[serde(default)]
    pub image: Option<ImageAttachment>,
    #[serde(default)]
    pub current_recipe: Option<CurrentRecipeContext>,
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

    // Build content blocks for the user message
    let mut content_blocks = Vec::new();

    // Add text block only if message is non-empty
    if !request.message.trim().is_empty() {
        content_blocks.push(ContentBlock::Text {
            text: request.message.clone(),
        });
    }

    // Add image if present
    if let Some(img) = &request.image {
        tracing::info!(
            "Received image attachment: media_type={}, size={} bytes",
            img.media_type,
            img.data.len()
        );
        content_blocks.push(ContentBlock::Image {
            source: ImageSource {
                source_type: "base64".to_string(),
                media_type: img.media_type.clone(),
                data: img.data.clone(),
            },
        });
    }

    // Ensure we have at least one content block
    if content_blocks.is_empty() {
        tracing::warn!("Received message with no content (no text and no image)");
        // This shouldn't happen due to frontend validation, but handle it gracefully
        content_blocks.push(ContentBlock::Text {
            text: "...".to_string(),
        });
    }

    if let Some(current_recipe) = &request.current_recipe {
        let mut context_text = format!(
            "[Current recipe context]\nrecipe_id: {}",
            current_recipe.recipe_id
        );
        if let Some(title) = &current_recipe.title {
            context_text.push_str(&format!("\ntitle: {}", title));
        }
        context_text.push_str("\nInstruction: Treat this as the active recipe. Call get_recipe if you need full details.");
        content_blocks.push(ContentBlock::Text { text: context_text });
    }

    // Add user message to history
    history.push(Message::User {
        content: content_blocks,
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
                Ok((response_text, tools_used, recipe_ids, new_messages)) => {
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
                    if !response_text.is_empty() {
                        yield Ok(Event::default()
                            .event("chunk")
                            .data(serde_json::json!({"text": response_text.clone()}).to_string()));
                    }

                    // Persist all new messages (tool calls, tool results, final text)
                    {
                        let mut sessions = state.sessions.write().await;
                        if let Some(history) = sessions.get_mut(&conv_id) {
                            history.extend(new_messages);
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
