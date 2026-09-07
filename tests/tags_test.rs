mod common;

use axum::http::StatusCode;
use serde_json::{json, Value};
use sqlx::SqlitePool;

use common::{
    create_test_app, create_test_app_with_config, create_test_db, create_two_family_config,
    send_request, send_request_with_headers,
};
use recipe_vault::{db::queries, models::recipe::CreateRecipeInput};

/// Read the `tags` array off a recipe JSON body (fails loudly if it is missing,
/// since the field is always serialised)
fn tags_of(recipe: &Value) -> Vec<String> {
    recipe["tags"]
        .as_array()
        .unwrap_or_else(|| panic!("recipe has no tags array: {}", recipe))
        .iter()
        .map(|t| t.as_str().expect("tag should be a string").to_string())
        .collect()
}

/// Tag names linked to a recipe, straight from the database
async fn linked_tag_names(pool: &SqlitePool, recipe_id: &str) -> Vec<String> {
    sqlx::query_scalar::<_, String>(
        "SELECT t.name FROM recipe_tags rt
         JOIN tags t ON t.id = rt.tag_id
         WHERE rt.recipe_id = ?
         ORDER BY LOWER(t.name)",
    )
    .bind(recipe_id)
    .fetch_all(pool)
    .await
    .expect("Failed to read recipe_tags")
}

/// Number of `recipe_tags` rows for a recipe
async fn link_count(pool: &SqlitePool, recipe_id: &str) -> i64 {
    sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM recipe_tags WHERE recipe_id = ?")
        .bind(recipe_id)
        .fetch_one(pool)
        .await
        .expect("Failed to count recipe_tags")
}

/// Every tag name in the global vocabulary
async fn all_tag_names(pool: &SqlitePool) -> Vec<String> {
    sqlx::query_scalar::<_, String>("SELECT name FROM tags ORDER BY LOWER(name)")
        .fetch_all(pool)
        .await
        .expect("Failed to read tags")
}

/// Create a recipe through the API and return its id.
/// An explicit difficulty keeps the background difficulty assessment from firing.
async fn create_recipe(app: &axum::Router, body: Value) -> Value {
    let (status, response) = send_request(app, "POST", "/api/recipes", Some(body)).await;
    assert_eq!(status, StatusCode::CREATED, "recipe creation failed");
    response.expect("Expected recipe response")
}

// ==== Scenario: Create recipe with tags ====
#[tokio::test]
async fn test_create_with_tags_stores_normalised_and_returns_sorted() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let recipe = create_recipe(
        &app,
        json!({
            "title": "Tiramisu",
            "difficulty": 3,
            "tags": ["Dessert", "italian", "  Gluten Free ", "slow   cooker"]
        }),
    )
    .await;

    // Casing, surrounding whitespace and internal whitespace are all normalised,
    // and the response is sorted alphabetically
    assert_eq!(
        tags_of(&recipe),
        vec!["dessert", "gluten free", "italian", "slow cooker"]
    );

    let recipe_id = recipe["id"].as_str().unwrap();

    // Stored form matches what was returned
    assert_eq!(
        linked_tag_names(&pool, recipe_id).await,
        vec!["dessert", "gluten free", "italian", "slow cooker"]
    );

    // GET returns the same sorted list
    let (status, fetched) =
        send_request(&app, "GET", &format!("/api/recipes/{}", recipe_id), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        tags_of(&fetched.unwrap()),
        vec!["dessert", "gluten free", "italian", "slow cooker"]
    );
}

// ==== Scenario: Create recipe without tags (AI assessment) ====
#[tokio::test(flavor = "multi_thread")]
async fn test_create_without_tags_gets_ai_tags_assigned() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let recipe = create_recipe(
        &app,
        json!({
            "title": "Chicken Curry",
            "description": "A weeknight curry",
            "difficulty": 3,
            "ingredients": [{"name": "chicken", "quantity": 500.0, "unit": "g"}],
            "steps": [{"instruction": "Fry the spices"}]
        }),
    )
    .await;

    // The create response returns before the background task has run
    assert_eq!(
        tags_of(&recipe),
        Vec::<String>::new(),
        "create responds with an empty tags array"
    );

    let recipe_id = recipe["id"].as_str().unwrap().to_string();

    // The background assessment uses the mock LLM, which returns ["main","curry"]
    let mut tags = Vec::new();
    for _ in 0..40 {
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        let (status, fetched) =
            send_request(&app, "GET", &format!("/api/recipes/{}", recipe_id), None).await;
        assert_eq!(status, StatusCode::OK);
        tags = tags_of(&fetched.unwrap());
        if !tags.is_empty() {
            break;
        }
    }

    assert_eq!(tags, vec!["curry", "main"], "mock tags stored and sorted");
    assert_eq!(linked_tag_names(&pool, &recipe_id).await, vec!["curry", "main"]);
}

