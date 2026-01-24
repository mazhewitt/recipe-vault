use serde::{Deserialize, Serialize};

/// A specific ingredient instance used in a recipe.
/// Note: This is recipe-specific, not a normalized ingredient catalog.
/// Future enhancement could extract ingredient names to a separate table
/// to enable queries like "find all recipes with coriander".
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RecipeIngredient {
    pub id: String,
    pub recipe_id: String,
    pub position: i32,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantity: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}
