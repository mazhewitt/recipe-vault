import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, expectHitArea, isPhone, openRecipe, openTab } from './helpers';

/**
 * family-recipe-ui › Recipe text is sized for reading from the counter,
 * › Every control the cook taps has a 44px hit area, › The title takes the
 * width of the page, › Share and photo end the meta line (D9).
 */

const API_HEADERS = { 'X-API-Key': 'test-api-key-for-playwright' };

// 1x1 pixel red JPEG (as ui-improvements.spec.ts)
const RED_DOT_JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAFA3PEY8ED5GWEZGPDpCakJEZkBQXl1UXmZicH19f3h9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3n/2wBDAFpGPDpCakJEZkBQXl1UXmZicH19f3h9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3n/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1FVWV1hZWmNkZWZnaGlqc3R1dnd4eXqGhf8hIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/oooorAP/9k=', 'base64');

/** Two recipes side by side in the book; opens the first so both arrows work. */
async function openTwoRecipeBook(page: Page): Promise<string> {
  const stamp = `${Date.now()}`;
  const first = await createRecipe(page, {
    title: `Counter Cake ${stamp} a`,
    ingredients: [{ name: 'flour', quantity: 200, unit: 'g' }, { name: 'eggs', quantity: 2 }],
    steps: [
      { step_number: 1, instruction: 'Beat the eggs into the flour', duration_minutes: 5 },
      { step_number: 2, instruction: 'Bake until golden' },
    ],
    servings: 4,
    prep_time_minutes: 10,
    cook_time_minutes: 30,
    difficulty: 2,
    tags: ['sweet'],
  });
  await createRecipe(page, {
    title: `Counter Cake ${stamp} b`,
    ingredients: [{ name: 'sugar', quantity: 1, unit: 'cup' }],
    steps: [{ step_number: 1, instruction: 'Stir' }],
    difficulty: 1,
    tags: ['sweet'],
  });
  await authenticate(page);
  await openRecipe(page, first);
  return first;
}

async function fontSize(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
}

async function lineHeightRatio(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate(el => {
    const cs = getComputedStyle(el);
    return parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
  });
}

