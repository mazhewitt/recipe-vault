import { test, expect, Page } from '@playwright/test';
import { createRecipe, isPhone, sendNote, waitForTurn } from './helpers';

/**
 * recipe-url-state: the open recipe lives in the URL (?recipe=<id>). Opens
 * push, refreshes leave the entry alone, the contents push the bare path,
 * reload restores, Back/Forward turn the page in the direction of travel, and
 * a recipe gone from the book shows the contents with a sticky note.
 */

const API_HEADERS = { 'X-API-Key': 'test-api-key-for-playwright' };
const MISSING_TEXT = "That recipe isn't in the book any more";

/** Empties the book (copy of swipe-navigation.spec.ts clearRecipes). */
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
const search = (page: Page) => page.evaluate(() => window.location.search);
const histLen = (page: Page) => page.evaluate(() => window.history.length);
const stateId = (page: Page) => page.evaluate(() => window.history.state && window.history.state.recipeId);
const row = (page: Page, id: string) => page.locator(`.index-recipe-item[data-recipe-id="${id}"]`).first();
const notice = (page: Page) => page.locator('.missing-recipe-notice');

async function clearCache(page: Page) {
  await page.evaluate(async () => {
    // @ts-ignore - browser-side module import
    const M = await import('/static/page-transitions.js');
    M.clearPrefetchCache();
  });
}

/** Opens a recipe from its contents row, as the reader would, and waits for the turn. */
async function openFromContents(page: Page, id: string, expected: string) {
  await waitForTurn(page);
  await row(page, id).click();
  await expect(title(page)).toHaveText(expected, { timeout: 10000 });
  await waitForTurn(page);
}

/** The visible "next" control: the arrow above 600px, the gutter chevron on a phone. */
async function clickNext(page: Page) {
  await waitForTurn(page);
  await page.locator(isPhone(page) ? '#gutter-next' : '#page-next').click();
}

/** Records every turn direction from now on: overlay classes above 600px, data-nav-direction on a phone. */
async function watchTurns(page: Page) {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as any).__turns = seen;
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes') {
          const v = document.documentElement.getAttribute('data-nav-direction');
          if (v) seen.push(v);
        }
        r.addedNodes.forEach((n) => {
          const el = n as Element;
          if (el.classList && el.classList.contains('page-turn-overlay')) {
            if (el.classList.contains('turn-forward')) seen.push('forward');
            if (el.classList.contains('turn-backward')) seen.push('backward');
          }
        });
      }
    }).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-nav-direction'], childList: true, subtree: true,
    });
  });
}
const turns = (page: Page) => page.evaluate(() => (window as any).__turns.splice(0) as string[]);

