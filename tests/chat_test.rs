mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware,
    response::IntoResponse,
    routing::post,
    Json, Router,
};
use rstest::*;
use serde_json::json;
use std::sync::Arc;
use tower::ServiceExt;

use recipe_vault::auth::{api_key_auth, ApiKeyState};
use recipe_vault::config::FamiliesConfig;

fn test_families_config() -> FamiliesConfig {
    use std::io::Write;
    let yaml = "families:\n  test-family:\n    members:\n      - test@example.com\n";
    let mut file = tempfile::NamedTempFile::new().unwrap();
    file.write_all(yaml.as_bytes()).unwrap();
    FamiliesConfig::load(file.path()).unwrap()
}

// ==== Helper to create a test app with auth middleware ====
fn create_auth_test_app(api_key: &str) -> Router {
    let api_key_state = ApiKeyState {
        key: Arc::new(api_key.to_string()),
        families_config: Arc::new(test_families_config()),
        dev_user_email: None,
    };

    // Simple handler that returns OK if auth passes
    async fn ok_handler() -> &'static str {
        "OK"
    }

    Router::new()
        .route("/test", post(ok_handler))
        .route_layer(middleware::from_fn_with_state(api_key_state, api_key_auth))
}

async fn send_auth_request(
    app: &Router,
    api_key: Option<&str>,
) -> (StatusCode, String) {
    let mut request_builder = Request::builder()
        .method("POST")
        .uri("/test")
        .header("content-type", "application/json");

    if let Some(key) = api_key {
        request_builder = request_builder.header("X-API-Key", key);
    }

    let request = request_builder.body(Body::empty()).unwrap();
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();

    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body_bytes.to_vec()).unwrap_or_default();

    (status, body)
}

// ==== Scenario: Missing authentication returns 401 ====
#[rstest]
#[tokio::test]
async fn test_chat_missing_auth_returns_401() {
    let app = create_auth_test_app("test-api-key-12345");

    let (status, body) = send_auth_request(&app, None).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert!(body.contains("Authentication required"));
}

// ==== Scenario: Invalid API key returns 401 ====
#[rstest]
#[tokio::test]
async fn test_chat_invalid_api_key_returns_401() {
    let app = create_auth_test_app("correct-api-key");

    let (status, body) = send_auth_request(&app, Some("wrong-api-key")).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert!(body.contains("Invalid API key"));
}

// ==== Scenario: Valid API key is accepted ====
#[rstest]
#[tokio::test]
async fn test_chat_valid_api_key_accepted() {
    let api_key = "my-valid-api-key-12345";
    let app = create_auth_test_app(api_key);

    let (status, body) = send_auth_request(&app, Some(api_key)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, "OK");
}

// ==== Scenario: API key header is case-sensitive ====
#[rstest]
#[tokio::test]
async fn test_chat_api_key_case_sensitive() {
    let app = create_auth_test_app("CaseSensitiveKey123");

    // Wrong case should fail
    let (status, _) = send_auth_request(&app, Some("casesensitivekey123")).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // Correct case should succeed
    let (status, _) = send_auth_request(&app, Some("CaseSensitiveKey123")).await;
    assert_eq!(status, StatusCode::OK);
}

// ==== Chat Request/Response Format Tests ====
// These tests verify the expected data structures

#[test]
fn test_chat_request_serialization() {
    // Verify ChatRequest structure
    let request = json!({
        "message": "What recipes do I have?",
        "conversation_id": "abc-123"
    });

    assert_eq!(request["message"], "What recipes do I have?");
    assert_eq!(request["conversation_id"], "abc-123");
}

#[test]
fn test_chat_request_minimal() {
    // conversation_id is optional
    let request = json!({
        "message": "Hello"
    });

    assert_eq!(request["message"], "Hello");
    assert!(request["conversation_id"].is_null());
}

#[test]
fn test_sse_chunk_event_format() {
    // Verify expected SSE event format for text chunks
    let chunk_event = json!({
        "text": "Here are your recipes..."
    });

    assert!(chunk_event["text"].is_string());
}

