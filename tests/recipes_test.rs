mod common;

use axum::http::StatusCode;
use rstest::*;
use serde_json::json;
use sqlx::SqlitePool;

use common::{create_test_app, create_test_db, send_request};

#[fixture]
async fn test_db() -> SqlitePool {
    create_test_db().await
}

// ==== Scenario: Complete recipe creation ====
#[rstest]
#[tokio::test]
async fn test_create_recipe_with_all_fields(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let recipe_json = json!({
        "title": "Chocolate Chip Cookies",
        "description": "Classic chewy cookies",
        "prep_time_minutes": 15,
        "cook_time_minutes": 12,
        "servings": 24,
        "ingredients": [
            {
                "name": "flour",
                "quantity": 2.5,
                "unit": "cups",
                "notes": "all-purpose"
            },
            {
                "name": "chocolate chips",
                "quantity": 2.0,
                "unit": "cups",
                "notes": null
            }
        ],
        "steps": [
            {
                "instruction": "Preheat oven to 180°C",
                "temperature_value": 180,
                "temperature_unit": "Celsius"
            },
            {
                "instruction": "Mix ingredients and bake for 12 minutes",
                "duration_minutes": 12
            }
        ]
    });

    let (status, response) = send_request(&app, "POST", "/api/recipes", Some(recipe_json)).await;

    assert_eq!(status, StatusCode::CREATED);
    let recipe = response.expect("Expected recipe response");
    assert_eq!(recipe["title"], "Chocolate Chip Cookies");
    assert_eq!(recipe["description"], "Classic chewy cookies");
    assert_eq!(recipe["prep_time_minutes"], 15);
    assert_eq!(recipe["cook_time_minutes"], 12);
    assert_eq!(recipe["servings"], 24);
    assert!(recipe["id"].is_string());
    assert_eq!(recipe["ingredients"].as_array().unwrap().len(), 2);
    assert_eq!(recipe["steps"].as_array().unwrap().len(), 2);
}

// ==== Scenario: Minimal recipe creation ====
#[rstest]
#[tokio::test]
async fn test_create_recipe_minimal(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let recipe_json = json!({
        "title": "Quick Pasta"
    });

    let (status, response) = send_request(&app, "POST", "/api/recipes", Some(recipe_json)).await;

    assert_eq!(status, StatusCode::CREATED);
    let recipe = response.expect("Expected recipe response");
    assert_eq!(recipe["title"], "Quick Pasta");
    assert!(recipe["description"].is_null());
    assert!(recipe["prep_time_minutes"].is_null());
    assert!(recipe["cook_time_minutes"].is_null());
    assert!(recipe["servings"].is_null());
}

// ==== Scenario: List all recipes (ordered by title) ====
#[rstest]
#[tokio::test]
async fn test_list_recipes_ordered_by_title(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    // Create multiple recipes
    send_request(&app, "POST", "/api/recipes", Some(json!({"title": "Zebra Cake"})))
        .await;
    send_request(&app, "POST", "/api/recipes", Some(json!({"title": "Apple Pie"})))
        .await;
    send_request(&app, "POST", "/api/recipes", Some(json!({"title": "Banana Bread"})))
        .await;

    let (status, response) = send_request(&app, "GET", "/api/recipes", None).await;

    assert_eq!(status, StatusCode::OK);
    let recipes = response.expect("Expected recipes list").as_array().unwrap().clone();
    assert_eq!(recipes.len(), 3);
    assert_eq!(recipes[0]["title"], "Apple Pie");
    assert_eq!(recipes[1]["title"], "Banana Bread");
    assert_eq!(recipes[2]["title"], "Zebra Cake");
}

