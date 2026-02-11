use recipe_vault::{
    ai::{assess_recipe_difficulty, LlmProvider},
    db::queries,
    models::{
        recipe::{CreateIngredientInput, CreateRecipeInput, CreateStepInput, UpdateRecipeInput},
        Recipe, RecipeIngredient, Step,
    },
};

mod common;

/// Test 9.8: Error handling for invalid difficulty values
#[tokio::test]
async fn test_invalid_difficulty_validation() {
    let pool = common::create_test_db().await;

    // Test: difficulty < 1 should fail validation
    let invalid_input = CreateRecipeInput {
        title: "Test Recipe".to_string(),
        description: Some("Test".to_string()),
        prep_time_minutes: None,
        cook_time_minutes: None,
        servings: None,
        difficulty: Some(0), // Invalid: too low
        ingredients: vec![],
        steps: vec![],
    };

    let result = queries::create_recipe(&pool, invalid_input, None).await;
    // SQLite CHECK constraint should prevent this
    assert!(result.is_err(), "Expected error for difficulty < 1");

    // Test: difficulty > 5 should fail validation
    let invalid_input2 = CreateRecipeInput {
        title: "Test Recipe 2".to_string(),
        description: Some("Test".to_string()),
        prep_time_minutes: None,
        cook_time_minutes: None,
        servings: None,
        difficulty: Some(6), // Invalid: too high
        ingredients: vec![],
        steps: vec![],
    };

    let result2 = queries::create_recipe(&pool, invalid_input2, None).await;
    assert!(result2.is_err(), "Expected error for difficulty > 5");

    // Test: valid difficulty values (1-5) should succeed
    for difficulty in 1..=5 {
        let valid_input = CreateRecipeInput {
            title: format!("Recipe {}", difficulty),
            description: Some("Test".to_string()),
            prep_time_minutes: None,
            cook_time_minutes: None,
            servings: None,
            difficulty: Some(difficulty),
            ingredients: vec![],
            steps: vec![],
        };

        let result = queries::create_recipe(&pool, valid_input, None).await;
        assert!(
            result.is_ok(),
            "Expected success for difficulty {}, got error: {:?}",
            difficulty,
            result.err()
        );
        assert_eq!(result.unwrap().recipe.difficulty, Some(difficulty));
    }
}

/// Test 9.2: AI assessment with sample recipes
#[tokio::test]
async fn test_ai_assessment_with_mock() {
    // Create mock LLM that returns difficulty 3
    let llm = LlmProvider::mock(None);

    // Create a sample recipe
    let recipe = Recipe {
        id: "test-id".to_string(),
        title: "Test Recipe".to_string(),
        description: Some("A test recipe".to_string()),
        prep_time_minutes: Some(15),
        cook_time_minutes: Some(30),
        servings: Some(4),
        difficulty: None,
        photo_filename: None,
        created_at: "2024-01-01T00:00:00Z".to_string(),
        updated_at: "2024-01-01T00:00:00Z".to_string(),
        created_by: None,
        updated_by: None,
    };

    let ingredients = vec![RecipeIngredient {
        id: "ing-1".to_string(),
        recipe_id: "test-id".to_string(),
        position: 0,
        name: "flour".to_string(),
        quantity: Some(2.0),
        unit: Some("cups".to_string()),
        notes: None,
    }];

    let steps = vec![Step {
        id: "step-1".to_string(),
        recipe_id: "test-id".to_string(),
        position: 0,
        instruction: "Mix ingredients".to_string(),
        duration_minutes: Some(5),
        temperature_value: None,
        temperature_unit: None,
    }];

    // Test assessment
    let result = assess_recipe_difficulty(&llm, &recipe, &ingredients, &steps).await;

    // Mock returns difficulty 3
    assert!(result.is_ok(), "Expected successful assessment");
    let difficulty = result.unwrap();
    assert!(
        (1..=5).contains(&difficulty),
        "Difficulty should be 1-5, got {}",
        difficulty
    );
}