#[test]
fn test_sse_tool_use_event_format() {
    // Verify expected SSE event format for tool use
    let tool_event = json!({
        "tool": "list_recipes",
        "status": "completed"
    });

    assert_eq!(tool_event["tool"], "list_recipes");
    assert_eq!(tool_event["status"], "completed");
}

#[test]
fn test_sse_done_event_format() {
    // Verify expected SSE event format for completion
    let done_event = json!({
        "conversation_id": "uuid-here",
        "tools_used": ["list_recipes", "get_recipe"]
    });

    assert!(done_event["conversation_id"].is_string());
    assert!(done_event["tools_used"].is_array());
}

#[test]
fn test_sse_error_event_format() {
    // Verify expected SSE event format for errors
    let error_event = json!({
        "message": "AI service unavailable",
        "recoverable": true
    });

    assert!(error_event["message"].is_string());
    assert!(error_event["recoverable"].is_boolean());
}

// ==== Timer SSE event: step_number end to end ====

use recipe_vault::ai::{AiAgent, AiAgentConfig, ContentBlock, LlmProvider, McpServerConfig, Message, ServingsData, TimerData};
use recipe_vault::handlers::chat::SseEvent;

/// Build an AiAgent over the mock LLM and the real MCP binary (built by cargo for
/// integration tests). start_timer never calls the recipe API, so no server is needed.
fn mock_agent() -> AiAgent {
    let recipes_server = McpServerConfig {
        name: "recipes".to_string(),
        command: env!("CARGO_BIN_EXE_recipe-vault-mcp").to_string(),
        args: vec![],
        env: [
            ("API_BASE_URL".to_string(), "http://127.0.0.1:1".to_string()),
            ("API_KEY".to_string(), "test-api-key".to_string()),
        ]
        .into_iter()
        .collect(),
    };
    AiAgent::new(
        LlmProvider::mock(None),
        AiAgentConfig {
            mcp_servers: vec![recipes_server],
            system_prompt: None,
        },
    )
}

fn user_message(text: &str) -> Message {
    Message::User {
        content: vec![ContentBlock::Text { text: text.to_string() }],
    }
}

fn timer_start_json(timer: &TimerData) -> serde_json::Value {
    let event = SseEvent::TimerStart {
        duration_minutes: timer.duration_minutes,
        label: timer.label.clone(),
        step_number: timer.step_number,
    };
    serde_json::from_str(&event.data_json()).unwrap()
}

#[tokio::test]
async fn test_start_timer_over_mock_llm_yields_timer_start_with_step_number() {
    let agent = mock_agent();
    agent.start().await.expect("agent should start the MCP server");

    let (text, tools_used, _recipe_ids, page, _meal_plans, _messages) = agent
        .chat(&[user_message("Please start a timer")])
        .await
        .expect("chat over the mock provider should succeed");
    agent.stop().await.ok();

    let timer_data = page.timers;
    assert!(page.servings.is_empty());
    assert_eq!(tools_used, vec!["start_timer".to_string()]);
    assert_eq!(
        timer_data,
        vec![TimerData {
            duration_minutes: 0.1,
            label: "Mock timer".to_string(),
            step_number: Some(2),
        }]
    );
    assert_eq!(text, "Timer started for step 2.");

    let json = timer_start_json(&timer_data[0]);
    assert_eq!(json["duration_minutes"], json!(0.1));
    assert_eq!(json["label"], "Mock timer");
    assert_eq!(json["step_number"], json!(2));
}

#[test]
fn test_timer_start_event_omits_step_number_when_absent() {
    let json = timer_start_json(&TimerData {
        duration_minutes: 30.0,
        label: "Marinate chicken".to_string(),
        step_number: None,
    });
    assert_eq!(json["duration_minutes"], json!(30.0));
    assert_eq!(json["label"], "Marinate chicken");
    assert!(
        json.get("step_number").is_none(),
        "step_number must be omitted from the wire format when there is no step: {json}"
    );
    assert_eq!(json.as_object().unwrap().len(), 2);
}

#[test]
fn test_timer_start_event_includes_step_number_when_present() {
    let json = timer_start_json(&TimerData {
        duration_minutes: 30.0,
        label: "Marinate chicken".to_string(),
        step_number: Some(2),
    });
    assert_eq!(json, json!({"duration_minutes": 30.0, "label": "Marinate chicken", "step_number": 2}));
}