// ==== Scenario: Get recipe details ====
#[rstest]
#[tokio::test]
async fn test_get_recipe_with_ingredients_and_steps(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    // Create recipe
    let (_, create_response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({
            "title": "Test Recipe",
            "ingredients": [
                {"name": "ingredient 1", "position": 0},
                {"name": "ingredient 2", "position": 1}
            ],
            "steps": [
                {"instruction": "step 1", "position": 0},
                {"instruction": "step 2", "position": 1}
            ]
        })),
    )
    .await;

    let created_recipe = create_response.unwrap();
    let recipe_id = created_recipe["id"].as_str().unwrap();

    // Get recipe
    let (status, response) = send_request(&app, "GET", &format!("/api/recipes/{}", recipe_id), None).await;

    assert_eq!(status, StatusCode::OK);
    let recipe = response.expect("Expected recipe");
    assert_eq!(recipe["title"], "Test Recipe");

    let ingredients = recipe["ingredients"].as_array().unwrap();
    assert_eq!(ingredients.len(), 2);
    assert_eq!(ingredients[0]["name"], "ingredient 1");
    assert_eq!(ingredients[0]["position"], 0);
    assert_eq!(ingredients[1]["name"], "ingredient 2");
    assert_eq!(ingredients[1]["position"], 1);

    let steps = recipe["steps"].as_array().unwrap();
    assert_eq!(steps.len(), 2);
    assert_eq!(steps[0]["instruction"], "step 1");
    assert_eq!(steps[0]["position"], 0);
    assert_eq!(steps[1]["instruction"], "step 2");
    assert_eq!(steps[1]["position"], 1);
}

// ==== Scenario: Recipe not found ====
#[rstest]
#[tokio::test]
async fn test_get_nonexistent_recipe_returns_404(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let (status, response) = send_request(&app, "GET", "/api/recipes/invalid-uuid", None).await;

    assert_eq!(status, StatusCode::NOT_FOUND);
    let error = response.expect("Expected error response");
    assert_eq!(error["code"], "NOT_FOUND");
}

// ==== Scenario: Update recipe metadata (preserves ingredients) ====
#[rstest]
#[tokio::test]
async fn test_update_recipe_preserves_ingredients(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    // Create recipe with ingredients
    let (_, create_response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({
            "title": "Original Title",
            "ingredients": [{"name": "original ingredient"}]
        })),
    )
    .await;

    let created_recipe = create_response.unwrap();
    let recipe_id = created_recipe["id"].as_str().unwrap();

    // Update only title
    let (status, response) = send_request(
        &app,
        "PUT",
        &format!("/api/recipes/{}", recipe_id),
        Some(json!({"title": "Updated Title"})),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let recipe = response.expect("Expected recipe");
    assert_eq!(recipe["title"], "Updated Title");
    assert_eq!(recipe["ingredients"].as_array().unwrap().len(), 1);
    assert_eq!(recipe["ingredients"][0]["name"], "original ingredient");
}

