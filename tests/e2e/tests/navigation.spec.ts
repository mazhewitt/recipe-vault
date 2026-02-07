import { test, expect } from '@playwright/test';
import { authenticate, seedRecipes, waitForRecipeList } from './helpers';

// Helper to get navigation selectors based on viewport
function getNavSelectors(page: any) {
  const isMobile = page.viewportSize()!.width <= 600;
  return {
    prev: isMobile ? '#mobile-edge-prev' : '#page-prev',
    next: isMobile ? '#mobile-edge-next' : '#page-next'
  };
}

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
    const nav = getNavSelectors(page);
    await page.locator(nav.next).click();

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
    const nav = getNavSelectors(page);
    await page.locator(nav.prev).click();

    // Wait for new recipe to load
    await page.waitForTimeout(500);
    const firstTitle = await page.locator('.recipe-title').textContent();

    // Titles should be different
    expect(firstTitle).not.toBe(secondTitle);
  });

  test('navigation buttons disable at boundaries', async ({ page }) => {
    // Seed multiple recipes
    const recipeIds = await seedRecipes(page, 3);

    // On page load, the index should be displayed
    await page.waitForTimeout(500);

    const nav = getNavSelectors(page);
    const isMobile = page.viewportSize()!.width <= 600;

    // Previous button should be disabled on index (page zero)
    if (isMobile) {
      await expect(page.locator(nav.prev)).toHaveClass(/disabled/);
      await expect(page.locator(nav.next)).not.toHaveClass(/disabled/);
    } else {
      await expect(page.locator(nav.prev)).toBeDisabled();
      await expect(page.locator(nav.next)).not.toBeDisabled();
    }

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

    // Previous button should be ENABLED on first recipe (goes back to index)
    if (isMobile) {
      await expect(page.locator(nav.prev)).not.toHaveClass(/disabled/);
      await expect(page.locator(nav.next)).not.toHaveClass(/disabled/);
    } else {
      await expect(page.locator(nav.prev)).not.toBeDisabled();
      await expect(page.locator(nav.next)).not.toBeDisabled();
    }

    // Navigate to last recipe (we know we have 3 recipes)
    const recipeCount = recipes.length;
    for (let i = 1; i < recipeCount; i++) {
      await page.locator(nav.next).click();
      // Wait for navigation to complete and state to update
      await page.evaluate(async () => {
        // @ts-ignore - updateNavigationState is defined in app.js
        await updateNavigationState();
      });
      await page.waitForTimeout(300);
    }

    // Next button should be disabled on last recipe
    if (isMobile) {
      await expect(page.locator(nav.next)).toHaveClass(/disabled/);
      await expect(page.locator(nav.prev)).not.toHaveClass(/disabled/);
    } else {
      await expect(page.locator(nav.next)).toBeDisabled();
      await expect(page.locator(nav.prev)).not.toBeDisabled();
    }
  });
});
