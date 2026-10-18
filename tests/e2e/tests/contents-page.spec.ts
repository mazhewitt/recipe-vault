import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, isPhone, openTab, waitForTurn } from './helpers';

const API_HEADERS = { 'X-API-Key': 'test-api-key-for-playwright' };

// Minimal 1x1 red JPEG used for a photo upload
const RED_DOT_JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAFA3PEY8ED5GWEZGPDpCakJEZkBQXl1UXmZicH19f3h9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3n/2wBDAFpGPDpCakJEZkBQXl1UXmZicH19f3h9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3n/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1FVWV1hZWmNkZWZnaGlqc3R1dnd4eXqGhf8hIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/oooorAP/9k=', 'base64');

/**
 * Empties the book, and proves it emptied. Page numbers are derived from a
 * recipe's position in the FULL alphabetical list (`2 * i + 3`, see
 * recipe-book-index spec), so a book holding only this test's recipes is a
 * precondition of the p. 3 / p. 5 / p. 7 assertions rather than a convenience —
 * it cannot be scoped away, only guaranteed.
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

async function openBook(page: Page) {
  // goto, not reload: a reload after an open restores the recipe (?recipe=)
  await page.goto('/chat');
  await expect(page.locator('.index-title')).toBeVisible();
}

test.describe('Contents page (Journal 2.0)', () => {
  test.beforeEach(async ({ page }) => {
    await clearRecipes(page);
    await authenticate(page);
  });

  test('title, alphabet strip, page numbers and footer render', async ({ page }) => {
    const suffix = Date.now().toString();
    const ids: string[] = [];
    for (const t of ['Apple Pie', 'Banana Bread', 'Carrot Cake']) {
      ids.push(await createRecipe(page, { title: `${t} ${suffix}`, ingredients: [], steps: [] }));
    }
    await openBook(page);

    await expect(page.locator('.index-title')).toHaveText('~ Contents ~');

    // Title precedes the alphabet strip in the left page
    const order = await page.locator('#page-left-content').evaluate(el => {
      const title = el.querySelector('.index-title');
      const strip = el.querySelector('.index-alphabet-nav');
      return title && strip ? title.compareDocumentPosition(strip) : 0;
    });
    expect(order & 4).toBe(4); // Node.DOCUMENT_POSITION_FOLLOWING

    // Page numbers follow the alphabetical list order: 3, 5, 7
    const items = page.locator('.index-recipe-item');
    const mine = items.filter({ hasText: suffix });
    // Two separate failures that a single count used to conflate: the app
    // dropping one of mine, and the sweep leaving someone else's behind.
    await expect(mine).toHaveCount(3);
    await expect(items).toHaveCount(3);
    // Address rows by id, so a failure names the recipe instead of an index
    await expect(page.locator(`.index-recipe-item[data-recipe-id="${ids[0]}"] .index-page-number`)).toHaveText('p. 3');
    await expect(page.locator(`.index-recipe-item[data-recipe-id="${ids[1]}"] .index-page-number`)).toHaveText('p. 5');
    await expect(page.locator(`.index-recipe-item[data-recipe-id="${ids[2]}"] .index-page-number`)).toHaveText('p. 7');
    await expect(page.locator(`.index-recipe-item[data-recipe-id="${ids[2]}"]`)).toHaveAttribute('data-page', '7');

    // Seeded recipes have no photo, so every polaroid is the empty variant
    await expect(mine.locator('.index-polaroid.empty')).toHaveCount(3);
    await expect(mine.locator('.index-polaroid img')).toHaveCount(0);

    // The footer counts the whole book, so these stay absolute — clearRecipes
    // above is what licenses them: this book holds my three recipes and nothing else.
    // Desktop left page says "continued overleaf" when the right page has entries
    const footers = page.locator('.index-footer');
    await expect(footers.first()).toContainText('3 recipes');
    if (page.viewportSize()!.width > 600) {
      await expect(page.locator('#page-left-content .index-footer')).toContainText('continued overleaf');
      await expect(page.locator('#page-right-content .index-footer')).not.toContainText('continued overleaf');
    } else {
      await expect(footers).toHaveCount(1);
      await expect(footers.first()).not.toContainText('continued overleaf');
    }
  });

  test('entry shows a polaroid thumbnail after a photo upload', async ({ page }) => {
    const suffix = Date.now().toString();
    const recipeId = await createRecipe(page, { title: `Photo Recipe ${suffix}`, ingredients: [], steps: [] });
    await page.request.post(`/api/recipes/${recipeId}/photo`, {
      headers: API_HEADERS,
      multipart: { photo: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: RED_DOT_JPEG } },
    });
    await openBook(page);

    const item = page.locator(`.index-recipe-item[data-recipe-id="${recipeId}"]`);
    await expect(item.locator('.index-polaroid img')).toHaveAttribute('src', new RegExp(`/api/recipes/${recipeId}/photo`));
    await expect(item.locator('.index-polaroid')).not.toHaveClass(/empty/);
  });

  test('returning to contents highlights the last-viewed recipe', async ({ page }) => {
    const suffix = Date.now().toString();
    // Target is the first recipe in the book — which the beforeEach sweep makes
    // true — so a single "previous" step returns to the contents page
    const target = await createRecipe(page, { title: `Apple Pie ${suffix}`, ingredients: [], steps: [] });
    await createRecipe(page, { title: `Banana Bread ${suffix}`, ingredients: [], steps: [] });
    await openBook(page);

    await expect(page.locator('.index-recipe-item.current')).toHaveCount(0);

    await page.locator(`.index-recipe-item[data-recipe-id="${target}"]`).click();
    await expect(page.locator('.recipe-title')).toContainText('Apple Pie');
    // The open is a page turn, and the header ignores a click while one runs
    await waitForTurn(page);

    // Back to the contents page: the header is hidden on phones, so use the gutter chevron there
    if (page.viewportSize()!.width <= 600) {
      await page.click('#gutter-prev');
    } else {
      await page.click('#recipe-book-header');
    }
    await waitForTurn(page);
    await expect(page.locator('.index-title')).toBeVisible();

    const current = page.locator('.index-recipe-item.current');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute('data-recipe-id', target);
    await expect(current).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('Recipe typography and meta line (Journal 2.0)', () => {
  test.beforeEach(async ({ page }) => {
    // Sweep even though nothing here counts rows: without it these two tests
    // leak Meta Recipe and Slow Recipe into whichever spec file runs next.
    await clearRecipes(page);
    await authenticate(page);
  });

  test('serif body, red step numbers and a single meta line', async ({ page }) => {
    const suffix = Date.now().toString();
    const recipeId = await createRecipe(page, {
      title: `Meta Recipe ${suffix}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [
        { step_number: 1, instruction: 'Mix the flour' },
        { step_number: 2, instruction: 'Bake it' },
      ],
      prep_time_minutes: 10,
      cook_time_minutes: 20,
      servings: 4,
    });

    await page.evaluate((id) => {
      // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
      fetchAndDisplayRecipe(id);
    }, recipeId);
    await expect(page.locator('.recipe-title')).toContainText('Meta Recipe');

    // Body text uses the serif token, headers stay handwritten
    const bodyFont = await page.locator('.ingredients-list').evaluate(el => getComputedStyle(el).fontFamily);
    expect(bodyFont).toContain('Libre Baskerville');
    const headerFont = await page.locator('.section-header').first().evaluate(el => getComputedStyle(el).fontFamily);
    expect(headerFont).toContain('Kalam');

    // Quantity span keeps the visible text intact
    await expect(page.locator('.ingredient-line').first()).toContainText('1 cup flour');
    await expect(page.locator('.ingredient-qty').first()).toHaveText('1 cup');

    // Method header and numbered steps. The phone shows one panel at a time, so
    // the method section is behind its tab there.
    if (isPhone(page)) await openTab(page, 'method');
    await expect(page.locator('.section-header').filter({ hasText: 'method' })).toBeVisible();
    const steps = page.locator('.prep-step');
    await expect(steps).toHaveCount(2);
    await expect(steps.nth(0)).toHaveAttribute('data-step', '1');
    await expect(steps.nth(0).locator('.step-number')).toHaveText('1.');
    await expect(steps.nth(1).locator('.step-text')).toHaveText('Bake it');

    // Meta line: serves, then the total (prep + cook) above 600px
    const meta = page.locator('.recipe-meta-line');
    await expect(meta).toHaveCount(1);
    await expect(meta.locator('.meta-serves')).toContainText('serves');
    await expect(meta.locator('.servings-count')).toHaveText('4');
    await expect(meta.locator('.meta-breakdown, .share-btn, .add-photo-btn')).toHaveCount(0);
    await expect(page.locator('.recipe-meta')).toHaveCount(0);

    // The breakdown, share and add-photo are in the "⋯" popover (with the
    // total, on the phone)
    const panel = page.locator('#page-right-content .recipe-more-panel');
    await page.locator('#page-right-content button.recipe-more').click();
    await expect(panel).toBeVisible();
    await expect(isPhone(page) ? panel.locator('.meta-total') : meta.locator('.meta-total')).toHaveText('30 min');
    await expect(isPhone(page) ? panel.locator('.meta-total') : meta.locator('.meta-total')).toBeVisible();
    await expect(panel.locator('.meta-breakdown')).toHaveText('(prep 10 · cook 20)');
    const order = await panel.evaluate(el => [el.querySelector('.meta-breakdown'), el.querySelector('.share-btn'), el.querySelector('.add-photo-btn')]
      .every((n, i, all) => i === 0 || (all[i - 1]!.compareDocumentPosition(n!) & 4) === 4));
    expect(order).toBe(true);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();

    // Read from the counter: 18px method text above 600px, 17px on the phone;
    // durations 15px (none here, so the step text is what is measured)
    const stepSize = await steps.nth(1).locator('.step-text')
      .evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(stepSize).toBe(isPhone(page) ? 17 : 18);
  });

  test('meta line formats hours and omits missing values', async ({ page }) => {
    const suffix = Date.now().toString();
    const recipeId = await createRecipe(page, {
      title: `Slow Recipe ${suffix}`,
      ingredients: [],
      steps: [],
      cook_time_minutes: 75,
    });
    // Not yet assessed, whatever the backend's background assessment has
    // reached by now (it races the read: .scratch/recipe-create-spawns-two-racing-writers/)
    await page.route(`**/api/recipes/${recipeId}`, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...(await response.json()), difficulty: null } });
    });

    await page.evaluate((id) => {
      // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
      fetchAndDisplayRecipe(id);
    }, recipeId);
    await expect(page.locator('.recipe-title')).toContainText('Slow Recipe');

    const meta = page.locator('.recipe-meta-line');
    const panel = page.locator('#page-right-content .recipe-more-panel');
    await expect((isPhone(page) ? panel : meta).locator('.meta-total')).toHaveText('1h 15');
    await expect(meta.locator('.meta-serves')).toHaveCount(0);
    await page.locator('#page-right-content button.recipe-more').click();
    await expect(panel.locator('.meta-breakdown')).toHaveText('(cook 75)');
    // The difficulty is not assessed yet, so its slot in the popover is there and empty
    await expect(meta.locator('.meta-difficulty')).toHaveCount(0);
    await expect(panel.locator('.meta-difficulty')).toHaveCount(1);
    await expect(panel.locator('.meta-difficulty')).toBeEmpty();
  });
});