test.describe('The open recipe in the URL', () => {
  let ids: string[] = [];
  let titles: string[] = [];

  test.beforeEach(async ({ page }) => {
    await clearRecipes(page);
    const suffix = `${Date.now()}`;
    const steps = Array.from({ length: 6 }, (_, i) => ({ step_number: i + 1, instruction: `Step ${i + 1}: stir well` }));
    const ingredients = Array.from({ length: 5 }, (_, i) => ({ name: `ingredient ${i + 1}`, quantity: i + 1, unit: 'g' }));
    titles = [`Apple Tart ${suffix}`, `Beef Stew ${suffix}`, `Chicken Pie ${suffix}`];
    ids = [];
    for (const t of titles) {
      ids.push(await createRecipe(page, { title: t, ingredients, steps, difficulty: 2, tags: ['main'] }));
    }
    await page.goto('/chat');
    await expect(page.locator('.index-title').first()).toBeVisible();
  });

  test('opening a recipe from the contents pushes ?recipe=<id>', async ({ page }) => {
    const before = await histLen(page);
    await openFromContents(page, ids[1], titles[1]);
    expect(await search(page)).toBe(`?recipe=${ids[1]}`);
    expect(await stateId(page)).toBe(ids[1]);
    expect(await histLen(page)).toBe(before + 1);
  });

  test('turning the page pushes an entry for the new recipe', async ({ page }) => {
    await openFromContents(page, ids[0], titles[0]);
    const before = await histLen(page);
    await clickNext(page);
    await expect(title(page)).toHaveText(titles[1]);
    await waitForTurn(page);
    expect(await search(page)).toBe(`?recipe=${ids[1]}`);
    expect(await histLen(page)).toBe(before + 1);
  });

  test('a recipe_artifact pushes an entry for the recipe it shows', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: `event: recipe_artifact\ndata: {"recipe_id":"${ids[2]}"}\n\nevent: done\ndata: {"conversation_id":"c1"}\n\n`,
      });
    });
    const before = await histLen(page);
    await sendNote(page, 'show a recipe');
    await expect(title(page)).toHaveText(titles[2], { timeout: 10000 });
    expect(await search(page)).toBe(`?recipe=${ids[2]}`);
    expect(await histLen(page)).toBe(before + 1);
  });

  test('a recipe_artifact naming a missing recipe keeps web-chat\'s "Recipe not found"', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: 'event: recipe_artifact\ndata: {"recipe_id":"00000000-0000-0000-0000-000000000000"}\n\nevent: done\ndata: {"conversation_id":"c1"}\n\n',
      });
    });
    await sendNote(page, 'show a recipe');
    await expect(page.locator('#page-right-content')).toContainText('Recipe not found', { timeout: 10000 });
    await expect(notice(page)).toHaveCount(0);
    await expect(page.locator('.recipe-title')).toHaveCount(0);
  });

  test('a photo upload refreshes without writing history', async ({ page }) => {
    await openFromContents(page, ids[0], titles[0]);
    const before = { len: await histLen(page), search: await search(page) };
    const RED_DOT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
    const chooser = page.waitForEvent('filechooser');
    await page.locator('#page-right-content .add-photo-btn').click();
    await (await chooser).setFiles({ name: 'dot.png', mimeType: 'image/png', buffer: RED_DOT });
    await expect(page.locator('#page-right-content .recipe-photo')).toHaveCount(1, { timeout: 10000 });
    await page.waitForTimeout(300);
    expect(await histLen(page)).toBe(before.len);
    expect(await search(page)).toBe(before.search);
  });

  test('the Recipe Book header pushes the bare path', async ({ page }) => {
    await openFromContents(page, ids[0], titles[0]);
    const before = await histLen(page);
    await page.locator('#recipe-book-header').click();
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');
    await waitForTurn(page);
    expect(await page.evaluate(() => window.location.pathname)).toBe('/chat');
    expect(await search(page)).toBe('');
    expect(await histLen(page)).toBe(before + 1);
  });

  test('a failed open (500) leaves the URL alone', async ({ page }) => {
    await openFromContents(page, ids[0], titles[0]);
    await clearCache(page);
    await page.route(`**/api/recipes/${ids[1]}`, (route) => route.fulfill({ status: 500, body: 'boom' }));
    const before = { len: await histLen(page), href: page.url() };
    await clickNext(page);
    await expect(page.locator('#page-right-content')).toContainText('Failed to load recipe', { timeout: 10000 });
    await waitForTurn(page);
    expect(await histLen(page)).toBe(before.len);
    expect(page.url()).toBe(before.href);
  });

  test('a reload restores the open recipe in the layout for the width', async ({ page }) => {
    await openFromContents(page, ids[1], titles[1]);
    await page.reload();
    await expect(title(page)).toHaveText(titles[1], { timeout: 10000 });
    expect(await stateId(page)).toBe(ids[1]);
    if (isPhone(page)) {
      await expect(page.locator('.page-tab[data-tab="ingredients"]')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'ingredients');
    } else {
      await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
      await expect(page.locator('#page-left-content .ingredients-list')).toHaveCount(1);
    }
  });

  test('loading ?recipe=<id> never shows the contents first', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as any;
      w.__flash = [];
      const check = () => {
        if (w.__flashDone) return;
        if (document.querySelector('.recipe-title')) { w.__flashDone = true; return; }
        if (document.querySelector('.index-title')) w.__flash.push('index-title');
        if (document.body && document.body.dataset.viewMode === 'index') w.__flash.push('view-mode-index');
      };
      new MutationObserver(check).observe(document, { childList: true, subtree: true, attributes: true });
    });
    await page.goto(`/chat?recipe=${ids[2]}`);
    await expect(title(page)).toHaveText(titles[2], { timeout: 10000 });
    expect(await page.evaluate(() => (window as any).__flashDone)).toBe(true);
    expect(await page.evaluate(() => (window as any).__flash)).toEqual([]);
  });

  test('after a reload onto a recipe, the contents highlight it', async ({ page }) => {
    await page.goto(`/chat?recipe=${ids[1]}`);
    await expect(title(page)).toHaveText(titles[1], { timeout: 10000 });
    await waitForTurn(page);
    await page.locator('#recipe-book-header').click();
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');
    await waitForTurn(page);
    await expect(row(page, ids[1])).toHaveClass(/\bcurrent\b/);
  });

  test('the server serves /chat?recipe=<id>', async ({ page }) => {
    const resp = await page.request.get(`/chat?recipe=${ids[0]}`);
    expect(resp.status()).toBe(200);
    expect(await resp.text()).toContain('/static/app.js');
  });

  test('Back and Forward turn the page in the direction of travel', async ({ page }) => {
    await openFromContents(page, ids[0], titles[0]);
    await clickNext(page);
    await expect(title(page)).toHaveText(titles[1]);
    await waitForTurn(page);
    const len = await histLen(page);
    await watchTurns(page);

    await page.goBack();
    await expect(title(page)).toHaveText(titles[0]);
    await waitForTurn(page);
    expect(await turns(page)).toContain('backward');
    expect(await search(page)).toBe(`?recipe=${ids[0]}`);

    await page.goBack();
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');
    await expect(page.locator('.index-title').first()).toBeVisible();
    await waitForTurn(page);
    expect(await turns(page)).toContain('backward');
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');
    expect(await search(page)).toBe('');

    await page.goForward();
    await expect(title(page)).toHaveText(titles[0]);
    await waitForTurn(page);
    expect(await turns(page)).toContain('forward');

    await page.goForward();
    await expect(title(page)).toHaveText(titles[1]);
    await waitForTurn(page);
    const seen = await turns(page);
    expect(seen).toContain('forward');
    expect(seen).not.toContain('backward');
    expect(await search(page)).toBe(`?recipe=${ids[1]}`);
    expect(await histLen(page)).toBe(len);
  });

  test('Back pressed during a page turn settles on the entry\'s page', async ({ page }) => {
    await openFromContents(page, ids[0], titles[0]);
    await clickNext(page);
    await expect(title(page)).toHaveText(titles[1]);
    await waitForTurn(page);

    // A real page turn, held open by a slow render
    await page.evaluate(async () => {
      // @ts-ignore - browser-side module import
      const M = await import('/static/page-transitions.js');
      M.animatePageTurn('forward', () => new Promise(r => setTimeout(r, 1500)));
    });
    await expect.poll(() => page.evaluate(async () => {
      // @ts-ignore - browser-side module import
      const M = await import('/static/page-transitions.js');
      return M.isAnimating();
    })).toBe(true);
    await page.goBack();
    expect(await search(page)).toBe(`?recipe=${ids[0]}`);

    await expect(title(page)).toHaveText(titles[0], { timeout: 10000 });
    await waitForTurn(page);
    await expect(title(page)).toHaveText(titles[0]);
  });

  test('an unknown recipe on load shows the contents with the notice', async ({ page }) => {
    await page.addInitScript(() => { (window as any).__len0 = window.history.length; });
    const goneId = await createRecipe(page, { title: `Gone ${Date.now()}`, ingredients: [], steps: [], difficulty: 2, tags: ['main'] });
    await page.request.delete(`/api/recipes/${goneId}`, { headers: API_HEADERS });

    await page.goto(`/chat?recipe=${goneId}`);
    await expect(page.locator('.index-title').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');
    await expect(page.locator('.recipe-title')).toHaveCount(0);
    await expect(notice(page)).toBeVisible();
    await expect(notice(page)).toHaveText(MISSING_TEXT);
    await expect(notice(page)).toHaveAttribute('role', 'status');
    expect(await search(page)).toBe('');
    expect(await histLen(page)).toBe(await page.evaluate(() => (window as any).__len0));

    // The notice goes with the next page
    await openFromContents(page, ids[0], titles[0]);
    await expect(notice(page)).toHaveCount(0);
  });

  test('a recipe deleted before Back shows the contents with the notice', async ({ page }) => {
    await openFromContents(page, ids[0], titles[0]);
    await clickNext(page);
    await expect(title(page)).toHaveText(titles[1]);
    await waitForTurn(page);
    await page.request.delete(`/api/recipes/${ids[0]}`, { headers: API_HEADERS });
    // Deleted elsewhere: this page's prefetch never heard
    await clearCache(page);
    const len = await histLen(page);

    await page.goBack();
    await expect(notice(page)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');
    await expect(page.locator('.recipe-title')).toHaveCount(0);
    expect(await search(page)).toBe('');
    expect(await histLen(page)).toBe(len);
  });

  test('a contents row whose recipe was deleted elsewhere opens nothing', async ({ page }) => {
    await page.request.delete(`/api/recipes/${ids[1]}`, { headers: API_HEADERS });
    await clearCache(page);
    await row(page, ids[1]).click();
    await expect(notice(page)).toBeVisible({ timeout: 10000 });
    await expect(notice(page)).toHaveText(MISSING_TEXT);
    await waitForTurn(page);
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');
    await expect(page.locator('.recipe-title')).toHaveCount(0);
    expect(await search(page)).toBe('');
    expect(await page.evaluate(() => window.location.pathname)).toBe('/chat');
  });

  test('a meal plan replaces the entry, and a reload after it shows the contents', async ({ page }) => {
    await openFromContents(page, ids[0], titles[0]);
    const len = await histLen(page);
    await page.evaluate((id) => {
      // @ts-ignore - renderMealPlan is exposed by app.js
      renderMealPlan({ title: 'Sunday lunch', recipes: [{ recipe_id: id, title: 'Apple', role: 'main' }] });
    }, ids[0]);
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'meal');
    expect(await search(page)).toBe('');
    expect(await histLen(page)).toBe(len);

    await page.reload();
    await expect(page.locator('.index-title').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');
    await expect(page.locator('.recipe-title')).toHaveCount(0);
  });

  test('a share page loads no app.js and keeps its URL', async ({ page }) => {
    const resp = await page.request.post(`/api/recipes/${ids[0]}/share`);
    expect(resp.ok(), `share -> ${resp.status()}`).toBeTruthy();
    const { url } = await resp.json();
    const scripts: string[] = [];
    page.on('request', (req) => { if (new URL(req.url()).pathname === '/static/app.js') scripts.push(req.url()); });
    await page.goto(url);
    await page.waitForLoadState('load');
    await page.waitForTimeout(300);
    expect(scripts).toEqual([]);
    expect(new URL(page.url()).pathname).toBe(url);
    expect(new URL(page.url()).search).toBe('');
  });
});
