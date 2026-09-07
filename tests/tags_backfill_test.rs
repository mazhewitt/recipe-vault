use recipe_vault::{
    backfill::{check_backfill_status, run_tags_backfill, BackfillStatus},
    db::queries,
    models::recipe::{CreateIngredientInput, CreateRecipeInput, CreateStepInput},
};
use sqlx::SqlitePool;

mod common;

/// Insert a recipe directly through the queries layer (no handler, so no
/// create-time auto-tagging) and return its id
async fn seed_recipe(pool: &SqlitePool, title: &str, tags: Vec<String>) -> String {
    let input = CreateRecipeInput {
        title: title.to_string(),
        description: Some("A test recipe".to_string()),
        prep_time_minutes: Some(10),
        cook_time_minutes: Some(20),
        servings: Some(4),
        difficulty: Some(2),
        ingredients: vec![CreateIngredientInput {
            name: "onion".to_string(),
            quantity: Some(1.0),
            unit: None,
            notes: None,
        }],
        steps: vec![CreateStepInput {
            instruction: "Cook the onion".to_string(),
            duration_minutes: Some(5),
            temperature_value: None,
            temperature_unit: None,
        }],
        tags,
    };

    queries::create_recipe(pool, input, Some("test@example.com".to_string()))
        .await
        .expect("Failed to seed recipe")
        .recipe
        .id
}

/// Read the current value of the tags backfill flag
async fn flag_value(pool: &SqlitePool) -> Option<String> {
    sqlx::query_scalar::<_, String>(
        "SELECT value FROM backfill_flags WHERE key = 'tags_backfill_completed'",
    )
    .fetch_optional(pool)
    .await
    .expect("Failed to read backfill flag")
}

/// Read a recipe's tags back
async fn tags_of(pool: &SqlitePool, recipe_id: &str) -> Vec<String> {
    queries::get_recipe(pool, recipe_id, None)
        .await
        .expect("Failed to fetch recipe")
        .recipe
        .tags
}

fn test_config() -> recipe_vault::config::Config {
    common::create_test_config(common::create_test_families_config())
}

#[tokio::test]
async fn test_backfill_tags_untagged_recipes_and_sets_flag() {
    let pool = common::create_test_db().await;

    let first = seed_recipe(&pool, "Chicken Curry", vec![]).await;
    let second = seed_recipe(&pool, "Lamb Curry", vec![]).await;

    assert_eq!(flag_value(&pool).await.as_deref(), Some("false"));
    assert_eq!(check_backfill_status(&pool).await, BackfillStatus::Pending);

    let summary = run_tags_backfill(&pool, &test_config(), reqwest::Client::new())
        .await
        .expect("Backfill failed");

    assert_eq!(summary.processed, 2);
    assert_eq!(summary.succeeded, 2);
    assert_eq!(summary.failed, 0);

    // The mock provider returns ["main", "curry"], stored and read back sorted
    assert_eq!(tags_of(&pool, &first).await, vec!["curry", "main"]);
    assert_eq!(tags_of(&pool, &second).await, vec!["curry", "main"]);

    assert_eq!(flag_value(&pool).await.as_deref(), Some("true"));
    assert_eq!(check_backfill_status(&pool).await, BackfillStatus::Completed);
}

#[tokio::test]
async fn test_backfill_skipped_when_flag_already_true() {
    let pool = common::create_test_db().await;

    let recipe_id = seed_recipe(&pool, "Untouched Recipe", vec![]).await;

    sqlx::query("UPDATE backfill_flags SET value = 'true' WHERE key = 'tags_backfill_completed'")
        .execute(&pool)
        .await
        .expect("Failed to set flag");

    let summary = run_tags_backfill(&pool, &test_config(), reqwest::Client::new())
        .await
        .expect("Backfill failed");

    assert_eq!(summary.processed, 0);
    assert!(
        tags_of(&pool, &recipe_id).await.is_empty(),
        "Recipe should be left untagged when the flag is already true"
    );
}