// ==== set_servings: servings_set end to end over the mock ====

use recipe_vault::handlers::chat::{current_recipe_context_text, servings_set_events, CurrentRecipeContext};

/// A user message as the chat handler builds it: the note, then the current-recipe block.
fn note_with_recipe(note: &str, recipe_json: serde_json::Value) -> Message {
    let ctx: CurrentRecipeContext = serde_json::from_value(recipe_json).unwrap();
    Message::User {
        content: vec![
            ContentBlock::Text { text: note.to_string() },
            ContentBlock::Text { text: current_recipe_context_text(&ctx, None) },
        ],
    }
}

#[tokio::test]
async fn test_halve_over_mock_llm_yields_servings_data_and_no_recipe_ids() {
    let agent = mock_agent();
    agent.start().await.expect("agent should start the MCP server");

    let (text, tools_used, recipe_ids, page, _meal_plans, _messages) = agent
        .chat(&[note_with_recipe(
            "halve this recipe",
            json!({"recipe_id": "R", "title": "Lasagne", "servings": 8}),
        )])
        .await
        .expect("chat over the mock provider should succeed");
    agent.stop().await.ok();

    assert_eq!(tools_used, vec!["set_servings".to_string()]);
    assert_eq!(page.servings, vec![ServingsData { servings: 4 }]);
    assert!(page.timers.is_empty());
    assert!(recipe_ids.is_empty(), "set_servings must not emit recipe_artifact: {recipe_ids:?}");
    assert!(text.contains("4 servings"), "reply should name the servings: {text}");
}

#[test]
fn test_servings_set_event_serialises_servings_and_recipe_id() {
    let event = SseEvent::ServingsSet { servings: 4, recipe_id: "R".to_string() };
    let data: serde_json::Value = serde_json::from_str(&event.data_json()).unwrap();
    assert_eq!(data, json!({"servings": 4, "recipe_id": "R"}));
    let tagged = serde_json::to_value(&event).unwrap();
    assert_eq!(tagged["event"], "servings_set");
}

#[test]
fn test_servings_set_events_need_a_current_recipe() {
    let servings = vec![ServingsData { servings: 4 }];
    assert!(servings_set_events(None, &servings).is_empty(), "no recipe, no event");

    let ctx: CurrentRecipeContext = serde_json::from_value(json!({"recipe_id": "R"})).unwrap();
    let events = servings_set_events(Some(&ctx), &servings);
    assert_eq!(events.len(), 1);
    let data: serde_json::Value = serde_json::from_str(&events[0].data_json()).unwrap();
    assert_eq!(data, json!({"servings": 4, "recipe_id": "R"}));
}

#[test]
fn test_page_servings_reach_the_context_block() {
    let ctx: CurrentRecipeContext =
        serde_json::from_value(json!({"recipe_id": "R", "title": "Lasagne", "servings": 8})).unwrap();
    let text = current_recipe_context_text(&ctx, None);
    assert!(text.lines().any(|l| l == "page_servings: 8"), "missing page_servings line: {text}");
    assert!(text.contains("may differ from the saved recipe"), "missing explanation: {text}");

    // An old request body without the field still deserialises, and adds no line
    let old: CurrentRecipeContext =
        serde_json::from_value(json!({"recipe_id": "R", "title": "Lasagne"})).unwrap();
    let text = current_recipe_context_text(&old, None);
    assert!(!text.contains("page_servings"), "no servings, no line: {text}");
    assert!(text.starts_with("[Current recipe context]\nrecipe_id: R"));
}

// ==== faster-chat-turns: the open recipe's saved text travels with the message ====

use recipe_vault::db::queries;
use recipe_vault::handlers::chat::open_recipe_for_context;
use recipe_vault::models::CreateRecipeInput;

