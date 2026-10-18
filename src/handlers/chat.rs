use axum::{
    extract::State,
    response::{
        sse::{Event, Sse},
    },
    Json,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::convert::Infallible;
use uuid::Uuid;

use crate::ai::{ContentBlock, ImageSource, Message, MealPlanEntry, ServingsData};
use crate::chat::{ChatError, ChatState, SessionStore};
use crate::db::queries;
use crate::error::ApiError;
use crate::models::RecipeWithDetails;

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
    /// The servings the page shows (the stepper's value), when the recipe has servings.
    #[serde(default)]
    pub servings: Option<u32>,
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
        #[serde(skip_serializing_if = "Option::is_none")]
        step_number: Option<u32>,
    },
    #[serde(rename = "servings_set")]
    ServingsSet { servings: u32, recipe_id: String },
    #[serde(rename = "done")]
    Done {
        conversation_id: String,
        tools_used: Vec<String>,
    },
    #[serde(rename = "error")]
    Error { message: String, recoverable: bool },
}

impl SseEvent {
    /// Serialise only the payload of this event (the `data` half of the tagged
    /// representation), suitable for the SSE `data:` line.
    pub fn data_json(&self) -> String {
        serde_json::to_value(self)
            .ok()
            .and_then(|v| v.get("data").cloned())
            .map(|d| d.to_string())
            .unwrap_or_default()
    }
}

/// The `[Current recipe context]` block appended to the user message. With the
/// open recipe's saved text the model answers from it, instead of spending a
/// whole model call on `get_recipe` first. Without it (no recipe the user's
/// family can read) the block names the recipe and points at `get_recipe`.
pub fn current_recipe_context_text(
    current_recipe: &CurrentRecipeContext,
    recipe: Option<&RecipeWithDetails>,
) -> String {
    let mut context_text = format!(
        "[Current recipe context]\nrecipe_id: {}",
        current_recipe.recipe_id
    );
    // The saved text carries the saved title
    if let (None, Some(title)) = (recipe, &current_recipe.title) {
        context_text.push_str(&format!("\ntitle: {}", title));
    }
    if let Some(servings) = current_recipe.servings {
        context_text.push_str(&format!("\npage_servings: {}", servings));
        context_text.push_str("\n(page_servings is what the page shows now and may differ from the saved recipe's servings.)");
    }
    match recipe {
        Some(recipe) => {
            context_text.push_str("\n\nThe recipe as saved (its quantities are for its saved servings):\n");
            context_text.push_str(&saved_recipe_text(recipe));
            context_text.push_str("\n\nInstruction: Treat this as the active recipe. Its saved text is above: answer questions about it, scale it and substitute in it from that text, without calling get_recipe. Call get_recipe only for another recipe.");
        }
        None => context_text.push_str("\nInstruction: Treat this as the active recipe. Call get_recipe if you need full details."),
    }
    context_text
}

/// The saved recipe as compact lines, under the field names `update_recipe`
/// takes: about 600 prompt tokens for a lasagne, where `get_recipe`'s JSON
/// is about 4,000.
fn saved_recipe_text(details: &RecipeWithDetails) -> String {
    let recipe = &details.recipe;
    let non_empty = |s: &Option<String>| s.as_deref().map(str::trim).filter(|s| !s.is_empty()).map(str::to_string);
    let mut lines = vec![format!("title: {}", recipe.title)];
    if let Some(description) = non_empty(&recipe.description) {
        lines.push(format!("description: {}", description));
    }
    if let Some(servings) = recipe.servings {
        lines.push(format!("servings: {}", servings));
    }
    if let Some(minutes) = recipe.prep_time_minutes {
        lines.push(format!("prep_time_minutes: {}", minutes));
    }
    if let Some(minutes) = recipe.cook_time_minutes {
        lines.push(format!("cook_time_minutes: {}", minutes));
    }
    if let Some(difficulty) = recipe.difficulty {
        lines.push(format!("difficulty: {}", difficulty));
    }
    if !recipe.tags.is_empty() {
        lines.push(format!("tags: {}", recipe.tags.join(", ")));
    }

    lines.push("ingredients:".to_string());
    for ingredient in &details.ingredients {
        let mut line = "-".to_string();
        // As stored: 2.0 prints "2", 0.75 "0.75"
        if let Some(quantity) = ingredient.quantity {
            line.push_str(&format!(" {}", quantity));
        }
        if let Some(unit) = non_empty(&ingredient.unit) {
            line.push_str(&format!(" {}", unit));
        }
        line.push_str(&format!(" {}", ingredient.name));
        if let Some(notes) = non_empty(&ingredient.notes) {
            line.push_str(&format!(" ({})", notes));
        }
        lines.push(line);
    }

    lines.push("steps:".to_string());
    for (n, step) in details.steps.iter().enumerate() {
        let mut line = format!("{}. {}", n + 1, step.instruction);
        if let Some(minutes) = step.duration_minutes {
            line.push_str(&format!(" [duration_minutes: {}]", minutes));
        }
        match (step.temperature_value, non_empty(&step.temperature_unit)) {
            (Some(value), Some(unit)) => line.push_str(&format!(" [temperature: {} {}]", value, unit)),
            (Some(value), None) => line.push_str(&format!(" [temperature: {}]", value)),
            _ => {}
        }
        lines.push(line);
    }
    lines.join("\n")
}

