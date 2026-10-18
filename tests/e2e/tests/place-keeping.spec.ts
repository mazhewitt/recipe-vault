import { test, expect, Page } from '@playwright/test';
import { authenticate, createCookingRecipe, expectHitArea, isPhone, openRecipe, openTab } from './helpers';

/**
 * cooking-guidance › The cook can keep their place in a recipe, and
 * › The screen stays awake while cooking (D10).
 */

/** Selects a spread mode from the left-edge strip, retrying through a page turn's animation lock. */
async function selectMode(page: Page, mode: 'contents' | 'cook' | 'notes') {
  const tab = page.locator(`.spread-tab[data-mode="${mode}"]`);
  await expect(async () => {
    await tab.click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', mode, { timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

/** The ingredient at `n` on whichever page shows the ingredients. */
function ingredient(page: Page, n: number) {
  return page.locator(`.ingredient-item[data-index="${n}"]`);
}

function step(page: Page, n: number) {
  return page.locator(`#page-right-content .prep-step[data-step="${n}"]`);
}

/**
 * Clicks an element at its centre, kept 61px clear of the phone's edges, where
 * the .mobile-edge-nav strips take the tap.
 */
async function tap(page: Page, locator: ReturnType<Page['locator']>) {
  await locator.scrollIntoViewIfNeeded();
  const box = (await locator.boundingBox())!;
  let x = box.width / 2;
  if (isPhone(page)) {
    const width = page.viewportSize()!.width;
    x = Math.min(Math.max(box.x + x, 61), width - 61) - box.x;
  }
  await locator.click({ position: { x, y: box.height / 2 } });
}

/** Opens a recipe on the cook spread (wide) or the Ingredients tab (phone). */
async function openCooking(page: Page, id: string) {
  await openRecipe(page, id);
  await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'recipe');
  if (!isPhone(page)) {
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    await expect(page.locator('#page-left-content .ingredient-item').first()).toBeVisible();
  } else {
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'ingredients');
  }
  await settled(page);
}

/** Resolves once no page turn or tab crossfade holds the lock, so a tap counts. */
async function settled(page: Page) {
  await expect.poll(() => page.evaluate(async () => {
    // @ts-ignore - module path served by the app
    const M = await import('/static/page-transitions.js');
    return M.isAnimating();
  })).toBe(false);
}

async function toMethod(page: Page) {
  if (isPhone(page)) await openTab(page, 'method');
  await settled(page);
}

async function toIngredients(page: Page) {
  if (isPhone(page)) await openTab(page, 'ingredients');
  await settled(page);
}

async function stored(page: Page, id: string) {
  return page.evaluate((key) => sessionStorage.getItem(key), `rv-place:${id}`);
}

async function boxOf(locator: ReturnType<Page['locator']>) {
  const b = (await locator.boundingBox())!;
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}

function expectSameBox(a: { x: number; y: number; width: number; height: number }, b: typeof a, what: string) {
  for (const k of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs(a[k] - b[k]), `${what} ${k} moved`).toBeLessThanOrEqual(1);
  }
}

/** Turns to the next or previous recipe by the control this viewport offers. */
async function turn(page: Page, dir: 'next' | 'prev', expectTitle: string) {
  const control = isPhone(page)
    ? page.locator(`#page-right-content .footer-${dir}`)
    : page.locator(dir === 'next' ? '#page-next' : '#page-prev');
  await control.scrollIntoViewIfNeeded();
  await control.click();
  await expect(page.locator('#page-right-content .recipe-title')).toHaveText(expectTitle, { timeout: 10000 });
  await settled(page);
}

