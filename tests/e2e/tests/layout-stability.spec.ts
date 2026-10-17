import { test, expect, Page, Route } from '@playwright/test';
import {
  ANCHORS,
  AnchorResult,
  authenticate,
  createCookingRecipe,
  expectAnchorsStill,
  isPhone,
  openRecipe,
  openTab,
  sendNote,
  trackAnchors,
} from './helpers';

/**
 * family-recipe-ui › Nothing on the page moves unless the cook acted on it.
 * One test per scenario. Cases that are red on today's code carry a
 * per-project `test.fail` naming the group that fixes them; Playwright errors
 * when such a case passes, so the annotation cannot outlive its fix.
 */

const ALL = ['chromium', 'mobile-chrome', 'ipad'];

/** Marks the running case as expected to fail on these projects until `why` lands. */
function failOn(projects: string[], why: string) {
  test.fail(projects.includes(test.info().project.name), why);
}

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
    ], async () => {
      await entry.click();
      await expect(page.locator('#page-right-content .recipe-title')).toContainText(recipe.title, { timeout: 10000 });
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
      await sendNote(page, 'halve it');
      await expect(page.locator('#page-right-content .meta-serves')).toHaveText('serves 2', { timeout: 10000 });
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

  test('ticking an ingredient and marking a step', async ({ page }) => {
    // Red on 9f28329: no anchor moved on the ingredient tap, but the feature is absent: data-ticked is never set.
    failOn(ALL, 'fixed in group 8 (D10)');
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

    if (isPhone(page)) await openTab(page, 'method');
    await page.locator(stepSel).scrollIntoViewIfNeeded();
    const stepAnchors = [...(await ANCHORS(page)), { name: 'tapped-step', selector: stepSel }];
    const stepPos = await tapPoint(page, stepSel);
    const stepResult = await trackAnchors(page, stepAnchors, async () => {
      await page.locator(stepSel).click({ position: stepPos });
    });
    expectAnchorsStill(stepResult);
    await expect(page.locator(stepSel)).toHaveAttribute('aria-current', 'step');
  });
});