/// Reads the recipe the page names, scoped to the requesting user's family as
/// `GET /api/recipes/:id` is. Not found, or not the family's: `None`. A
/// database error is logged and is `None` too: the turn goes ahead on the
/// short block.
pub async fn open_recipe_for_context(
    pool: &SqlitePool,
    current_recipe: &CurrentRecipeContext,
    family_members: Option<&[String]>,
) -> Option<RecipeWithDetails> {
    match queries::get_recipe(pool, &current_recipe.recipe_id, family_members).await {
        Ok(recipe) => Some(recipe),
        Err(ApiError::NotFound(_)) => None,
        Err(e) => {
            tracing::warn!(
                "Could not read the open recipe {} for the chat context: {}",
                current_recipe.recipe_id,
                e
            );
            None
        }
    }
}

/// `servings_set` events for a turn's set_servings calls. They go to the recipe the
/// request was sent from, so without a current recipe there is no event.
pub fn servings_set_events(
    current_recipe: Option<&CurrentRecipeContext>,
    servings: &[ServingsData],
) -> Vec<SseEvent> {
    match current_recipe {
        Some(recipe) => servings
            .iter()
            .map(|s| SseEvent::ServingsSet {
                servings: s.servings,
                recipe_id: recipe.recipe_id.clone(),
            })
            .collect(),
        None => Vec::new(),
    }
}

/// POST /api/chat - Send a message and receive a streaming response
/// Record the user message in the session and return the conversation id plus the
/// conversation to send to the LLM. A lost-history notice is prepended only when the
/// request named a conversation the server no longer holds.
pub async fn prepare_conversation(
    sessions: &SessionStore,
    requested_id: Option<String>,
    user_message: Message,
) -> (String, Vec<Message>) {
    let resuming = requested_id.is_some();
    let conversation_id = requested_id.unwrap_or_else(|| Uuid::new_v4().to_string());

    let (mut conversation, is_new_session) = sessions
        .append_user_message(&conversation_id, user_message)
        .await;

    if resuming && is_new_session {
        let notice = Message::User {
            content: vec![ContentBlock::Text {
                text: "[System] This session has no prior history. Briefly explain to the user that the conversation was reset and you'll continue from here.".to_string(),
            }],
        };
        conversation.insert(0, notice);
    }

    (conversation_id, conversation)
}

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
        // The open recipe's saved text, read as the user's family can read it,
        // so a question about it needs no get_recipe round trip
        let family_members = identity.and_then(|i| i.family_members.as_deref());
        let recipe = open_recipe_for_context(state.pool(), current_recipe, family_members).await;
        content_blocks.push(ContentBlock::Text {
            text: current_recipe_context_text(current_recipe, recipe.as_ref()),
        });
    }

    // Add user message to history and capture the conversation snapshot
    let (conversation_id, conversation) = prepare_conversation(
        state.sessions(),
        request.conversation_id,
        Message::User {
            content: content_blocks,
        },
    )
    .await;
    let conv_id = conversation_id.clone();

    // Create SSE stream
    let stream = async_stream::stream! {
        // Send initial chunk to acknowledge receipt
        yield Ok(Event::default()
            .event("chunk")
            .data(serde_json::json!({"text": ""}).to_string()));

        // Get agent and process message
        match state.chat(&conversation).await {
            Ok((response_text, tools_used, recipe_ids, page_events, meal_plans, new_messages)) => {
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
                    for timer in &page_events.timers {
                        tracing::info!(
                            "Emitting timer_start event: duration={}, label={}, step={:?}",
                            timer.duration_minutes, timer.label, timer.step_number
                        );
                        let event = SseEvent::TimerStart {
                            duration_minutes: timer.duration_minutes,
                            label: timer.label.clone(),
                            step_number: timer.step_number,
                        };
                        yield Ok(Event::default()
                            .event("timer_start")
                            .data(event.data_json()));
                    }

                    // Send servings_set events (for set_servings tool calls), only
                    // to the recipe the request was sent from
                    for event in servings_set_events(request.current_recipe.as_ref(), &page_events.servings) {
                        tracing::info!("Emitting servings_set event: {}", event.data_json());
                        yield Ok(Event::default()
                            .event("servings_set")
                            .data(event.data_json()));
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
