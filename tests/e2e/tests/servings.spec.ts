import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, expectHitArea, isPhone, openNotesView, openRecipe, sendNote, waitForTurn } from './helpers';

/**
 * family-recipe-ui › Scaled quantities are rounded for reading, driven through
 * the pure scaleQuantity in static/servings.js (there is no JS unit tier);
 * family-recipe-ui › A servings stepper scales the page; web-chat › The
 * servings_set event sets the page's stepper; browser-testing › AI scaling
 * sets the page's servings.
 */

/** scaleQuantity(quantity, unit, servings, n) for each case, in the page. */
async function scaled(page: Page, cases: Array<[number, string | null, number, number]>): Promise<string[]> {
  return page.evaluate(async (cs) => {
    // @ts-ignore - module path served by the app
    const M = await import('/static/servings.js');
    return cs.map(([q, u, s, n]) => M.scaleQuantity(q, u, s, n));
  }, cases);
}

test.describe('Scaled quantities are rounded for reading', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('grams and millilitres: whole below 50, nearest 5 to 500, nearest 10 above', async ({ page }) => {
    expect(await scaled(page, [
      [100, 'g', 8, 2],
      [150, 'g', 8, 2],
      [500, 'g', 8, 2],
      [450, 'g', 8, 3],
      [900, 'ml', 8, 7],
      [100, 'grams', 8, 3],
      [100, 'ML', 8, 3],
    ])).toEqual(['25 g', '38 g', '125 g', '170 g', '790 ml', '38 grams', '38 ML']);
  });

  test('kilograms and litres: one decimal place, a trailing .0 dropped', async ({ page }) => {
    expect(await scaled(page, [
      [1.5, 'kg', 8, 3],
      [2, 'l', 8, 4],
      [1, 'litre', 8, 12],
    ])).toEqual(['0.6 kg', '1 l', '1.5 litre']);
  });

  test('cups and spoons: the nearest quarter, as a fraction', async ({ page }) => {
    expect(await scaled(page, [
      [2, 'tbsp', 8, 3],
      [1, 'tsp', 8, 12],
      [2, 'cups', 8, 5],
      [1, 'teaspoon', 8, 6],
    ])).toEqual(['¾ tbsp', '1½ tsp', '1¼ cups', '¾ teaspoon']);
  });

  test('counts without a unit: the nearest half, as a fraction', async ({ page }) => {
    expect(await scaled(page, [
      [3, null, 8, 3],
      [3, null, 8, 12],
      [4, null, 8, 2],
      [3, '', 8, 12],
    ])).toEqual(['1', '4½', '1', '4½']);
  });

  test('a count that rounds to nothing reads "a little of" the unscaled amount', async ({ page }) => {
    expect(await scaled(page, [
      [1, null, 8, 1],
      [10, 'g', 1000, 1],
    ])).toEqual(['a little of 1', 'a little of 10 g']);
  });

  test('any other unit: at most two decimals, trailing zeros dropped', async ({ page }) => {
    expect(await scaled(page, [
      [3, 'cloves', 8, 3],
      [2, 'tins', 8, 4],
      [1, 'pinch', 8, 12],
    ])).toEqual(['1.13 cloves', '1 tins', '1.5 pinch']);
  });

  test('at the recipe\'s own servings the quantity reads as stored', async ({ page }) => {
    expect(await scaled(page, [
      [1.2, 'kg', 4, 4],
      [37.5, 'g', 8, 8],
      [0.333, null, 8, 8],
    ])).toEqual(['1.2 kg', '37.5 g', '0.333']);
  });
});