/// A small lasagne owned by `owner`, with every field the block carries.
async fn saved_lasagne(pool: &sqlx::SqlitePool, owner: &str) -> String {
    let input: CreateRecipeInput = serde_json::from_value(json!({
        "title": "Granny's Lasagne",
        "description": "The Sunday classic.",
        "prep_time_minutes": 40,
        "cook_time_minutes": 150,
        "servings": 6,
        "difficulty": 3,
        "tags": ["main", "pasta"],
        "ingredients": [
            {"name": "olive oil", "quantity": 2.0, "unit": "tbsp"},
            {"name": "onion", "quantity": 1.0, "notes": "finely chopped"},
            {"name": "milk", "quantity": 0.75, "unit": "l"},
            {"name": "nutmeg", "notes": "a good grating"}
        ],
        "steps": [
            {"instruction": "Soften the onion in the oil.", "duration_minutes": 10},
            {"instruction": "Heat the oven.", "temperature_value": 180, "temperature_unit": "Celsius"},
            {"instruction": "Rest before cutting."}
        ]
    }))
    .unwrap();
    queries::create_recipe(pool, input, Some(owner.to_string())).await.unwrap().recipe.id
}

fn ctx_for(id: &str) -> CurrentRecipeContext {
    serde_json::from_value(json!({"recipe_id": id, "title": "Lasagne", "servings": 3})).unwrap()
}

#[tokio::test]
async fn test_the_open_recipes_saved_text_reaches_the_context_block() {
    let pool = common::create_test_db().await;
    let id = saved_lasagne(&pool, "alice@example.com").await;
    let family = vec!["alice@example.com".to_string(), "bob@example.com".to_string()];
    let ctx = ctx_for(&id);

    let recipe = open_recipe_for_context(&pool, &ctx, Some(family.as_slice())).await;
    assert!(recipe.is_some(), "a family member reads the family's recipe");
    let text = current_recipe_context_text(&ctx, recipe.as_ref());
    let lines: Vec<&str> = text.lines().collect();

    assert!(text.starts_with(&format!("[Current recipe context]\nrecipe_id: {id}")), "{text}");
    for line in [
        "page_servings: 3",
        // The saved title, under the field names update_recipe takes
        "title: Granny's Lasagne",
        "description: The Sunday classic.",
        "servings: 6",
        "prep_time_minutes: 40",
        "cook_time_minutes: 150",
        "difficulty: 3",
        "tags: main, pasta",
        "- 2 tbsp olive oil",
        "- 1 onion (finely chopped)",
        "- 0.75 l milk",
        "- nutmeg (a good grating)",
        "1. Soften the onion in the oil. [duration_minutes: 10]",
        "2. Heat the oven. [temperature: 180 Celsius]",
        "3. Rest before cutting.",
    ] {
        assert!(lines.contains(&line), "missing {line:?} in:\n{text}");
    }
    assert!(!lines.contains(&"title: Lasagne"), "the page's title gives way to the saved one: {text}");
    let at = |s: &str| text.find(s).unwrap();
    assert!(at("- 2 tbsp olive oil") < at("- nutmeg"), "ingredients in order: {text}");
    assert!(at("1. Soften") < at("2. Heat") && at("2. Heat") < at("3. Rest"), "steps in order: {text}");
    assert!(text.contains("without calling get_recipe"), "the instruction follows the text: {text}");
    assert!(!text.contains("Call get_recipe if you need full details"), "{text}");
}

#[tokio::test]
async fn test_another_familys_recipe_stays_out_of_the_context_block() {
    let pool = common::create_test_db().await;
    let id = saved_lasagne(&pool, "alice@example.com").await;
    let other_family = vec!["carol@elsewhere.com".to_string()];
    let ctx = ctx_for(&id);

    let recipe = open_recipe_for_context(&pool, &ctx, Some(other_family.as_slice())).await;
    assert!(recipe.is_none(), "another family reads nothing");
    let text = current_recipe_context_text(&ctx, recipe.as_ref());
    for leaked in ["Granny", "olive oil", "Soften", "Sunday", "prep_time_minutes"] {
        assert!(!text.contains(leaked), "{leaked:?} leaked into:\n{text}");
    }
    // Today's block: the request's own id, title and servings, and get_recipe for the rest
    assert!(text.lines().any(|l| l == "title: Lasagne"), "{text}");
    assert!(text.lines().any(|l| l == "page_servings: 3"), "{text}");
    assert!(text.ends_with("Call get_recipe if you need full details."), "{text}");

    // No such recipe at all
    let missing = ctx_for("no-such-recipe");
    assert!(open_recipe_for_context(&pool, &missing, None).await.is_none());

    // A database error falls back too, and the turn goes ahead
    pool.close().await;
    assert!(open_recipe_for_context(&pool, &ctx, None).await.is_none());
}

