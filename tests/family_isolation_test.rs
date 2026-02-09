mod common;

use axum::http::StatusCode;
use serde_json::json;
use sqlx::SqlitePool;

use common::{
    create_test_app_with_config, create_test_db, create_two_family_config,
    send_request_with_headers,
};

/// Helper: create an app configured for Family A user (alice@example.com via Cloudflare header)
fn create_family_a_app(pool: SqlitePool) -> axum::Router {
    // No dev_email — we'll use Cloudflare header or API key + X-User-Email
    create_test_app_with_config(pool, None, create_two_family_config())
}

/// Helper: seed a recipe for a specific family member using API key + X-User-Email
async fn seed_recipe(
    app: &axum::Router,
    title: &str,
    creator_email: &str,
) -> String {
    let (status, response) = send_request_with_headers(
        app,
        "POST",
        "/api/recipes",
        Some(json!({"title": title})),
        &[
            ("X-API-Key", "test-api-key"),
            ("X-User-Email", creator_email),
        ],
    )
    .await;

    assert_eq!(status, StatusCode::CREATED, "Failed to create recipe '{}'", title);
    let recipe = response.unwrap();
    recipe["id"].as_str().unwrap().to_string()
}

/// Helper: make a request as a specific family user (via API key + X-User-Email)
async fn request_as_user(
    app: &axum::Router,
    method: &str,
    uri: &str,
    body: Option<serde_json::Value>,
    email: &str,
) -> (StatusCode, Option<serde_json::Value>) {
    send_request_with_headers(
        app,
        method,
        uri,
        body,
        &[
            ("X-API-Key", "test-api-key"),
            ("X-User-Email", email),
        ],
    )
    .await
}

/// Helper: make a request in god mode (API key without X-User-Email)
async fn request_as_god(
    app: &axum::Router,
    method: &str,
    uri: &str,
    body: Option<serde_json::Value>,
) -> (StatusCode, Option<serde_json::Value>) {
    send_request_with_headers(
        app,
        method,
        uri,
        body,
        &[("X-API-Key", "test-api-key")],
    )
    .await
}

// ==== 8.3: Family A user lists recipes (sees only Family A recipes) ====
#[tokio::test]
async fn test_family_a_lists_only_family_a_recipes() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    // Seed recipes for both families
    seed_recipe(&app, "Alice's Cookies", "alice@example.com").await;
    seed_recipe(&app, "Bob's Pasta", "bob@example.com").await;

    // Family A lists recipes
    let (status, response) = request_as_user(&app, "GET", "/api/recipes", None, "alice@example.com").await;

    assert_eq!(status, StatusCode::OK);
    let recipes = response.unwrap();
    let list = recipes.as_array().unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["title"], "Alice's Cookies");
}

// ==== 8.4: Family A user gets Family A recipe (success) ====
#[tokio::test]
async fn test_family_a_gets_own_recipe() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    let recipe_id = seed_recipe(&app, "Alice's Cake", "alice@example.com").await;

    let (status, response) = request_as_user(
        &app, "GET", &format!("/api/recipes/{}", recipe_id), None, "alice@example.com",
    ).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(response.unwrap()["title"], "Alice's Cake");
}

// ==== 8.5: Family A user gets Family B recipe (404) ====
#[tokio::test]
async fn test_family_a_cannot_get_family_b_recipe() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    let bob_recipe_id = seed_recipe(&app, "Bob's Secret", "bob@example.com").await;

    let (status, _) = request_as_user(
        &app, "GET", &format!("/api/recipes/{}", bob_recipe_id), None, "alice@example.com",
    ).await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ==== 8.6: Family A user updates Family A recipe (success) ====
#[tokio::test]
async fn test_family_a_updates_own_recipe() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    let recipe_id = seed_recipe(&app, "Alice's Original", "alice@example.com").await;

    let (status, response) = request_as_user(
        &app,
        "PUT",
        &format!("/api/recipes/{}", recipe_id),
        Some(json!({"title": "Alice's Updated"})),
        "alice2@example.com", // Another Family A member
    ).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(response.unwrap()["title"], "Alice's Updated");
}

// ==== 8.7: Family A user updates Family B recipe (404) ====
#[tokio::test]
async fn test_family_a_cannot_update_family_b_recipe() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    let bob_recipe_id = seed_recipe(&app, "Bob's Recipe", "bob@example.com").await;

    let (status, _) = request_as_user(
        &app,
        "PUT",
        &format!("/api/recipes/{}", bob_recipe_id),
        Some(json!({"title": "Hacked!"})),
        "alice@example.com",
    ).await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ==== 8.8: Family A user deletes Family A recipe (success) ====
