use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::{RecipeIngredient, Step};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Recipe {
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prep_time_minutes: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cook_time_minutes: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub servings: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_by: Option<String>,
}

/// Full recipe with ingredients and steps
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecipeWithDetails {
    #[serde(flatten)]
    pub recipe: Recipe,
    pub ingredients: Vec<RecipeIngredient>,
    pub steps: Vec<Step>,
}

/// Input for creating a recipe
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRecipeInput {
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub prep_time_minutes: Option<i32>,
    #[serde(default)]
    pub cook_time_minutes: Option<i32>,
    #[serde(default)]
    pub servings: Option<i32>,
    #[serde(default)]
    pub ingredients: Vec<CreateIngredientInput>,
    #[serde(default)]
    pub steps: Vec<CreateStepInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIngredientInput {
    pub name: String,
    #[serde(default)]
    pub quantity: Option<f64>,
    #[serde(default)]
    pub unit: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStepInput {
    pub instruction: String,
    #[serde(default)]
    pub duration_minutes: Option<i32>,
    #[serde(default)]
    pub temperature_value: Option<i32>,
    #[serde(default)]
    pub temperature_unit: Option<String>,
}

/// Input for updating a recipe
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateRecipeInput {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub prep_time_minutes: Option<i32>,
    #[serde(default)]
    pub cook_time_minutes: Option<i32>,
    #[serde(default)]
    pub servings: Option<i32>,
    #[serde(default)]
    pub ingredients: Option<Vec<CreateIngredientInput>>,
    #[serde(default)]
    pub steps: Option<Vec<CreateStepInput>>,
}

impl Recipe {
    /// Calculate total time (prep + cook)
    pub fn total_time_minutes(&self) -> Option<i32> {
        match (self.prep_time_minutes, self.cook_time_minutes) {
            (Some(prep), Some(cook)) => Some(prep + cook),
            (Some(prep), None) => Some(prep),
            (None, Some(cook)) => Some(cook),
            (None, None) => None,
        }
    }

    /// Generate a new UUID for a recipe
    pub fn new_id() -> String {
        Uuid::new_v4().to_string()
    }
}

impl CreateRecipeInput {
    /// Validate the input
    pub fn validate(&self) -> Result<(), String> {
        if self.title.trim().is_empty() {
            return Err("Title cannot be empty".to_string());
        }
        if self.title.len() > 200 {
            return Err("Title exceeds maximum length of 200 characters".to_string());
        }
        if let Some(desc) = &self.description {
            if desc.len() > 2000 {
                return Err("Description exceeds maximum length of 2000 characters".to_string());
            }
        }
        Ok(())
    }
}
