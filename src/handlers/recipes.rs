use axum::{
    extract::{Multipart, Path, State},
    http::{header, StatusCode},
    response::IntoResponse,
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

    // Before deleting, check if recipe has a photo and delete it
    if let Ok(recipe) = queries::get_recipe(&state.pool, &id, family_members.map(|v| v.as_slice())).await {
        if let Some(photo_filename) = &recipe.recipe.photo_filename {
            let photo_path = format!("{}/{}", state.config.photos_dir, photo_filename);
            if let Err(e) = tokio::fs::remove_file(&photo_path).await {
                tracing::warn!("Failed to delete photo file {}: {}", photo_path, e);
                // Continue with recipe deletion even if photo deletion fails
            } else {
                tracing::info!("Deleted photo file: {}", photo_path);
            }
        }
    }

    queries::delete_recipe(&state.pool, &id, family_members.map(|v| v.as_slice())).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Upload a photo for a recipe
pub async fn upload_photo(
    State(state): State<RecipeState>,
    Path(id): Path<String>,
    extensions: axum::http::Extensions,
    mut multipart: Multipart,
) -> ApiResult<Json<serde_json::Value>> {
    let identity = extensions.get::<UserIdentity>();
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    // Verify recipe exists and is accessible by user (family tenancy check)
    let recipe = queries::get_recipe(&state.pool, &id, family_members.map(|v| v.as_slice())).await?;

    // Extract file from multipart form data
    let mut file_data: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;
    let mut content_type: Option<String> = None;

    while let Some(field) = multipart.next_field().await
        .map_err(|e| crate::error::ApiError::Validation(format!("Failed to read multipart field: {}", e)))?
    {
        if field.name() == Some("photo") {
            filename = field.file_name().map(|s| s.to_string());
            content_type = field.content_type().map(|s| s.to_string());

            let data = field.bytes().await
                .map_err(|e| crate::error::ApiError::Validation(format!("Failed to read file data: {}", e)))?;

            file_data = Some(data.to_vec());
            break;
        }
    }

    let file_data = file_data.ok_or_else(||
        crate::error::ApiError::Validation("No photo file provided".to_string())
    )?;

    // Validate file size (5MB = 5,242,880 bytes)
    const MAX_FILE_SIZE: usize = 5 * 1024 * 1024;
    if file_data.len() > MAX_FILE_SIZE {
        return Err(crate::error::ApiError::FileTooLarge(
            format!("File size {} bytes exceeds maximum of {} bytes (5MB)", file_data.len(), MAX_FILE_SIZE)
        ));
    }

    // Determine extension from content-type or filename
    let extension = determine_file_extension(&content_type, &filename)?;

    // Validate file extension
    validate_file_extension(&extension)?;

    // Check for existing photo and delete old file if format differs
    if let Some(old_photo_filename) = &recipe.recipe.photo_filename {
        let old_extension = std::path::Path::new(old_photo_filename)
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("");

        if old_extension.to_lowercase() != extension.to_lowercase() {
            let old_photo_path = format!("{}/{}", state.config.photos_dir, old_photo_filename);
            if let Err(e) = tokio::fs::remove_file(&old_photo_path).await {
                tracing::warn!("Failed to delete old photo file {}: {}", old_photo_path, e);
            } else {
                tracing::info!("Deleted old photo file with different format: {}", old_photo_path);
            }
        }
    }

    // Save file to filesystem with atomic write
    let photo_filename = format!("{}.{}", id, extension);
    let photo_path = format!("{}/{}", state.config.photos_dir, photo_filename);

    // Write to temporary file first, then rename (atomic operation)
    let temp_path = format!("{}.tmp", photo_path);
    tokio::fs::write(&temp_path, &file_data).await
        .map_err(|e| crate::error::ApiError::FileSystemError(format!("Failed to write photo file: {}", e)))?;

    tokio::fs::rename(&temp_path, &photo_path).await
        .map_err(|e| {
            // Clean up temp file if rename fails
            let _ = std::fs::remove_file(&temp_path);
            crate::error::ApiError::FileSystemError(format!("Failed to save photo file: {}", e))
        })?;

    tracing::info!("Saved photo file: {}", photo_path);

    // Update recipe's photo_filename in database
    sqlx::query("UPDATE recipes SET photo_filename = ? WHERE id = ?")
        .bind(&photo_filename)
        .bind(&id)
        .execute(&state.pool)
        .await?;

    Ok(Json(serde_json::json!({
        "photo_filename": photo_filename
    })))
}

/// Retrieve a photo for a recipe
pub async fn get_photo(
    State(state): State<RecipeState>,
    Path(id): Path<String>,
    extensions: axum::http::Extensions,
) -> ApiResult<impl IntoResponse> {
    let identity = extensions.get::<UserIdentity>();
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    // Query database for recipe and verify family tenancy
    let recipe = queries::get_recipe(&state.pool, &id, family_members.map(|v| v.as_slice())).await?;

    // Return 404 if recipe has no photo
    let photo_filename = recipe.recipe.photo_filename
        .ok_or_else(|| crate::error::ApiError::NotFound("Recipe has no photo".to_string()))?;

    // Read photo file
    let photo_path = format!("{}/{}", state.config.photos_dir, photo_filename);
    let photo_bytes = tokio::fs::read(&photo_path).await
        .map_err(|e| {
            tracing::error!("Failed to read photo file {}: {}", photo_path, e);
            crate::error::ApiError::NotFound("Photo file not found".to_string())
        })?;

    // Detect content-type from file extension
    let content_type = content_type_from_extension(&photo_filename);

    // Return photo bytes with appropriate Content-Type header
    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, content_type)],
        photo_bytes,
    ))
}

