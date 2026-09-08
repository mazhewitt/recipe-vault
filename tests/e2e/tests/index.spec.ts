import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, isPhone } from './helpers';

const API_HEADERS = { 'X-API-Key': 'test-api-key-for-playwright' };

/**
 * Empties the book, and proves it emptied. The left/right column split is
 * computed from the FULL recipe list, so a book holding only this test's
 * recipes is a precondition of the header assertions below rather than a
 * convenience — it cannot be scoped away, only guaranteed.
 *
 * The DELETE fails transiently often enough to matter: the e2e server runs a
 * 5-connection pool over one shared-cache in-memory SQLite, and every
 * POST /api/recipes spawns background auto-tag and auto-difficulty writes that
 * hold transactions on the row for ~50ms afterwards. So retry, and assert the
 * result. The previous version discarded every response, and one swallowed 500
 * anywhere in the suite left a stray recipe for a later exact count to trip on.
 *
 * TODO: three spec files carry a copy of this; fold them into helpers.ts.
 */
async function clearRecipes(page: Page) {
  let titles: string[] = [];
  // Three sweeps, then one final read, so the last sweep is checked too.
  for (let attempt = 0; attempt < 4; attempt++) {
    const list = await page.request.get('/api/recipes', { headers: API_HEADERS });
    expect(list.ok(), `GET /api/recipes -> ${list.status()}`).toBeTruthy();
    const remaining: Array<{ id: string; title: string }> = await list.json();
    titles = remaining.map(r => r.title);
    if (remaining.length === 0) return;
    if (attempt === 3) break;
    for (const r of remaining) {
      const res = await page.request.delete(`/api/recipes/${r.id}`, { headers: API_HEADERS });
      // 404 means someone else already removed it, which is still "gone"
      if (!res.ok() && res.status() !== 404) {
        console.warn(`DELETE /api/recipes/${r.id} (${r.title}) -> ${res.status()} ${await res.text()}`);
      }
    }
  }
  expect(titles, 'clearRecipes could not empty the book').toEqual([]);
}

// Helper to get navigation selectors based on viewport
function getNavSelectors(page: Page) {
  const isMobile = page.viewportSize()!.width <= 600;
  return {
    prev: isMobile ? '#mobile-edge-prev' : '#page-prev',
    next: isMobile ? '#mobile-edge-next' : '#page-next'
  };
}

test.describe('Recipe Index', () => {
  test.beforeEach(async ({ page }) => {
    await clearRecipes(page);
    await authenticate(page);
  });

  test('desktop index renders two columns with correct headers', async ({ page }) => {
    // A bare `return` here would report a green tick on the phone projects while
    // asserting nothing; test.skip prints a `-` instead.
    test.skip(isPhone(page), 'the two-column split is above 600px');

    // Seed enough recipes to split across pages
    // We'll create 4 recipes: Apple Pie, Banana Bread, Carrot Cake, Date Scones
    const uniqueSuffix = Date.now().toString();
    const ids: string[] = [];
    for (const t of ['Apple Pie', 'Banana Bread', 'Carrot Cake', 'Date Scones']) {
      ids.push(await createRecipe(page, { title: `${t} ${uniqueSuffix}`, ingredients: [], steps: [] }));
    }

    // Reload to see index
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    // The split index is computed from the whole list, not from these four, so
    // assert the book holds only them before reading anything into the split.
    const items = page.locator('.index-recipe-item');
    await expect(items.filter({ hasText: uniqueSuffix })).toHaveCount(4);
    await expect(items).toHaveCount(4);

    // Verify headers A and B are on the left (first half)
    const leftPage = page.locator('#page-left-content');
    await expect(leftPage.locator('.index-letter-header').filter({ hasText: 'A' })).toBeVisible();
    await expect(leftPage.locator('.index-letter-header').filter({ hasText: 'B' })).toBeVisible();
    await expect(leftPage.locator(`.index-recipe-item[data-recipe-id="${ids[0]}"]`)).toBeVisible();
    await expect(leftPage.locator(`.index-recipe-item[data-recipe-id="${ids[1]}"]`)).toBeVisible();

    // Verify headers C and D are on the right (second half)
    const rightPage = page.locator('#page-right-content');
    await expect(rightPage.locator('.index-letter-header').filter({ hasText: 'C' })).toBeVisible();
    await expect(rightPage.locator('.index-letter-header').filter({ hasText: 'D' })).toBeVisible();
    await expect(rightPage.locator(`.index-recipe-item[data-recipe-id="${ids[2]}"]`)).toBeVisible();
    await expect(rightPage.locator(`.index-recipe-item[data-recipe-id="${ids[3]}"]`)).toBeVisible();

    // Verify headers are NOT duplicated (e.g., C shouldn't be on left)
    await expect(leftPage.locator('.index-letter-header').filter({ hasText: 'C' })).toHaveCount(0);
    await expect(leftPage.locator(`.index-recipe-item[data-recipe-id="${ids[2]}"]`)).toHaveCount(0);
  });

  test('mobile index renders single column', async ({ page }) => {
    test.skip(!isPhone(page), 'single column is the phone layout');

    // Seed recipes
    const uniqueSuffix = Date.now().toString();
    const ids: string[] = [];
    for (const t of ['Apple Pie', 'Banana Bread']) {
      ids.push(await createRecipe(page, { title: `${t} ${uniqueSuffix}`, ingredients: [], steps: [] }));
    }

    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    // Verify all content is on left page
    const leftPage = page.locator('#page-left-content');
    await expect(leftPage.locator('.index-letter-header').filter({ hasText: 'A' })).toBeVisible();
    await expect(leftPage.locator('.index-letter-header').filter({ hasText: 'B' })).toBeVisible();
    await expect(leftPage.locator(`.index-recipe-item[data-recipe-id="${ids[0]}"]`)).toBeVisible();
    await expect(leftPage.locator(`.index-recipe-item[data-recipe-id="${ids[1]}"]`)).toBeVisible();

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

    // Click the recipe in the index
    await page.locator('.index-recipe-item').filter({ hasText: title }).click();

    // Verify recipe view is shown
    await expect(page.locator('.recipe-title')).toHaveText(title);

    // Verify navigation state updated (back button enabled)
    const nav = getNavSelectors(page);
    await expect(page.locator(nav.prev)).toBeEnabled();
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

    // Click next arrow
    const nav = getNavSelectors(page);
    await page.locator(nav.next).click();

    // Verify first recipe loaded
    await expect(page.locator('.recipe-title')).toContainText(`AA Apple ${uniqueSuffix}`);
  });

  test('empty state renders correctly', async ({ page }) => {
    // This used to bail out whenever any recipe existed, which — with the suite
    // leaking recipes across spec files — meant it had stopped asserting
    // anything. clearRecipes now guarantees the empty book instead of hoping
    // for one, so the assertion always runs.
    await clearRecipes(page);

    await page.reload();

    await expect(page.locator('.recipe-placeholder-text')).toContainText('Your recipe book is empty');
  });

  test('index refreshes on orientation change', async ({ page }) => {
    // Seed enough recipes to split across pages
    const uniqueSuffix = Date.now().toString();
    for (const t of ['Apple Pie', 'Banana Bread', 'Carrot Cake', 'Date Scones']) {
      await createRecipe(page, { title: `${t} ${uniqueSuffix}`, ingredients: [], steps: [] });
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
