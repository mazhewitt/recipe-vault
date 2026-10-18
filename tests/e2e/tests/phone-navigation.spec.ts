import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, expectHitArea, isPhone, openRecipe, openTab } from './helpers';

const API_HEADERS = { 'X-API-Key': 'test-api-key-for-playwright' };

/**
 * Empties the book, and proves it emptied: "first" and "last" recipe are
 * properties of the full list (copy of swipe-navigation.spec.ts clearRecipes).
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
const prev = (page: Page) => page.locator('#gutter-prev');
const next = (page: Page) => page.locator('#gutter-next');

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

/**
 * Where a chevron's 44x44 hit area meets the page: content boxes it overlaps
 * (clipped to the part of #page-right the reader can see below the sticky tab
 * row, since content scrolled under the row is hidden by it), tabs it overlaps,
 * and visible content points on a 20px grid that elementFromPoint does not
 * resolve to content (or to #page-margin, the reply sticky over the page foot).
 */
async function chevronIntrusions(page: Page) {
  return page.evaluate(() => {
    const pageRight = document.getElementById('page-right')!;
    const content = document.getElementById('page-right-content')!;
    const tabsRow = document.querySelector('#page-right .page-tabs')!.getBoundingClientRect();
    const pr = pageRight.getBoundingClientRect();
    const visTop = Math.max(pr.top, tabsRow.bottom);
    const visBottom = Math.min(pr.bottom, window.innerHeight);
    const hitBox = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      return { left: cx - 22, right: cx + 22, top: cy - 22, bottom: cy + 22 };
    };
    const overlaps = (a: any, b: any) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const out: string[] = [];
    for (const id of ['gutter-prev', 'gutter-next']) {
      const box = hitBox(document.getElementById(id)!);
      for (const el of Array.from(content.querySelectorAll('*'))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const clipped = { left: r.left, right: r.right, top: Math.max(r.top, visTop), bottom: Math.min(r.bottom, visBottom) };
        if (clipped.bottom <= clipped.top) continue;
        if (overlaps(box, clipped)) out.push(`#${id} overlaps ${el.tagName.toLowerCase()}.${(el as HTMLElement).className}`);
      }
      for (const tab of Array.from(document.querySelectorAll('#page-right .page-tab'))) {
        if (overlaps(box, tab.getBoundingClientRect())) out.push(`#${id} overlaps tab ${(tab as HTMLElement).dataset.tab}`);
      }
    }
    const margin = document.getElementById('page-margin');
    const cr = content.getBoundingClientRect();
    for (let x = cr.left + 2; x < cr.right - 1; x += 20) {
      for (let y = Math.max(cr.top, visTop) + 2; y < Math.min(cr.bottom, visBottom) - 1; y += 20) {
        const hit = document.elementFromPoint(x, y);
        if (!hit) continue;
        if (content.contains(hit) || (margin && margin.contains(hit))) continue;
        out.push(`(${x.toFixed(0)},${y.toFixed(0)}) -> ${hit.tagName.toLowerCase()}#${hit.id}.${(hit as HTMLElement).className}`);
      }
    }
    return out;
  });
}

/** Taps the centre of a point, as a thumb does (real touch through CDP). */
async function tapAt(page: Page, x: number, y: number) {
  await page.touchscreen.tap(Math.round(x), Math.round(y));
}