// ==== Scenario: Create recipe with tags skips assessment ====
#[tokio::test(flavor = "multi_thread")]
async fn test_create_with_tags_skips_ai_assessment() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let recipe = create_recipe(
        &app,
        json!({"title": "Lemon Tart", "difficulty": 3, "tags": ["side"]}),
    )
    .await;
    let recipe_id = recipe["id"].as_str().unwrap().to_string();

    // Well past the 50 ms settle delay the mock assessment would have used
    tokio::time::sleep(std::time::Duration::from_millis(400)).await;

    let (_, fetched) =
        send_request(&app, "GET", &format!("/api/recipes/{}", recipe_id), None).await;
    assert_eq!(
        tags_of(&fetched.unwrap()),
        vec!["side"],
        "user-supplied tags are not replaced by the mock's [\"main\",\"curry\"]"
    );
    assert_eq!(linked_tag_names(&pool, &recipe_id).await, vec!["side"]);
}

// ==== Scenario: List recipes includes tags ====
#[tokio::test]
async fn test_list_includes_tags_for_every_recipe() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    create_recipe(
        &app,
        json!({"title": "Apple Pie", "difficulty": 2, "tags": ["dessert", "british"]}),
    )
    .await;

    // Seeded through the queries layer so no background auto-tagging can race us
    let untagged = queries::create_recipe(
        &pool,
        CreateRecipeInput {
            title: "Zebra Cake".to_string(),
            description: None,
            prep_time_minutes: None,
            cook_time_minutes: None,
            servings: None,
            difficulty: Some(2),
            ingredients: vec![],
            steps: vec![],
            tags: vec![],
        },
        Some("test@example.com".to_string()),
    )
    .await
    .expect("Failed to seed untagged recipe");

    let (status, response) = send_request(&app, "GET", "/api/recipes", None).await;
    assert_eq!(status, StatusCode::OK);

    let recipes = response.unwrap().as_array().unwrap().clone();
    assert_eq!(recipes.len(), 2);
    for recipe in &recipes {
        assert!(
            recipe.get("tags").is_some(),
            "tags must never be omitted: {}",
            recipe
        );
        assert!(recipe["tags"].is_array(), "tags must always be an array");
    }

    assert_eq!(recipes[0]["title"], "Apple Pie");
    assert_eq!(tags_of(&recipes[0]), vec!["british", "dessert"]);

    assert_eq!(recipes[1]["title"], "Zebra Cake");
    assert_eq!(
        tags_of(&recipes[1]),
        Vec::<String>::new(),
        "an untagged recipe carries an empty array, not a missing field"
    );
    assert_eq!(link_count(&pool, &untagged.recipe.id).await, 0);
}

// ==== Scenario: Update replaces tags ====
#[tokio::test]
async fn test_update_with_tags_replaces_the_set() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let recipe = create_recipe(
        &app,
        json!({
            "title": "Massaman",
            "difficulty": 3,
            "tags": ["dessert"],
            "ingredients": [{"name": "potato", "quantity": 2.0}],
            "steps": [{"instruction": "Simmer"}]
        }),
    )
    .await;
    let recipe_id = recipe["id"].as_str().unwrap().to_string();

    let (status, response) = send_request(
        &app,
        "PUT",
        &format!("/api/recipes/{}", recipe_id),
        Some(json!({"tags": ["main", "thai"]})),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let updated = response.unwrap();
    assert_eq!(tags_of(&updated), vec!["main", "thai"]);

    // The old link is gone, the new ones are there
    assert_eq!(linked_tag_names(&pool, &recipe_id).await, vec!["main", "thai"]);

    // Other recipe data is untouched
    assert_eq!(updated["title"], "Massaman");
    assert_eq!(updated["ingredients"].as_array().unwrap().len(), 1);
    assert_eq!(updated["steps"].as_array().unwrap().len(), 1);

    // The `dessert` tag row survives even though nothing links to it now
    assert!(all_tag_names(&pool).await.contains(&"dessert".to_string()));
}

