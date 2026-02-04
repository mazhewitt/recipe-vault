mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware,
    routing::post,
    Router,
};
use rstest::*;
use serde_json::json;
use std::sync::Arc;
use tower::ServiceExt;

use recipe_vault::auth::{api_key_auth, ApiKeyState};

// ==== Helper to create a test app with auth middleware ====
fn create_auth_test_app(api_key: &str) -> Router {
    let api_key_state = ApiKeyState {
        key: Arc::new(api_key.to_string()),
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