#[tokio::test]
async fn test_backfill_skips_already_tagged_recipes() {
    let pool = common::create_test_db().await;

    let tagged = seed_recipe(&pool, "Chocolate Tart", vec!["dessert".to_string()]).await;
    let untagged = seed_recipe(&pool, "Beef Stew", vec![]).await;

    let summary = run_tags_backfill(&pool, &test_config(), reqwest::Client::new())
        .await
        .expect("Backfill failed");

    // Only the untagged recipe is selected
    assert_eq!(summary.processed, 1);
    assert_eq!(summary.succeeded, 1);

    assert_eq!(tags_of(&pool, &tagged).await, vec!["dessert"]);
    assert_eq!(tags_of(&pool, &untagged).await, vec!["curry", "main"]);
}

#[tokio::test]
async fn test_backfill_with_no_recipes_marks_complete() {
    let pool = common::create_test_db().await;

    let summary = run_tags_backfill(&pool, &test_config(), reqwest::Client::new())
        .await
        .expect("Backfill failed");

    assert_eq!(summary.processed, 0);
    assert_eq!(flag_value(&pool).await.as_deref(), Some("true"));
}

#[tokio::test]
async fn test_backfill_skips_when_flag_row_missing() {
    let pool = common::create_test_db().await;

    let recipe_id = seed_recipe(&pool, "Orphan Recipe", vec![]).await;

    sqlx::query("DELETE FROM backfill_flags")
        .execute(&pool)
        .await
        .expect("Failed to delete flag row");

    assert_eq!(check_backfill_status(&pool).await, BackfillStatus::Missing);

    let summary = run_tags_backfill(&pool, &test_config(), reqwest::Client::new())
        .await
        .expect("Backfill should skip cleanly when the flag row is missing");

    assert_eq!(summary.processed, 0);
    assert!(tags_of(&pool, &recipe_id).await.is_empty());
}

#[tokio::test]
async fn test_backfill_skips_when_flag_table_missing() {
    let pool = common::create_test_db().await;

    sqlx::query("DROP TABLE backfill_flags")
        .execute(&pool)
        .await
        .expect("Failed to drop backfill_flags");

    assert_eq!(check_backfill_status(&pool).await, BackfillStatus::Missing);

    let summary = run_tags_backfill(&pool, &test_config(), reqwest::Client::new())
        .await
        .expect("Backfill should skip cleanly when the flag table is missing");

    assert_eq!(summary.processed, 0);
}

#[tokio::test]
async fn test_backfill_resumes_after_partial_run() {
    let pool = common::create_test_db().await;

    let first = seed_recipe(&pool, "Pancakes", vec![]).await;

    run_tags_backfill(&pool, &test_config(), reqwest::Client::new())
        .await
        .expect("First backfill failed");

    // Simulate an interrupted run: the flag is still 'false' and a new recipe
    // arrived untagged in the meantime
    sqlx::query("UPDATE backfill_flags SET value = 'false' WHERE key = 'tags_backfill_completed'")
        .execute(&pool)
        .await
        .expect("Failed to reset flag");
    let second = seed_recipe(&pool, "Waffles", vec![]).await;

    let summary = run_tags_backfill(&pool, &test_config(), reqwest::Client::new())
        .await
        .expect("Second backfill failed");

    // Only the still-untagged recipe is reprocessed
    assert_eq!(summary.processed, 1);
    assert_eq!(tags_of(&pool, &first).await, vec!["curry", "main"]);
    assert_eq!(tags_of(&pool, &second).await, vec!["curry", "main"]);
    assert_eq!(flag_value(&pool).await.as_deref(), Some("true"));
}

#[tokio::test]
async fn test_backfill_continues_past_failures_and_leaves_flag_false() {
    let pool = common::create_test_db().await;

    seed_recipe(&pool, "Broken One", vec![]).await;
    seed_recipe(&pool, "Broken Two", vec![]).await;

    // Break the read side so every assessment fails
    sqlx::query("DROP TABLE ingredients")
        .execute(&pool)
        .await
        .expect("Failed to drop ingredients");

    let summary = run_tags_backfill(&pool, &test_config(), reqwest::Client::new())
        .await
        .expect("Backfill should not abort on individual failures");

    // Both recipes were attempted — the first failure did not stop the pass
    assert_eq!(summary.processed, 2);
    assert_eq!(summary.succeeded, 0);
    assert_eq!(summary.failed, 2);

    // Nothing succeeded, so the backfill retries on the next start
    assert_eq!(flag_value(&pool).await.as_deref(), Some("false"));
}