// ==== Scenario: Replace ingredients ====
#[rstest]
#[tokio::test]
async fn test_update_recipe_replaces_ingredients(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    // Create recipe
    let (_, create_response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({
            "title": "Test Recipe",
            "ingredients": [{"name": "old ingredient"}]
        })),
    )
    .await;

    let created_recipe = create_response.unwrap();
    let recipe_id = created_recipe["id"].as_str().unwrap();

    // Update with new ingredients
    let (status, response) = send_request(
        &app,
        "PUT",
        &format!("/api/recipes/{}", recipe_id),
        Some(json!({
            "ingredients": [
                {"name": "new ingredient 1"},
                {"name": "new ingredient 2"}
            ]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let recipe = response.expect("Expected recipe");
    let ingredients = recipe["ingredients"].as_array().unwrap();
    assert_eq!(ingredients.len(), 2);
    assert_eq!(ingredients[0]["name"], "new ingredient 1");
    assert_eq!(ingredients[1]["name"], "new ingredient 2");
}

// ==== Scenario: Delete recipe (cascade) ====
#[rstest]
#[tokio::test]
async fn test_delete_recipe_cascades(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    // Create recipe with ingredients and steps
    let (_, create_response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({
            "title": "To Delete",
            "ingredients": [{"name": "ingredient"}],
            "steps": [{"instruction": "step"}]
        })),
    )
    .await;

    let created_recipe = create_response.unwrap();
    let recipe_id = created_recipe["id"].as_str().unwrap();

    // Delete recipe
    let (status, _) = send_request(&app, "DELETE", &format!("/api/recipes/{}", recipe_id), None).await;

    assert_eq!(status, StatusCode::NO_CONTENT);

    // Verify it's gone
    let (status, _) = send_request(&app, "GET", &format!("/api/recipes/{}", recipe_id), None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ==== Scenario: Duplicate recipe title ====
#[rstest]
#[tokio::test]
async fn test_create_duplicate_title_returns_conflict(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    // Create first recipe
    send_request(&app, "POST", "/api/recipes", Some(json!({"title": "Duplicate Recipe"})))
        .await;

    // Try to create with same title
    let (status, response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({"title": "Duplicate Recipe"})),
    )
    .await;

    assert_eq!(status, StatusCode::CONFLICT);
    let error = response.expect("Expected error");
    assert_eq!(error["code"], "CONFLICT");
}

// ==== Scenario: Invalid recipe data ====
#[rstest]
#[tokio::test]
async fn test_create_recipe_empty_title_returns_validation_error(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let (status, response) = send_request(&app, "POST", "/api/recipes", Some(json!({"title": ""})))
        .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    let error = response.expect("Expected error");
    assert_eq!(error["code"], "VALIDATION_ERROR");
    assert!(error["error"].as_str().unwrap().contains("empty"));
}

// ==== Scenario: Ingredient without measurement ====
#[rstest]
#[tokio::test]
async fn test_ingredient_without_measurement(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let (status, response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({
            "title": "Flexible Recipe",
            "ingredients": [
                {
                    "name": "salt",
                    "notes": "to taste"
                }
            ]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    let recipe = response.expect("Expected recipe");
    let ingredient = &recipe["ingredients"][0];
    assert_eq!(ingredient["name"], "salt");
    assert!(ingredient["quantity"].is_null());
    assert!(ingredient["unit"].is_null());
    assert_eq!(ingredient["notes"], "to taste");
}

// ==== Scenario: Step with timing ====
#[rstest]
#[tokio::test]
async fn test_step_with_timing(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let (status, response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({
            "title": "Timed Recipe",
            "steps": [
                {
                    "instruction": "Simmer for 20 minutes",
                    "duration_minutes": 20
                }
            ]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    let recipe = response.expect("Expected recipe");
    let step = &recipe["steps"][0];
    assert_eq!(step["instruction"], "Simmer for 20 minutes");
    assert_eq!(step["duration_minutes"], 20);
}

// ==== Scenario: Step with temperature ====
#[rstest]
#[tokio::test]
async fn test_step_with_temperature(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let (status, response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({
            "title": "Baked Recipe",
            "steps": [
                {
                    "instruction": "Preheat oven to 180°C",
                    "temperature_value": 180,
                    "temperature_unit": "Celsius"
                }
            ]
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    let recipe = response.expect("Expected recipe");
    let step = &recipe["steps"][0];
    assert_eq!(step["instruction"], "Preheat oven to 180°C");
    assert_eq!(step["temperature_value"], 180);
    assert_eq!(step["temperature_unit"], "Celsius");
}

// ==== Scenario: Recipe authorship tracking ====
#[rstest]
#[tokio::test]
async fn test_create_recipe_tracks_author(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    let (status, response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({"title": "Test Recipe with Author"})),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    let recipe = response.expect("Expected recipe");
    assert_eq!(recipe["created_by"], "test@example.com");
    assert_eq!(recipe["updated_by"], "test@example.com");
}

#[rstest]
#[tokio::test]
async fn test_update_recipe_tracks_author(#[future] test_db: SqlitePool) {
    let db = test_db.await;
    let app = create_test_app(db);

    // Create recipe
    let (_, create_response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({"title": "Original"})),
    )
    .await;

    let created_recipe = create_response.unwrap();
    let recipe_id = created_recipe["id"].as_str().unwrap();
    assert_eq!(created_recipe["created_by"], "test@example.com");

    // Update recipe
    let (status, response) = send_request(
        &app,
        "PUT",
        &format!("/api/recipes/{}", recipe_id),
        Some(json!({"title": "Updated"})),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let recipe = response.expect("Expected recipe");
    assert_eq!(recipe["created_by"], "test@example.com");
    assert_eq!(recipe["updated_by"], "test@example.com");
    assert_eq!(recipe["title"], "Updated");
}