// ==== Scenario: Update without tags leaves them unchanged ====
#[tokio::test]
async fn test_update_without_tags_leaves_them_unchanged() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let recipe = create_recipe(
        &app,
        json!({"title": "Original", "difficulty": 3, "tags": ["dessert", "italian"]}),
    )
    .await;
    let recipe_id = recipe["id"].as_str().unwrap().to_string();

    let (status, response) = send_request(
        &app,
        "PUT",
        &format!("/api/recipes/{}", recipe_id),
        Some(json!({"title": "Renamed"})),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let updated = response.unwrap();
    assert_eq!(updated["title"], "Renamed");
    assert_eq!(tags_of(&updated), vec!["dessert", "italian"]);
    assert_eq!(
        linked_tag_names(&pool, &recipe_id).await,
        vec!["dessert", "italian"]
    );
}

// ==== Scenario: Update with an empty array clears tags ====
#[tokio::test]
async fn test_update_with_empty_array_clears_tags() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let recipe = create_recipe(
        &app,
        json!({"title": "Cleared", "difficulty": 3, "tags": ["dessert", "italian"]}),
    )
    .await;
    let recipe_id = recipe["id"].as_str().unwrap().to_string();
    assert_eq!(link_count(&pool, &recipe_id).await, 2);

    let (status, response) = send_request(
        &app,
        "PUT",
        &format!("/api/recipes/{}", recipe_id),
        Some(json!({"tags": []})),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(tags_of(&response.unwrap()), Vec::<String>::new());
    assert_eq!(link_count(&pool, &recipe_id).await, 0);

    // Clearing the links leaves the vocabulary intact
    assert_eq!(all_tag_names(&pool).await, vec!["dessert", "italian"]);
}

// ==== Scenario: Replacing tags refreshes updated_by ====
#[tokio::test]
async fn test_update_tags_bumps_updated_by() {
    let pool = create_test_db().await;
    let app = create_test_app_with_config(pool.clone(), None, create_two_family_config());

    let (status, response) = send_request_with_headers(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({"title": "Shared Recipe", "difficulty": 3, "tags": ["dessert"]})),
        &[
            ("X-API-Key", "test-api-key"),
            ("X-User-Email", "alice@example.com"),
        ],
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    let created = response.unwrap();
    assert_eq!(created["updated_by"], "alice@example.com");
    let recipe_id = created["id"].as_str().unwrap().to_string();

    // SQLite timestamps are second-granular, so age the row deliberately: a
    // tags-only update has to move it forward from this literal.
    const STALE_UPDATED_AT: &str = "2000-01-01 00:00:00";
    sqlx::query("UPDATE recipes SET updated_at = ? WHERE id = ?")
        .bind(STALE_UPDATED_AT)
        .bind(&recipe_id)
        .execute(&pool)
        .await
        .expect("Failed to age updated_at");

    // A second member of the same family replaces the tags
    let (status, response) = send_request_with_headers(
        &app,
        "PUT",
        &format!("/api/recipes/{}", recipe_id),
        Some(json!({"tags": ["main"]})),
        &[
            ("X-API-Key", "test-api-key"),
            ("X-User-Email", "alice2@example.com"),
        ],
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let updated = response.unwrap();
    assert_eq!(tags_of(&updated), vec!["main"]);
    assert_eq!(updated["created_by"], "alice@example.com");
    assert_eq!(
        updated["updated_by"], "alice2@example.com",
        "a tags-only update still refreshes updated_by"
    );
    assert!(
        updated["updated_at"].as_str().unwrap() > STALE_UPDATED_AT,
        "a tags-only update refreshes updated_at, got {}",
        updated["updated_at"]
    );
}

// ==== Scenario: Duplicates are collapsed ====
#[tokio::test]
async fn test_duplicate_tags_collapse_to_one() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let recipe = create_recipe(
        &app,
        json!({"title": "Deduped", "difficulty": 3, "tags": ["Main", " main ", "MAIN"]}),
    )
    .await;
    let recipe_id = recipe["id"].as_str().unwrap();

    assert_eq!(tags_of(&recipe), vec!["main"]);
    assert_eq!(link_count(&pool, recipe_id).await, 1);
    assert_eq!(all_tag_names(&pool).await, vec!["main"]);
}