// ==== Integration Tests (require external dependencies) ====
// These tests are ignored by default and require:
// - ANTHROPIC_API_KEY environment variable
// - Running recipe-vault server
// - Built MCP binary
//
// Run with: cargo test --test chat_test -- --ignored

#[tokio::test]
#[ignore = "Requires running server and valid ANTHROPIC_API_KEY"]
async fn test_chat_endpoint_returns_sse_stream() {
    // This test requires a running server with valid config
    // Manual verification:
    // 1. Start server: cargo run
    // 2. Send request:
    //    curl -X POST http://localhost:3000/api/chat \
    //      -H "Content-Type: application/json" \
    //      -H "X-API-Key: YOUR_API_KEY" \
    //      -d '{"message": "Hello"}'
    // 3. Verify SSE events are received
    println!("This test requires manual execution with a running server");
}

#[tokio::test]
#[ignore = "Requires running server and valid ANTHROPIC_API_KEY"]
async fn test_chat_conversation_context_maintained() {
    // Manual verification:
    // 1. Send first message, save conversation_id from response
    // 2. Send follow-up with same conversation_id
    // 3. Verify Claude understands context
    println!("This test requires manual execution with a running server");
}

// ==== update_recipe refresh: recipe_artifact + [UI] margin-note instruction ====

const UI_INSTRUCTION: &str = "\n\n[UI] The recipe page has been refreshed. Reply with one short margin note (one sentence) saying what changed. Do not call display_recipe.";

/// Spawn a stub of the recipe API for the MCP binary to talk to.
/// `ok` selects between a successful update (returns a recipe JSON with an `id`)
/// and a failing update (500 with no body).
async fn spawn_stub_api(recipe_id: &'static str, ok: bool) -> String {
    use axum::routing::put;

    let app = Router::new().route(
        "/api/recipes/:id",
        put(move || async move {
            if ok {
                (
                    StatusCode::OK,
                    Json(json!({
                        "id": recipe_id,
                        "title": "Chicken Curry",
                        "servings": 2,
                        "created_at": "2026-01-01T00:00:00Z",
                        "updated_at": "2026-01-01T00:00:00Z",
                        "ingredients": [],
                        "steps": []
                    })),
                )
                    .into_response()
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, "boom").into_response()
            }
        }),
    );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.ok();
    });
    format!("http://{}", addr)
}

fn mock_agent_against(base_url: &str, mock_recipe_id: Option<String>) -> AiAgent {
    let recipes_server = McpServerConfig {
        name: "recipes".to_string(),
        command: env!("CARGO_BIN_EXE_recipe-vault-mcp").to_string(),
        args: vec![],
        env: [
            ("API_BASE_URL".to_string(), base_url.to_string()),
            ("API_KEY".to_string(), "test-api-key".to_string()),
        ]
        .into_iter()
        .collect(),
    };
    AiAgent::new(
        LlmProvider::mock(mock_recipe_id),
        AiAgentConfig {
            mcp_servers: vec![recipes_server],
            system_prompt: None,
        },
    )
}

fn tool_result_contents(messages: &[Message]) -> Vec<String> {
    messages
        .iter()
        .filter_map(|m| match m {
            Message::Tool { tool_results } => Some(tool_results),
            _ => None,
        })
        .flatten()
        .map(|r| r.content.clone())
        .collect()
}

