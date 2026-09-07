use crate::ai::llm::{ContentBlock, LlmError, LlmProvider, LlmResponse, Message};
use crate::models::{normalize_tag, Recipe, RecipeIngredient, Step};
use thiserror::Error;

/// System prompt for tag assessment. Also used by the mock provider to
/// recognise a tag-assessment request.
pub const TAG_ASSESSMENT_SYSTEM_PROMPT: &str =
    "You are a culinary expert categorising recipes with short tags.";

/// The fixed course vocabulary. Exactly one of these must appear in the
/// assigned tags; `main` and `dessert` drive the contents Mains and Sweets tabs.
pub const COURSE_TAGS: [&str; 8] = [
    "main", "side", "dessert", "breakfast", "snack", "drink", "sauce", "bread",
];

/// Maximum number of tags kept from an assessment
const MAX_ASSESSED_TAGS: usize = 5;

#[derive(Debug, Error)]
pub enum TagAssessmentError {
    #[error("LLM error: {0}")]
    Llm(#[from] LlmError),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("No course tag in response: {0:?}")]
    MissingCourseTag(Vec<String>),
}

/// Assess the tags of a recipe using AI
///
/// Returns 1-5 normalised, lowercase tags containing exactly one course tag
/// from `COURSE_TAGS`, optionally a cuisine tag and optional diet tags.
pub async fn assess_recipe_tags(
    llm: &LlmProvider,
    recipe: &Recipe,
    ingredients: &[RecipeIngredient],
    steps: &[Step],
) -> Result<Vec<String>, TagAssessmentError> {
    let prompt = format_tag_prompt(recipe, ingredients, steps);

    let messages = vec![Message::User {
        content: vec![ContentBlock::Text { text: prompt }],
    }];

    let response = llm.complete(&messages, &[], Some(TAG_ASSESSMENT_SYSTEM_PROMPT)).await?;

    parse_tag_response(&response)
}

/// Format the structured prompt for tag assessment
fn format_tag_prompt(recipe: &Recipe, ingredients: &[RecipeIngredient], steps: &[Step]) -> String {
    let mut prompt = String::from("Analyze this recipe and assign tags:\n\n");

    // Recipe metadata
    prompt.push_str(&format!("Title: {}\n", recipe.title));

    if let Some(description) = &recipe.description {
        prompt.push_str(&format!("Description: {}\n", description));
    }

    if let Some(prep_time) = recipe.prep_time_minutes {
        prompt.push_str(&format!("Prep time: {} minutes\n", prep_time));
    }

    if let Some(cook_time) = recipe.cook_time_minutes {
        prompt.push_str(&format!("Cook time: {} minutes\n", cook_time));
    }

    if let Some(servings) = recipe.servings {
        prompt.push_str(&format!("Servings: {}\n", servings));
    }

    // Ingredients
    prompt.push_str("\nIngredients:\n");
    for ingredient in ingredients {
        let mut ing_line = String::from("- ");

        if let Some(qty) = ingredient.quantity {
            ing_line.push_str(&format!("{} ", qty));
        }

        if let Some(unit) = &ingredient.unit {
            ing_line.push_str(&format!("{} ", unit));
        }

        ing_line.push_str(&ingredient.name);

        if let Some(notes) = &ingredient.notes {
            ing_line.push_str(&format!(" ({})", notes));
        }

        prompt.push_str(&format!("{}\n", ing_line));
    }

    // Steps
    prompt.push_str("\nSteps:\n");
    for (idx, step) in steps.iter().enumerate() {
        prompt.push_str(&format!("{}. {}\n", idx + 1, step.instruction));
    }

    // Tagging rules
    prompt.push_str(&format!(
        r#"

Tagging rules:
- Assign between 1 and 5 tags, all lowercase.
- Exactly one course tag from this list: {}
- Optionally one cuisine tag (e.g. italian, thai, indian, mexican)
- Optionally diet tags where they clearly apply: vegetarian, vegan, gluten-free
- Tags may only contain lowercase letters, numbers, spaces and hyphens.

Respond with ONLY a JSON array of strings, for example: ["main", "italian", "vegetarian"]
"#,
        COURSE_TAGS.join(" | ")
    ));

    prompt
}

/// Parse the LLM response to extract the assigned tags
///
/// Tolerates code fences and leading prose, drops elements that fail
/// normalisation, dedupes, and caps the result at `MAX_ASSESSED_TAGS`.
fn parse_tag_response(response: &LlmResponse) -> Result<Vec<String>, TagAssessmentError> {
    // Extract text content from response based on enum variant
    let text = match response {
        LlmResponse::Text(t) => t.as_str(),
        LlmResponse::TextWithToolUse { text, .. } => text.as_str(),
        LlmResponse::ToolUse(_) => {
            return Err(TagAssessmentError::InvalidResponse(
                "Received tool use response instead of text".to_string()
            ));
        }
    };

    // Strip code fences and any prose before the array
    let cleaned = strip_code_fences(text);
    let start = cleaned.find('[').ok_or_else(|| {
        TagAssessmentError::InvalidResponse(format!("No JSON array found in: {}", cleaned.trim()))
    })?;
    let end = cleaned.rfind(']').ok_or_else(|| {
        TagAssessmentError::InvalidResponse(format!("Unterminated JSON array in: {}", cleaned.trim()))
    })?;
    if end < start {
        return Err(TagAssessmentError::InvalidResponse(
            format!("Unterminated JSON array in: {}", cleaned.trim())
        ));
    }

    let raw: Vec<String> = serde_json::from_str(&cleaned[start..=end]).map_err(|e| {
        TagAssessmentError::InvalidResponse(format!("Could not parse tag array: {}", e))
    })?;

    // Normalise, drop failures, dedupe preserving order, cap at 5
    let mut tags: Vec<String> = Vec::new();
    for tag in &raw {
        if let Some(normalized) = normalize_tag(tag)
            && !tags.contains(&normalized)
        {
            tags.push(normalized);
            if tags.len() == MAX_ASSESSED_TAGS {
                break;
            }
        }
    }

    // A tag set without a course tag is useless to the contents tabs
    if !tags.iter().any(|t| COURSE_TAGS.contains(&t.as_str())) {
        return Err(TagAssessmentError::MissingCourseTag(tags));
    }

    Ok(tags)
}

/// Remove a surrounding ```json / ``` code fence if present
fn strip_code_fences(text: &str) -> String {
    text.replace("```json", "").replace("```", "")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::llm::LlmResponse;

    #[test]
    fn test_parse_tag_response_clean_array() {
        let response = LlmResponse::Text(r#"["main", "indian", "vegetarian"]"#.to_string());
        assert_eq!(
            parse_tag_response(&response).unwrap(),
            vec!["main", "indian", "vegetarian"]
        );
    }

    #[test]
    fn test_parse_tag_response_fenced_array() {
        let response = LlmResponse::Text(
            "```json\n[\"dessert\", \"italian\"]\n```".to_string()
        );
        assert_eq!(
            parse_tag_response(&response).unwrap(),
            vec!["dessert", "italian"]
        );
    }

    #[test]
    fn test_parse_tag_response_prose_wrapped() {
        let response = LlmResponse::Text(
            "Sure! Here are the tags for this recipe:\n[\"main\", \"thai\"]\nHope that helps."
                .to_string(),
        );
        assert_eq!(parse_tag_response(&response).unwrap(), vec!["main", "thai"]);
    }

    #[test]
    fn test_parse_tag_response_mixed_case_and_dedupe() {
        let response = LlmResponse::Text(r#"["Main", " MAIN ", "Gluten Free"]"#.to_string());
        assert_eq!(
            parse_tag_response(&response).unwrap(),
            vec!["main", "gluten free"]
        );
    }

    #[test]
    fn test_parse_tag_response_drops_invalid_and_caps_at_five() {
        let response = LlmResponse::Text(
            r#"["main", "bad!", "italian", "vegetarian", "quick", "cheap", "easy"]"#.to_string(),
        );
        assert_eq!(
            parse_tag_response(&response).unwrap(),
            vec!["main", "italian", "vegetarian", "quick", "cheap"]
        );
    }

    #[test]
    fn test_parse_tag_response_missing_course_tag() {
        let response = LlmResponse::Text(r#"["italian", "vegetarian"]"#.to_string());
        assert!(matches!(
            parse_tag_response(&response),
            Err(TagAssessmentError::MissingCourseTag(_))
        ));
    }

    #[test]
    fn test_parse_tag_response_empty_array() {
        let response = LlmResponse::Text("[]".to_string());
        assert!(matches!(
            parse_tag_response(&response),
            Err(TagAssessmentError::MissingCourseTag(_))
        ));
    }

    #[test]
    fn test_parse_tag_response_no_array() {
        let response = LlmResponse::Text("I couldn't tag this recipe.".to_string());
        assert!(matches!(
            parse_tag_response(&response),
            Err(TagAssessmentError::InvalidResponse(_))
        ));
    }

    #[test]
    fn test_format_tag_prompt_includes_vocabulary() {
        let recipe = Recipe {
            id: "test".to_string(),
            title: "Test Curry".to_string(),
            description: Some("A warming curry".to_string()),
            prep_time_minutes: Some(10),
            cook_time_minutes: Some(20),
            servings: Some(4),
            difficulty: None,
            photo_filename: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            created_by: Some("test@example.com".to_string()),
            updated_by: Some("test@example.com".to_string()),
            tags: vec![],
        };

        let ingredients = vec![RecipeIngredient {
            id: "1".to_string(),
            recipe_id: "test".to_string(),
            position: 0,
            name: "chicken".to_string(),
            quantity: Some(500.0),
            unit: Some("g".to_string()),
            notes: None,
        }];

        let steps = vec![Step {
            id: "1".to_string(),
            recipe_id: "test".to_string(),
            position: 0,
            instruction: "Fry the onions".to_string(),
            duration_minutes: None,
            temperature_value: None,
            temperature_unit: None,
        }];

        let prompt = format_tag_prompt(&recipe, &ingredients, &steps);

        assert!(prompt.contains("Test Curry"));
        assert!(prompt.contains("A warming curry"));
        assert!(prompt.contains("chicken"));
        assert!(prompt.contains("Fry the onions"));
        assert!(prompt.contains("main | side | dessert | breakfast | snack | drink | sauce | bread"));
        assert!(prompt.contains("vegetarian, vegan, gluten-free"));
        assert!(prompt.contains("ONLY a JSON array"));
    }

    #[tokio::test]
    async fn test_assess_recipe_tags_with_mock_provider() {
        let llm = LlmProvider::mock(None);
        let recipe = Recipe {
            id: "test".to_string(),
            title: "Chicken Curry".to_string(),
            description: None,
            prep_time_minutes: None,
            cook_time_minutes: None,
            servings: None,
            difficulty: None,
            photo_filename: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            created_by: None,
            updated_by: None,
            tags: vec![],
        };

        let tags = assess_recipe_tags(&llm, &recipe, &[], &[]).await.unwrap();
        assert_eq!(tags, vec!["main", "curry"]);
    }
}
