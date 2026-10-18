import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, isPhone, line, openRecipe, recordRequests, sendNote, touchGesture } from './helpers';

const API_HEADERS = { 'X-API-Key': 'test-api-key-for-playwright' };

/**
 * Empties the book, and proves it emptied, so the open recipe's neighbours are
 * the ones this file seeds (copy of swipe-navigation.spec.ts clearRecipes).
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

/** Three recipes in alphabetical order, each with its difficulty assessed (the cache serves only those). */
async function seedThree(page: Page) {
  const suffix = `${Date.now()}`;
  const ids: string[] = [];
  for (const name of ['Apricot Tart', 'Barley Soup', 'Carrot Cake']) {
    ids.push(await createRecipe(page, {
      title: `${name} ${suffix}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      difficulty: 2,
      tags: ['main'],
    }));
  }
  return { ids, titles: ['Apricot Tart', 'Barley Soup', 'Carrot Cake'].map(n => `${n} ${suffix}`) };
}

const title = (page: Page) => page.locator('#page-right-content .recipe-title');

/** The next control the reader has at this width. */
const nextControl = (page: Page) => page.locator(isPhone(page) ? '#gutter-next' : '#page-next');

async function isAnimating(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    // @ts-ignore - browser-side module import
    const M = await import('/static/page-transitions.js');
    return M.isAnimating();
  });
}

async function isCached(page: Page, id: string): Promise<boolean> {
  return page.evaluate(async (rid) => {
    // @ts-ignore - browser-side module import
    const M = await import('/static/page-transitions.js');
    return M.getCachedRecipe(rid) !== null;
  }, id);
}

async function waitForPrefetch(page: Page, id: string) {
  await expect.poll(() => isCached(page, id), { timeout: 10000 }).toBe(true);
}

/** Opens the middle recipe and waits for both neighbours to be prefetched. */
async function openMiddle(page: Page) {
  const seeded = await seedThree(page);
  await page.reload();
  await expect(page.locator('.index-title')).toBeVisible();
  await openRecipe(page, seeded.ids[1]);
  await expect(title(page)).toHaveText(seeded.titles[1]);
  await waitForPrefetch(page, seeded.ids[0]);
  await waitForPrefetch(page, seeded.ids[2]);
  await expect.poll(() => isAnimating(page)).toBe(false);
  return seeded;
}

test.describe('Page turns use the held list and the prefetch', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
    await clearRecipes(page);
  });

  test('a turn makes no list request', async ({ page }) => {
    const { titles } = await openMiddle(page);
    const rec = recordRequests(page);

    await nextControl(page).click();
    await expect(title(page)).toHaveText(titles[2]);
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);
    await page.waitForTimeout(500);

    expect(rec.list, 'GET /api/recipes during the turn').toEqual([]);
  });

  for (const via of ['footer', 'swipe'] as const) {
    test(`a turn by the ${via} makes no list request`, async ({ page }) => {
      test.skip(!isPhone(page), 'phone only: the footer link and swipes are the phone\'s controls');
      const { titles } = await openMiddle(page);
      const rec = recordRequests(page);

      if (via === 'footer') {
        await page.locator('#page-right-content .footer-next').click();
      } else {
        await touchGesture(page, 320, 420, line(10, -0.45 * page.viewportSize()!.width, 0));
      }
      await expect(title(page)).toHaveText(titles[2]);
      await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);
      await page.waitForTimeout(500);

      expect(rec.list, 'GET /api/recipes during the turn').toEqual([]);
    });
  }

  test('a cached turn requests no recipe and shows no skeleton', async ({ page }) => {
    const { ids, titles } = await openMiddle(page);
    const rec = recordRequests(page);
    await page.evaluate(() => {
      (window as any).__skeletons = 0;
      new MutationObserver((records) => {
        for (const r of records) {
          r.addedNodes.forEach((n) => {
            if (n instanceof Element && (n.matches('.skeleton') || n.querySelector('.skeleton'))) {
              (window as any).__skeletons++;
            }
          });
        }
      }).observe(document.getElementById('page-right-content')!, { childList: true, subtree: true });
    });

    await nextControl(page).click();
    await expect(title(page)).toHaveText(titles[2]);
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);

    expect(rec.recipe.filter(id => id === ids[2]), 'GET /api/recipes/:next').toEqual([]);
    expect(await page.evaluate(() => (window as any).__skeletons)).toBe(0);
  });

  test('with a slow API the next title still appears in under 300ms', async ({ page }) => {
    const { titles } = await openMiddle(page);
    await page.route(/\/api\/recipes(\/[^/]+)?$/, async (route) => {
      await new Promise(r => setTimeout(r, 300));
      await route.continue();
    });

    const elapsed = await page.evaluate(async ({ sel, want }) => {
      const t0 = performance.now();
      (document.querySelector(sel) as HTMLElement).click();
      return new Promise<number>((resolve) => {
        const check = () => {
          const el = document.querySelector('#page-right-content .recipe-title');
          if (el && el.textContent!.trim() === want) resolve(performance.now() - t0);
          else if (performance.now() - t0 > 3000) resolve(Infinity);
          else requestAnimationFrame(check);
        };
        check();
      });
    }, { sel: isPhone(page) ? '#gutter-next' : '#page-next', want: titles[2] });

    expect(elapsed).toBeLessThan(300);
  });

  test('a list refresh keeps both cached neighbours', async ({ page }) => {
    const { ids } = await openMiddle(page);
    await page.evaluate(() => (window as any).fetchRecipeList(true));
    expect(await isCached(page, ids[0])).toBe(true);
    expect(await isCached(page, ids[2])).toBe(true);
  });

  test('a deleted recipe leaves the cache on the next refresh, and only it', async ({ page }) => {
    const { ids } = await openMiddle(page);
    const del = await page.request.delete(`/api/recipes/${ids[2]}`, { headers: API_HEADERS });
    expect(del.ok()).toBeTruthy();

    await page.evaluate(() => (window as any).fetchRecipeList(true));
    expect(await isCached(page, ids[2])).toBe(false);
    expect(await isCached(page, ids[0])).toBe(true);
  });

  test('a page load makes exactly one list request', async ({ page }) => {
    await seedThree(page);
    const rec = recordRequests(page);
    await page.reload();
    await expect(page.locator('.index-recipe-item').first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(rec.list).toHaveLength(1);
  });

  test('the Contents spread tab makes exactly one list request', async ({ page }) => {
    test.skip(isPhone(page), 'spread modes exist above 600px only');
    await openMiddle(page);
    const rec = recordRequests(page);
    await page.locator('.spread-tab[data-mode="contents"]').click();
    await expect(page.locator('#page-left-content .index-recipe-item').first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(rec.list).toHaveLength(1);
  });

  test('a recipe created after load refreshes the list once when opened', async ({ page }) => {
    await seedThree(page);
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    // Not in the list the page loaded with
    const lateId = await createRecipe(page, {
      title: `Zucchini Bread ${Date.now()}`,
      ingredients: [], steps: [], difficulty: 2, tags: ['main'],
    });
    const rec = recordRequests(page);
    await openRecipe(page, lateId);
    await expect.poll(() => rec.list.length, { timeout: 5000 }).toBe(1);
    await page.waitForTimeout(500);
    expect(rec.list).toHaveLength(1);

    const expected = await page.evaluate(async (id) => {
      const list = await (window as any).fetchRecipeList();
      // @ts-ignore - browser-side module import
      const M = await import('/static/recipe-display.js');
      return `p. ${M.pageNumberFor(list.findIndex((r: any) => String(r.id) === String(id)))}`;
    }, lateId);
    await expect(page.locator('#note-page-number')).toHaveText(expected);
  });

  test('a chat turn that ran delete_recipe refreshes the list once at done', async ({ page }) => {
    const { ids } = await openMiddle(page);
    let releaseDone: () => void = () => {};
    const doneHeld = new Promise<void>(r => { releaseDone = r; });
    const deleted = ids[0];
    await page.route('**/api/chat', async (route) => {
      await page.request.delete(`/api/recipes/${deleted}`, { headers: API_HEADERS });
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body:
          'event: tool_use\ndata: {"tool":"delete_recipe"}\n\n'
          + 'event: chunk\ndata: {"text":"Gone from the book."}\n\n'
          + 'event: done\ndata: {"conversation_id":"cache-test"}\n\n',
      });
      releaseDone();
    });
    const rec = recordRequests(page);

    await sendNote(page, 'delete the apricot tart');
    await doneHeld;
    await expect.poll(() => rec.list.length, { timeout: 5000 }).toBe(1);
    await page.waitForTimeout(500);
    expect(rec.list).toHaveLength(1);
    // The refreshed list drops the deleted recipe from the cache
    expect(await isCached(page, deleted)).toBe(false);
  });
});