test.describe('Keeping your place', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('tapping an ingredient ticks it and tapping again unticks it, without moving it', async ({ page }) => {
    const r = await createCookingRecipe(page);
    await openCooking(page, r.id);
    const item = ingredient(page, 2);
    await item.scrollIntoViewIfNeeded();
    const before = await boxOf(item);

    await tap(page, item);
    await expect(item).toHaveAttribute('data-ticked', 'true');
    expectSameBox(await boxOf(item), before, 'ticked ingredient');
    // Struck through, faded, and a pencil tick drawn in the margin
    const look = await item.evaluate(el => ({
      deco: getComputedStyle(el).textDecorationLine,
      opacity: parseFloat(getComputedStyle(el).opacity),
      tick: getComputedStyle(el, '::before').content,
    }));
    expect(look.deco).toContain('line-through');
    expect(look.opacity).toBeLessThan(1);
    expect(look.tick).not.toBe('none');

    await tap(page, item);
    await expect(item).not.toHaveAttribute('data-ticked', 'true');
    expectSameBox(await boxOf(item), before, 'unticked ingredient');
  });

  test('one step carries the mark; tapping it again clears it', async ({ page }) => {
    const r = await createCookingRecipe(page);
    await openCooking(page, r.id);
    await toMethod(page);

    const two = step(page, 2);
    await two.scrollIntoViewIfNeeded();
    const before = await boxOf(two);
    await tap(page, two);
    await expect(two).toHaveAttribute('aria-current', 'step');
    expectSameBox(await boxOf(two), before, 'marked step');
    const bracket = await two.evaluate(el => getComputedStyle(el, '::after').content);
    expect(bracket).not.toBe('none');

    await tap(page, step(page, 3));
    await expect(step(page, 3)).toHaveAttribute('aria-current', 'step');
    await expect(two).not.toHaveAttribute('aria-current', 'step');
    await expect(page.locator('.prep-step[aria-current="step"]')).toHaveCount(1);

    await tap(page, step(page, 3));
    await expect(page.locator('.prep-step[aria-current="step"]')).toHaveCount(0);
  });

  test('the mark and the timer highlight coexist', async ({ page }) => {
    const r = await createCookingRecipe(page);
    await openCooking(page, r.id);
    await page.evaluate(() => {
      // @ts-ignore - startTimer is exposed by app.js
      startTimer(1, 'x', 2);
    });
    await toMethod(page);
    const two = step(page, 2);
    await expect(two).toHaveClass(/timer-active/);
    await tap(page, two);
    await expect(two).toHaveAttribute('aria-current', 'step');
    await expect(two).toHaveClass(/timer-active/);
    const marks = await two.evaluate(el => ({
      tag: getComputedStyle(el, '::before').content,
      bracket: getComputedStyle(el, '::after').content,
    }));
    expect(marks.tag).not.toBe('none');
    expect(marks.bracket).not.toBe('none');
    await page.evaluate(() => {
      // @ts-ignore - cancelTimer is exposed by app.js
      cancelTimer();
    });
  });

  test('ticks and the mark are remembered per recipe, across paging and a reload', async ({ page }) => {
    const a = await createCookingRecipe(page);
    const b = await createCookingRecipe(page);
    await authenticate(page);
    await openCooking(page, a.id);

    await tap(page, ingredient(page, 1));
    await tap(page, ingredient(page, 3));
    await toMethod(page);
    await tap(page, step(page, 4));
    expect(JSON.parse((await stored(page, a.id))!)).toEqual({ ticked: [1, 3], step: 4 });

    // Next to B: B carries none of A's marks
    await turn(page, 'next', b.title);
    await toIngredients(page);
    await expect(page.locator('.ingredient-item[data-ticked="true"]')).toHaveCount(0);
    await expect(page.locator('.prep-step[aria-current="step"]')).toHaveCount(0);
    await tap(page, ingredient(page, 0));
    expect(JSON.parse((await stored(page, b.id))!)).toEqual({ ticked: [0], step: null });

    // ...and back to A
    await turn(page, 'prev', a.title);
    await toIngredients(page);
    await expect(page.locator('.ingredient-item[data-ticked="true"]')).toHaveCount(2);
    await expect(ingredient(page, 1)).toHaveAttribute('data-ticked', 'true');
    await expect(ingredient(page, 3)).toHaveAttribute('data-ticked', 'true');
    await expect(step(page, 4)).toHaveAttribute('aria-current', 'step');

    // A reload, then A opened again
    await page.reload();
    await expect(page.locator('.app-container')).toBeVisible();
    await openCooking(page, a.id);
    await expect(ingredient(page, 1)).toHaveAttribute('data-ticked', 'true');
    await expect(ingredient(page, 3)).toHaveAttribute('data-ticked', 'true');
    await expect(ingredient(page, 0)).not.toHaveAttribute('data-ticked', 'true');
    await expect(step(page, 4)).toHaveAttribute('aria-current', 'step');
  });

  test('clear ticks removes the ticks, the mark and the stored place', async ({ page }) => {
    const r = await createCookingRecipe(page);
    // A recipe after it, so the phone's next-recipe strip is live (it takes no
    // taps on the last page)
    await createCookingRecipe(page);
    await authenticate(page);
    await openCooking(page, r.id);
    const header = page.locator('.tab-panel[data-tab="ingredients"] .section-header:visible');
    const clear = header.locator('.clear-ticks');
    await expect(clear).toBeHidden();
    const headerHeight = (await header.boundingBox())!.height;

    await tap(page, ingredient(page, 0));
    await expect(clear).toBeVisible();
    expect(Math.abs((await header.boundingBox())!.height - headerHeight)).toBeLessThanOrEqual(1);

    await toMethod(page);
    await tap(page, step(page, 2));
    await toIngredients(page);
    await clear.scrollIntoViewIfNeeded();
    // Nothing (the phone's edge-nav strips) takes the tap meant for it
    const reachable = await clear.evaluate(el => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!hit && el.contains(hit);
    });
    expect(reachable, '.clear-ticks is covered at its centre').toBe(true);
    await clear.click();

    await expect(page.locator('.ingredient-item[data-ticked="true"]')).toHaveCount(0);
    await expect(page.locator('.prep-step[aria-current="step"]')).toHaveCount(0);
    await expect(clear).toBeHidden();
    expect(await stored(page, r.id)).toBeNull();
  });

  test('clear ticks has a 44px hit area', async ({ page }) => {
    const r = await createCookingRecipe(page);
    await authenticate(page);
    await openCooking(page, r.id);
    await tap(page, ingredient(page, 0));
    const sel = '.tab-panel[data-tab="ingredients"] .section-header:visible .clear-ticks';
    await expect(page.locator(sel)).toBeVisible();
    await page.locator(sel).scrollIntoViewIfNeeded();
    await expectHitArea(page, sel);
  });

  test('a touch drag that starts on an item ticks nothing', async ({ page }) => {
    test.skip(test.info().project.name === 'chromium', 'touch projects only (mobile-chrome, ipad)');
    const r = await createCookingRecipe(page);
    await openCooking(page, r.id);
    const item = ingredient(page, 1);
    await item.scrollIntoViewIfNeeded();
    const box = (await item.boundingBox())!;
    const x = isPhone(page) ? page.viewportSize()!.width / 2 : box.x + Math.min(box.width / 2, 80);
    const y = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - (120 * i) / 12 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
    await expect(page.locator('.ingredient-item[data-ticked="true"]')).toHaveCount(0);
    expect(await stored(page, r.id)).toBeNull();
  });

  test('a tap during a page turn is ignored', async ({ page }) => {
    const a = await createCookingRecipe(page);
    const b = await createCookingRecipe(page);
    await authenticate(page);
    await openCooking(page, a.id);
    await ingredient(page, 1).scrollIntoViewIfNeeded();
    const nextSel = isPhone(page) ? '#page-right-content .footer-next' : '#page-next';
    // In the page, so the tap lands in the first frame the turn holds the lock
    // (it takes it once the recipe list has been re-read)
    const tappedInTurn = await page.evaluate(async (sel) => {
      // @ts-ignore - module path served by the app
      const M = await import('/static/page-transitions.js');
      (document.querySelector(sel) as HTMLElement).click();
      const start = performance.now();
      while (!M.isAnimating() && performance.now() - start < 5000) {
        await new Promise(r => setTimeout(r, 0));
      }
      if (!M.isAnimating()) return 'no lock';
      // Whichever recipe's line is on the page by now, A's or (from the
      // prefetch cache) already B's
      const line = document.querySelector('#page-left-content .ingredient-item[data-index="1"], #page-right-content .ingredient-item[data-index="1"]') as HTMLElement | null;
      if (!line) return 'no line';
      line.click();
      return 'tapped';
    }, nextSel);
    expect(tappedInTurn).toBe('tapped');
    await expect(page.locator('#page-right-content .recipe-title')).toHaveText(b.title, { timeout: 10000 });
    expect(await stored(page, a.id)).toBeNull();
    expect(await stored(page, b.id)).toBeNull();
    await expect(page.locator('.ingredient-item[data-ticked="true"]')).toHaveCount(0);
  });
});

