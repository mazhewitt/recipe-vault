use sqlx::SqlitePool;
use std::time::Duration;
use tokio::time::sleep;

use crate::{
    ai::{assess_recipe_difficulty, LlmProvider, LlmProviderType},
    config::Config,
    db::queries,
    models::{recipe::UpdateRecipeInput, Recipe},
};

/// Check if the difficulty backfill has already been completed
pub async fn check_backfill_status(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let result = sqlx::query_scalar::<_, String>(
        "SELECT value FROM system_flags WHERE key = 'difficulty_backfill_completed'"
    )
    .fetch_optional(pool)
    .await?;

    Ok(result.map(|v| v == "true").unwrap_or(false))
}

/// Run the difficulty backfill process for all recipes with NULL difficulty
pub async fn run_backfill(pool: &SqlitePool, config: &Config) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tracing::info!("Starting difficulty backfill process");

    // Check if backfill is already complete
    if check_backfill_status(pool).await? {
        tracing::info!("Difficulty backfill already completed, skipping");
        return Ok(());
    }

    // Query all recipes with NULL difficulty (no family filtering for backfill)
    let recipes = sqlx::query_as::<_, Recipe>(
        "SELECT * FROM recipes WHERE difficulty IS NULL ORDER BY created_at"
    )
    .fetch_all(pool)
    .await?;

    let total_count = recipes.len();
    tracing::info!("Found {} recipes without difficulty ratings", total_count);

    if total_count == 0 {
        // No recipes to process, mark as complete
        mark_backfill_complete(pool).await?;
        tracing::info!("No recipes to backfill, marking as complete");
        return Ok(());
    }

    // Create LLM provider
    let llm = if config.mock_llm {
        LlmProvider::mock(config.mock_recipe_id.clone())
    } else {
        LlmProvider::new(
            LlmProviderType::Anthropic,
            config.anthropic_api_key.clone(),
            config.ai_model.clone(),
        )
    };

    let mut processed_count = 0;
    let mut success_count = 0;
    let mut error_count = 0;

    // Process recipes sequentially with delay
    for recipe in recipes {
        processed_count += 1;

        // Log progress every 10 recipes
        if processed_count % 10 == 0 {
            tracing::info!(
                "Backfill progress: {}/{} recipes processed ({} succeeded, {} failed)",
                processed_count,
                total_count,
                success_count,
                error_count
            );
        }

        // Process this recipe
        match process_recipe(&llm, pool, &recipe).await {
            Ok(difficulty) => {
                success_count += 1;
                tracing::debug!(
                    "Assigned difficulty {} to recipe '{}' ({})",
                    difficulty,
                    recipe.title,
                    recipe.id
                );
            }
            Err(e) => {
                error_count += 1;
                tracing::warn!(
                    "Failed to assign difficulty to recipe '{}' ({}): {}",
                    recipe.title,
                    recipe.id,
                    e
                );
                // Continue processing despite errors
            }
        }

        // Add delay between API calls to avoid rate limiting
        sleep(Duration::from_millis(100)).await;
    }

    // Mark backfill as complete
    mark_backfill_complete(pool).await?;

    tracing::info!(
        "Difficulty backfill completed: {}/{} recipes succeeded, {} failed",
        success_count,
        total_count,
        error_count
    );

    Ok(())
}

/// Process a single recipe to assign difficulty
async fn process_recipe(
    llm: &LlmProvider,
    pool: &SqlitePool,
    recipe: &Recipe,
) -> Result<u8, Box<dyn std::error::Error + Send + Sync>> {
    // Fetch full recipe details with ingredients and steps (no family filtering)
    let recipe_details = queries::get_recipe(pool, &recipe.id, None).await?;

    // Assess difficulty using AI
    let difficulty = assess_recipe_difficulty(
        llm,
        &recipe_details.recipe,
        &recipe_details.ingredients,
        &recipe_details.steps,
    )
    .await?;

    // Update the recipe with the assessed difficulty
    let update_input = UpdateRecipeInput {
        title: None,
        description: None,
        prep_time_minutes: None,
        cook_time_minutes: None,
        servings: None,
        difficulty: Some(difficulty as i32),
        ingredients: None,
        steps: None,
    };

    queries::update_recipe(pool, &recipe.id, update_input, None, None).await?;

    Ok(difficulty)
}

/// Mark the backfill as complete in the system_flags table
async fn mark_backfill_complete(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE system_flags SET value = 'true', updated_at = CURRENT_TIMESTAMP WHERE key = 'difficulty_backfill_completed'"
    )
    .execute(pool)
    .await?;

    Ok(())
}
