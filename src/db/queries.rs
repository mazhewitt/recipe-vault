use sqlx::SqlitePool;
use uuid::Uuid;

use crate::{
    error::{ApiError, ApiResult},
    models::{
        recipe::{CreateIngredientInput, CreateRecipeInput, CreateStepInput, UpdateRecipeInput},
        RecipeIngredient, Recipe, RecipeWithDetails, Step,
    },
};

/// Create a new recipe with ingredients and steps
pub async fn create_recipe(
    pool: &SqlitePool,
    input: CreateRecipeInput,
) -> ApiResult<RecipeWithDetails> {
    // Validate input
    input.validate()?;

    let recipe_id = Recipe::new_id();

    // Start a transaction
    let mut tx = pool.begin().await?;

    // Check for duplicate title
    let existing: Option<(i32,)> = sqlx::query_as(
        "SELECT 1 FROM recipes WHERE LOWER(title) = LOWER(?)"
    )
    .bind(&input.title)
    .fetch_optional(&mut *tx)
    .await?;

    if existing.is_some() {
        return Err(ApiError::Conflict(input.title));
    }

    // Insert recipe
    sqlx::query(
        "INSERT INTO recipes (id, title, description, prep_time_minutes, cook_time_minutes, servings)
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&recipe_id)
    .bind(&input.title)
    .bind(&input.description)
    .bind(&input.prep_time_minutes)
    .bind(&input.cook_time_minutes)
    .bind(&input.servings)
    .execute(&mut *tx)
    .await?;

    // Insert ingredients
    for (position, ingredient) in input.ingredients.iter().enumerate() {
        let ingredient_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO ingredients (id, recipe_id, position, name, quantity, unit, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&ingredient_id)
        .bind(&recipe_id)
        .bind(position as i32)
        .bind(&ingredient.name)
        .bind(&ingredient.quantity)
        .bind(&ingredient.unit)
        .bind(&ingredient.notes)
        .execute(&mut *tx)
        .await?;
    }

    // Insert steps
    for (position, step) in input.steps.iter().enumerate() {
        let step_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO steps (id, recipe_id, position, instruction, duration_minutes, temperature_value, temperature_unit)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&step_id)
        .bind(&recipe_id)
        .bind(position as i32)
        .bind(&step.instruction)
        .bind(&step.duration_minutes)
        .bind(&step.temperature_value)
        .bind(&step.temperature_unit)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    // Fetch and return the complete recipe
    get_recipe(pool, &recipe_id).await
}

/// Get a recipe by ID with all ingredients and steps
pub async fn get_recipe(pool: &SqlitePool, recipe_id: &str) -> ApiResult<RecipeWithDetails> {
    // Fetch recipe
    let recipe: Option<Recipe> = sqlx::query_as("SELECT * FROM recipes WHERE id = ?")
        .bind(recipe_id)
        .fetch_optional(pool)
        .await?;

    let recipe = recipe.ok_or_else(|| ApiError::NotFound(recipe_id.to_string()))?;

    // Fetch ingredients
    let ingredients: Vec<RecipeIngredient> = sqlx::query_as(
        "SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY position"
    )
    .bind(recipe_id)
    .fetch_all(pool)
    .await?;

    // Fetch steps
    let steps: Vec<Step> = sqlx::query_as(
        "SELECT * FROM steps WHERE recipe_id = ? ORDER BY position"
    )
    .bind(recipe_id)
    .fetch_all(pool)
    .await?;

    Ok(RecipeWithDetails {
        recipe,
        ingredients,
        steps,
    })
}

/// List all recipes (without ingredients/steps)
pub async fn list_recipes(pool: &SqlitePool) -> ApiResult<Vec<Recipe>> {
    let recipes = sqlx::query_as("SELECT * FROM recipes ORDER BY LOWER(title)")
        .fetch_all(pool)
        .await?;

    Ok(recipes)
}

