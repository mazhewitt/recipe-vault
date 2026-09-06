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

use recipe_vault::ai::{AiAgent, AiAgentConfig, ContentBlock, LlmProvider, McpServerConfig, Message, TimerData};
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

    let (text, tools_used, _recipe_ids, timer_data, _meal_plans, _messages) = agent
        .chat(&[user_message("Please start a timer")])
        .await
        .expect("chat over the mock provider should succeed");
    agent.stop().await.ok();

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
        .chat(&[user_message("Please halve this recipe")])
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
        .chat(&[user_message("Please halve this recipe")])
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
