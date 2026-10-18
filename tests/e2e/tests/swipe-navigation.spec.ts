import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, isPhone, isTablet, line, openRecipe, openTab, touchGesture } from './helpers';

const API_HEADERS = { 'X-API-Key': 'test-api-key-for-playwright' };

/**
 * Empties the book, and proves it emptied: "first" and "last" recipe are
 * properties of the full list (copy of contents-filters.spec.ts clearRecipes).
 */
async function clearRecipes(page: Page) {
  let titles: string[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    const list = await page.request.get('/api/recipes', { headers: API_HEADERS });
    expect(list.ok(), `GET /api/recipes -> ${list.status()}`).toBeTruthy();
    const remaining: Array<{ id: string; title: string }> = await list.json();
    titles = remaining.map(r => r.title);
    if (remaining.length === 0) return;
    if (attempt === 3) break;
    for (const r of remaining) {
      await page.request.delete(`/api/recipes/${r.id}`, { headers: API_HEADERS });
    }
  }
  expect(titles, 'clearRecipes could not empty the book').toEqual([]);
}

const title = (page: Page) => page.locator('#page-right-content .recipe-title');

/** Records every value html[data-nav-direction] takes from now on. */
async function watchNavDirection(page: Page) {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as any).__navDirections = seen;
    new MutationObserver(() => {
      const v = document.documentElement.getAttribute('data-nav-direction');
      if (v) seen.push(v);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-nav-direction'] });
  });
}
const navDirections = (page: Page) => page.evaluate(() => (window as any).__navDirections as string[]);

/** The width every swipe threshold is measured against. */
const bookWidth = (page: Page) =>
  page.evaluate(() => document.querySelector('.pages-container')!.getBoundingClientRect().width);

/** Asserts the recipe on the page is still `expected` 1200ms after a gesture. */
async function expectStill(page: Page, expected: string) {
  await page.waitForTimeout(1200);
  await expect(title(page)).toHaveText(expected);
}

