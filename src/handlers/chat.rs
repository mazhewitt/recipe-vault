use axum::{
    extract::State,
    response::{
        sse::{Event, Sse},
    },
    Json,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use uuid::Uuid;

use crate::ai::{ContentBlock, ImageSource, Message, MealPlanEntry};
use crate::chat::{ChatError, ChatState};

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
    #[serde(rename = "meal_artifact")]
    MealArtifact {
        title: String,
        guest_count: Option<i32>,
        recipes: Vec<MealPlanEntry>,
    },
    #[serde(rename = "timer_start")]
    TimerStart {
        duration_minutes: f64,
        label: String,
    },
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
    extensions: axum::http::Extensions,
    Json(request): Json<ChatRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, ChatError> {
    // Get authenticated user identity
    let identity = extensions.get::<crate::auth::UserIdentity>();
    let user_email = identity
        .and_then(|i| i.email.clone())
        .ok_or_else(|| ChatError::Session("User not authenticated".to_string()))?;

    // Ensure agent is running with the authenticated user's context
    state.get_or_create_agent(&user_email).await?;

    // Get or create conversation
    let conversation_id = request
        .conversation_id
        .unwrap_or_else(|| Uuid::new_v4().to_string());

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

    // Add user message to history and capture the conversation snapshot
    let (mut conversation, is_new_session) = state
        .sessions()
        .append_user_message(
            &conversation_id,
            Message::User {
                content: content_blocks,
            },
        )
        .await;

    if is_new_session {
        let notice = Message::User {
            content: vec![ContentBlock::Text {
                text: "[System] This session has no prior history. Briefly explain to the user that the conversation was reset and you'll continue from here.".to_string(),
            }],
        };
        conversation.insert(0, notice);
    }
    let conv_id = conversation_id.clone();

    // Create SSE stream
    let stream = async_stream::stream! {
        // Send initial chunk to acknowledge receipt
        yield Ok(Event::default()
            .event("chunk")
            .data(serde_json::json!({"text": ""}).to_string()));

        // Get agent and process message
        match state.chat(&conversation).await {
            Ok((response_text, tools_used, recipe_ids, timer_data, meal_plans, new_messages)) => {
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

                    // Send meal artifact events (for display_meal_plan tool calls)
                    for meal_plan in &meal_plans {
                        tracing::info!("Emitting meal_artifact event: title={}", meal_plan.title);
                        yield Ok(Event::default()
                            .event("meal_artifact")
                            .data(serde_json::to_string(meal_plan).unwrap_or_default()));
                    }

                    // Send timer_start events (for start_timer tool calls)
                    for (duration_minutes, label) in &timer_data {
                        tracing::info!("Emitting timer_start event: duration={}, label={}", duration_minutes, label);
                        yield Ok(Event::default()
                            .event("timer_start")
                            .data(serde_json::json!({
                                "duration_minutes": duration_minutes,
                                "label": label
                            }).to_string()));
                    }

                    // Stream the response text in chunks
                    if !response_text.is_empty() {
                        yield Ok(Event::default()
                            .event("chunk")
                            .data(serde_json::json!({"text": response_text.clone()}).to_string()));
                    }

                    // Persist all new messages (tool calls, tool results, final text)
                    state
                        .sessions()
                        .append_messages(&conv_id, new_messages)
                        .await;

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
    };

    Ok(Sse::new(stream))
}

/// POST /api/chat/reset - Reset a conversation session
pub async fn reset_conversation(
    State(state): State<ChatState>,
    Json(request): Json<ResetRequest>,
) -> Result<Json<ResetResponse>, ChatError> {
    state.sessions().remove(&request.conversation_id).await;
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

#[cfg(test)]
mod tests {
    use super::*;

    // Task 5.2 / 5.3 — SseEvent::MealArtifact serializes correctly
    #[test]
    fn test_sse_meal_artifact_serializes_to_tagged_json() {
        let event = SseEvent::MealArtifact {
            title: "Sunday Roast".to_string(),
            guest_count: Some(6),
            recipes: vec![
                MealPlanEntry {
                    recipe_id: "abc-123".to_string(),
                    title: "Beef Wellington".to_string(),
                    role: "centrepiece".to_string(),
                },
            ],
        };

        let json = serde_json::to_string(&event).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed["event"], "meal_artifact");
        assert_eq!(parsed["data"]["title"], "Sunday Roast");
        assert_eq!(parsed["data"]["guest_count"], 6);
        assert_eq!(parsed["data"]["recipes"][0]["recipe_id"], "abc-123");
        assert_eq!(parsed["data"]["recipes"][0]["role"], "centrepiece");
        assert_eq!(parsed["data"]["recipes"][0]["title"], "Beef Wellington");
    }

    #[test]
    fn test_sse_meal_artifact_null_guest_count() {
        let event = SseEvent::MealArtifact {
            title: "Quick Lunch".to_string(),
            guest_count: None,
            recipes: vec![],
        };

        let json = serde_json::to_string(&event).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed["event"], "meal_artifact");
        assert_eq!(parsed["data"]["guest_count"], serde_json::Value::Null);
        assert!(parsed["data"]["recipes"].as_array().unwrap().is_empty());
    }

    // Task 5.3 — Verify the meal_artifact data emitted via serde_json::to_string
    // matches what the SSE stream handler emits (since the handler uses MealArtifactData
    // directly, not SseEvent, we test both round-trips are consistent)
    #[test]
    fn test_meal_artifact_serde_roundtrip_consistent_with_sse_payload() {
        use crate::ai::MealArtifactData;

        let artifact = MealArtifactData {
            title: "Summer BBQ".to_string(),
            guest_count: Some(4),
            recipes: vec![
                MealPlanEntry {
                    recipe_id: "r1".to_string(),
                    title: "Grilled Chicken".to_string(),
                    role: "centrepiece".to_string(),
                },
                MealPlanEntry {
                    recipe_id: "r2".to_string(),
                    title: "Coleslaw".to_string(),
                    role: "side".to_string(),
                },
            ],
        };

        // This is what the SSE handler emits as the data field of the meal_artifact event
        let sse_data = serde_json::to_string(&artifact).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&sse_data).unwrap();

        assert_eq!(parsed["title"], "Summer BBQ");
        assert_eq!(parsed["guest_count"], 4);
        assert_eq!(parsed["recipes"].as_array().unwrap().len(), 2);
        assert_eq!(parsed["recipes"][0]["role"], "centrepiece");
        assert_eq!(parsed["recipes"][1]["role"], "side");
    }
}
