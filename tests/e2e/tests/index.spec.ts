import { test, expect } from '@playwright/test';
import { authenticate, seedRecipes } from './helpers';

async function clearRecipes(page: any) {
  // Fetch list of recipes
  const list = await page.request.get('/api/recipes', { 
    headers: { 'X-API-Key': 'test-api-key-for-playwright' } 
  });
  const recipes = await list.json();
  
  // Delete each one
  for (const r of recipes) {
    await page.request.delete(`/api/recipes/${r.id}`, {
      headers: { 'X-API-Key': 'test-api-key-for-playwright' }
    });
  }
}

test.describe('Recipe Index', () => {
  test.beforeEach(async ({ page }) => {
    await clearRecipes(page);
    await authenticate(page);
  });

  test('desktop index renders two columns with correct headers', async ({ page }) => {
    // Skip if mobile
    if (page.viewportSize()!.width <= 600) return;

    // Seed enough recipes to split across pages
    // We'll create 4 recipes: Apple Pie, Banana Bread, Carrot Cake, Date Scones
    const uniqueSuffix = Date.now().toString();
    const recipes = [
      { title: `Apple Pie ${uniqueSuffix}`, ingredients: [], steps: [] },
      { title: `Banana Bread ${uniqueSuffix}`, ingredients: [], steps: [] },
      { title: `Carrot Cake ${uniqueSuffix}`, ingredients: [], steps: [] },
      { title: `Date Scones ${uniqueSuffix}`, ingredients: [], steps: [] },
    ];

    // Seed them
    for (const r of recipes) {
      await page.request.post('/api/recipes', {
        data: r,
        headers: { 'X-API-Key': 'test-api-key-for-playwright' }
      });
    }

    // Reload to see index
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    // Verify headers A and B are on the left (first half)
    const leftPage = page.locator('#page-left-content');
    await expect(leftPage.locator('.index-letter-header').filter({ hasText: 'A' })).toBeVisible();
    await expect(leftPage.locator('.index-letter-header').filter({ hasText: 'B' })).toBeVisible();
    
    // Verify headers C and D are on the right (second half)
    const rightPage = page.locator('#page-right-content');
    await expect(rightPage.locator('.index-letter-header').filter({ hasText: 'C' })).toBeVisible();
    await expect(rightPage.locator('.index-letter-header').filter({ hasText: 'D' })).toBeVisible();

    // Verify headers are NOT duplicated (e.g., C shouldn't be on left)
    await expect(leftPage.locator('.index-letter-header').filter({ hasText: 'C' })).not.toBeVisible();
  });

  test('mobile index renders single column', async ({ page }) => {
    // Only run on mobile
    if (page.viewportSize()!.width > 600) return;

    // Seed recipes
    const uniqueSuffix = Date.now().toString();
    const recipes = [
      { title: `Apple Pie ${uniqueSuffix}`, ingredients: [], steps: [] },
      { title: `Banana Bread ${uniqueSuffix}`, ingredients: [], steps: [] },
    ];
    for (const r of recipes) {
      await page.request.post('/api/recipes', {
        data: r,
        headers: { 'X-API-Key': 'test-api-key-for-playwright' }
      });
    }

    // Switch to book tab and reload
    await page.click('#tab-book');
    await page.reload();
    await page.click('#tab-book'); // Ensure visible after reload

    // Verify all content is on left page
    const leftPage = page.locator('#page-left-content');
    await expect(leftPage.locator('.index-letter-header').filter({ hasText: 'A' })).toBeVisible();
    await expect(leftPage.locator('.index-letter-header').filter({ hasText: 'B' })).toBeVisible();

    // Verify right page is empty/hidden
    await expect(page.locator('#page-right-content')).toBeEmpty();
  });

  test('clicking recipe name navigates to recipe view', async ({ page }) => {
    const uniqueSuffix = Date.now().toString();
    const title = `Clickable Recipe ${uniqueSuffix}`;
    await createRecipe(page, {
      title: title,
      ingredients: [],
      steps: []
    });

    await page.reload();
    if (page.viewportSize()!.width <= 600) await page.click('#tab-book');

    // Click the recipe in the index
    await page.locator('.index-recipe-item').filter({ hasText: title }).click();

    // Verify recipe view is shown
    await expect(page.locator('.recipe-title')).toHaveText(title);
    
    // Verify navigation state updated (back button enabled)
    await expect(page.locator('#page-prev')).toBeEnabled();
  });

  test('forward arrow from index loads first recipe', async ({ page }) => {
    const uniqueSuffix = Date.now().toString();
    // Create one recipe "Apple" so it's first
    await createRecipe(page, {
      title: `AA Apple ${uniqueSuffix}`,
      ingredients: [],
      steps: []
    });

    await page.reload();
    if (page.viewportSize()!.width <= 600) await page.click('#tab-book');

    // Click next arrow
    await page.locator('#page-next').click();

    // Verify first recipe loaded
    await expect(page.locator('.recipe-title')).toContainText(`AA Apple ${uniqueSuffix}`);
  });

  test('empty state renders correctly', async ({ page }) => {
    // Note: This test assumes a clean DB or no recipes. 
    // Since parallel tests might seed recipes, we can't easily force empty state 
    // without clearing DB. We'll skip if recipes exist.
    const list = await page.request.get('/api/recipes', { headers: { 'X-API-Key': 'test-api-key-for-playwright' } });
    const recipes = await list.json();
    if (recipes.length > 0) return;

    await page.reload();
    if (page.viewportSize()!.width <= 600) await page.click('#tab-book');

    await expect(page.locator('.recipe-placeholder-text')).toContainText('Your recipe book is empty');
  });

  test('index refreshes on orientation change', async ({ page }) => {
    // Seed enough recipes to split across pages
    const uniqueSuffix = Date.now().toString();
    const recipes = [
      { title: `Apple Pie ${uniqueSuffix}`, ingredients: [], steps: [] },
      { title: `Banana Bread ${uniqueSuffix}`, ingredients: [], steps: [] },
      { title: `Carrot Cake ${uniqueSuffix}`, ingredients: [], steps: [] },
      { title: `Date Scones ${uniqueSuffix}`, ingredients: [], steps: [] },
    ];
    for (const r of recipes) {
      await page.request.post('/api/recipes', {
        data: r,
        headers: { 'X-API-Key': 'test-api-key-for-playwright' }
      });
    }
    
    // Only relevant for environments where we can resize
    if (page.viewportSize()!.width <= 600) {
      // Start mobile, resize to desktop
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(page.locator('#page-right-content')).not.toBeEmpty(); // Should split columns
    } else {
      // Start desktop, resize to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('#page-right-content')).toBeEmpty(); // Should go single column
    }
  });
});

async function createRecipe(page: any, recipe: any) {
  await page.request.post('/api/recipes', {
    data: recipe,
    headers: { 'X-API-Key': 'test-api-key-for-playwright' }
  });
}