/// Update a recipe
pub async fn update_recipe(
    pool: &SqlitePool,
    recipe_id: &str,
    input: UpdateRecipeInput,
) -> ApiResult<RecipeWithDetails> {
    let mut tx = pool.begin().await?;

    // Check if recipe exists
    let exists: Option<(i32,)> = sqlx::query_as("SELECT 1 FROM recipes WHERE id = ?")
        .bind(recipe_id)
        .fetch_optional(&mut *tx)
        .await?;

    if exists.is_none() {
        return Err(ApiError::NotFound(recipe_id.to_string()));
    }

    // Update recipe metadata if provided
    if let Some(title) = &input.title {
        if title.trim().is_empty() {
            return Err(ApiError::Validation("Title cannot be empty".to_string()));
        }
        if title.len() > 200 {
            return Err(ApiError::Validation(
                "Title exceeds maximum length of 200 characters".to_string(),
            ));
        }

        // Check for duplicate title (excluding current recipe)
        let existing: Option<(i32,)> = sqlx::query_as(
            "SELECT 1 FROM recipes WHERE LOWER(title) = LOWER(?) AND id != ?"
        )
        .bind(title)
        .bind(recipe_id)
        .fetch_optional(&mut *tx)
        .await?;

        if existing.is_some() {
            return Err(ApiError::Conflict(title.clone()));
        }
    }

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut has_update = false;

    if input.title.is_some() {
        updates.push("title = ?");
        has_update = true;
    }
    if input.description.is_some() {
        updates.push("description = ?");
        has_update = true;
    }
    if input.prep_time_minutes.is_some() {
        updates.push("prep_time_minutes = ?");
        has_update = true;
    }
    if input.cook_time_minutes.is_some() {
        updates.push("cook_time_minutes = ?");
        has_update = true;
    }
    if input.servings.is_some() {
        updates.push("servings = ?");
        has_update = true;
    }

    if has_update {
        updates.push("updated_at = datetime('now')");
        let update_query = format!("UPDATE recipes SET {} WHERE id = ?", updates.join(", "));

        let mut query = sqlx::query(&update_query);
        if let Some(title) = &input.title {
            query = query.bind(title);
        }
        if let Some(description) = &input.description {
            query = query.bind(description);
        }
        if let Some(prep_time) = input.prep_time_minutes {
            query = query.bind(prep_time);
        }
        if let Some(cook_time) = input.cook_time_minutes {
            query = query.bind(cook_time);
        }
        if let Some(servings) = input.servings {
            query = query.bind(servings);
        }
        query = query.bind(recipe_id);

        query.execute(&mut *tx).await?;
    }

    // Replace ingredients if provided
    if let Some(ingredients) = input.ingredients {
        sqlx::query("DELETE FROM ingredients WHERE recipe_id = ?")
            .bind(recipe_id)
            .execute(&mut *tx)
            .await?;

        for (position, ingredient) in ingredients.iter().enumerate() {
            let ingredient_id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO ingredients (id, recipe_id, position, name, quantity, unit, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&ingredient_id)
            .bind(recipe_id)
            .bind(position as i32)
            .bind(&ingredient.name)
            .bind(&ingredient.quantity)
            .bind(&ingredient.unit)
            .bind(&ingredient.notes)
            .execute(&mut *tx)
            .await?;
        }
    }

    // Replace steps if provided
    if let Some(steps) = input.steps {
        sqlx::query("DELETE FROM steps WHERE recipe_id = ?")
            .bind(recipe_id)
            .execute(&mut *tx)
            .await?;

        for (position, step) in steps.iter().enumerate() {
            let step_id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO steps (id, recipe_id, position, instruction, duration_minutes, temperature_value, temperature_unit)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&step_id)
            .bind(recipe_id)
            .bind(position as i32)
            .bind(&step.instruction)
            .bind(&step.duration_minutes)
            .bind(&step.temperature_value)
            .bind(&step.temperature_unit)
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;

    // Fetch and return updated recipe
    get_recipe(pool, recipe_id).await
}

/// Delete a recipe (cascade deletes ingredients and steps)
pub async fn delete_recipe(pool: &SqlitePool, recipe_id: &str) -> ApiResult<()> {
    let result = sqlx::query("DELETE FROM recipes WHERE id = ?")
        .bind(recipe_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound(recipe_id.to_string()));
    }

    Ok(())
}