test.describe('Swipe navigation', () => {
  let ids: string[] = [];
  let titles: string[] = [];

  test.beforeEach(async ({ page }) => {
    await clearRecipes(page);
    // Alphabetical, so the full-list order is Apple, Beef, Chicken. Long
    // enough to scroll on a phone; difficulty set so the prefetch serves them;
    // tags set so the mock auto-tagger never runs. Beef is the only sweet, so
    // the sweets filter hides the book's first recipe.
    const suffix = `${Date.now()}`;
    const steps = Array.from({ length: 16 }, (_, i) => ({ step_number: i + 1, instruction: `Step ${i + 1}: stir, taste and keep going until it looks right` }));
    const ingredients = Array.from({ length: 12 }, (_, i) => ({ name: `ingredient ${i + 1}`, quantity: i + 1, unit: 'g' }));
    titles = [`Apple Tart ${suffix}`, `Beef Stew ${suffix}`, `Chicken Pie ${suffix}`];
    const tags = [['main'], ['dessert'], ['main']];
    ids = [];
    for (let i = 0; i < 3; i++) {
      ids.push(await createRecipe(page, { title: titles[i], ingredients, steps, difficulty: 2, tags: tags[i] }));
    }
    await authenticate(page);
  });

  test('swiping left turns forward and swiping right turns back', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only: swipe is gated on max-width 600px');
    await openRecipe(page, ids[1]);
    await expect(title(page)).toHaveText(titles[1]);
    await watchNavDirection(page);
    const w = await bookWidth(page);

    await touchGesture(page, 320, 420, line(10, -0.45 * w, 0));
    await expect(title(page)).toHaveText(titles[2]);
    expect(await navDirections(page)).toContain('forward');

    await page.waitForTimeout(400);
    await touchGesture(page, 60, 420, line(10, 0.45 * w, 0));
    await expect(title(page)).toHaveText(titles[1]);
    expect(await navDirections(page)).toContain('backward');
  });

  test('a 25% swipe does nothing', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    const w = await bookWidth(page);
    await touchGesture(page, 320, 420, line(10, -0.25 * w, 0));
    await expectStill(page, titles[1]);
  });

  test('a scroll with 31 degrees of sideways drift does not turn the page', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    await openTab(page, 'method');
    // The tab switch is a 200ms crossfade that holds the turn lock; let it end
    // so the gesture, not the lock, is what is under test
    await page.waitForTimeout(400);
    await touchGesture(page, 255, 600, line(12, -130, -220));
    await expectStill(page, titles[1]);
  });

  test('a gesture that locked as a scroll never turns the page, even if it then goes far sideways', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    // First 30px: dx -30, dy -20, so |dx| <= 2|dy| and it is a scroll; then
    // on sideways to dx -170 with the overall dy still small
    const rest = line(8, -140, 0).map(([x]) => [-30 + x, -20] as [number, number]);
    await touchGesture(page, 320, 600, [...line(3, -30, -20), ...rest]);
    await expectStill(page, titles[1]);
  });

  test('a sideways wobble then a scroll does not turn the page', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    await touchGesture(page, 200, 600, [...line(3, -15, 0), ...line(10, 0, -300).map(([, y]) => [-15, y] as [number, number])]);
    await expectStill(page, titles[1]);
  });

  test('a horizontal lock that drifts vertically by the end does not turn the page', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    // First 30px: dx -30, dy -5 (locks horizontal), then on to dx -160, dy -90
    const rest = line(8, -130, -85).map(([x, y]) => [-30 + x, -5 + y] as [number, number]);
    await touchGesture(page, 300, 600, [...line(3, -30, -5), ...rest]);
    await expectStill(page, titles[1]);
  });

  test('a tap-sized move decides nothing', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    await touchGesture(page, 200, 420, line(4, -25, -20));
    await expectStill(page, titles[1]);
  });

  test('a touch on a coasting page is not a swipe', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    await openTab(page, 'method');
    // The tab switch is a 200ms crossfade that holds the turn lock; let it end
    // so the gesture, not the lock, is what is under test
    await page.waitForTimeout(400);
    const w = await bookWidth(page);
    const scrolled = await page.evaluate(() => {
      const el = document.getElementById('page-right')!;
      el.scrollTop = 120;
      return el.scrollTop;
    });
    expect(scrolled, '#page-right must be scrollable for this test').toBeGreaterThan(0);
    await page.waitForTimeout(50);
    await touchGesture(page, 320, 420, line(6, -0.45 * w, 0));
    await expectStill(page, titles[1]);

    await page.waitForTimeout(400);
    await touchGesture(page, 320, 420, line(6, -0.45 * w, 0));
    await expect(title(page)).toHaveText(titles[2]);
  });

  test('swiping left on the contents opens the first recipe of the full list, whatever the filter', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();
    await page.locator('.contents-tab-sweets').click();
    await expect(page.locator('.contents-tab-sweets')).toHaveAttribute('aria-pressed', 'true');
    const w = await bookWidth(page);
    await touchGesture(page, 320, 420, line(10, -0.45 * w, 0));
    await expect(title(page)).toHaveText(titles[0]);
  });

  test('swiping right on the first recipe returns to the contents', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[0]);
    const w = await bookWidth(page);
    await touchGesture(page, 60, 420, line(10, 0.45 * w, 0));
    await expect(page.locator('.index-title')).toBeVisible();
  });

  test('swiping left on the last recipe does nothing', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[2]);
    const w = await bookWidth(page);
    await touchGesture(page, 320, 420, line(10, -0.45 * w, 0));
    await expectStill(page, titles[2]);
  });

  test('on a tablet a 300px swipe does nothing', async ({ page }) => {
    test.skip(!isTablet(page), 'tablet only');
    await openRecipe(page, ids[1]);
    await touchGesture(page, 600, 500, line(10, -300, 0));
    await expectStill(page, titles[1]);
  });
});
