use sqlx::SqlitePool;
use uuid::Uuid;

use crate::{
    error::{ApiError, ApiResult},
    models::{
        recipe::{CreateRecipeInput, UpdateRecipeInput},
        RecipeIngredient, Recipe, RecipeWithDetails, ShareLink, Step,
    },
};

/// Build a SQL IN clause with placeholders for the given number of items.
/// Returns (clause_string, bindings) where clause_string is like "LOWER(created_by) IN (?, ?, ?)"
fn family_filter_clause(family_members: &[String]) -> String {
    let placeholders: Vec<&str> = family_members.iter().map(|_| "?").collect();
    format!("LOWER(created_by) IN ({})", placeholders.join(", "))
}

/// Create a new recipe with ingredients and steps
pub async fn create_recipe(
    pool: &SqlitePool,
    input: CreateRecipeInput,
    user_email: Option<String>,
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
        "INSERT INTO recipes (id, title, description, prep_time_minutes, cook_time_minutes, servings, difficulty, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&recipe_id)
    .bind(&input.title)
    .bind(&input.description)
    .bind(input.prep_time_minutes)
    .bind(input.cook_time_minutes)
    .bind(input.servings)
    .bind(input.difficulty)
    .bind(&user_email)
    .bind(&user_email)
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
        .bind(ingredient.quantity)
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
        .bind(step.duration_minutes)
        .bind(step.temperature_value)
        .bind(&step.temperature_unit)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    // Fetch and return the complete recipe (no family filter needed — user just created it)
    get_recipe(pool, &recipe_id, None).await
}

/// Get a recipe by ID with all ingredients and steps.
/// When family_members is Some, only returns the recipe if created_by is in the list.
/// When family_members is None (god mode), returns any recipe.
pub async fn get_recipe(
    pool: &SqlitePool,
    recipe_id: &str,
    family_members: Option<&[String]>,
) -> ApiResult<RecipeWithDetails> {
    // Fetch recipe with optional family filtering
    let recipe: Option<Recipe> = match family_members {
        Some(members) if !members.is_empty() => {
            let filter = family_filter_clause(members);
            let sql = format!("SELECT * FROM recipes WHERE id = ? AND {}", filter);
            let mut query = sqlx::query_as(&sql).bind(recipe_id);
            for member in members {
                query = query.bind(member);
            }
            query.fetch_optional(pool).await?
        }
        _ => {
            // God mode or empty members — no filtering
            sqlx::query_as("SELECT * FROM recipes WHERE id = ?")
                .bind(recipe_id)
                .fetch_optional(pool)
                .await?
        }
    };

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

/// List all recipes (without ingredients/steps).
/// When family_members is Some, only returns recipes created by family members.
/// When family_members is None (god mode), returns all recipes.
pub async fn list_recipes(
    pool: &SqlitePool,
    family_members: Option<&[String]>,
) -> ApiResult<Vec<Recipe>> {
    let recipes = match family_members {
        Some(members) if !members.is_empty() => {
            let filter = family_filter_clause(members);
            let sql = format!("SELECT * FROM recipes WHERE {} ORDER BY LOWER(title)", filter);
            let mut query = sqlx::query_as(&sql);
            for member in members {
                query = query.bind(member);
            }
            query.fetch_all(pool).await?
        }
        _ => {
            // God mode or empty members — return all
            sqlx::query_as("SELECT * FROM recipes ORDER BY LOWER(title)")
                .fetch_all(pool)
                .await?
        }
    };

    Ok(recipes)
}

/// Update a recipe.
/// When family_members is Some, only updates if the recipe was created by a family member.
/// When family_members is None (god mode), updates any recipe.
pub async fn update_recipe(
    pool: &SqlitePool,
    recipe_id: &str,
    input: UpdateRecipeInput,
    user_email: Option<String>,
    family_members: Option<&[String]>,
) -> ApiResult<RecipeWithDetails> {
    let mut tx = pool.begin().await?;

    // Check if recipe exists (with family filtering)
    let exists: Option<(i32,)> = match family_members {
        Some(members) if !members.is_empty() => {
            let filter = family_filter_clause(members);
            let sql = format!("SELECT 1 FROM recipes WHERE id = ? AND {}", filter);
            let mut query = sqlx::query_as(&sql).bind(recipe_id);
            for member in members {
                query = query.bind(member);
            }
            query.fetch_optional(&mut *tx).await?
        }
        _ => {
            sqlx::query_as("SELECT 1 FROM recipes WHERE id = ?")
                .bind(recipe_id)
                .fetch_optional(&mut *tx)
                .await?
        }
    };

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
    if input.difficulty.is_some() {
        updates.push("difficulty = ?");
        has_update = true;
    }

    if has_update {
        updates.push("updated_at = datetime('now')");
        updates.push("updated_by = ?");
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
        if let Some(difficulty) = input.difficulty {
            query = query.bind(difficulty);
        }
        query = query.bind(&user_email);
        query = query.bind(recipe_id);

        query.execute(&mut *tx).await?;
    }

    // Replace ingredients if provided
    if let Some(ingredients) = input.ingredients {
        sqlx::query("DELETE FROM ingredients WHERE recipe_id = ?")
            .bind(recipe_id)
            .execute(&mut *tx)
            .await?;

        // Update the recipe's updated_by and updated_at when ingredients change
        sqlx::query("UPDATE recipes SET updated_at = datetime('now'), updated_by = ? WHERE id = ?")
            .bind(&user_email)
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
            .bind(ingredient.quantity)
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

        // Update the recipe's updated_by and updated_at when steps change
        sqlx::query("UPDATE recipes SET updated_at = datetime('now'), updated_by = ? WHERE id = ?")
            .bind(&user_email)
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
            .bind(step.duration_minutes)
            .bind(step.temperature_value)
            .bind(&step.temperature_unit)
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;

    // Fetch and return updated recipe (no family filter needed — already verified access)
    get_recipe(pool, recipe_id, None).await
}

/// Delete a recipe (cascade deletes ingredients and steps).
/// When family_members is Some, only deletes if the recipe was created by a family member.
/// When family_members is None (god mode), deletes any recipe.
pub async fn delete_recipe(
    pool: &SqlitePool,
    recipe_id: &str,
    family_members: Option<&[String]>,
) -> ApiResult<()> {
    let result = match family_members {
        Some(members) if !members.is_empty() => {
            let filter = family_filter_clause(members);
            let sql = format!("DELETE FROM recipes WHERE id = ? AND {}", filter);
            let mut query = sqlx::query(&sql).bind(recipe_id);
            for member in members {
                query = query.bind(member);
            }
            query.execute(pool).await?
        }
        _ => {
            sqlx::query("DELETE FROM recipes WHERE id = ?")
                .bind(recipe_id)
                .execute(pool)
                .await?
        }
    };

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound(recipe_id.to_string()));
    }

    Ok(())
}

