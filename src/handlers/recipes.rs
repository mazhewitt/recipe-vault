use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{
    ai::{assess_recipe_difficulty, LlmProvider, LlmProviderType},
    auth::UserIdentity,
    config::Config,
    db::queries,
    error::ApiResult,
    models::{
        recipe::{CreateRecipeInput, UpdateRecipeInput},
        Recipe, RecipeWithDetails,
    },
};

/// Shared state for recipe handlers with database and AI configuration
#[derive(Clone)]
pub struct RecipeState {
    pub pool: SqlitePool,
    pub config: Arc<Config>,
}

/// Create a new recipe
pub async fn create_recipe(
    State(state): State<RecipeState>,
    extensions: axum::http::Extensions,
    Json(input): Json<CreateRecipeInput>,
) -> ApiResult<(StatusCode, Json<RecipeWithDetails>)> {
    let identity = extensions.get::<UserIdentity>();
    let user_email = identity.and_then(|i| i.email.clone());

    let recipe = queries::create_recipe(&state.pool, input, user_email).await?;

    // Check if difficulty was not specified - if so, auto-assign using AI
    if recipe.recipe.difficulty.is_none() {
        let recipe_id = recipe.recipe.id.clone();
        let pool = state.pool.clone();
        let config = state.config.clone();

        tracing::info!("Recipe {} created without difficulty, spawning auto-assessment task", recipe_id);

        // Spawn async task to assess and update difficulty (non-blocking)
        tokio::spawn(async move {
            // Small delay to allow the CREATE transaction to fully commit
            // and avoid database lock contention (especially in tests with SQLite)
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

            match auto_assign_difficulty(&pool, &config, &recipe_id).await {
                Ok(difficulty) => {
                    tracing::info!("Auto-assigned difficulty {} to recipe {}", difficulty, recipe_id);
                }
                Err(e) => {
                    tracing::warn!("Failed to auto-assign difficulty to recipe {}: {}", recipe_id, e);
                }
            }
        });
    }

    Ok((StatusCode::CREATED, Json(recipe)))
}

/// List all recipes (filtered by family membership)
pub async fn list_recipes(
    State(state): State<RecipeState>,
    extensions: axum::http::Extensions,
) -> ApiResult<Json<Vec<Recipe>>> {
    let identity = extensions.get::<UserIdentity>();
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    let recipes = queries::list_recipes(&state.pool, family_members.map(|v| v.as_slice())).await?;
    Ok(Json(recipes))
}

/// Get a single recipe by ID (filtered by family membership)
pub async fn get_recipe(
    State(state): State<RecipeState>,
    Path(id): Path<String>,
    extensions: axum::http::Extensions,
) -> ApiResult<Json<RecipeWithDetails>> {
    let identity = extensions.get::<UserIdentity>();
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    let recipe = queries::get_recipe(&state.pool, &id, family_members.map(|v| v.as_slice())).await?;
    Ok(Json(recipe))
}

/// Update a recipe (filtered by family membership)
pub async fn update_recipe(
    State(state): State<RecipeState>,
    Path(id): Path<String>,
    extensions: axum::http::Extensions,
    Json(input): Json<UpdateRecipeInput>,
) -> ApiResult<Json<RecipeWithDetails>> {
    let identity = extensions.get::<UserIdentity>();
    let user_email = identity.and_then(|i| i.email.clone());
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    let recipe = queries::update_recipe(
        &state.pool,
        &id,
        input,
        user_email,
        family_members.map(|v| v.as_slice()),
    )
    .await?;
    Ok(Json(recipe))
}

/// Delete a recipe (filtered by family membership)
pub async fn delete_recipe(
    State(state): State<RecipeState>,
    Path(id): Path<String>,
    extensions: axum::http::Extensions,
) -> ApiResult<StatusCode> {
    let identity = extensions.get::<UserIdentity>();
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    queries::delete_recipe(&state.pool, &id, family_members.map(|v| v.as_slice())).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Auto-assign difficulty to a recipe using AI assessment
async fn auto_assign_difficulty(
    pool: &SqlitePool,
    config: &Config,
    recipe_id: &str,
) -> Result<u8, Box<dyn std::error::Error + Send + Sync>> {
    // Fetch the full recipe with ingredients and steps (no family filtering for background task)
    let recipe_details = queries::get_recipe(pool, recipe_id, None).await?;

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

    // Assess difficulty using AI
    let difficulty = assess_recipe_difficulty(
        &llm,
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

    queries::update_recipe(pool, recipe_id, update_input, None, None).await?;

    Ok(difficulty)
}
