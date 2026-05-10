import { test, expect, Page } from '@playwright/test';
import { authenticate, seedRecipes } from './helpers';

// Switch to the book/recipe panel on mobile (Pixel 5, width ≤ 600px)
async function switchToBookOnMobile(page: Page): Promise<void> {
  if (page.viewportSize()!.width <= 600) {
    await page.click('#tab-book');
  }
}

test.describe('Meal Plan Panel', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  // Task 6.2 — meal_artifact SSE event renders the panel
  test('meal_artifact SSE event renders meal plan panel', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore — renderMealPlan is exposed globally by app.js
      renderMealPlan({
        title: 'Test Dinner',
        guest_count: null,
        recipes: [
          { recipe_id: 'fake-id-1', title: 'Roast Chicken', role: 'centrepiece' },
          { recipe_id: 'fake-id-2', title: 'Roast Potatoes', role: 'side' },
        ],
      });
    });

    await switchToBookOnMobile(page);

    await expect(page.locator('.meal-plan-panel')).toBeVisible();
    await expect(page.locator('.meal-plan-title')).toHaveText('Test Dinner');
  });

  // Task 6.3 — recipe titles and role labels render
  test('meal plan panel shows recipe titles with role labels', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      renderMealPlan({
        title: 'Sunday Roast',
        guest_count: null,
        recipes: [
          { recipe_id: 'id-1', title: 'Beef Wellington', role: 'centrepiece' },
          { recipe_id: 'id-2', title: 'Honey Roasted Parsnips', role: 'side' },
          { recipe_id: 'id-3', title: 'Mushroom Nut Roast', role: 'vegetarian alternative' },
        ],
      });
    });

    await switchToBookOnMobile(page);

    const rows = page.locator('.meal-plan-recipe-row');
    await expect(rows.nth(0)).toContainText('centrepiece');
    await expect(rows.nth(0)).toContainText('Beef Wellington');
    await expect(rows.nth(1)).toContainText('side');
    await expect(rows.nth(1)).toContainText('Honey Roasted Parsnips');
    await expect(rows.nth(2)).toContainText('vegetarian alternative');
    await expect(rows.nth(2)).toContainText('Mushroom Nut Roast');
  });

  // Task 6.4 — guest count badge renders when guest_count is set
  test('guest count badge renders when guest_count is set', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      renderMealPlan({
        title: 'Birthday Feast',
        guest_count: 6,
        recipes: [{ recipe_id: 'id-1', title: 'Birthday Cake', role: 'centrepiece' }],
      });
    });

    await switchToBookOnMobile(page);

    await expect(page.locator('.meal-plan-guest-badge')).toBeVisible();
    await expect(page.locator('.meal-plan-guest-badge')).toContainText('For 6 people');
  });

  // Task 6.5 — guest count badge absent when guest_count is null
  test('guest count badge is absent when guest_count is null', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      renderMealPlan({
        title: 'Simple Dinner',
        guest_count: null,
        recipes: [{ recipe_id: 'id-1', title: 'Pasta', role: 'centrepiece' }],
      });
    });

    await switchToBookOnMobile(page);

    await expect(page.locator('.meal-plan-guest-badge')).not.toBeVisible();
  });

  // Task 6.6 — clicking a recipe title opens the recipe view
  test('clicking recipe title in meal plan opens the recipe view', async ({ page }) => {
    const [recipeId] = await seedRecipes(page, 1);

    await page.evaluate((id) => {
      // @ts-ignore
      renderMealPlan({
        title: 'Click Test Meal',
        guest_count: null,
        recipes: [{ recipe_id: id, title: 'Chicken Curry', role: 'centrepiece' }],
      });
    }, recipeId);

    await switchToBookOnMobile(page);

    // Click the recipe link button
    await page.locator('.meal-plan-recipe-link').first().click();

    // Recipe panel should appear
    await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 5000 });
  });

  // Task 6.7 — action buttons present and disabled in Phase 1
  test('action buttons are present and disabled in Phase 1 state', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      renderMealPlan({
        title: 'Button Test',
        guest_count: null,
        recipes: [{ recipe_id: 'id-1', title: 'Some Dish', role: 'centrepiece' }],
      });
    });

    await switchToBookOnMobile(page);

    await expect(page.locator('.meal-plan-action-btn').filter({ hasText: 'Shopping List' })).toBeDisabled();
    await expect(page.locator('.meal-plan-action-btn').filter({ hasText: 'Cooking Timeline' })).toBeDisabled();
    await expect(page.locator('.meal-plan-action-btn').filter({ hasText: 'Save Meal' })).toBeDisabled();
  });

  // Task 6.8 — recipe_artifact event replaces an open meal plan
  test('recipe_artifact event replaces an open meal plan', async ({ page }) => {
    const [recipeId] = await seedRecipes(page, 1);

    // First render a meal plan
    await page.evaluate(() => {
      // @ts-ignore
      renderMealPlan({
        title: 'To Be Replaced',
        guest_count: null,
        recipes: [{ recipe_id: 'fake-id', title: 'Some Recipe', role: 'centrepiece' }],
      });
    });

    await switchToBookOnMobile(page);
    await expect(page.locator('.meal-plan-panel')).toBeVisible();

    // Display a recipe (overwrites #page-right-content)
    await page.evaluate((id) => {
      // @ts-ignore — fetchAndDisplayRecipe is exposed globally by app.js
      fetchAndDisplayRecipe(id);
    }, recipeId);

    // Wait for recipe title to appear in the left panel
    await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 5000 });

    // Meal plan panel should be gone (replaced by recipe steps in right panel)
    await expect(page.locator('.meal-plan-panel')).not.toBeVisible();
  });

  // Task 6.9 — meal_artifact event replaces an open recipe
  test('meal_artifact event replaces recipe in the right panel', async ({ page }) => {
    const [recipeId] = await seedRecipes(page, 1);

    // First display a recipe
    await page.evaluate((id) => {
      // @ts-ignore
      fetchAndDisplayRecipe(id);
    }, recipeId);

    await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 5000 });

    // Now render a meal plan (overwrites #page-right-content)
    await page.evaluate(() => {
      // @ts-ignore
      renderMealPlan({
        title: 'Replacing Recipe',
        guest_count: null,
        recipes: [{ recipe_id: 'fake-id', title: 'Some Dish', role: 'centrepiece' }],
      });
    });

    await switchToBookOnMobile(page);

    // Meal plan panel should now appear in the right panel
    await expect(page.locator('.meal-plan-panel')).toBeVisible();
    await expect(page.locator('.meal-plan-title')).toHaveText('Replacing Recipe');
  });

  // Task 6.10 — full chat flow: mock LLM triggers display_meal_plan via "create a meal plan"
  test('chat message triggers meal plan display via mock LLM', async ({ page }) => {
    // Seed 2 recipes so the mock can build a centrepiece + side meal plan
    await seedRecipes(page, 2);

    // On mobile, switch to chat tab to send a message
    if (page.viewportSize()!.width <= 600) {
      await page.click('#tab-chat');
    }

    await page.locator('#message-input').fill('create a meal plan');
    await page.locator('#message-input').press('Enter');

    // Wait for user message to appear in the chat log
    await expect(page.locator('#messages')).toContainText('User: create a meal plan', {
      timeout: 5000,
    });

    // Wait for the AI to respond (mock completes the two-step flow)
    await expect(page.locator('#messages')).toContainText('AI:', { timeout: 15000 });

    // Switch to book tab on mobile to see the panel
    await switchToBookOnMobile(page);

    // The meal plan panel should have been rendered by the meal_artifact SSE event
    await expect(page.locator('.meal-plan-panel')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.meal-plan-title')).toHaveText('Mock Dinner Party');
  });
});