test.describe('Phone navigation', () => {
  let ids: string[] = [];
  let titles: string[] = [];

  test.beforeEach(async ({ page }) => {
    await clearRecipes(page);
    // Alphabetical, so the full-list order is Apple, Beef, Chicken. Long
    // enough to scroll on a phone; difficulty set so the prefetch serves them;
    // tags set so the mock auto-tagger never runs.
    const suffix = `${Date.now()}`;
    const steps = Array.from({ length: 16 }, (_, i) => ({ step_number: i + 1, instruction: `Step ${i + 1}: stir, taste and keep going until it looks right` }));
    const ingredients = Array.from({ length: 12 }, (_, i) => ({ name: `ingredient ${i + 1}`, quantity: i + 1, unit: 'g' }));
    titles = [`Apple Tart ${suffix}`, `Beef Stew ${suffix}`, `Chicken Pie ${suffix}`];
    ids = [];
    for (let i = 0; i < 3; i++) {
      ids.push(await createRecipe(page, { title: titles[i], ingredients, steps, difficulty: 2, tags: ['main'] }));
    }
    await authenticate(page);
  });

  test('the invisible edge zones are gone', async ({ page }) => {
    await openRecipe(page, ids[1]);
    await expect(page.locator('.mobile-edge-nav, #mobile-edge-prev, #mobile-edge-next')).toHaveCount(0);
  });

  test('above the phone breakpoint the chevrons are hidden', async ({ page }) => {
    test.skip(isPhone(page), 'tablet and desktop only');
    await openRecipe(page, ids[1]);
    await expect(prev(page)).toBeHidden();
    await expect(next(page)).toBeHidden();
    await expect(page.locator('#page-next')).toBeVisible();
  });

  test('the chevrons are visible 44px buttons at the end of the tab row', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    for (const loc of [prev(page), next(page)]) {
      await expect(loc).toBeVisible();
      expect(await loc.evaluate(el => el.tagName)).toBe('BUTTON');
    }
    await expectHitArea(page, '#gutter-prev');
    await expectHitArea(page, '#gutter-next');
    const geo = await page.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      const tabs = Array.from(document.querySelectorAll('#page-right .page-tab')).map(t => t.getBoundingClientRect());
      return { row: r('#page-right .page-tabs'), p: r('#gutter-prev'), n: r('#gutter-next'), lastTabRight: tabs[tabs.length - 1].right };
    });
    const mid = (b: { top: number; height: number }) => b.top + b.height / 2;
    expect(Math.abs(mid(geo.p) - mid(geo.row))).toBeLessThanOrEqual(22);
    expect(Math.abs(mid(geo.n) - mid(geo.row))).toBeLessThanOrEqual(22);
    expect(geo.p.right).toBeLessThanOrEqual(geo.n.left);
    expect(geo.p.left).toBeGreaterThanOrEqual(geo.lastTabRight);
  });

  test('the chevrons cover no page content at any scroll position', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    await openTab(page, 'method');
    const max = await page.locator('#page-right').evaluate(el => el.scrollHeight - el.clientHeight);
    expect(max).toBeGreaterThan(100);
    for (const top of [0, Math.round(max / 2), max]) {
      await page.locator('#page-right').evaluate((el, t) => { el.scrollTop = t; }, top);
      await page.waitForTimeout(100);
      expect(await chevronIntrusions(page), `scrollTop ${top}`).toEqual([]);
    }
  });

  test('tapping the chevrons turns forward and back', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    await watchNavDirection(page);
    await next(page).tap();
    await expect(title(page)).toHaveText(titles[2]);
    expect(await navDirections(page)).toContain('forward');
    await page.waitForTimeout(400);
    await prev(page).tap();
    await expect(title(page)).toHaveText(titles[1]);
    expect(await navDirections(page)).toContain('backward');
  });

  test('previous on the first recipe returns to the contents; next on the last is inert', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[2]);
    await expect(next(page)).toBeVisible();
    await expect(next(page)).toBeDisabled();
    await next(page).tap({ force: true });
    await page.waitForTimeout(800);
    await expect(title(page)).toHaveText(titles[2]);

    await openRecipe(page, ids[0]);
    await expect(title(page)).toHaveText(titles[0]);
    await expect(prev(page)).toBeEnabled();
    await prev(page).tap();
    await expect(page.locator('.index-title')).toBeVisible();
  });

  test('the chevrons are hidden on the contents and on a meal plan', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await expect(page.locator('.index-title')).toBeVisible();
    await expect(prev(page)).toBeHidden();
    await expect(next(page)).toBeHidden();

    await openRecipe(page, ids[1]);
    await expect(next(page)).toBeVisible();
    await page.evaluate(() => {
      // @ts-ignore - exposed by app.js
      renderMealPlan({ title: 'Sunday', guest_count: null, recipes: [{ recipe_id: 'x', title: 'Roast', role: 'centrepiece' }] });
    });
    await expect(page.locator('.meal-plan-panel')).toBeVisible();
    await expect(prev(page)).toBeHidden();
    await expect(next(page)).toBeHidden();
  });

  test('a tap near the left edge of a quantity keeps the recipe', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    await openRecipe(page, ids[1]);
    const qty = page.locator('#page-right-content .ingredient-qty').nth(2);
    await expect(qty).toBeVisible();
    const box = (await qty.boundingBox())!;
    await tapAt(page, box.x + 6, box.y + box.height / 2);
    await page.waitForTimeout(1000);
    await expect(title(page)).toHaveText(titles[1]);
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'recipe');
  });

  test('tapping a contents page number opens that row', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    const row = page.locator('.index-recipe-item').nth(2);
    await expect(row).toBeVisible();
    const id = await row.getAttribute('data-recipe-id');
    const num = row.locator('.index-page-number');
    const box = (await num.boundingBox())!;
    await tapAt(page, box.x + box.width / 2, box.y + box.height / 2);
    const expected = titles[ids.indexOf(id!)];
    await expect(title(page)).toHaveText(expected);
  });
});