/// Delete a photo for a recipe
pub async fn delete_photo(
    State(state): State<RecipeState>,
    Path(id): Path<String>,
    extensions: axum::http::Extensions,
) -> ApiResult<StatusCode> {
    let identity = extensions.get::<UserIdentity>();
    let family_members = identity.and_then(|i| i.family_members.as_ref());

    // Query database for recipe and verify family tenancy
    let recipe = queries::get_recipe(&state.pool, &id, family_members.map(|v| v.as_slice())).await?;

    // Return 404 if recipe has no photo
    let photo_filename = recipe.recipe.photo_filename
        .ok_or_else(|| crate::error::ApiError::NotFound("Recipe has no photo".to_string()))?;

    // Delete photo file from filesystem
    let photo_path = format!("{}/{}", state.config.photos_dir, photo_filename);
    if let Err(e) = tokio::fs::remove_file(&photo_path).await {
        tracing::warn!("Failed to delete photo file {}: {}", photo_path, e);
        // Continue to set photo_filename to NULL even if file deletion fails
    } else {
        tracing::info!("Deleted photo file: {}", photo_path);
    }

    // Set recipe's photo_filename to NULL in database
    sqlx::query("UPDATE recipes SET photo_filename = NULL WHERE id = ?")
        .bind(&id)
        .execute(&state.pool)
        .await?;

    Ok(StatusCode::OK)
}

/// Helper: Determine file extension from content-type or filename
fn determine_file_extension(content_type: &Option<String>, filename: &Option<String>) -> ApiResult<String> {
    // Try content-type first
    if let Some(ct) = content_type {
        let extension = match ct.as_str() {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            "image/gif" => "gif",
            _ => "",
        };
        if !extension.is_empty() {
            return Ok(extension.to_string());
        }
    }

    // Fallback to filename extension
    if let Some(fname) = filename {
        if let Some(ext) = std::path::Path::new(fname).extension().and_then(|s| s.to_str()) {
            return Ok(ext.to_lowercase());
        }
    }

    Err(crate::error::ApiError::UnsupportedFileType(
        "Could not determine file type from content-type or filename".to_string()
    ))
}

