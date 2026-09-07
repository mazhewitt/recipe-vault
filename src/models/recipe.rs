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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub photo_filename: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_by: Option<String>,
    /// Tag names, sorted alphabetically. Loaded separately (not a recipes column),
    /// and always serialised so the frontend can rely on the field existing.
    #[sqlx(skip)]
    #[serde(default)]
    pub tags: Vec<String>,
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
    pub difficulty: Option<i32>,
    #[serde(default)]
    pub ingredients: Vec<CreateIngredientInput>,
    #[serde(default)]
    pub steps: Vec<CreateStepInput>,
    #[serde(default)]
    pub tags: Vec<String>,
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
    pub difficulty: Option<i32>,
    #[serde(default)]
    pub ingredients: Option<Vec<CreateIngredientInput>>,
    #[serde(default)]
    pub steps: Option<Vec<CreateStepInput>>,
    /// `None` leaves tags alone, `Some` replaces the whole set (`Some(vec![])` clears them).
    #[serde(default)]
    pub tags: Option<Vec<String>>,
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
        if let Some(desc) = &self.description
            && desc.len() > 2000 {
                return Err("Description exceeds maximum length of 2000 characters".to_string());
            }
        normalize_tags(&self.tags)?;
        Ok(())
    }
}

/// Maximum number of tags a single recipe may carry
pub const MAX_TAGS_PER_RECIPE: usize = 10;

/// Maximum length of a normalised tag name
pub const MAX_TAG_LENGTH: usize = 30;

/// Normalise a single tag name: trim, lowercase, collapse internal whitespace.
/// Returns None when the result is not 1–30 characters of `[a-z0-9 -]`.
pub fn normalize_tag(tag: &str) -> Option<String> {
    let normalized = tag
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ");

    let length = normalized.chars().count();
    if length == 0 || length > MAX_TAG_LENGTH {
        return None;
    }
    if !normalized
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == ' ' || c == '-')
    {
        return None;
    }

    Some(normalized)
}

/// Normalise a list of tag names, rejecting the whole list if any tag is invalid
/// or if more than `MAX_TAGS_PER_RECIPE` distinct tags remain. Duplicates are
/// collapsed, keeping the first occurrence.
pub fn normalize_tags(tags: &[String]) -> Result<Vec<String>, String> {
    let mut normalized: Vec<String> = Vec::with_capacity(tags.len());

    for tag in tags {
        let name = normalize_tag(tag).ok_or_else(|| {
            format!(
                "Invalid tag '{}': tags must be 1-{} characters of lowercase letters, numbers, spaces or hyphens",
                tag, MAX_TAG_LENGTH
            )
        })?;
        if !normalized.contains(&name) {
            normalized.push(name);
        }
    }

    if normalized.len() > MAX_TAGS_PER_RECIPE {
        return Err(format!(
            "Too many tags: {} supplied, maximum is {}",
            normalized.len(),
            MAX_TAGS_PER_RECIPE
        ));
    }

    Ok(normalized)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tags(names: &[&str]) -> Vec<String> {
        names.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn test_normalize_tag_lowercases_and_trims() {
        assert_eq!(normalize_tag("  Gluten Free "), Some("gluten free".to_string()));
        assert_eq!(normalize_tag("MAIN"), Some("main".to_string()));
    }

    #[test]
    fn test_normalize_tag_collapses_internal_whitespace() {
        assert_eq!(normalize_tag("slow   cooker"), Some("slow cooker".to_string()));
        assert_eq!(normalize_tag("slow\tcooker"), Some("slow cooker".to_string()));
    }

    #[test]
    fn test_normalize_tag_allows_digits_and_hyphens() {
        assert_eq!(normalize_tag("Gluten-Free"), Some("gluten-free".to_string()));
        assert_eq!(normalize_tag("5 a day"), Some("5 a day".to_string()));
    }

    #[test]
    fn test_normalize_tag_rejects_invalid_characters() {
        assert_eq!(normalize_tag("main!"), None);
        assert_eq!(normalize_tag("dessert/pudding"), None);
        assert_eq!(normalize_tag("crème"), None);
    }

    #[test]
    fn test_normalize_tag_length_bounds() {
        assert_eq!(normalize_tag(""), None);
        assert_eq!(normalize_tag("   "), None);
        // 1 character is fine
        assert_eq!(normalize_tag("a"), Some("a".to_string()));
        // 30 characters is fine, 31 is not
        let thirty = "a".repeat(30);
        assert_eq!(normalize_tag(&thirty), Some(thirty.clone()));
        assert_eq!(normalize_tag(&"a".repeat(31)), None);
    }

    #[test]
    fn test_normalize_tags_dedupes_preserving_first_occurrence() {
        let result = normalize_tags(&tags(&["Main", "main", " MAIN ", "thai"])).unwrap();
        assert_eq!(result, vec!["main".to_string(), "thai".to_string()]);
    }

    #[test]
    fn test_normalize_tags_rejects_invalid_tag_naming_it() {
        let err = normalize_tags(&tags(&["main", "dessert/pudding"])).unwrap_err();
        assert!(err.contains("dessert/pudding"), "error should name the tag: {}", err);
    }

    #[test]
    fn test_normalize_tags_rejects_more_than_ten() {
        let many: Vec<String> = (0..11).map(|i| format!("tag{}", i)).collect();
        let err = normalize_tags(&many).unwrap_err();
        assert!(err.contains("10"), "error should mention the maximum: {}", err);

        // 10 distinct tags are accepted
        let ten: Vec<String> = (0..10).map(|i| format!("tag{}", i)).collect();
        assert_eq!(normalize_tags(&ten).unwrap().len(), 10);

        // duplicates do not count towards the limit
        let mut with_dupes = ten.clone();
        with_dupes.push("TAG0".to_string());
        assert_eq!(normalize_tags(&with_dupes).unwrap().len(), 10);
    }

    #[test]
    fn test_normalize_tags_empty_input() {
        assert_eq!(normalize_tags(&[]).unwrap(), Vec::<String>::new());
    }
}
