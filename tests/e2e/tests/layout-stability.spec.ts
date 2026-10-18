import { test, expect, Page, Route } from '@playwright/test';
import {
  ANCHORS,
  AnchorResult,
  authenticate,
  CLEAR_TICKS_ROW,
  createCookingRecipe,
  expectAnchorsStill,
  isPhone,
  openRecipe,
  openTab,
  paceChat,
  sendNote,
  trackAnchors,
} from './helpers';

/**
 * family-recipe-ui › Nothing on the page moves unless the cook acted on it.
 * One test per scenario.
 */

/** Selects a spread mode from the left-edge strip, retrying through a page turn's animation lock. */
async function selectMode(page: Page, mode: 'contents' | 'cook' | 'notes') {
  const tab = page.locator(`.spread-tab[data-mode="${mode}"]`);
  await expect(async () => {
    await tab.click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', mode, { timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

/** An `/api/chat` route that holds every request until the test releases it. */
function holdChat(page: Page, respond: (route: Route) => Promise<void>) {
  let arrived!: () => void;
  const requested = new Promise<void>(r => { arrived = r; });
  let release!: () => void;
  const released = new Promise<void>(r => { release = r; });
  const ready = page.route('**/api/chat', async (route) => {
    arrived();
    await released;
    await respond(route);
  });
  return { ready, requested, release };
}

/** A hand-built SSE body: a reply of `lines` lines in one chunk per line, then `done`. */
function longReplyBody(lines: number): string {
  let body = '';
  for (let i = 1; i <= lines; i++) {
    const text = `Line ${i} of a long reply about the stew.\\n`;
    body += `event: chunk\ndata: {"text":"${text}"}\n\n`;
  }
  body += `event: done\ndata: {"conversation_id":"layout-stability"}\n\n`;
  return body;
}

/** The centre of an element's box, kept 60px clear of the page edges on the phone. */
async function tapPoint(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = (await page.locator(selector).boundingBox())!;
  let x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (isPhone(page)) {
    const width = page.viewportSize()!.width;
    x = Math.min(Math.max(x, 61), width - 61);
  }
  return { x: x - box.x, y: y - box.y };
}

/** Opens the cooking fixture on the cook spread (wide) or the Ingredients tab (phone). */
async function openCookingRecipe(page: Page) {
  const recipe = await createCookingRecipe(page);
  await openRecipe(page, recipe.id);
  if (!isPhone(page)) await selectMode(page, 'cook');
  return recipe;
}

function withoutAnchor(result: AnchorResult, name: string): AnchorResult {
  const copy = { ...result };
  delete copy[name];
  return copy;
}

test.describe('Layout stability: nothing moves unless the cook acted on it', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('opening a recipe', async ({ page }) => {
    const recipe = await createCookingRecipe(page);
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();
    const entry = page.locator('.index-recipe-item', { hasText: recipe.title });
    await entry.scrollIntoViewIfNeeded();

    const result = await trackAnchors(page, [
      { name: 'note-input', selector: '#note-input' },
      { name: 'message-input', selector: '#message-input' },
      ...(isPhone(page) ? [{ name: 'book-container', selector: '.book-container' }] : []),
    ], async () => {
      await entry.click();
      await expect(page.locator('#page-right-content .recipe-title')).toContainText(recipe.title, { timeout: 10000 });
    });
    expectAnchorsStill(result);
  });

  test('returning to the contents on the phone', async ({ page }) => {
    test.skip(!isPhone(page), 'the chip only hides at ≤600px');
    await openCookingRecipe(page);
    await expect(page.locator('.user-info')).toBeHidden();

    const result = await trackAnchors(page, [
      { name: 'book-container', selector: '.book-container' },
      { name: 'note-input', selector: '#note-input' },
      { name: 'message-input', selector: '#message-input' },
    ], async () => {
      await page.locator('#recipe-book-header').click();
      await expect(page.locator('.index-title')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.user-info')).toBeVisible();
    });
    expectAnchorsStill(result);
  });

  test('switching spread mode', async ({ page }) => {
    test.skip(isPhone(page), 'no spread modes at ≤600px');
    await openCookingRecipe(page);
    const anchors = await ANCHORS(page);

    for (const mode of ['notes', 'contents', 'cook'] as const) {
      const result = await trackAnchors(page, anchors, async () => {
        await selectMode(page, mode);
      });
      expectAnchorsStill(result);
    }
  });

  test('sending a note', async ({ page }) => {
    await openCookingRecipe(page);
    const anchors = await ANCHORS(page);
    const chat = holdChat(page, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response });
    });
    await chat.ready;

    // One line at every width (web-chat "The slip does not change height" is
    // about a one-line note): the ipad slip's textarea is ~170px wide, and a
    // longer note wraps there, so clearing it on send would shrink the slip.
    await page.locator('#message-input').fill('oven hot?');
    const result = await trackAnchors(page, anchors, async () => {
      await page.locator('#message-input').press('Enter');
      await chat.requested;
      await page.waitForTimeout(1500);
    }, { settle: false });
    const replied = page.waitForResponse('**/api/chat');
    chat.release();
    await replied;
    expectAnchorsStill(result);
  });

  test('a reply arriving', async ({ page }) => {
    await openCookingRecipe(page);
    const anchors = await ANCHORS(page);
    const chat = holdChat(page, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: longReplyBody(40),
      });
    });
    await chat.ready;
    // One chunk per frame or slower, so the sticky's growth is sampled while it streams
    await paceChat(page, 50);

    await sendNote(page, 'tell me everything about this stew');
    await chat.requested;
    // Let the sent note settle first: this case starts at the first chunk.
    await page.waitForTimeout(800);

    const result = await trackAnchors(page, anchors, async () => {
      chat.release();
      await expect(page.locator('#page-margin')).toContainText('Line 40 of a long reply', { timeout: 10000 });
    });
    expectAnchorsStill(result);
  });

  test('a reply sticky over a page scrolled to its end', async ({ page }) => {
    await openCookingRecipe(page);
    // The page the sticky lies over: the left page above 600px, the phone's one page
    const scroller = isPhone(page) ? '#page-right' : '#page-left';
    await page.route('**/api/chat', route => route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: longReplyBody(3),
    }));
    const scrollToEnd = async () => {
      await page.locator(scroller).evaluate(el => { el.scrollTop = el.scrollHeight; });
      await page.waitForTimeout(300);
    };
    /** Tracks the anchors and every frame's scrollTop of the page under the sticky through `action`. */
    const trackWithScroll = async (action: () => Promise<void>) => {
      const anchors = await ANCHORS(page);
      await page.locator(scroller).evaluate((el) => {
        const w = window as any;
        w.__scrollTops = [];
        w.__scrollSampling = true;
        const sample = () => {
          if (!w.__scrollSampling) return;
          w.__scrollTops.push(el.scrollTop);
          requestAnimationFrame(sample);
        };
        sample();
      });
      const result = await trackAnchors(page, anchors, action);
      const tops: number[] = await page.evaluate(() => {
        const w = window as any;
        w.__scrollSampling = false;
        return w.__scrollTops;
      });
      expectAnchorsStill(result);
      const drift = Math.max(...tops) - Math.min(...tops);
      expect(drift, `${scroller} scrollTop moved ${tops[0]} → ${tops[tops.length - 1]}`).toBeLessThanOrEqual(1);
    };

    // The reply streams in and completes over a page scrolled to its end...
    await scrollToEnd();
    await trackWithScroll(async () => {
      await sendNote(page, 'tell me about it');
      await expect(page.locator('#page-margin')).toContainText('Line 3 of a long reply', { timeout: 10000 });
      await expect(page.locator('#send-button')).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10000 });
    });
    // ...and is dismissed with the page scrolled to its new end, the sticky's clearance included
    await scrollToEnd();
    await trackWithScroll(async () => {
      await page.locator('#page-margin .note-dismiss').click();
      await expect(page.locator('#page-margin')).toBeHidden();
    });
  });

  test('refreshing the recipe', async ({ page }) => {
    const recipe = await openCookingRecipe(page);
    if (isPhone(page)) await openTab(page, 'method');
    const m = Math.ceil(recipe.steps / 2);
    await page.locator(`#page-right-content .prep-step[data-step="${m}"]`).evaluate(el => {
      el.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(300);
    const anchors = await ANCHORS(page);

    const result = await trackAnchors(page, anchors, async () => {
      // The mock LLM answers "update" with update_recipe (servings: 2); a
      // stepper at 2 with no "Scaled for" note is the re-rendered recipe
      await sendNote(page, 'update it');
      await expect(page.locator('#page-right-content .servings-count')).toHaveText('2', { timeout: 10000 });
      await expect(page.locator('.servings-note')).toHaveText('');
    });
    expectAnchorsStill(result);
  });

  test('changing the servings', async ({ page }) => {
    const recipe = await openCookingRecipe(page);
    await expect(page.locator('.servings-count')).toHaveText('4');
    const anchors = await ANCHORS(page);

    // Each item's line and height, the meta line and the note slot, as boxes
    const boxes = () => page.evaluate(() => {
      const box = (el: Element | null) => {
        const r = el!.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      return {
        items: [...document.querySelectorAll('.ingredient-item[data-index]')].map(el => {
          const r = el.getBoundingClientRect();
          return { y: r.y, height: r.height };
        }),
        meta: box(document.querySelector('.recipe-meta-line')),
        note: box(document.querySelector('.servings-note')),
      };
    });
    const expectSameBoxes = (now: Awaited<ReturnType<typeof boxes>>, before: typeof now, what: string) => {
      for (const k of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(now.meta[k] - before.meta[k]), `${what}: meta line ${k}`).toBeLessThanOrEqual(1);
        expect(Math.abs(now.note[k] - before.note[k]), `${what}: servings note ${k}`).toBeLessThanOrEqual(1);
      }
      now.items.forEach((item, i) => {
        expect(Math.abs(item.y - before.items[i].y), `${what}: ingredient ${i} y`).toBeLessThanOrEqual(1);
        expect(Math.abs(item.height - before.items[i].height), `${what}: ingredient ${i} height`).toBeLessThanOrEqual(1);
      });
    };
    const before = await boxes();

    let result = await trackAnchors(page, anchors, async () => {
      await page.locator('.servings-step[data-step="-1"]').click();
      await expect(page.locator('.servings-count')).toHaveText('3');
    });
    expectAnchorsStill(result);
    expectSameBoxes(await boxes(), before, '−');

    result = await trackAnchors(page, anchors, async () => {
      await page.locator('.servings-step[data-step="+1"]').click();
      await expect(page.locator('.servings-count')).toHaveText('4');
    });
    expectAnchorsStill(result);
    expectSameBoxes(await boxes(), before, '+');

    // ...and a servings_set event from the chat
    await page.route('**/api/chat', route => route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: `event: servings_set\ndata: {"servings":5,"recipe_id":"${recipe.id}"}\n\n`
        + 'event: done\ndata: {"conversation_id":"layout-servings"}\n\n',
    }));
    const afterTaps = await boxes();
    result = await trackAnchors(page, anchors, async () => {
      await sendNote(page, 'for five');
      await expect(page.locator('.servings-count')).toHaveText('5', { timeout: 10000 });
    });
    expectAnchorsStill(result);
    expectSameBoxes(await boxes(), afterTaps, 'servings_set');
  });

  test('opening the "⋯" popover', async ({ page }) => {
    await openCookingRecipe(page);
    const anchors = [
      ...(await ANCHORS(page)),
      { name: 'meta-line', selector: '#page-right-content .recipe-meta-line' },
      { name: 'step-1', selector: '#page-right-content .prep-step[data-step="1"]' },
      { name: 'ingredient-0', selector: '.ingredient-item[data-index="0"]' },
    ].filter(a => a.name !== 'step-1' || !isPhone(page));
    const more = page.locator('#page-right-content button.recipe-more');
    const panel = page.locator('#page-right-content .recipe-more-panel');
    const result = await trackAnchors(page, anchors, async () => {
      await more.click();
      await expect(panel).toBeVisible();
      // A tap outside, on the title
      const t = (await page.locator('#page-right-content .recipe-title').boundingBox())!;
      await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
      await expect(panel).toBeHidden();
    });
    expectAnchorsStill(result);
  });

  test('a timer starting, ticking and finishing', async ({ page }) => {
    // Red on 9f28329: mid-step-5 dy=23 (ipad 69, mobile-chrome 79) from .timer-active padding; note-input dy=28.
    await openCookingRecipe(page);
    if (isPhone(page)) await openTab(page, 'method');
    const anchors = await ANCHORS(page);

    const result = await trackAnchors(page, anchors, async () => {
      await sendNote(page, 'start a timer');
      await expect(page.locator('#timer-text')).toContainText('Done', { timeout: 15000 });
      await page.waitForTimeout(500);
    }, { settle: false });

    expectAnchorsStill(withoutAnchor(result, 'timer-widget'));

    // The pill holds its box between ticks, and at zero its centre and top stay put.
    const frames = result['timer-widget'].frames.filter(f => f.shown);
    const running = frames.filter(f => !f.text.includes('Done'));
    const done = frames.filter(f => f.text.includes('Done'));
    expect(running.length, 'timer pill never shown running').toBeGreaterThan(0);
    expect(done.length, 'timer pill never shown finished').toBeGreaterThan(0);
    // From the first tick on: the pill's appearance itself is the cook's action.
    const ticking = running.slice(running.findIndex(f => f.text !== running[0].text));
    const base = ticking[0];
    const tickDrift = Math.max(...ticking.map(f => Math.max(
      Math.abs(f.x - base.x), Math.abs(f.y - base.y),
      Math.abs(f.width - base.width), Math.abs(f.height - base.height))));
    expect(tickDrift, `#timer-widget moved ${tickDrift.toFixed(1)}px between ticks`).toBeLessThanOrEqual(1);
    const last = running[running.length - 1];
    const fin = done[0];
    const dCentre = Math.abs((fin.x + fin.width / 2) - (last.x + last.width / 2));
    const dTop = Math.abs(fin.y - last.y);
    expect(dCentre, `#timer-widget centre moved ${dCentre.toFixed(1)}px at zero`).toBeLessThanOrEqual(1);
    expect(dTop, `#timer-widget top moved ${dTop.toFixed(1)}px at zero`).toBeLessThanOrEqual(1);
  });

  test("starting a timer from a step's duration", async ({ page }) => {
    const recipe = await createCookingRecipe(page, { durations: { 3: 8, 4: 2 } });
    await openRecipe(page, recipe.id);
    if (!isPhone(page)) await selectMode(page, 'cook');
    if (isPhone(page)) {
      await openTab(page, 'method');
      await page.waitForTimeout(400); // the tab crossfade holds the animation lock
    }
    const chip = (n: number) => page.locator(`#page-right-content .prep-step[data-step="${n}"] .step-duration`);
    await chip(3).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const anchors = await ANCHORS(page);

    const result = await trackAnchors(page, anchors, async () => {
      await chip(3).click();
      await expect(page.locator('#timer-widget .timer-label')).toHaveText('Step 3');
      await chip(4).click();
      await expect(page.locator('#timer-widget .timer-label')).toHaveText('Tap again to replace');
      await chip(4).click();
      await expect(page.locator('#timer-widget .timer-label')).toHaveText('Step 4');
    });

    expectAnchorsStill(withoutAnchor(result, 'timer-widget'));
    const frames = result['timer-widget'].frames.filter(f => f.shown);
    expect(frames.length, 'timer pill never shown').toBeGreaterThan(0);
    const base = frames[0];
    const drift = Math.max(...frames.map(f => Math.max(
      Math.abs(f.x - base.x), Math.abs(f.y - base.y),
      Math.abs(f.width - base.width), Math.abs(f.height - base.height))));
    expect(drift, `#timer-widget moved ${drift.toFixed(1)}px`).toBeLessThanOrEqual(1);
    await page.locator('.timer-cancel').click();
  });

  test('ticking an ingredient and marking a step', async ({ page }) => {
    // Red on 9f28329 (no anchor moved, but data-ticked was never set); fixed in group 8 (D10).
    const recipe = await openCookingRecipe(page);
    const m = Math.ceil(recipe.steps / 2);
    const ingredientSel = '.ingredient-item:visible >> nth=2';
    const stepSel = `#page-right-content .prep-step[data-step="${m}"]`;

    await page.locator(ingredientSel).scrollIntoViewIfNeeded();
    const tappedIngredient = page.locator(ingredientSel);
    const ingAnchors = [
      ...(await ANCHORS(page)),
      { name: 'tapped-ingredient', selector: await tappedIngredient.evaluate(el => {
        el.setAttribute('data-layout-probe', 'ingredient');
        return '[data-layout-probe="ingredient"]';
      }) },
    ];
    const pos = await tapPoint(page, ingredientSel);
    const ingResult = await trackAnchors(page, ingAnchors, async () => {
      await tappedIngredient.click({ position: pos });
    });
    expectAnchorsStill(ingResult);
    await expect(tappedIngredient).toHaveAttribute('data-ticked', 'true');

    if (isPhone(page)) {
      await openTab(page, 'method');
      // A tap inside the tab crossfade is ignored by design (cooking-guidance ›
      // Ignored while a page turns), so let the lock go first
      await expect.poll(() => page.evaluate(async () => {
        // @ts-ignore - module path served by the app
        const M = await import('/static/page-transitions.js');
        return M.isAnimating();
      })).toBe(false);
    }
    await page.locator(stepSel).scrollIntoViewIfNeeded();
    const stepAnchors = [...(await ANCHORS(page)), { name: 'tapped-step', selector: stepSel }];
    const stepPos = await tapPoint(page, stepSel);
    const stepResult = await trackAnchors(page, stepAnchors, async () => {
      await page.locator(stepSel).click({ position: stepPos });
    });
    expectAnchorsStill(stepResult);
    await expect(page.locator(stepSel)).toHaveAttribute('aria-current', 'step');

    // "Clear ticks" then "Undo" moves no anchor, nor the header and its lines
    if (isPhone(page)) {
      await openTab(page, 'ingredients');
      await expect.poll(() => page.evaluate(async () => {
        // @ts-ignore - module path served by the app
        const M = await import('/static/page-transitions.js');
        return M.isAnimating();
      })).toBe(false);
    }
    const headerSel = CLEAR_TICKS_ROW;
    const clear = page.locator(`${headerSel} .clear-ticks`);
    await clear.scrollIntoViewIfNeeded();
    const clearAnchors = [
      ...(await ANCHORS(page)),
      { name: 'ingredients-header', selector: await page.locator(headerSel).evaluate(el => {
        el.setAttribute('data-layout-probe', 'header');
        return '[data-layout-probe="header"]';
      }) },
      { name: 'ingredient-0', selector: await page.locator('.ingredient-item:visible').first().evaluate(el => {
        el.setAttribute('data-layout-probe', 'first-ingredient');
        return '[data-layout-probe="first-ingredient"]';
      }) },
      { name: 'tapped-ingredient', selector: '[data-layout-probe="ingredient"]' },
    ];
    const clearResult = await trackAnchors(page, clearAnchors, async () => {
      await clear.click();
      await expect(clear).toHaveText('Undo');
      await clear.click();
      await expect(clear).toHaveText('clear ticks');
    });
    expectAnchorsStill(clearResult);
    await expect(tappedIngredient).toHaveAttribute('data-ticked', 'true');
  });
});
