import { test, expect } from '@playwright/test';
import { authenticate, seedRecipes, waitForRecipeList } from './helpers';

test.describe('Recipe Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('next arrow navigates to next recipe', async ({ page }) => {
    // Seed multiple recipes
    const recipeIds = await seedRecipes(page, 3);

    // Load the first recipe
    await page.evaluate((id) => {
      // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
      fetchAndDisplayRecipe(id);
    }, recipeIds[0]);

    // Wait for recipe to load
    await expect(page.locator('.recipe-title')).toBeVisible();
    const firstTitle = await page.locator('.recipe-title').textContent();

    // Click next arrow
    await page.locator('#page-next').click();

    // Wait for new recipe to load
    await page.waitForTimeout(500);
    const secondTitle = await page.locator('.recipe-title').textContent();

    // Titles should be different
    expect(firstTitle).not.toBe(secondTitle);
  });

  test('previous arrow navigates to previous recipe', async ({ page }) => {
    // Seed multiple recipes
    const recipeIds = await seedRecipes(page, 3);

    // Load the second recipe (index 1)
    await page.evaluate((id) => {
      // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
      fetchAndDisplayRecipe(id);
    }, recipeIds[1]);

    // Wait for recipe to load
    await expect(page.locator('.recipe-title')).toBeVisible();
    const secondTitle = await page.locator('.recipe-title').textContent();

    // Click previous arrow
    await page.locator('#page-prev').click();

    // Wait for new recipe to load
    await page.waitForTimeout(500);
    const firstTitle = await page.locator('.recipe-title').textContent();

    // Titles should be different
    expect(firstTitle).not.toBe(secondTitle);
  });

  test('navigation buttons disable at boundaries', async ({ page }) => {
    // Seed multiple recipes
    const recipeIds = await seedRecipes(page, 3);

    // Fetch the recipe list to see what order they're in
    const recipes = await page.evaluate(async () => {
      // @ts-ignore - fetchRecipeList is defined in app.js
      return await fetchRecipeList(true);
    });

    // Load the FIRST recipe in the list (not necessarily recipeIds[0])
    const firstRecipeInList = recipes[0].id;

    await page.evaluate(async (id) => {
      // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
      await fetchAndDisplayRecipe(id);
      // @ts-ignore - updateNavigationState is defined in app.js
      await updateNavigationState();
    }, firstRecipeInList);

    await expect(page.locator('.recipe-title')).toBeVisible();

    // Previous button should be disabled on first recipe
    await expect(page.locator('#page-prev')).toBeDisabled();
    await expect(page.locator('#page-next')).not.toBeDisabled();

    // Navigate to last recipe (we know we have 3 recipes)
    const recipeCount = recipes.length;
    for (let i = 1; i < recipeCount; i++) {
      await page.locator('#page-next').click();
      // Wait for navigation to complete and state to update
      await page.evaluate(async () => {
        // @ts-ignore - updateNavigationState is defined in app.js
        await updateNavigationState();
      });
      await page.waitForTimeout(300);
    }

    // Next button should be disabled on last recipe
    await expect(page.locator('#page-next')).toBeDisabled();
    await expect(page.locator('#page-prev')).not.toBeDisabled();
  });
});