// ==== Scenario: Tag rows are shared by name, across families ====
#[tokio::test]
async fn test_same_tag_name_is_a_single_row_shared_by_recipes() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let first = create_recipe(
        &app,
        json!({"title": "Beef Stew", "difficulty": 3, "tags": ["main"]}),
    )
    .await;
    // Different casing must not create a second row
    let second = create_recipe(
        &app,
        json!({"title": "Fish Pie", "difficulty": 3, "tags": ["Main"]}),
    )
    .await;

    assert_eq!(tags_of(&first), vec!["main"]);
    assert_eq!(tags_of(&second), vec!["main"]);

    let tag_rows = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM tags")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(tag_rows, 1, "one tags row shared by both recipes");
    assert_eq!(all_tag_names(&pool).await, vec!["main"]);

    let links = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM recipe_tags")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(links, 2, "both recipes link to it");
}

// ==== Scenario: Invalid characters are rejected ====
#[tokio::test]
async fn test_create_with_invalid_tag_character_returns_400_and_creates_nothing() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let (status, response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({"title": "Rejected", "difficulty": 3, "tags": ["main", "dessert/pudding"]})),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    let error = response.expect("Expected error body");
    assert_eq!(error["code"], "VALIDATION_ERROR");
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("dessert/pudding"),
        "the validation message names the offending tag: {}",
        error["error"]
    );

    // Nothing was written: no recipe, no tag rows
    let (status, list) = send_request(&app, "GET", "/api/recipes", None).await;
    assert_eq!(status, StatusCode::OK);
    assert!(list.unwrap().as_array().unwrap().is_empty());
    assert!(all_tag_names(&pool).await.is_empty());
}

// ==== Scenario: At most ten tags per recipe ====
#[tokio::test]
async fn test_create_with_more_than_ten_tags_returns_400_and_creates_nothing() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let tags: Vec<String> = (0..11).map(|i| format!("tag-{}", i)).collect();
    let (status, response) = send_request(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({"title": "Too Many", "difficulty": 3, "tags": tags})),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    let error = response.expect("Expected error body");
    assert_eq!(error["code"], "VALIDATION_ERROR");
    assert!(
        error["error"].as_str().unwrap().contains("maximum is 10"),
        "the validation message states the maximum: {}",
        error["error"]
    );

    let (_, list) = send_request(&app, "GET", "/api/recipes", None).await;
    assert!(list.unwrap().as_array().unwrap().is_empty());
    assert!(all_tag_names(&pool).await.is_empty());
}

// ==== Scenario: Invalid tags on update change nothing ====
#[tokio::test]
async fn test_update_with_invalid_tag_returns_400_and_changes_nothing() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let recipe = create_recipe(
        &app,
        json!({"title": "Untouched", "difficulty": 3, "tags": ["dessert"]}),
    )
    .await;
    let recipe_id = recipe["id"].as_str().unwrap().to_string();

    // The title change must not land either
    let (status, response) = send_request(
        &app,
        "PUT",
        &format!("/api/recipes/{}", recipe_id),
        Some(json!({"title": "Should Not Stick", "tags": ["main!"]})),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    let error = response.expect("Expected error body");
    assert_eq!(error["code"], "VALIDATION_ERROR");
    assert!(error["error"].as_str().unwrap().contains("main!"));

    let (_, fetched) =
        send_request(&app, "GET", &format!("/api/recipes/{}", recipe_id), None).await;
    let fetched = fetched.unwrap();
    assert_eq!(fetched["title"], "Untouched");
    assert_eq!(tags_of(&fetched), vec!["dessert"]);
    assert_eq!(linked_tag_names(&pool, &recipe_id).await, vec!["dessert"]);
    assert_eq!(all_tag_names(&pool).await, vec!["dessert"]);
}

#[tokio::test]
async fn test_update_with_more_than_ten_tags_returns_400_and_changes_nothing() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let recipe = create_recipe(
        &app,
        json!({"title": "Still Dessert", "difficulty": 3, "tags": ["dessert"]}),
    )
    .await;
    let recipe_id = recipe["id"].as_str().unwrap().to_string();

    let tags: Vec<String> = (0..11).map(|i| format!("tag-{}", i)).collect();
    let (status, response) = send_request(
        &app,
        "PUT",
        &format!("/api/recipes/{}", recipe_id),
        Some(json!({"tags": tags})),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(response.unwrap()["error"]
        .as_str()
        .unwrap()
        .contains("maximum is 10"));

    assert_eq!(linked_tag_names(&pool, &recipe_id).await, vec!["dessert"]);
    assert_eq!(all_tag_names(&pool).await, vec!["dessert"]);
}

