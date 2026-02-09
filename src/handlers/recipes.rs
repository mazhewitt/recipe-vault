use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;

use crate::{
    auth::UserIdentity,
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
    extensions: axum::http::Extensions,
    Json(input): Json<CreateRecipeInput>,
) -> ApiResult<(StatusCode, Json<RecipeWithDetails>)> {
    let identity = extensions.get::<UserIdentity>();
    let user_email = identity.and_then(|i| i.email.clone());

    let recipe = queries::create_recipe(&pool, input, user_email).await?;
    Ok((StatusCode::CREATED, Json(recipe)))
}

/// List all recipes (filtered by family membership)
pub async fn list_recipes(
    State(pool): State<SqlitePool>,
    extensions: axum::http::Extensions,
) -> ApiResult<Json<Vec<Recipe>>> {
    let identity = extensions.get::<UserIdentity>();
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    let recipes = queries::list_recipes(&pool, family_members.map(|v| v.as_slice())).await?;
    Ok(Json(recipes))
}

/// Get a single recipe by ID (filtered by family membership)
pub async fn get_recipe(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    extensions: axum::http::Extensions,
) -> ApiResult<Json<RecipeWithDetails>> {
    let identity = extensions.get::<UserIdentity>();
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    let recipe = queries::get_recipe(&pool, &id, family_members.map(|v| v.as_slice())).await?;
    Ok(Json(recipe))
}

/// Update a recipe (filtered by family membership)
pub async fn update_recipe(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    extensions: axum::http::Extensions,
    Json(input): Json<UpdateRecipeInput>,
) -> ApiResult<Json<RecipeWithDetails>> {
    let identity = extensions.get::<UserIdentity>();
    let user_email = identity.and_then(|i| i.email.clone());
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    let recipe = queries::update_recipe(
        &pool,
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
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    extensions: axum::http::Extensions,
) -> ApiResult<StatusCode> {
    let identity = extensions.get::<UserIdentity>();
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    queries::delete_recipe(&pool, &id, family_members.map(|v| v.as_slice())).await?;
    Ok(StatusCode::NO_CONTENT)
}