/** An 8-serving recipe with a quantity in each rounding class, and one without. */
async function createScalingRecipe(page: Page, servings: number | null = 8): Promise<string> {
  return createRecipe(page, {
    title: `Scaling Bake ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: 'A recipe to scale',
    ingredients: [
      { name: 'plain flour', quantity: 450, unit: 'g' },
      { name: 'eggs', quantity: 3 },
      { name: 'salt and pepper' },
      { name: 'whole milk', quantity: 900, unit: 'ml' },
    ],
    steps: [
      { step_number: 1, instruction: 'Whisk the 3 eggs into the 900 ml of milk.' },
      { step_number: 2, instruction: 'Fold in the 450 g of flour and bake.' },
    ],
    ...(servings == null ? {} : { servings }),
  });
}

const count = (page: Page) => page.locator('.servings-count');
const minus = (page: Page) => page.locator('.servings-step[data-step="-1"]');
const plus = (page: Page) => page.locator('.servings-step[data-step="+1"]');
const qty = (page: Page, n: number) => page.locator(`.ingredient-item[data-index="${n}"] .ingredient-qty`);

/** Taps − or + until the count reads `n`. */
async function stepTo(page: Page, n: number) {
  for (let i = 0; i < 40; i++) {
    const now = Number(await count(page).textContent());
    if (now === n) return;
    await (now > n ? minus(page) : plus(page)).click();
    await expect(count(page)).toHaveText(String(now > n ? now - 1 : now + 1));
  }
  throw new Error(`count never reached ${n}`);
}

async function placeRecord(page: Page, id: string) {
  const raw = await page.evaluate((key) => sessionStorage.getItem(key), `rv-place:${id}`);
  return raw ? JSON.parse(raw) : null;
}

test.describe('A servings stepper scales the page', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('the stepper renders, and a recipe without servings has none', async ({ page }) => {
    const id = await createScalingRecipe(page);
    await openRecipe(page, id);
    await expect(page.locator('.recipe-meta-line .meta-serves')).toContainText('serves');
    await expect(minus(page)).toHaveAttribute('aria-label', 'Fewer servings');
    await expect(plus(page)).toHaveAttribute('aria-label', 'More servings');
    await expect(count(page)).toHaveText('8');
    await expect(count(page)).toHaveAttribute('aria-live', 'polite');
    expect(await count(page).evaluate(el => el.tagName)).toBe('OUTPUT');
    await expectHitArea(page, '.servings-step[data-step="-1"]');
    await expectHitArea(page, '.servings-step[data-step="+1"]');

    const bare = await createScalingRecipe(page, null);
    await openRecipe(page, bare);
    await expect(page.locator('.recipe-title')).toContainText('Scaling Bake');
    await expect(page.locator('.servings-step')).toHaveCount(0);
    await expect(count(page)).toHaveCount(0);
  });

  test('the range runs from 1 to max(S, min(4S, 24))', async ({ page }) => {
    const eight = await createScalingRecipe(page, 8);
    await openRecipe(page, eight);
    await stepTo(page, 24);
    await expect(plus(page)).toBeDisabled();
    await plus(page).click({ force: true });
    await expect(count(page)).toHaveText('24');

    const two = await createScalingRecipe(page, 2);
    await openRecipe(page, two);
    await expect(count(page)).toHaveText('2');
    await stepTo(page, 8);
    await expect(plus(page)).toBeDisabled();
    await stepTo(page, 1);
    await expect(minus(page)).toBeDisabled();
    await minus(page).click({ force: true });
    await expect(count(page)).toHaveText('1');

    const thirty = await createScalingRecipe(page, 30);
    await openRecipe(page, thirty);
    await expect(count(page)).toHaveText('30');
    await expect(plus(page)).toBeDisabled();
    await expect(minus(page)).toBeEnabled();
  });

  test('quantities are scaled, marked in biro, and read as stored again at S', async ({ page }) => {
    const id = await createScalingRecipe(page);
    await openRecipe(page, id);
    const note = page.locator('.servings-note');
    await expect(note).toHaveText('');
    const noteBox = (await note.boundingBox())!;

    await stepTo(page, 3);
    await expect(qty(page, 0)).toHaveText('170 g');
    await expect(qty(page, 1)).toHaveText('1');
    await expect(qty(page, 3)).toHaveText('340 ml');
    await expect(page.locator('.ingredient-item[data-index="1"]')).toHaveText('1 eggs');
    await expect(page.locator('.ingredient-item[data-index="2"]')).toHaveText('salt and pepper');
    await expect(page.locator('.ingredient-qty[data-scaled]')).toHaveCount(3);
    const inks = await page.evaluate(() => {
      const biro = document.createElement('span');
      biro.style.color = 'var(--color-biro)';
      document.body.appendChild(biro);
      const want = getComputedStyle(biro).color;
      biro.remove();
      return { want, got: [...document.querySelectorAll('.ingredient-qty[data-scaled]')].map(el => getComputedStyle(el).color) };
    });
    expect(inks.got).toEqual([inks.want, inks.want, inks.want]);
    await expect(note).toHaveText('Scaled for 3 · amounts in the method are for 8');
    const shown = (await note.boundingBox())!;
    for (const k of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(shown[k] - noteBox[k]), `note ${k}`).toBeLessThanOrEqual(1);
    }

    await stepTo(page, 8);
    await expect(qty(page, 0)).toHaveText('450 g');
    await expect(qty(page, 1)).toHaveText('3');
    await expect(qty(page, 3)).toHaveText('900 ml');
    await expect(page.locator('.ingredient-qty[data-scaled]')).toHaveCount(0);
    await expect(note).toHaveText('');
  });

  test('only the quantity text changes', async ({ page }) => {
    const id = await createScalingRecipe(page);
    await openRecipe(page, id);
    const method = await page.locator('#page-right-content .prep-list').textContent();
    await page.evaluate(() => {
      const w = window as any;
      w.__elementMutations = 0;
      w.__observer = new MutationObserver(records => {
        for (const r of records) {
          for (const n of [...r.addedNodes, ...r.removedNodes]) {
            if (n.nodeType === Node.ELEMENT_NODE) w.__elementMutations++;
          }
        }
      });
      for (const id of ['page-left-content', 'page-right-content']) {
        w.__observer.observe(document.getElementById(id), { childList: true, subtree: true });
      }
    });
    await plus(page).click();
    await expect(count(page)).toHaveText('9');
    await minus(page).click();
    await minus(page).click();
    await expect(count(page)).toHaveText('7');
    expect(await page.evaluate(() => (window as any).__elementMutations)).toBe(0);
    expect(await page.locator('#page-right-content .prep-list').textContent()).toBe(method);
  });

  test('remembered for the session, clamped to the range', async ({ page }) => {
    const a = await createScalingRecipe(page);
    const b = await createScalingRecipe(page);
    await openRecipe(page, a);
    await stepTo(page, 3);
    expect(await placeRecord(page, a)).toMatchObject({ servings: 3 });

    // Another recipe and back
    await openRecipe(page, b);
    await expect(count(page)).toHaveText('8');
    await openRecipe(page, a);
    await expect(count(page)).toHaveText('3');
    await expect(qty(page, 0)).toHaveText('170 g');

    // A refresh in place
    await page.evaluate((id) => (window as any).fetchAndDisplayRecipe(id), a);
    await expect(count(page)).toHaveText('3');
    await expect(qty(page, 0)).toHaveText('170 g');

    // A reload
    await page.reload();
    await expect(page.locator('.app-container')).toBeVisible();
    await openRecipe(page, a);
    await expect(count(page)).toHaveText('3');
    await expect(qty(page, 0)).toHaveText('170 g');

    // Out of range: above is clamped to the top, below falls back to S
    await page.evaluate((id) => sessionStorage.setItem(`rv-place:${id}`, JSON.stringify({ ticked: [], step: null, servings: 99 })), b);
    await openRecipe(page, b);
    await expect(count(page)).toHaveText('24');
    await page.evaluate((id) => sessionStorage.setItem(`rv-place:${id}`, JSON.stringify({ ticked: [], step: null, servings: 0 })), a);
    await openRecipe(page, a);
    await expect(count(page)).toHaveText('8');
  });

  test('remembered across a spread mode switch, set while the ingredients are parked', async ({ page }) => {
    test.skip(isPhone(page), 'a phone has no spread modes');
    const id = await createScalingRecipe(page);
    await openRecipe(page, id);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    await stepTo(page, 3);
    await openNotesView(page);
    await expect(count(page)).toHaveText('3');

    // Set in Notes mode, on the header's stepper, with the ingredients panel parked off the page
    await stepTo(page, 5);
    // Read in the same task as the switch: the panel must come back already redrawn
    const back = await page.evaluate(() => {
      (window as any).setSpreadMode('cook', { force: true });
      const left = document.getElementById('page-left-content')!;
      return {
        note: left.querySelector('.servings-note')?.textContent,
        qty: left.querySelector('.ingredient-item[data-index="0"] .ingredient-qty')?.textContent,
      };
    });
    expect(back).toEqual({ note: 'Scaled for 5 · amounts in the method are for 8', qty: '280 g' });
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    await expect(page.locator('#page-left-content .servings-note')).toHaveText('Scaled for 5 · amounts in the method are for 8');
    await expect(page.locator('#page-left-content .ingredient-item[data-index="0"] .ingredient-qty')).toHaveText('280 g');
  });

  test('nothing is saved; an update_recipe keeps the count, clamped', async ({ page }) => {
    const id = await createScalingRecipe(page);
    await openRecipe(page, id);
    const calls: string[] = [];
    page.on('request', req => {
      const path = new URL(req.url()).pathname;
      if (path.startsWith('/api/recipes') || path.startsWith('/api/chat')) calls.push(`${req.method()} ${path}`);
    });
    await stepTo(page, 12);
    await stepTo(page, 5);
    await stepTo(page, 12);
    await page.waitForTimeout(300);
    expect(calls).toEqual([]);

    // The mock's "update" saves servings 2: the range becomes 1-8 and 12 is clamped to 8
    await sendNote(page, 'update this recipe');
    await expect(page.locator('.servings-note')).toHaveText('Scaled for 8 · amounts in the method are for 2', { timeout: 10000 });
    await expect(count(page)).toHaveText('8');
  });

  test('stepping back to S stores no count, so a saved new servings shows unscaled', async ({ page }) => {
    const id = await createScalingRecipe(page);
    await openRecipe(page, id);
    await plus(page).click();
    await expect(count(page)).toHaveText('9');
    await minus(page).click();
    await expect(count(page)).toHaveText('8');
    expect((await placeRecord(page, id))?.servings ?? null).toBeNull();

    // The mock's "update" saves servings 2: the page shows the recipe's new servings
    await sendNote(page, 'update this recipe');
    await expect(count(page)).toHaveText('2', { timeout: 10000 });
    await expect(page.locator('.ingredient-qty[data-scaled]')).toHaveCount(0);
    await expect(page.locator('.servings-note')).toHaveText('');
  });
});

/** A hand-built SSE turn: one servings_set event, a reply chunk, done. */
async function routeServingsSet(page: Page, recipeId: string, servings: number) {
  await page.route('**/api/chat', route => route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    body: `event: servings_set\ndata: {"servings":${servings},"recipe_id":"${recipeId}"}\n\n`
      + 'event: chunk\ndata: {"text":"Done."}\n\n'
      + 'event: done\ndata: {"conversation_id":"servings-set"}\n\n',
  }));
}

test.describe('The servings_set event sets the page\'s stepper', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('the open recipe\'s stepper is set, clamped, with no request to /api/recipes', async ({ page }) => {
    const id = await createScalingRecipe(page);
    await openRecipe(page, id);
    const recipeCalls: string[] = [];
    page.on('request', req => {
      if (new URL(req.url()).pathname.startsWith('/api/recipes')) recipeCalls.push(req.url());
    });
    await routeServingsSet(page, id, 3);
    await sendNote(page, 'for three please');
    await expect(count(page)).toHaveText('3', { timeout: 10000 });
    await expect(qty(page, 0)).toHaveText('170 g');
    expect(await placeRecord(page, id)).toMatchObject({ servings: 3 });

    await page.unroute('**/api/chat');
    await routeServingsSet(page, id, 40);
    await sendNote(page, 'for forty please');
    await expect(count(page)).toHaveText('24', { timeout: 10000 });
    expect(recipeCalls).toEqual([]);
  });

  test('another recipe is open: nothing changes', async ({ page }) => {
    const other = await createScalingRecipe(page);
    const id = await createScalingRecipe(page);
    await openRecipe(page, id);
    await routeServingsSet(page, other, 3);
    await sendNote(page, 'for three please');
    await expect(page.locator('#page-margin')).toContainText('Done.', { timeout: 10000 });
    await expect(count(page)).toHaveText('8');
    await expect(qty(page, 0)).toHaveText('450 g');
    expect(await placeRecord(page, id)).toBeNull();
    expect(await placeRecord(page, other)).toBeNull();
  });

  test('the contents is open: nothing changes, though that recipe was the last one shown', async ({ page }) => {
    const id = await createScalingRecipe(page);
    await openRecipe(page, id);
    await waitForTurn(page);
    await page.goBack();
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');
    await waitForTurn(page);
    await routeServingsSet(page, id, 3);
    await sendNote(page, 'for three please');
    await expect(page.locator('#page-margin')).toContainText('Done.', { timeout: 10000 });
    expect(await placeRecord(page, id)).toBeNull();
    await page.unroute('**/api/chat');
    await openRecipe(page, id);
    await expect(count(page)).toHaveText('8');
  });

  test('a recipe without servings: nothing changes', async ({ page }) => {
    const id = await createScalingRecipe(page, null);
    await openRecipe(page, id);
    await routeServingsSet(page, id, 3);
    await sendNote(page, 'for three please');
    await expect(page.locator('#page-margin')).toContainText('Done.', { timeout: 10000 });
    await expect(qty(page, 0)).toHaveText('450 g');
    await expect(count(page)).toHaveCount(0);
    expect(await placeRecord(page, id)).toBeNull();
  });

  test('AI scaling against the mock: "halve this recipe" sets the page to 4', async ({ page }) => {
    const id = await createScalingRecipe(page);
    await openRecipe(page, id);
    const recipeCalls: string[] = [];
    page.on('request', req => {
      if (new URL(req.url()).pathname.startsWith('/api/recipes')) recipeCalls.push(req.url());
    });
    const title = page.locator('#page-right-content .recipe-title');
    const titleNode = await title.elementHandle();
    await sendNote(page, 'halve this recipe');
    await expect(count(page)).toHaveText('4', { timeout: 10000 });
    await expect(qty(page, 0)).toHaveText('225 g');
    await expect(page.locator('#page-margin')).toContainText('Showing 4 servings on the page', { timeout: 10000 });
    // No re-render: the title node is the one that was there before
    expect(await titleNode!.evaluate(el => el.isConnected)).toBe(true);
    expect(recipeCalls).toEqual([]);
  });
});