#[tokio::test]
async fn test_update_recipe_emits_recipe_artifact_and_ui_instruction() {
    let recipe_id = "11111111-2222-3333-4444-555555555555";
    let base_url = spawn_stub_api(recipe_id, true).await;
    let agent = mock_agent_against(&base_url, Some(recipe_id.to_string()));
    agent.start().await.expect("agent should start the MCP server");

    let (text, tools_used, recipe_ids, _timers, _meal_plans, messages) = agent
        .chat(&[user_message("Please update this recipe")])
        .await
        .expect("chat over the mock provider should succeed");
    agent.stop().await.ok();

    assert_eq!(tools_used, vec!["update_recipe".to_string()]);
    assert_eq!(
        recipe_ids,
        vec![recipe_id.to_string()],
        "update_recipe should surface the updated recipe id for the recipe_artifact event"
    );
    let contents = tool_result_contents(&messages);
    assert_eq!(contents.len(), 1, "expected one tool result: {contents:?}");
    assert!(
        contents[0].ends_with(UI_INSTRUCTION),
        "tool result should be suffixed with the [UI] instruction, got: {}",
        contents[0]
    );
    assert_eq!(text, "Halved it — serves 2 now.");
}

#[tokio::test]
async fn test_failed_update_recipe_emits_no_artifact_and_leaves_text_unchanged() {
    let recipe_id = "66666666-7777-8888-9999-000000000000";
    let base_url = spawn_stub_api(recipe_id, false).await;
    let agent = mock_agent_against(&base_url, Some(recipe_id.to_string()));
    agent.start().await.expect("agent should start the MCP server");

    let (_text, _tools_used, recipe_ids, _timers, _meal_plans, messages) = agent
        .chat(&[user_message("Please update this recipe")])
        .await
        .expect("chat over the mock provider should succeed");
    agent.stop().await.ok();

    assert!(
        recipe_ids.is_empty(),
        "a failed update_recipe must not emit a recipe_artifact: {recipe_ids:?}"
    );
    let contents = tool_result_contents(&messages);
    assert_eq!(contents.len(), 1, "expected one tool result: {contents:?}");
    assert!(
        !contents[0].contains("[UI]"),
        "the error text must be returned unchanged, got: {}",
        contents[0]
    );
}

#[test]
fn test_recipe_ids_are_deduplicated_preserving_order() {
    use recipe_vault::ai::dedupe_recipe_ids;

    assert_eq!(
        dedupe_recipe_ids(vec![
            "a".to_string(),
            "b".to_string(),
            "a".to_string(),
            "c".to_string(),
            "b".to_string(),
        ]),
        vec!["a".to_string(), "b".to_string(), "c".to_string()]
    );
}

// ==== Lost-history notice (web-chat: "Lost-history notice only for lost conversations") ====

use recipe_vault::chat::SessionStore;
use recipe_vault::handlers::chat::prepare_conversation;

fn user_text(text: &str) -> Message {
    Message::User {
        content: vec![ContentBlock::Text { text: text.to_string() }],
    }
}

fn has_reset_notice(conversation: &[Message]) -> bool {
    conversation.iter().any(|m| match m {
        Message::User { content } => content.iter().any(|b| {
            matches!(b, ContentBlock::Text { text } if text.starts_with("[System]") && text.contains("conversation was reset"))
        }),
        _ => false,
    })
}

#[tokio::test]
async fn test_new_chat_without_conversation_id_gets_no_reset_notice() {
    let sessions = SessionStore::new();
    let (id, conversation) = prepare_conversation(&sessions, None, user_text("hello")).await;
    assert!(!id.is_empty());
    assert!(!has_reset_notice(&conversation), "new chat must not carry the reset notice");
    assert_eq!(conversation.len(), 1);
}

#[tokio::test]
async fn test_unknown_conversation_id_gets_reset_notice_first() {
    let sessions = SessionStore::new();
    let (id, conversation) =
        prepare_conversation(&sessions, Some("lost-id".to_string()), user_text("hello")).await;
    assert_eq!(id, "lost-id");
    assert!(has_reset_notice(&conversation[..1]), "notice must be the first message");
    assert_eq!(conversation.len(), 2);
}

#[tokio::test]
async fn test_known_conversation_id_gets_no_reset_notice() {
    let sessions = SessionStore::new();
    let (id, _) = prepare_conversation(&sessions, None, user_text("first")).await;
    let (id2, conversation) =
        prepare_conversation(&sessions, Some(id.clone()), user_text("second")).await;
    assert_eq!(id, id2);
    assert!(!has_reset_notice(&conversation));
    assert_eq!(conversation.len(), 2);
}
