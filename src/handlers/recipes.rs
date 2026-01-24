use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;

use crate::{
    db::queries,
    error::ApiResult,
    models::{
        recipe::{CreateRecipeInput, UpdateRecipeInput},
        Recipe, RecipeWithDetails,
    },
};

/// Create a new recipe
pub async fn create_recipe(
    State(pool): State<SqlitePool>,
    Json(input): Json<CreateRecipeInput>,
) -> ApiResult<(StatusCode, Json<RecipeWithDetails>)> {
    let recipe = queries::create_recipe(&pool, input).await?;
    Ok((StatusCode::CREATED, Json(recipe)))
}

/// List all recipes
pub async fn list_recipes(
    State(pool): State<SqlitePool>,
) -> ApiResult<Json<Vec<Recipe>>> {
    let recipes = queries::list_recipes(&pool).await?;
    Ok(Json(recipes))
}

/// Get a single recipe by ID
pub async fn get_recipe(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> ApiResult<Json<RecipeWithDetails>> {
    let recipe = queries::get_recipe(&pool, &id).await?;
    Ok(Json(recipe))
}

/// Update a recipe
pub async fn update_recipe(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(input): Json<UpdateRecipeInput>,
) -> ApiResult<Json<RecipeWithDetails>> {
    let recipe = queries::update_recipe(&pool, &id, input).await?;
    Ok(Json(recipe))
}

/// Delete a recipe
pub async fn delete_recipe(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> ApiResult<StatusCode> {
    queries::delete_recipe(&pool, &id).await?;
    Ok(StatusCode::NO_CONTENT)
}
