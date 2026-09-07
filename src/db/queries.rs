use std::collections::HashMap;

use sqlx::{Sqlite, SqlitePool, Transaction};
use uuid::Uuid;

use crate::{
    error::{ApiError, ApiResult},
    models::{
        recipe::{normalize_tags, CreateRecipeInput, UpdateRecipeInput},
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
    // Validate input (including tags, so a bad tag fails before any write)
    input.validate()?;
    let tags = normalize_tags(&input.tags)?;

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

    // Insert tags
    if !tags.is_empty() {
        set_recipe_tags(&mut tx, &recipe_id, &tags).await?;
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

    let mut recipe = recipe.ok_or_else(|| ApiError::NotFound(recipe_id.to_string()))?;

    // Fetch tags
    let mut tags_by_recipe = load_tags_for(pool, std::slice::from_ref(&recipe.id)).await?;
    recipe.tags = tags_by_recipe.remove(&recipe.id).unwrap_or_default();

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
    let mut recipes: Vec<Recipe> = match family_members {
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

    // Load every recipe's tags in one query
    let ids: Vec<String> = recipes.iter().map(|r| r.id.clone()).collect();
    let mut tags_by_recipe = load_tags_for(pool, &ids).await?;
    for recipe in &mut recipes {
        recipe.tags = tags_by_recipe.remove(&recipe.id).unwrap_or_default();
    }

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
    // Normalise tags before anything is written so an invalid tag changes nothing
    let tags = match &input.tags {
        Some(tags) => Some(normalize_tags(tags)?),
        None => None,
    };

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

    // Replace tags if provided (Some(vec![]) clears them)
    if let Some(tags) = tags {
        set_recipe_tags(&mut tx, recipe_id, &tags).await?;

        // Update the recipe's updated_by and updated_at when tags change
        sqlx::query("UPDATE recipes SET updated_at = datetime('now'), updated_by = ? WHERE id = ?")
            .bind(&user_email)
            .bind(recipe_id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;

    // Fetch and return updated recipe (no family filter needed — already verified access)
    get_recipe(pool, recipe_id, None).await
}

/// Replace a recipe's tag links with the given normalised tag names.
/// Creates missing `tags` rows (case-insensitive), removes links that are no
/// longer wanted and inserts the missing ones. Runs inside the caller's transaction.
pub async fn set_recipe_tags(
    tx: &mut Transaction<'_, Sqlite>,
    recipe_id: &str,
    tags: &[String],
) -> ApiResult<()> {
    // Resolve every tag name to a tag id, creating the row if the name is new
    let mut tag_ids: Vec<String> = Vec::with_capacity(tags.len());
    for name in tags {
        sqlx::query("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind(name)
            .execute(&mut **tx)
            .await?;

        let (tag_id,): (String,) = sqlx::query_as("SELECT id FROM tags WHERE LOWER(name) = LOWER(?)")
            .bind(name)
            .fetch_one(&mut **tx)
            .await?;

        if !tag_ids.contains(&tag_id) {
            tag_ids.push(tag_id);
        }
    }

    // Remove links that are no longer in the set
    if tag_ids.is_empty() {
        sqlx::query("DELETE FROM recipe_tags WHERE recipe_id = ?")
            .bind(recipe_id)
            .execute(&mut **tx)
            .await?;
    } else {
        let placeholders: Vec<&str> = tag_ids.iter().map(|_| "?").collect();
        let sql = format!(
            "DELETE FROM recipe_tags WHERE recipe_id = ? AND tag_id NOT IN ({})",
            placeholders.join(", ")
        );
        let mut query = sqlx::query(&sql).bind(recipe_id);
        for tag_id in &tag_ids {
            query = query.bind(tag_id);
        }
        query.execute(&mut **tx).await?;
    }

    // Insert the links that are missing
    for tag_id in &tag_ids {
        sqlx::query("INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)")
            .bind(recipe_id)
            .bind(tag_id)
            .execute(&mut **tx)
            .await?;
    }

    Ok(())
}

/// Load the tags of several recipes in a single query.
/// Recipes without tags are absent from the map; each list is sorted alphabetically.
pub async fn load_tags_for(
    pool: &SqlitePool,
    recipe_ids: &[String],
) -> ApiResult<HashMap<String, Vec<String>>> {
    let mut tags_by_recipe: HashMap<String, Vec<String>> = HashMap::new();
    if recipe_ids.is_empty() {
        return Ok(tags_by_recipe);
    }

    let placeholders: Vec<&str> = recipe_ids.iter().map(|_| "?").collect();
    let sql = format!(
        "SELECT rt.recipe_id, t.name FROM recipe_tags rt
         JOIN tags t ON t.id = rt.tag_id
         WHERE rt.recipe_id IN ({})
         ORDER BY rt.recipe_id, LOWER(t.name)",
        placeholders.join(", ")
    );

    let mut query = sqlx::query_as(&sql);
    for recipe_id in recipe_ids {
        query = query.bind(recipe_id);
    }
    let rows: Vec<(String, String)> = query.fetch_all(pool).await?;

    for (recipe_id, name) in rows {
        tags_by_recipe.entry(recipe_id).or_default().push(name);
    }

    Ok(tags_by_recipe)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::recipe::CreateRecipeInput;

    async fn test_pool() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:")
            .await
            .expect("Failed to create test database");
        sqlx::migrate!()
            .run(&pool)
            .await
            .expect("Failed to run migrations");
        pool
    }

    fn recipe_input(title: &str, tags: &[&str]) -> CreateRecipeInput {
        CreateRecipeInput {
            title: title.to_string(),
            description: None,
            prep_time_minutes: None,
            cook_time_minutes: None,
            servings: None,
            difficulty: None,
            ingredients: vec![],
            steps: vec![],
            tags: tags.iter().map(|t| t.to_string()).collect(),
        }
    }

    #[tokio::test]
    async fn test_create_recipe_stores_normalised_sorted_tags() {
        let pool = test_pool().await;

        let created = create_recipe(&pool, recipe_input("Thai Curry", &["Main", " main ", "THAI"]), None)
            .await
            .expect("Failed to create recipe");

        assert_eq!(created.recipe.tags, vec!["main".to_string(), "thai".to_string()]);

        // A single tags row per name, shared by every recipe using it
        let second = create_recipe(&pool, recipe_input("Green Curry", &["main"]), None)
            .await
            .expect("Failed to create recipe");
        assert_eq!(second.recipe.tags, vec!["main".to_string()]);

        let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tags WHERE LOWER(name) = 'main'")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_update_recipe_replaces_and_clears_tags() {
        let pool = test_pool().await;
        let created = create_recipe(&pool, recipe_input("Trifle", &["dessert"]), None)
            .await
            .unwrap();
        let recipe_id = created.recipe.id.clone();

        // Omitting tags leaves them alone
        let untouched = update_recipe(
            &pool,
            &recipe_id,
            UpdateRecipeInput {
                title: None,
                description: Some("Layered".to_string()),
                prep_time_minutes: None,
                cook_time_minutes: None,
                servings: None,
                difficulty: None,
                ingredients: None,
                steps: None,
                tags: None,
            },
            Some("cook@example.com".to_string()),
            None,
        )
        .await
        .unwrap();
        assert_eq!(untouched.recipe.tags, vec!["dessert".to_string()]);

        // Some(tags) replaces the set and bumps updated_by
        let replaced = update_recipe(
            &pool,
            &recipe_id,
            UpdateRecipeInput {
                title: None,
                description: None,
                prep_time_minutes: None,
                cook_time_minutes: None,
                servings: None,
                difficulty: None,
                ingredients: None,
                steps: None,
                tags: Some(vec!["Main".to_string(), "thai".to_string()]),
            },
            Some("tagger@example.com".to_string()),
            None,
        )
        .await
        .unwrap();
        assert_eq!(replaced.recipe.tags, vec!["main".to_string(), "thai".to_string()]);
        assert_eq!(replaced.recipe.updated_by, Some("tagger@example.com".to_string()));

        // Some(vec![]) clears them
        let cleared = update_recipe(
            &pool,
            &recipe_id,
            UpdateRecipeInput {
                title: None,
                description: None,
                prep_time_minutes: None,
                cook_time_minutes: None,
                servings: None,
                difficulty: None,
                ingredients: None,
                steps: None,
                tags: Some(vec![]),
            },
            Some("tagger@example.com".to_string()),
            None,
        )
        .await
        .unwrap();
        assert!(cleared.recipe.tags.is_empty());
    }

    #[tokio::test]
    async fn test_invalid_tags_are_rejected_before_any_write() {
        let pool = test_pool().await;

        let result = create_recipe(&pool, recipe_input("Bad Tags", &["main!"]), None).await;
        assert!(matches!(result, Err(ApiError::Validation(_))));

        let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM recipes")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 0, "no recipe should have been written");
    }

    #[tokio::test]
    async fn test_list_recipes_populates_tags_in_one_query() {
        let pool = test_pool().await;
        create_recipe(&pool, recipe_input("Apple Pie", &["dessert"]), None)
            .await
            .unwrap();
        create_recipe(&pool, recipe_input("Beef Stew", &[]), None)
            .await
            .unwrap();

        let recipes = list_recipes(&pool, None).await.unwrap();
        assert_eq!(recipes.len(), 2);
        assert_eq!(recipes[0].tags, vec!["dessert".to_string()]);
        assert!(recipes[1].tags.is_empty());
    }

    #[tokio::test]
    async fn test_share_token_lookup_includes_tags() {
        let pool = test_pool().await;
        let created = create_recipe(&pool, recipe_input("Shared Pie", &["dessert", "english"]), None)
            .await
            .unwrap();

        create_share_link(
            &pool,
            "share-token-abc",
            &created.recipe.id,
            "cook@example.com",
            "2999-01-01 00:00:00",
        )
        .await
        .unwrap();

        let shared = get_recipe_by_share_token(&pool, "share-token-abc")
            .await
            .unwrap()
            .expect("share token should resolve to a recipe");
        assert_eq!(
            shared.recipe.tags,
            vec!["dessert".to_string(), "english".to_string()],
            "a recipe fetched through its share token carries its tags"
        );
    }

    #[tokio::test]
    async fn test_delete_recipe_removes_tag_links() {
        let pool = test_pool().await;
        let created = create_recipe(&pool, recipe_input("To Delete", &["main", "thai"]), None)
            .await
            .unwrap();
        let recipe_id = created.recipe.id.clone();

        let (links,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM recipe_tags WHERE recipe_id = ?")
            .bind(&recipe_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(links, 2);

        delete_recipe(&pool, &recipe_id, None).await.unwrap();

        let (links,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM recipe_tags WHERE recipe_id = ?")
            .bind(&recipe_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(links, 0, "recipe_tags rows should cascade away");

        // The tag vocabulary itself survives for other recipes
        let (tags,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tags")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(tags, 2);
    }
}