/// Helper: Validate file extension is supported
fn validate_file_extension(extension: &str) -> ApiResult<()> {
    let ext_lower = extension.to_lowercase();
    match ext_lower.as_str() {
        "jpg" | "jpeg" | "png" | "webp" | "gif" => Ok(()),
        _ => Err(crate::error::ApiError::UnsupportedFileType(
            format!("Unsupported file extension '{}'. Supported formats: jpg, jpeg, png, webp, gif", extension)
        )),
    }
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

/// Determine Content-Type header from file extension
fn content_type_from_extension(filename: &str) -> &'static str {
    let extension = std::path::Path::new(filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    match extension.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_type_from_extension_jpg() {
        assert_eq!(content_type_from_extension("photo.jpg"), "image/jpeg");
        assert_eq!(content_type_from_extension("photo.JPG"), "image/jpeg");
        assert_eq!(content_type_from_extension("PHOTO.jpg"), "image/jpeg");
    }

    #[test]
    fn test_content_type_from_extension_jpeg() {
        assert_eq!(content_type_from_extension("photo.jpeg"), "image/jpeg");
        assert_eq!(content_type_from_extension("photo.JPEG"), "image/jpeg");
    }

    #[test]
    fn test_content_type_from_extension_png() {
        assert_eq!(content_type_from_extension("photo.png"), "image/png");
        assert_eq!(content_type_from_extension("photo.PNG"), "image/png");
    }

    #[test]
    fn test_content_type_from_extension_webp() {
        assert_eq!(content_type_from_extension("photo.webp"), "image/webp");
        assert_eq!(content_type_from_extension("photo.WEBP"), "image/webp");
    }

    #[test]
    fn test_content_type_from_extension_gif() {
        assert_eq!(content_type_from_extension("photo.gif"), "image/gif");
        assert_eq!(content_type_from_extension("photo.GIF"), "image/gif");
    }

    #[test]
    fn test_content_type_from_extension_unknown() {
        assert_eq!(content_type_from_extension("photo.txt"), "application/octet-stream");
        assert_eq!(content_type_from_extension("photo.pdf"), "application/octet-stream");
        assert_eq!(content_type_from_extension("photo"), "application/octet-stream");
    }

    #[test]
    fn test_validate_file_extension_valid() {
        assert!(validate_file_extension("jpg").is_ok());
        assert!(validate_file_extension("JPG").is_ok());
        assert!(validate_file_extension("jpeg").is_ok());
        assert!(validate_file_extension("JPEG").is_ok());
        assert!(validate_file_extension("png").is_ok());
        assert!(validate_file_extension("PNG").is_ok());
        assert!(validate_file_extension("webp").is_ok());
        assert!(validate_file_extension("WEBP").is_ok());
        assert!(validate_file_extension("gif").is_ok());
        assert!(validate_file_extension("GIF").is_ok());
    }

    #[test]
    fn test_validate_file_extension_invalid() {
        assert!(validate_file_extension("txt").is_err());
        assert!(validate_file_extension("pdf").is_err());
        assert!(validate_file_extension("doc").is_err());
        assert!(validate_file_extension("exe").is_err());
    }

    #[test]
    fn test_determine_file_extension_from_content_type() {
        let ct = Some("image/jpeg".to_string());
        let result = determine_file_extension(&ct, &None);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "jpg");

        let ct = Some("image/png".to_string());
        let result = determine_file_extension(&ct, &None);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "png");

        let ct = Some("image/webp".to_string());
        let result = determine_file_extension(&ct, &None);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "webp");

        let ct = Some("image/gif".to_string());
        let result = determine_file_extension(&ct, &None);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "gif");
    }

    #[test]
    fn test_determine_file_extension_from_filename() {
        let filename = Some("photo.jpg".to_string());
        let result = determine_file_extension(&None, &filename);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "jpg");

        let filename = Some("photo.PNG".to_string());
        let result = determine_file_extension(&None, &filename);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "png");
    }

    #[test]
    fn test_determine_file_extension_no_input() {
        let result = determine_file_extension(&None, &None);
        assert!(result.is_err());
    }

    #[test]
    fn test_filename_generation() {
        // Test that recipe ID + extension format is correct
        let recipe_id = "abc-123";
        let extension = "jpg";
        let filename = format!("{}.{}", recipe_id, extension);
        assert_eq!(filename, "abc-123.jpg");
    }
}
