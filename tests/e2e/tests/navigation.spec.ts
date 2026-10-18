import { test, expect } from '@playwright/test';
import { authenticate, seedRecipes, openRecipe, useContentsMode } from './helpers';

// Helper to get navigation selectors based on viewport
function getNavSelectors(page: any) {
  const isMobile = page.viewportSize()!.width <= 600;
  return {
    prev: isMobile ? '#gutter-prev' : '#page-prev',
    next: isMobile ? '#gutter-next' : '#page-next'
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
    await openRecipe(page, recipeIds[0]);
    const firstTitle = await page.locator('#page-right-content .recipe-title').textContent();

    // Contents mode: a recipe opens in cook mode, where the left page carries
    // the ingredients instead of the contents
    await useContentsMode(page);

    // The open recipe is marked in the contents column on the left page
    const current = page.locator('#page-left-content .index-recipe-item.current');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText(firstTitle!);
    await expect(current).toHaveAttribute('aria-current', 'page');

    // Click next arrow
    const nav = getNavSelectors(page);
    await page.locator(nav.next).click();

    // Wait for new recipe to load
    await expect(page.locator('#page-right-content .recipe-title')).not.toHaveText(firstTitle!, { timeout: 10000 });
    const secondTitle = await page.locator('#page-right-content .recipe-title').textContent();

    // Turning the page put the spread back in cook mode, as opening a recipe
    // always does; the contents follow the page whenever they are on it
    await useContentsMode(page);

    // The contents highlight follows the page
    const nowCurrent = page.locator('#page-left-content .index-recipe-item.current');
    await expect(nowCurrent).toHaveCount(1);
    await expect(nowCurrent).toContainText(secondTitle!);
  });

  test('previous arrow navigates to previous recipe', async ({ page }) => {
    // Seed multiple recipes
    const recipeIds = await seedRecipes(page, 3);

    // Load the second recipe (index 1)
    await openRecipe(page, recipeIds[1]);
    const secondTitle = await page.locator('#page-right-content .recipe-title').textContent();

    // Click previous arrow
    const nav = getNavSelectors(page);
    await page.locator(nav.prev).click();

    // Wait for new recipe to load
    await expect(page.locator('#page-right-content .recipe-title')).not.toHaveText(secondTitle!, { timeout: 10000 });
    const firstTitle = await page.locator('#page-right-content .recipe-title').textContent();
    expect(firstTitle).not.toBe(secondTitle);
  });

  test('navigation buttons disable at boundaries', async ({ page }) => {
    // Seed multiple recipes
    const recipeIds = await seedRecipes(page, 3);

    // On page load, the index should be displayed
    await page.waitForTimeout(500);

    const nav = getNavSelectors(page);
    const isMobile = page.viewportSize()!.width <= 600;

    // Previous button should be disabled on index (page zero). The phone's
    // chevrons live in the recipe page's tab row, so the contents hides them.
    if (isMobile) {
      await expect(page.locator(nav.prev)).toBeHidden();
      await expect(page.locator(nav.next)).toBeHidden();
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
    await expect(page.locator(nav.prev)).toBeEnabled();
    await expect(page.locator(nav.next)).toBeEnabled();

    // Navigate to last recipe (we know we have 3 recipes)
    const recipeCount = recipes.length;
    for (let i = 1; i < recipeCount; i++) {
      // loadNextRecipe returns without doing anything while the shared
      // animation lock is held (a page turn or a tab crossfade), so wait for it
      // to clear: this test is about the boundary rule, not about timing
      await expect.poll(() => page.evaluate(async () => {
        const M = await import('/static/page-transitions.js');
        return M.isAnimating();
      }), { timeout: 10000 }).toBe(false);
      // Await the full navigation cycle (animation + fetch + render)
      await page.evaluate(async () => {
        // @ts-ignore - loadNextRecipe is defined in app.js
        await loadNextRecipe();
        // @ts-ignore - updateNavigationState is defined in app.js
        await updateNavigationState();
      });
      // ...and that it really moved on, before the next hop or the assertion
      await expect(page.locator('#page-right-content .recipe-title'))
        .toHaveText(recipes[i].title, { timeout: 10000 });
    }

    // Next button should be disabled on last recipe
    await expect(page.locator(nav.next)).toBeVisible();
    await expect(page.locator(nav.next)).toBeDisabled();
    await expect(page.locator(nav.prev)).toBeEnabled();
  });
});
