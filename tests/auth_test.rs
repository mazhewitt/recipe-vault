use axum::{
    body::Body,
    http::{Request, StatusCode},
    routing::get,
    Router,
    middleware,
};
use std::io::Write;
use std::sync::Arc;
use tower::ServiceExt;

use recipe_vault::{
    auth::{cloudflare_auth, CloudflareAuthState},
    config::FamiliesConfig,
    handlers::ui::{self, UiState},
};

fn test_families_config() -> FamiliesConfig {
    let yaml = r#"
families:
  test-family:
    members:
      - user@example.com
      - dev@example.com
"#;
    let mut file = tempfile::NamedTempFile::new().unwrap();
    file.write_all(yaml.as_bytes()).unwrap();
    FamiliesConfig::load(file.path()).unwrap()
}

// Helper to create the UI app with cloudflare auth middleware
fn create_ui_app(dev_email: Option<String>) -> Router {
    let state = UiState {};

    let cloudflare_auth_state = CloudflareAuthState {
        dev_user_email: dev_email,
        families_config: Arc::new(test_families_config()),
    };

    Router::new()
        .route("/chat", get(ui::chat_page))
        .with_state(state)
        .layer(middleware::from_fn_with_state(
            cloudflare_auth_state,
            cloudflare_auth,
        ))
}

#[tokio::test]
async fn test_cloudflare_identity_extraction() {
    // No dev email, but provide header
    let app = create_ui_app(None);

    let request = Request::builder()
        .method("GET")
        .uri("/chat")
        .header("Cf-Access-Authenticated-User-Email", "user@example.com")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
    assert!(body_str.contains("user@example.com"));
    assert!(body_str.contains("Recipe Vault - Chat"));
}

#[tokio::test]
async fn test_dev_user_email_fallback() {
    // Dev email provided, no header
    let app = create_ui_app(Some("dev@example.com".to_string()));

    let request = Request::builder()
        .method("GET")
        .uri("/chat")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
    assert!(body_str.contains("dev@example.com"));
}

#[tokio::test]
async fn test_unauthenticated_access() {
    // No dev email, no header
    let app = create_ui_app(None);

    let request = Request::builder()
        .method("GET")
        .uri("/chat")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
    assert!(body_str.contains("Authentication required via Cloudflare Access"));
}