#[tokio::test]
async fn test_family_a_deletes_own_recipe() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    let recipe_id = seed_recipe(&app, "Alice's Temp", "alice@example.com").await;

    let (status, _) = request_as_user(
        &app, "DELETE", &format!("/api/recipes/{}", recipe_id), None, "alice@example.com",
    ).await;

    assert_eq!(status, StatusCode::NO_CONTENT);

    // Verify deleted
    let (status, _) = request_as_user(
        &app, "GET", &format!("/api/recipes/{}", recipe_id), None, "alice@example.com",
    ).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ==== 8.9: Family A user deletes Family B recipe (404) ====
#[tokio::test]
async fn test_family_a_cannot_delete_family_b_recipe() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    let bob_recipe_id = seed_recipe(&app, "Bob's Keep", "bob@example.com").await;

    let (status, _) = request_as_user(
        &app, "DELETE", &format!("/api/recipes/{}", bob_recipe_id), None, "alice@example.com",
    ).await;

    assert_eq!(status, StatusCode::NOT_FOUND);

    // Verify still exists for Bob
    let (status, _) = request_as_user(
        &app, "GET", &format!("/api/recipes/{}", bob_recipe_id), None, "bob@example.com",
    ).await;
    assert_eq!(status, StatusCode::OK);
}

// ==== 8.10: God mode lists all recipes from all families ====
#[tokio::test]
async fn test_god_mode_lists_all_recipes() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    seed_recipe(&app, "Alice's Recipe", "alice@example.com").await;
    seed_recipe(&app, "Bob's Recipe", "bob@example.com").await;

    let (status, response) = request_as_god(&app, "GET", "/api/recipes", None).await;

    assert_eq!(status, StatusCode::OK);
    let recipes = response.unwrap();
    let list = recipes.as_array().unwrap();
    assert_eq!(list.len(), 2);
}

// ==== 8.11: God mode gets any recipe by ID ====
#[tokio::test]
async fn test_god_mode_gets_any_recipe() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    let bob_recipe_id = seed_recipe(&app, "Bob's Private", "bob@example.com").await;

    let (status, response) = request_as_god(
        &app, "GET", &format!("/api/recipes/{}", bob_recipe_id), None,
    ).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(response.unwrap()["title"], "Bob's Private");
}

// ==== 8.12: God mode creates recipe with DEV_USER_EMAIL as created_by ====
#[tokio::test]
async fn test_god_mode_creates_recipe_with_dev_email() {
    let pool = create_test_db().await;
    // Set dev email for god mode authorship
    let app = create_test_app_with_config(
        pool,
        Some("dev@example.com".to_string()),
        create_two_family_config(),
    );

    let (status, response) = request_as_god(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({"title": "God Mode Recipe"})),
    ).await;

    assert_eq!(status, StatusCode::CREATED);
    let recipe = response.unwrap();
    assert_eq!(recipe["created_by"], "dev@example.com");
}

// ==== 8.13: Scoped mode (API key + X-User-Email) sees only that family ====
#[tokio::test]
async fn test_scoped_mode_sees_only_family() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    seed_recipe(&app, "Alice's Scoped", "alice@example.com").await;
    seed_recipe(&app, "Bob's Scoped", "bob@example.com").await;

    // Scoped to Bob's family
    let (status, response) = request_as_user(&app, "GET", "/api/recipes", None, "bob@example.com").await;

    assert_eq!(status, StatusCode::OK);
    let recipes = response.unwrap();
    let list = recipes.as_array().unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["title"], "Bob's Scoped");
}

// ==== 8.14: User not in config receives 403 error ====
#[tokio::test]
async fn test_user_not_in_config_gets_403() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    let (status, response) = request_as_user(
        &app, "GET", "/api/recipes", None, "stranger@example.com",
    ).await;

    assert_eq!(status, StatusCode::FORBIDDEN);
    let error = response.unwrap();
    assert!(error["error"].as_str().unwrap().contains("not configured"));
}

// ==== 8.15: Case-insensitive email matching in queries ====
#[tokio::test]
async fn test_case_insensitive_email_matching() {
    let pool = create_test_db().await;
    let app = create_family_a_app(pool);

    // Create recipe as lowercase alice
    let recipe_id = seed_recipe(&app, "Alice's Case Test", "alice@example.com").await;

    // Access as UPPERCASE Alice (should still work, config normalizes)
    let (status, response) = request_as_user(
        &app, "GET", &format!("/api/recipes/{}", recipe_id), None, "ALICE@EXAMPLE.COM",
    ).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(response.unwrap()["title"], "Alice's Case Test");
}