/// Insert a new share link
pub async fn create_share_link(
    pool: &SqlitePool,
    token: &str,
    recipe_id: &str,
    created_by: &str,
    expires_at: &str,
) -> ApiResult<ShareLink> {
    sqlx::query(
        "INSERT INTO share_links (token, recipe_id, created_by, expires_at) VALUES (?, ?, ?, ?)"
    )
    .bind(token)
    .bind(recipe_id)
    .bind(created_by)
    .bind(expires_at)
    .execute(pool)
    .await?;

    let link: ShareLink = sqlx::query_as(
        "SELECT * FROM share_links WHERE token = ?"
    )
    .bind(token)
    .fetch_one(pool)
    .await?;

    Ok(link)
}

/// Look up a share link by token. Returns None if not found or expired.
pub async fn get_share_link(
    pool: &SqlitePool,
    token: &str,
) -> ApiResult<Option<ShareLink>> {
    let link: Option<ShareLink> = sqlx::query_as(
        "SELECT * FROM share_links WHERE token = ?"
    )
    .bind(token)
    .fetch_optional(pool)
    .await?;

    Ok(link)
}

/// Get a recipe with full details via a share token (no family filtering).
/// Returns None if the token doesn't exist. Caller should check expiry.
pub async fn get_recipe_by_share_token(
    pool: &SqlitePool,
    token: &str,
) -> ApiResult<Option<RecipeWithDetails>> {
    let link: Option<ShareLink> = sqlx::query_as(
        "SELECT * FROM share_links WHERE token = ?"
    )
    .bind(token)
    .fetch_optional(pool)
    .await?;

    let link = match link {
        Some(l) => l,
        None => return Ok(None),
    };

    // Fetch recipe without family filtering (share links bypass tenancy)
    let recipe = get_recipe(pool, &link.recipe_id, None).await?;
    Ok(Some(recipe))
}