/// Test 9.10: Verify existing recipes still function (CRUD regression)
#[tokio::test]
async fn test_existing_recipe_crud_with_difficulty() {
    let pool = common::create_test_db().await;

    // Create recipe with difficulty
    let input = CreateRecipeInput {
        title: "Test Recipe".to_string(),
        description: Some("Test description".to_string()),
        prep_time_minutes: Some(15),
        cook_time_minutes: Some(30),
        servings: Some(4),
        difficulty: Some(3),
        ingredients: vec![CreateIngredientInput {
            name: "flour".to_string(),
            quantity: Some(2.0),
            unit: Some("cups".to_string()),
            notes: None,
        }],
        steps: vec![CreateStepInput {
            instruction: "Mix ingredients".to_string(),
            duration_minutes: Some(5),
            temperature_value: Some(180),
            temperature_unit: Some("Celsius".to_string()),
        }],
    };

    // Test CREATE
    let created = queries::create_recipe(&pool, input, None)
        .await
        .expect("Failed to create recipe");
    assert_eq!(created.recipe.title, "Test Recipe");
    assert_eq!(created.recipe.difficulty, Some(3));
    assert_eq!(created.ingredients.len(), 1);
    assert_eq!(created.steps.len(), 1);

    let recipe_id = created.recipe.id.clone();

    // Test READ
    let fetched = queries::get_recipe(&pool, &recipe_id, None)
        .await
        .expect("Failed to get recipe");
    assert_eq!(fetched.recipe.id, recipe_id);
    assert_eq!(fetched.recipe.difficulty, Some(3));

    // Test UPDATE (change difficulty)
    let update_input = UpdateRecipeInput {
        title: Some("Updated Recipe".to_string()),
        description: None,
        prep_time_minutes: None,
        cook_time_minutes: None,
        servings: None,
        difficulty: Some(5), // Change difficulty
        ingredients: None,
        steps: None,
    };

    let updated = queries::update_recipe(&pool, &recipe_id, update_input, None, None)
        .await
        .expect("Failed to update recipe");
    assert_eq!(updated.recipe.title, "Updated Recipe");
    assert_eq!(updated.recipe.difficulty, Some(5));

    // Test DELETE
    queries::delete_recipe(&pool, &recipe_id, None)
        .await
        .expect("Failed to delete recipe");

    // Verify deleted
    let result = queries::get_recipe(&pool, &recipe_id, None).await;
    assert!(result.is_err(), "Recipe should be deleted");
}

/// Test: Recipe without difficulty specified (NULL) works correctly
#[tokio::test]
async fn test_recipe_without_difficulty() {
    let pool = common::create_test_db().await;

    // Create recipe without difficulty
    let input = CreateRecipeInput {
        title: "No Difficulty Recipe".to_string(),
        description: Some("Test".to_string()),
        prep_time_minutes: Some(10),
        cook_time_minutes: Some(20),
        servings: Some(2),
        difficulty: None, // No difficulty
        ingredients: vec![],
        steps: vec![],
    };

    let created = queries::create_recipe(&pool, input, None)
        .await
        .expect("Should create recipe without difficulty");

    assert_eq!(created.recipe.difficulty, None);

    // Verify it can be retrieved
    let fetched = queries::get_recipe(&pool, &created.recipe.id, None)
        .await
        .expect("Should fetch recipe");
    assert_eq!(fetched.recipe.difficulty, None);
}

/// Test 9.5 & 4.5: User-specified difficulty is preserved (not auto-assigned)
#[tokio::test]
async fn test_user_specified_difficulty_preserved() {
    let pool = common::create_test_db().await;

    // Create recipe WITH user-specified difficulty
    let input = CreateRecipeInput {
        title: "User Rated Recipe".to_string(),
        description: Some("Test".to_string()),
        prep_time_minutes: Some(10),
        cook_time_minutes: Some(20),
        servings: Some(4),
        difficulty: Some(4), // User specified
        ingredients: vec![CreateIngredientInput {
            name: "test".to_string(),
            quantity: Some(1.0),
            unit: None,
            notes: None,
        }],
        steps: vec![CreateStepInput {
            instruction: "test".to_string(),
            duration_minutes: None,
            temperature_value: None,
            temperature_unit: None,
        }],
    };

    let created = queries::create_recipe(&pool, input, None)
        .await
        .expect("Should create recipe");

    // Verify user's difficulty is preserved
    assert_eq!(
        created.recipe.difficulty,
        Some(4),
        "User-specified difficulty should be preserved"
    );

    // Note: In the actual handler, auto-assignment only happens if difficulty is None
    // This test verifies the data layer preserves user-specified values
}