// ==== Scenario: Deleting a recipe removes its tag links ====
#[tokio::test]
async fn test_delete_recipe_removes_tag_links_but_keeps_tag_rows() {
    let pool = create_test_db().await;
    let app = create_test_app(pool.clone());

    let doomed = create_recipe(
        &app,
        json!({"title": "Doomed", "difficulty": 3, "tags": ["main", "curry"]}),
    )
    .await;
    let doomed_id = doomed["id"].as_str().unwrap().to_string();

    // A second recipe keeps `main` in use
    let survivor = create_recipe(
        &app,
        json!({"title": "Survivor", "difficulty": 3, "tags": ["main"]}),
    )
    .await;
    let survivor_id = survivor["id"].as_str().unwrap().to_string();

    assert_eq!(link_count(&pool, &doomed_id).await, 2);

    let (status, _) = send_request(
        &app,
        "DELETE",
        &format!("/api/recipes/{}", doomed_id),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    // Links are cascaded away
    assert_eq!(link_count(&pool, &doomed_id).await, 0);

    // The vocabulary survives, including the now-unused `curry`
    assert_eq!(all_tag_names(&pool).await, vec!["curry", "main"]);

    // The other recipe is unaffected
    assert_eq!(linked_tag_names(&pool, &survivor_id).await, vec!["main"]);
}

// ==== Scenario: Tags are not family-scoped, recipes still are ====
#[tokio::test]
async fn test_families_share_tag_rows_but_not_recipes() {
    let pool = create_test_db().await;
    let app = create_test_app_with_config(pool.clone(), None, create_two_family_config());

    let alice_headers = [
        ("X-API-Key", "test-api-key"),
        ("X-User-Email", "alice@example.com"),
    ];
    let bob_headers = [
        ("X-API-Key", "test-api-key"),
        ("X-User-Email", "bob@example.com"),
    ];

    let (status, response) = send_request_with_headers(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({"title": "Alice Salad", "difficulty": 2, "tags": ["vegetarian", "main"]})),
        &alice_headers,
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    let alice_recipe_id = response.unwrap()["id"].as_str().unwrap().to_string();

    let (status, response) = send_request_with_headers(
        &app,
        "POST",
        "/api/recipes",
        Some(json!({"title": "Bob Soup", "difficulty": 2, "tags": ["Vegetarian"]})),
        &bob_headers,
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    let bob_recipe_id = response.unwrap()["id"].as_str().unwrap().to_string();

    // One global `vegetarian` row is shared by both families
    let vegetarian_rows =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM tags WHERE LOWER(name) = 'vegetarian'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(vegetarian_rows, 1);
    assert_eq!(
        linked_tag_names(&pool, &alice_recipe_id).await,
        vec!["main", "vegetarian"]
    );
    assert_eq!(
        linked_tag_names(&pool, &bob_recipe_id).await,
        vec!["vegetarian"]
    );

    // Alice only sees her own recipe, with her own tags
    let (status, list) =
        send_request_with_headers(&app, "GET", "/api/recipes", None, &alice_headers).await;
    assert_eq!(status, StatusCode::OK);
    let recipes = list.unwrap().as_array().unwrap().clone();
    assert_eq!(recipes.len(), 1);
    assert_eq!(recipes[0]["title"], "Alice Salad");
    assert_eq!(tags_of(&recipes[0]), vec!["main", "vegetarian"]);

    // Bob's recipe (and therefore its tags) is invisible to Alice
    let (status, _) = send_request_with_headers(
        &app,
        "GET",
        &format!("/api/recipes/{}", bob_recipe_id),
        None,
        &alice_headers,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    // Bob sees his own, sharing the same tag name
    let (status, list) =
        send_request_with_headers(&app, "GET", "/api/recipes", None, &bob_headers).await;
    assert_eq!(status, StatusCode::OK);
    let recipes = list.unwrap().as_array().unwrap().clone();
    assert_eq!(recipes.len(), 1);
    assert_eq!(recipes[0]["title"], "Bob Soup");
    assert_eq!(tags_of(&recipes[0]), vec!["vegetarian"]);
}
