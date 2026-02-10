use crate::ai::llm::{ContentBlock, LlmError, LlmProvider, LlmResponse, Message};
use crate::models::{Recipe, RecipeIngredient, Step};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DifficultyAssessmentError {
    #[error("LLM error: {0}")]
    Llm(#[from] LlmError),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Rating out of range: {0} (must be 1-5)")]
    RatingOutOfRange(i32),
}

/// Assess the difficulty of a recipe using AI
///
/// Returns a difficulty rating from 1-5:
/// - 1 = Easy (simple techniques, few ingredients, < 30 min)
/// - 2 = Medium-Easy (basic techniques, moderate ingredients)
/// - 3 = Medium (intermediate techniques, multiple steps)
/// - 4 = Medium-Hard (advanced techniques, timing-sensitive)
/// - 5 = Hard (complex techniques, many steps, precision required)
pub async fn assess_recipe_difficulty(
    llm: &LlmProvider,
    recipe: &Recipe,
    ingredients: &[RecipeIngredient],
    steps: &[Step],
) -> Result<u8, DifficultyAssessmentError> {
    let prompt = format_difficulty_prompt(recipe, ingredients, steps);

    let messages = vec![Message::User {
        content: vec![ContentBlock::Text { text: prompt }],
    }];

    let response = llm.complete(&messages, &[], Some("You are a culinary expert analyzing recipe difficulty.")).await?;

    parse_difficulty_rating(&response)
}

/// Format the structured prompt for difficulty assessment
fn format_difficulty_prompt(recipe: &Recipe, ingredients: &[RecipeIngredient], steps: &[Step]) -> String {
    let mut prompt = String::from("Analyze this recipe and assign a difficulty rating from 1-5:\n\n");

    // Recipe metadata
    prompt.push_str(&format!("Title: {}\n", recipe.title));

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

    // Rating criteria
    prompt.push_str(r#"

Rating criteria:
1 (Easy): Simple techniques, common ingredients, < 6 steps, < 30 min total
2 (Medium-Easy): Basic techniques, readily available ingredients, 6-10 steps, 30-45 min
3 (Medium): Intermediate techniques, some specialty ingredients, 10-15 steps, 45-60 min
4 (Medium-Hard): Advanced techniques (soufflé, tempering), timing-sensitive, 15+ steps, 60-90 min
5 (Hard): Expert techniques (sous vide, molecular), rare ingredients, complex timing, 90+ min

Respond with ONLY a number 1-5.
"#);

    prompt
}

/// Parse the LLM response to extract the difficulty rating
fn parse_difficulty_rating(response: &LlmResponse) -> Result<u8, DifficultyAssessmentError> {
    // Extract text content from response based on enum variant
    let text = match response {
        LlmResponse::Text(t) => t.as_str(),
        LlmResponse::TextWithToolUse { text, .. } => text.as_str(),
        LlmResponse::ToolUse(_) => {
            return Err(DifficultyAssessmentError::InvalidResponse(
                "Received tool use response instead of text".to_string()
            ));
        }
    };

    // Try to parse the rating - extract first digit found
    let trimmed = text.trim();

    // Try to parse the whole string as an integer
    if let Ok(rating) = trimmed.parse::<i32>() {
        if (1..=5).contains(&rating) {
            return Ok(rating as u8);
        } else {
            return Err(DifficultyAssessmentError::RatingOutOfRange(rating));
        }
    }

    // If that fails, try to find a single digit in the text
    let digits: Vec<u32> = trimmed.chars()
        .filter_map(|c: char| c.to_digit(10))
        .collect();

    if digits.len() == 1 {
        let rating = digits[0] as i32;
        if (1..=5).contains(&rating) {
            return Ok(rating as u8);
        } else {
            return Err(DifficultyAssessmentError::RatingOutOfRange(rating));
        }
    }

    Err(DifficultyAssessmentError::InvalidResponse(
        format!("Could not extract rating from: {}", trimmed)
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::llm::LlmResponse;

    #[test]
    fn test_parse_difficulty_rating_valid() {
        let response = LlmResponse::Text("3".to_string());
        assert_eq!(parse_difficulty_rating(&response).unwrap(), 3);
    }

    #[test]
    fn test_parse_difficulty_rating_with_whitespace() {
        let response = LlmResponse::Text("  4  \n".to_string());
        assert_eq!(parse_difficulty_rating(&response).unwrap(), 4);
    }

    #[test]
    fn test_parse_difficulty_rating_out_of_range() {
        let response = LlmResponse::Text("7".to_string());
        assert!(matches!(
            parse_difficulty_rating(&response),
            Err(DifficultyAssessmentError::RatingOutOfRange(7))
        ));
    }

    #[test]
    fn test_parse_difficulty_rating_invalid_text() {
        let response = LlmResponse::Text("This is medium difficulty".to_string());
        assert!(matches!(
            parse_difficulty_rating(&response),
            Err(DifficultyAssessmentError::InvalidResponse(_))
        ));
    }

    #[test]
    fn test_format_difficulty_prompt_includes_criteria() {
        let recipe = Recipe {
            id: "test".to_string(),
            title: "Test Recipe".to_string(),
            description: None,
            prep_time_minutes: Some(10),
            cook_time_minutes: Some(20),
            servings: Some(4),
            difficulty: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            created_by: Some("test@example.com".to_string()),
            updated_by: Some("test@example.com".to_string()),
        };

        let ingredients = vec![
            RecipeIngredient {
                id: "1".to_string(),
                recipe_id: "test".to_string(),
                position: 0,
                name: "flour".to_string(),
                quantity: Some(2.0),
                unit: Some("cups".to_string()),
                notes: None,
            }
        ];

        let steps = vec![
            Step {
                id: "1".to_string(),
                recipe_id: "test".to_string(),
                position: 0,
                instruction: "Mix ingredients".to_string(),
                duration_minutes: None,
                temperature_value: None,
                temperature_unit: None,
            }
        ];

        let prompt = format_difficulty_prompt(&recipe, &ingredients, &steps);

        assert!(prompt.contains("Rating criteria:"));
        assert!(prompt.contains("1 (Easy)"));
        assert!(prompt.contains("5 (Hard)"));
        assert!(prompt.contains("Respond with ONLY a number 1-5"));
    }
}
