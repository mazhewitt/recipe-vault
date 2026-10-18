import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, createCookingRecipe, openRecipe, openTab, recordRequests, waitForTurn } from './helpers';

/**
 * Crossing the 600px phone breakpoint keeps the view (family-recipe-ui
 * "Crossing the phone breakpoint keeps the view"). These specs drive the resize
 * handler itself, so setViewportSize is the point rather than a shortcut.
 */

const scrollOf = (page: Page, id: string) =>
  page.locator(`#${id}`).evaluate(el => el.scrollTop);
const scrollTo = async (page: Page, id: string, top: number) => {
  await page.locator(`#${id}`).evaluate((el, t) => { el.scrollTop = t; }, top);
  // Let the scroll event land before the viewport changes
  await page.waitForTimeout(100);
};

async function seedContents(page: Page, n: number) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  for (let i = 0; i < n; i++) {
    await createRecipe(page, { title: `Breakpoint ${String(i).padStart(2, '0')} ${suffix}`, ingredients: [], steps: [] });
  }
}

test.describe('Crossing 600px keeps the view', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('rotating a phone to landscape keeps the recipe in cook, and Method comes back to its place', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chrome', 'starts as a phone');
    await page.setViewportSize({ width: 390, height: 844 });
    const { id, title } = await createCookingRecipe(page);
    await openRecipe(page, id);
    await waitForTurn(page);
    await openTab(page, 'method');
    await page.waitForTimeout(400);
    await scrollTo(page, 'page-right', 150);
    const s = await scrollOf(page, 'page-right');
    expect(s).toBeGreaterThan(50);

    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#page-right-content .recipe-title')).toHaveText(title);
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'recipe');
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect(page.locator('.note-input')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
    await expect.poll(() => scrollOf(page, 'page-right')).toBeGreaterThanOrEqual(s - 1);
    expect(Math.abs((await scrollOf(page, 'page-right')) - s)).toBeLessThanOrEqual(1);
  });

  test('desktop round trip through a phone keeps the scroll and the mode', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'starts as a desktop');
    await page.setViewportSize({ width: 1280, height: 800 });
    const { id, title } = await createCookingRecipe(page);
    await openRecipe(page, id);
    await waitForTurn(page);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    await scrollTo(page, 'page-right', 200);
    expect(await scrollOf(page, 'page-right')).toBe(200);

    await page.setViewportSize({ width: 500, height: 800 });
    await expect(page.locator('#page-right-content .recipe-title')).toHaveText(title);
    await expect(page.locator('.page-tabs')).toBeVisible();
    await expect(page.locator('.tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect(page.locator('#page-right-content .tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect(page.locator('.note-input')).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect.poll(async () => Math.abs((await scrollOf(page, 'page-right')) - 200)).toBeLessThanOrEqual(1);
  });

  test('a reader in notes mode comes back in notes after a phone round trip', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'starts as a desktop');
    await page.setViewportSize({ width: 1280, height: 800 });
    const { id } = await createCookingRecipe(page);
    await openRecipe(page, id);
    await waitForTurn(page);
    await page.evaluate(() => {
      // @ts-ignore - exposed by app.js
      window.setSpreadMode('notes', { force: true });
    });
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'notes');
    await page.setViewportSize({ width: 500, height: 800 });
    await expect(page.locator('.page-tabs')).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'notes');
    await expect(page.locator('.note-input')).toBeVisible();
  });

  test('resizing within a band does not re-render the contents', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'desktop window resize');
    await seedContents(page, 4);
    await page.setViewportSize({ width: 1280, height: 800 });
    await authenticate(page);
    await expect(page.locator('.index-recipe-item').first()).toBeVisible();
    await waitForTurn(page);
    await page.locator('.index-recipe-item').first().evaluate(el => { (el as any).__tagged = true; });
    const before = await page.locator('.index-recipe-item').count();
    const rec = recordRequests(page);

    for (let i = 0; i < 20; i++) {
      await page.setViewportSize({ width: 900 + (i % 2 === 0 ? i * 9 : 190 - i * 9), height: 800 });
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(300);
    expect(rec.list).toHaveLength(0);
    expect(await page.locator('.index-recipe-item').count()).toBe(before);
    expect(await page.locator('.index-recipe-item').first().evaluate(el => (el as any).__tagged === true)).toBe(true);
  });

  test('the phone keyboard does not reset the contents', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chrome', 'phone keyboard');
    await seedContents(page, 30);
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page);
    await expect(page.locator('.index-recipe-item').first()).toBeVisible();
    await waitForTurn(page);
    await scrollTo(page, 'page-left', 300);
    expect(await scrollOf(page, 'page-left')).toBe(300);
    const rec = recordRequests(page);

    await page.setViewportSize({ width: 390, height: 500 });
    await page.waitForTimeout(300);
    expect(Math.abs((await scrollOf(page, 'page-left')) - 300)).toBeLessThanOrEqual(1);
    expect(rec.list).toHaveLength(0);
  });
});
