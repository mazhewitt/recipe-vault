use axum::{
    body::Body,
    http::{Request, StatusCode},
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower::ServiceExt;

use recipe_vault::handlers::ui::{self, UiState};

// Helper to create the UI app
fn create_ui_app(password: Option<&str>) -> Router {
    let state = UiState {
        family_password: password.map(|p| Arc::new(p.to_string())),
    };

    Router::new()
        .route("/chat", get(ui::chat_page))
        .route("/login", post(ui::login))
        .route("/logout", post(ui::logout))
        .with_state(state)
}

#[tokio::test]
async fn test_login_success() {
    let app = create_ui_app(Some("secret123"));

    // Prepare login form data
    let body = "password=secret123";
    let request = Request::builder()
        .method("POST")
        .uri("/login")
        .header("content-type", "application/x-www-form-urlencoded")
        .body(Body::from(body))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::SEE_OTHER); // Redirect
    
    // Check for Set-Cookie header
    let cookie = response.headers().get("set-cookie");
    assert!(cookie.is_some());
    let cookie_str = cookie.unwrap().to_str().unwrap();
    assert!(cookie_str.contains("rv_session="));
    assert!(cookie_str.contains("HttpOnly"));
}

#[tokio::test]
async fn test_login_failure() {
    let app = create_ui_app(Some("secret123"));

    // Wrong password
    let body = "password=wrongpass";
    let request = Request::builder()
        .method("POST")
        .uri("/login")
        .header("content-type", "application/x-www-form-urlencoded")
        .body(Body::from(body))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();

    // Should return 200 OK but with error HTML
    assert_eq!(response.status(), StatusCode::OK);
    
    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
    assert!(body_str.contains("Incorrect password"));
}

#[tokio::test]
async fn test_logout() {
    let app = create_ui_app(Some("secret123"));

    let request = Request::builder()
        .method("POST")
        .uri("/logout")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    
    // Check for cleared cookie
    let cookie = response.headers().get("set-cookie");
    assert!(cookie.is_some());
    let cookie_str = cookie.unwrap().to_str().unwrap();
    assert!(cookie_str.contains("Max-Age=0"));
}

#[tokio::test]
async fn test_chat_page_redirects_to_login_without_cookie() {
    let app = create_ui_app(Some("secret123"));

    let request = Request::builder()
        .method("GET")
        .uri("/chat")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();

    // Since handler returns HTML directly based on session, 
    // it should return the LOGIN_PAGE_HTML (200 OK) if not authenticated
    assert_eq!(response.status(), StatusCode::OK);
    
    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
    assert!(body_str.contains("<form class=\"login-form\""));
}

#[tokio::test]
async fn test_chat_page_access_with_valid_cookie() {
    let password = "secret123";
    let app = create_ui_app(Some(password));

    // Manually create a valid cookie
    // We need to import the helper from auth but it's not pub.
    // Wait, create_session_cookie IS pub.
    let cookie_val = recipe_vault::auth::create_session_cookie(password);
    
    // Extract the value part: rv_session=HASH; ...
    // We just need to send "rv_session=HASH" in the Cookie header.
    let cookie_part = cookie_val.split(';').next().unwrap();

    let request = Request::builder()
        .method("GET")
        .uri("/chat")
        .header("Cookie", cookie_part)
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    
    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
    assert!(body_str.contains("Recipe Vault - Chat"));
}
