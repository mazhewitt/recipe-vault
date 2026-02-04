use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use serde_json::Value;
use sqlx::SqlitePool;
use tower::ServiceExt;

/// Create an in-memory test database with migrations
pub async fn create_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:")
        .await
        .expect("Failed to create test database");

    sqlx::migrate!()
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    pool
}

/// Create test router with database pool
pub fn create_test_app(pool: SqlitePool) -> Router {
    use recipe_vault::handlers::recipes;
    use recipe_vault::auth::cloudflare_auth;
    use axum::middleware;

    Router::new()
        .route("/api/recipes", axum::routing::post(recipes::create_recipe))
        .route("/api/recipes", axum::routing::get(recipes::list_recipes))
        .route(
            "/api/recipes/:id",
            axum::routing::get(recipes::get_recipe),
        )
        .route(
            "/api/recipes/:id",
            axum::routing::put(recipes::update_recipe),
        )
        .route(
            "/api/recipes/:id",
            axum::routing::delete(recipes::delete_recipe),
        )
        .with_state(pool)
        .layer(middleware::from_fn_with_state(
            Some("test@example.com".to_string()),
            cloudflare_auth,
        ))
}

/// Helper to send JSON request and get response
pub async fn send_request(
    app: &Router,
    method: &str,
    uri: &str,
    body: Option<Value>,
) -> (StatusCode, Option<Value>) {
    let request = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json");

    let request = if let Some(json) = body {
        request.body(Body::from(json.to_string())).unwrap()
    } else {
        request.body(Body::empty()).unwrap()
    };

    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();

    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();

    let json_response = if !body_bytes.is_empty() {
        serde_json::from_slice(&body_bytes).ok()
    } else {
        None
    };

    (status, json_response)
}