async function selectCook(page: Page) {
  const tab = page.locator('.spread-tab[data-mode="cook"]');
  await expect(async () => {
    await tab.click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook', { timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

test.describe('Readable and tappable from the counter', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('recipe text is sized for reading from the counter', async ({ page }) => {
    await openTwoRecipeBook(page);
    const big = isPhone(page) ? 17 : 18;

    if (isPhone(page)) {
      await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'ingredients');
      expect(await fontSize(page, '#page-right-content .ingredient-item')).toBe(17);
      expect(await lineHeightRatio(page, '#page-right-content .ingredients-list')).toBeGreaterThanOrEqual(1.6);
      await openTab(page, 'method');
    }

    // The method is the same size in every mode (lead answer Q2)
    expect(await fontSize(page, '#page-right-content .prep-step .step-text')).toBe(big);
    expect(await fontSize(page, '#page-right-content .step-duration')).toBe(15);
    expect(await lineHeightRatio(page, '#page-right-content .prep-list')).toBeGreaterThanOrEqual(1.6);

    if (!isPhone(page)) {
      await selectCook(page);
      expect(await fontSize(page, '#page-left-content .ingredient-item')).toBe(18);
      expect(await lineHeightRatio(page, '#page-left-content .ingredients-list')).toBeGreaterThanOrEqual(1.6);
      expect(await fontSize(page, '#page-right-content .prep-step .step-text')).toBe(18);
    }
  });

  test('the contents keep their size', async ({ page }) => {
    await createRecipe(page, { title: `Contents Size ${Date.now()}`, ingredients: [], steps: [], tags: ['main'] });
    await authenticate(page);
    await expect(page.locator('.index-recipe-item').first()).toBeVisible();
    expect(await fontSize(page, '.index-recipe-item')).toBe(isPhone(page) ? 16 : 15);
  });

  test('book controls have a 44px hit area', async ({ page }) => {
    test.skip(isPhone(page), 'no page arrows or edge tabs at or below 600px');
    // Contents page: the filter tabs
    await createRecipe(page, { title: `Hit Area ${Date.now()}`, ingredients: [], steps: [], tags: ['main'] });
    await authenticate(page);
    const filters = page.locator('.contents-tab:not(.spread-tab):visible');
    expect(await filters.count()).toBeGreaterThan(0);
    for (const filter of await filters.all()) {
      const key = await filter.getAttribute('data-filter');
      await expectHitArea(page, `.contents-tab[data-filter="${key}"]`);
      expect((await filter.boundingBox())!.width).toBeCloseTo(26, 0);
    }

    // A recipe: the spread tabs and both arrows
    await openTwoRecipeBook(page);
    for (const mode of ['contents', 'cook', 'notes']) {
      await expectHitArea(page, `.spread-tab[data-mode="${mode}"]`);
    }
    await expect(page.locator('#page-prev')).toBeEnabled();
    await expect(page.locator('#page-next')).toBeEnabled();
    await expectHitArea(page, '#page-prev');
    await expectHitArea(page, '#page-next');
  });

  test('recipe and note controls have a 44px hit area', async ({ page }) => {
    await openTwoRecipeBook(page);
    await expectHitArea(page, '#page-right-content .share-btn');
    await expectHitArea(page, '#page-right-content .add-photo-btn');
    await expectHitArea(page, '#send-button');
    await expectHitArea(page, '#clipboard-button');
    for (const sel of ['#send-button', '#clipboard-button']) {
      const box = (await page.locator(sel).boundingBox())!;
      expect(box.width, `${sel} width`).toBeGreaterThanOrEqual(44);
      expect(box.height, `${sel} height`).toBeGreaterThanOrEqual(44);
    }
  });

  test('phone footer links have a 44px hit area', async ({ page }) => {
    test.skip(!isPhone(page), 'the footer is shown at or below 600px only');
    await openTwoRecipeBook(page);
    const footer = page.locator('#page-right-content .phone-footer');
    await footer.scrollIntoViewIfNeeded();
    await expectHitArea(page, '#page-right-content .footer-prev');
    await expectHitArea(page, '#page-right-content .footer-next');
  });

  test('share and photo end the meta line, 44px each', async ({ page }) => {
    await openTwoRecipeBook(page);
    await expect(page.locator('.recipe-title-row .share-btn')).toHaveCount(0);
    await expect(page.locator('.recipe-title-row .add-photo-btn')).toHaveCount(0);
    const lastTwo = await page.locator('#page-right-content .recipe-meta-line').evaluate(el => {
      const kids = Array.from(el.children);
      return kids.slice(-2).map(k => k.className);
    });
    expect(lastTwo).toEqual(['share-btn', 'add-photo-btn']);
    // The (prep · cook) breakdown comes before them
    const breakdownBefore = await page.locator('#page-right-content .recipe-meta-line').evaluate(el => {
      const b = el.querySelector('.meta-breakdown');
      const s = el.querySelector('.share-btn');
      return !!b && !!s && (b.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    });
    expect(breakdownBefore).toBe(true);
    for (const sel of ['.share-btn', '.add-photo-btn']) {
      const box = (await page.locator(`#page-right-content .recipe-meta-line ${sel}`).boundingBox())!;
      expect(box.width, `${sel} width`).toBeGreaterThanOrEqual(44);
      expect(box.height, `${sel} height`).toBeGreaterThanOrEqual(44);
    }
  });

  test('a long title with a photo takes at most two lines', async ({ page }) => {
    // Titles are unique: drop one left by another project's run
    const list = await page.request.get('/api/recipes', { headers: API_HEADERS });
    for (const r of (await list.json()) as Array<{ id: string; title: string }>) {
      if (r.title === "Granny's Beef Lasagne") {
        await page.request.delete(`/api/recipes/${r.id}`, { headers: API_HEADERS });
      }
    }
    const id = await createRecipe(page, {
      title: "Granny's Beef Lasagne",
      ingredients: [{ name: 'beef mince', quantity: 500, unit: 'g' }],
      steps: [{ step_number: 1, instruction: 'Layer and bake' }],
      difficulty: 3,
      tags: ['main'],
    });
    const upload = await page.request.post(`/api/recipes/${id}/photo`, {
      headers: API_HEADERS,
      multipart: { photo: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: RED_DOT_JPEG } },
    });
    expect(upload.ok()).toBeTruthy();
    await authenticate(page);
    await openRecipe(page, id);
    await expect(page.locator('#page-right-content .recipe-polaroid .recipe-photo')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const lines = await page.locator('#page-right-content .recipe-title').evaluate(el => {
      const cs = getComputedStyle(el);
      return Math.round(el.getBoundingClientRect().height / parseFloat(cs.lineHeight));
    });
    expect(lines, 'title line count').toBeLessThanOrEqual(2);
  });

  test('the share toast appears next to the share button', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await openTwoRecipeBook(page);
    page.on('dialog', d => d.dismiss());
    const btn = page.locator('#page-right-content .share-btn');
    await btn.click();
    const toast = page.locator('.share-toast');
    await expect(toast).toBeVisible();
    const t = (await toast.boundingBox())!;
    const b = (await btn.boundingBox())!;
    // Within a button's reach of the button, and on screen
    expect(Math.abs((t.y + t.height) - b.y)).toBeLessThanOrEqual(40);
    expect(t.x).toBeGreaterThanOrEqual(0);
    expect(t.x + t.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
