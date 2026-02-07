import { test, expect } from '@playwright/test';
import { authenticate, createRecipe, waitForRecipeList } from './helpers';

test.describe('Recipe Display', () => {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('recipe title, ingredients, and steps render', async ({ page }) => {
    const title = `Test Recipe ${uniqueSuffix}`;
    // Create a recipe
    const recipeId = await createRecipe(page, {
      title: title,
      description: 'A test recipe for display testing',
      ingredients: [
        { name: 'flour', quantity: 1, unit: 'cup' },
        { name: 'eggs', quantity: 2 },
        { name: 'milk', quantity: 0.5, unit: 'cup' },
      ],
      steps: [
        { step_number: 1, instruction: 'Mix flour and eggs' },
        { step_number: 2, instruction: 'Add milk' },
        { step_number: 3, instruction: 'Bake for 20 minutes' },
      ],
      prep_time_minutes: 10,
      cook_time_minutes: 20,
      servings: 4,
    });

    // Display the recipe by calling fetchAndDisplayRecipe directly
    await page.evaluate((id) => {
      // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
      fetchAndDisplayRecipe(id);
    }, recipeId);

    // Wait for recipe to render
    await page.waitForTimeout(500);

    // Verify title in the book interface
    await expect(page.locator('.recipe-title')).toHaveText(title);

    // Verify ingredients section exists and contains items
    const ingredientsSection = page.locator('.ingredients-list');
    await expect(ingredientsSection).toBeVisible();
    await expect(ingredientsSection).toContainText('1 cup flour');
    await expect(ingredientsSection).toContainText('2 eggs');
    await expect(ingredientsSection).toContainText('0.5 cup milk');

    // Verify preparation steps exist in right page
    const isMobile = await page.viewportSize()!.width <= 600;
    const rightContent = page.locator(isMobile ? '#page-left-content' : '#page-right-content');
    await expect(rightContent).toBeVisible();
    await expect(rightContent).toContainText('Mix flour and eggs');
    await expect(rightContent).toContainText('Add milk');
    await expect(rightContent).toContainText('Bake for 20 minutes');
  });

  test('long recipe content scrolls', async ({ page }) => {
    const title = `Long Recipe ${uniqueSuffix}`;
    // Create a recipe with many ingredients and steps
    const manyIngredients = Array.from({ length: 30 }, (_, i) => ({
      name: `Ingredient ${i + 1}`,
      quantity: i + 1,
      unit: 'unit',
    }));
    const manySteps = Array.from({ length: 30 }, (_, i) => ({
      step_number: i + 1,
      instruction: `Step ${i + 1}: Do something`,
    }));

    const recipeId = await createRecipe(page, {
      title: title,
      description: 'A recipe with lots of ingredients and steps',
      ingredients: manyIngredients,
      steps: manySteps,
    });

    // Display the recipe
    await page.evaluate((id) => {
      // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
      fetchAndDisplayRecipe(id);
    }, recipeId);

    // Wait for recipe to render
    await page.waitForTimeout(500);

    // Verify left page (ingredients) is scrollable
    const leftPage = page.locator('#page-left');
    await expect(leftPage).toBeVisible();

    // Check that overflow is set to allow scrolling
    const overflowY = await leftPage.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.overflowY;
    });

    // Should be 'auto' or 'scroll'
    expect(['auto', 'scroll']).toContain(overflowY);

    // Verify we can see the first ingredient
    await expect(page.locator('.ingredients-list')).toContainText('Ingredient 1');

    // Scroll down within the left page
    await leftPage.evaluate(el => el.scrollTop = el.scrollHeight);

    // Wait a bit for scroll to complete
    await page.waitForTimeout(200);

    // Verify we can see later ingredients after scrolling
    await expect(page.locator('.ingredients-list')).toContainText('Ingredient 30');
  });
});
