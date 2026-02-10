use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use serde_json::Value;
use sqlx::SqlitePool;
use std::io::Write;
use std::sync::Arc;
use tower::ServiceExt;

/// Create an in-memory test database with migrations
#[allow(dead_code)]
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

/// Create a test families config YAML and return the FamiliesConfig
#[allow(dead_code)]
pub fn create_test_families_config() -> recipe_vault::config::FamiliesConfig {
    let yaml = r#"
families:
  test-family:
    members:
      - test@example.com
"#;
    let mut file = tempfile::NamedTempFile::new().unwrap();
    file.write_all(yaml.as_bytes()).unwrap();
    recipe_vault::config::FamiliesConfig::load(file.path()).unwrap()
}

/// Create a test families config with 2 families for isolation testing
#[allow(dead_code)]
pub fn create_two_family_config() -> recipe_vault::config::FamiliesConfig {
    let yaml = r#"
families:
  family-a:
    members:
      - alice@example.com
      - alice2@example.com
  family-b:
    members:
      - bob@example.com
      - bob2@example.com
"#;
    let mut file = tempfile::NamedTempFile::new().unwrap();
    file.write_all(yaml.as_bytes()).unwrap();
    recipe_vault::config::FamiliesConfig::load(file.path()).unwrap()
}

/// Create test router with database pool (single-family, backward compatible)
#[allow(dead_code)]
pub fn create_test_app(pool: SqlitePool) -> Router {
    create_test_app_with_email(pool, "test@example.com")
}

/// Create test router with a specific dev user email and auto-generated families config
#[allow(dead_code)]
pub fn create_test_app_with_email(pool: SqlitePool, email: &str) -> Router {
    let families_config = create_test_families_config();
    create_test_app_with_config(pool, Some(email.to_string()), families_config)
}

/// Create test router with custom families config (for multi-family tests)
#[allow(dead_code)]
pub fn create_test_app_with_config(
    pool: SqlitePool,
    dev_email: Option<String>,
    families_config: recipe_vault::config::FamiliesConfig,
) -> Router {
    use recipe_vault::auth::{api_key_auth, cloudflare_auth, ApiKeyState, CloudflareAuthState};
    use recipe_vault::handlers::recipes;
    use recipe_vault::config::Config;
    use axum::middleware;

    let families_config = Arc::new(families_config.clone());

    let api_key_state = ApiKeyState {
        key: Arc::new("test-api-key".to_string()),
        families_config: families_config.clone(),
        dev_user_email: dev_email.clone(),
    };

    let cloudflare_auth_state = CloudflareAuthState {
        dev_user_email: dev_email,
        families_config: families_config.clone(),
    };

    // Create RecipeState with Config for handlers
    let config = Config {
        database_url: ":memory:".to_string(),
        bind_address: "127.0.0.1:3000".to_string(),
        anthropic_api_key: "test-key".to_string(),
        ai_model: "test-model".to_string(),
        mock_llm: true,
        mock_recipe_id: None,
        families_config: (*families_config).clone(),
        dev_user_email: None,
    };

    let recipe_state = recipes::RecipeState {
        pool: pool.clone(),
        config: Arc::new(config),
    };

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
        .with_state(recipe_state)
        .route_layer(middleware::from_fn_with_state(
            api_key_state,
            api_key_auth,
        ))
        .layer(middleware::from_fn_with_state(
            cloudflare_auth_state,
            cloudflare_auth,
        ))
}

/// Helper to send JSON request and get response
#[allow(dead_code)]
pub async fn send_request(
    app: &Router,
    method: &str,
    uri: &str,
    body: Option<Value>,
) -> (StatusCode, Option<Value>) {
    send_request_with_headers(app, method, uri, body, &[]).await
}

/// Helper to send JSON request with custom headers
#[allow(dead_code)]
pub async fn send_request_with_headers(
    app: &Router,
    method: &str,
    uri: &str,
    body: Option<Value>,
    headers: &[(&str, &str)],
) -> (StatusCode, Option<Value>) {
    let mut request = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json");

    for (key, value) in headers {
        request = request.header(*key, *value);
    }

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