test.describe('The screen stays awake while cooking', () => {
  test('one lock while cooking, kept while paging, released on the contents, re-taken on return', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __wl: { requests: number; releases: number } };
      w.__wl = { requests: 0, releases: 0 };
      Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: {
          request: async (type: string) => {
            w.__wl.requests++;
            const sentinel = {
              type,
              released: false,
              release: async () => {
                if (sentinel.released) return;
                sentinel.released = true;
                w.__wl.releases++;
              },
              addEventListener() {},
              removeEventListener() {},
            };
            return sentinel;
          },
        },
      });
    });
    const a = await createCookingRecipe(page);
    const b = await createCookingRecipe(page);
    await authenticate(page);
    const counts = () => page.evaluate(() => (window as unknown as { __wl: { requests: number; releases: number } }).__wl);
    expect(await counts()).toEqual({ requests: 0, releases: 0 });

    await openCooking(page, a.id);
    await expect.poll(counts).toEqual({ requests: 1, releases: 0 });

    await turn(page, 'next', b.title);
    await page.waitForTimeout(300);
    expect(await counts()).toEqual({ requests: 1, releases: 0 });

    await page.click('#recipe-book-header');
    await expect(page.locator('.index-title')).toBeVisible();
    await expect.poll(counts).toEqual({ requests: 1, releases: 1 });

    await openCooking(page, a.id);
    await expect.poll(counts).toEqual({ requests: 2, releases: 1 });
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(async () => (await counts()).requests).toBe(3);
  });

  test('without the Wake Lock API nothing errors', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore - removing the API as an unsupported browser would lack it
      delete Navigator.prototype.wakeLock;
      // @ts-ignore
      delete navigator.wakeLock;
    });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    const r = await createCookingRecipe(page);
    await authenticate(page);
    expect(await page.evaluate(() => 'wakeLock' in navigator)).toBe(false);
    await openCooking(page, r.id);
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.click('#recipe-book-header');
    await expect(page.locator('.index-title')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
