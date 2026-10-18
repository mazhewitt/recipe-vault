import { test, expect } from '@playwright/test';
import {
  authenticate, createCookingRecipe, createRecipe, expectAnchorsStill, expectHitArea, openTab, paceChat,
  chimes, installAudioStub, sendNote, spineX, trackAnchors,
} from './helpers';

function isPhone(page: any): boolean {
  return page.viewportSize()!.width <= 600;
}

async function openRecipe(page: any, id: string, titleFragment: string) {
  await page.evaluate((recipeId: string) => {
    // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
    fetchAndDisplayRecipe(recipeId);
  }, id);
  await expect(page.locator('.recipe-title')).toContainText(titleFragment);
}

async function seedTwoRecipes(page: any) {
  const suffix = Date.now().toString();
  const first = await createRecipe(page, {
    title: `Timer Recipe ${suffix}`,
    ingredients: [{ name: 'water', quantity: 1, unit: 'cup' }],
    steps: [
      { step_number: 1, instruction: 'Boil the water' },
      { step_number: 2, instruction: 'Steep for four minutes' },
      { step_number: 3, instruction: 'Pour and serve' },
    ],
  });
  const second = await createRecipe(page, {
    title: `Other Recipe ${suffix}`,
    ingredients: [],
    steps: [
      { step_number: 1, instruction: 'Do something' },
      { step_number: 2, instruction: 'Do something else' },
    ],
  });
  return { first, second };
}

function intersects(a: { x: number; y: number; width: number; height: number },
                    b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

test.describe('Timer cover pill (Journal 2.0)', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('pill sits on the book cover and highlights the step', async ({ page }) => {
    const { first, second } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    const widget = page.locator('#timer-widget');
    await expect(widget).toBeHidden();

    await page.evaluate(() => {
      // @ts-ignore - startTimer is defined in app.js
      startTimer(1, 'Test', 2);
    });

    await expect(widget).toBeVisible();
    await expect(page.locator('.recipe-book #timer-widget')).toHaveCount(1);
    await expect(page.locator('#timer-widget .timer-label')).toHaveText('Step 2 · Test');

    // Fully within the viewport
    const box = (await widget.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

    // Never overlaps the user identity pill
    const userBox = await page.locator('.user-info').boundingBox();
    if (userBox) {
      expect(intersects(box, userBox)).toBe(false);
    }

    // Never overlaps the header; above 600px never the page arrows either
    const headerBox = (await page.locator('#recipe-book-header').boundingBox())!;
    expect(intersects(box, headerBox), '#timer-widget overlaps #recipe-book-header').toBe(false);

    if (isPhone(page)) {
      // Compact pill at the top right of the book frame's header bar
      expect(box.height).toBeGreaterThanOrEqual(44);
      const book = (await page.locator('.recipe-book').boundingBox())!;
      expect(box.x + box.width / 2).toBeGreaterThan(book.x + book.width / 2);
      expect(book.x + book.width - (box.x + box.width)).toBeLessThanOrEqual(16);
      expect(box.y - book.y).toBeLessThanOrEqual(12);
    } else {
      // Clipped to the top edge of the cover, centred over the spine
      const book = (await page.locator('.recipe-book').boundingBox())!;
      expect(box.y).toBeLessThan(book.y);
      expect(box.y + box.height).toBeGreaterThan(book.y);
      expect(Math.abs(box.x + box.width / 2 - await spineX(page)),
        'pill centre is not over the spine').toBeLessThanOrEqual(1);
      for (const arrow of ['#page-prev', '#page-next']) {
        const a = (await page.locator(arrow).boundingBox())!;
        expect(intersects(box, a), `#timer-widget overlaps ${arrow}`).toBe(false);
        // A disabled arrow ignores the pointer (pointer-events: none), so only
        // an enabled one can be hit-tested; #page-prev is always enabled here.
        if (await page.locator(arrow).isEnabled()) {
          const hitId = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id,
            [a.x + a.width / 2, a.y + a.height / 2]);
          expect(hitId).toBe(arrow.slice(1));
        }
        // The close control's 44px hit area stays clear of the arrow
        const c = (await page.locator('.timer-cancel').boundingBox())!;
        const hit = { x: c.x + c.width / 2 - 22, y: c.y + c.height / 2 - 22, width: 44, height: 44 };
        expect(intersects(hit, a), `.timer-cancel hit area overlaps ${arrow}`).toBe(false);
      }
    }

    // Close target is 44x44 at every breakpoint
    await expectHitArea(page, '.timer-cancel');

    // Step 2 carries the highlight, no other step does
    const step2 = page.locator('.prep-step[data-step="2"]');
    await expect(step2).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);
    await expect(page.locator('.prep-step[data-step="1"]')).not.toHaveClass(/timer-active/);

    // Navigating to another recipe removes the highlight
    await openRecipe(page, second, 'Other Recipe');
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);
    await expect(widget).toBeVisible();

    // Navigating back restores it
    await openRecipe(page, first, 'Timer Recipe');
    await expect(page.locator('.prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);

    // Cancel hides the pill and clears the highlight
    await page.locator('.timer-cancel').click();
    await expect(widget).toBeHidden();
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);
  });

  test('timer without a step shows the pill but no highlight', async ({ page }) => {
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    await page.evaluate(() => {
      // @ts-ignore - startTimer is defined in app.js
      startTimer(1, 'No step');
    });

    await expect(page.locator('#timer-widget')).toBeVisible();
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);

    await page.locator('.timer-cancel').click();
    await expect(page.locator('#timer-widget')).toBeHidden();
  });

  test('timer started in the same turn as a recipe display binds to the new recipe', async ({ page }) => {
    const { first, second } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    // Mirror chat.js handling recipe_artifact then timer_start back to back:
    // the display is not awaited before the timer starts.
    await page.evaluate((id: string) => {
      // @ts-ignore - globals defined in app.js
      fetchAndDisplayRecipe(id);
      // @ts-ignore
      startTimer(1, 'Same turn', 2);
    }, second);

    await expect(page.locator('.recipe-title')).toContainText('Other Recipe');
    await expect(page.locator('.prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);

    // The previous recipe must not carry the highlight
    await openRecipe(page, first, 'Timer Recipe');
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);

    await page.locator('.timer-cancel').click();
  });

  test('replacing a timer moves the highlight and completion clears it', async ({ page }) => {
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    await page.evaluate(() => {
      // @ts-ignore
      startTimer(1, 'A', 2);
    });
    await expect(page.locator('.prep-step[data-step="2"]')).toHaveClass(/timer-active/);

    // A second timer replaces the first highlight
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(1, 'B', 3);
    });
    await expect(page.locator('.prep-step[data-step="3"]')).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);

    // A step-less timer removes it
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(1, 'C');
    });
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);

    // Completion clears the highlight (0.02 min = ~1.2s)
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(0.02, 'Done', 2);
    });
    await expect(page.locator('.prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    await expect(page.locator('#timer-text')).toHaveText('Done · Step 2 · Done', { timeout: 10000 });
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'done');
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);

    // The finished state stays past the old 3s auto-hide, until tapped
    await page.waitForTimeout(4000);
    await expect(page.locator('#timer-widget')).toBeVisible();
    await expect(page.locator('#timer-text')).toHaveText('Done · Step 2 · Done');
    await page.locator('#timer-text').click();
    await expect(page.locator('#timer-widget')).toBeHidden();
  });

  test('chat "start a timer" via the mock LLM shows the pill and highlights step 2', async ({ page }) => {
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    // Paced, so the in-flight line can be read between the stream's events
    await paceChat(page, 700);
    await sendNote(page, 'start a timer');

    // The tool shows as a line in the cook's words; the pill is the confirmation
    await expect(page.locator('#page-margin .margin-note[data-kind="status"]'))
      .toHaveText('Setting a timer…', { timeout: 10000 });
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
      .toContainText('Timer started', { timeout: 10000 });
    // No "Timer set" line anywhere: not on the sticky, not in the thread
    await expect(page.locator('body')).not.toContainText('Timer set');
    const kinds = await page.evaluate(() =>
      // @ts-ignore - getMarginThread is exposed by app.js
      getMarginThread().map((n: { kind: string; text: string }) => `${n.kind}:${n.text}`));
    expect(kinds.join('\n')).not.toContain('Timer set');
    expect(kinds.filter((k: string) => k.startsWith('status:'))).toEqual([]);

    await expect(page.locator('#timer-widget')).toBeVisible();
    await expect(page.locator('#timer-text')).toContainText('Mock timer');
    await expect(page.locator('.prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);

    await page.locator('.timer-cancel').click();
    await expect(page.locator('#timer-widget')).toBeHidden();
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);
  });

  test('the highlight leaves the step\'s box and the next step where they were', async ({ page }) => {
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');
    if (isPhone(page)) await openTab(page, 'method');
    const step2 = page.locator('#page-right-content .prep-step[data-step="2"]');
    const step3 = page.locator('#page-right-content .prep-step[data-step="3"]');
    const before2 = (await step2.boundingBox())!;
    const before3 = (await step3.boundingBox())!;

    await page.evaluate(() => {
      // @ts-ignore
      startTimer(1, 'Box', 2);
    });
    await expect(step2).toHaveClass(/timer-active/);
    const after2 = (await step2.boundingBox())!;
    const after3 = (await step3.boundingBox())!;
    for (const k of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(after2[k] - before2[k]), `step 2 ${k} changed`).toBeLessThanOrEqual(1);
      expect(Math.abs(after3[k] - before3[k]), `step 3 ${k} changed`).toBeLessThanOrEqual(1);
    }
    // The highlight is drawn: a band, an inset shadow and the "timer running" tag
    const look = await step2.evaluate((el) => {
      const cs = getComputedStyle(el);
      const tag = getComputedStyle(el, '::before');
      return { bg: cs.backgroundColor, shadow: cs.boxShadow, tag: tag.content, tagPos: tag.position };
    });
    expect(look.bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(look.shadow).toContain('inset');
    expect(look.tag).toContain('timer running');
    expect(look.tagPos).toBe('absolute');

    await page.locator('.timer-cancel').click();
  });

  test('the pill holds its box across ten ticks and renders tabular numerals', async ({ page }) => {
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');
    await page.evaluate(() => {
      // @ts-ignore - 1:15 down to 1:04 crosses the 1:10 width change
      startTimer(1.25, 'Steady', 2);
    });
    const widget = page.locator('#timer-widget');
    await expect(widget).toHaveAttribute('data-state', 'running');
    await expect(page.locator('#timer-text')).toContainText('Steady');
    const boxes = [];
    let last = await page.locator('#timer-text').textContent();
    for (let i = 0; i < 10; i++) {
      await expect(page.locator('#timer-text')).not.toHaveText(last!, { timeout: 3000 });
      last = await page.locator('#timer-text').textContent();
      boxes.push((await widget.boundingBox())!);
    }
    for (const b of boxes) {
      for (const k of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(b[k] - boxes[0][k]), `pill ${k} moved between ticks`).toBeLessThanOrEqual(1);
      }
    }
    const numeric = await page.locator('#timer-widget .timer-time').evaluate(
      (el) => getComputedStyle(el).fontVariantNumeric);
    expect(numeric).toContain('tabular-nums');
    await page.locator('.timer-cancel').click();
  });

  test('with a timer running the forward arrow still turns the page', async ({ page }) => {
    test.skip(isPhone(page), 'no page arrows at <=600px');
    await seedTwoRecipes(page);
    const list = await page.evaluate(async () => (await (await fetch('/api/recipes')).json()));
    await openRecipe(page, list[0].id, list[0].title);
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(1, 'Arrow', 2);
    });
    await expect(page.locator('#timer-widget')).toBeVisible();
    await expect(page.locator('#page-next')).toBeEnabled();
    await page.locator('#page-next').click();
    await expect(page.locator('#page-right-content .recipe-title')).toHaveText(list[1].title);
    await page.locator('.timer-cancel').click();
  });

  test('completion chimes three notes and vibrates', async ({ page }) => {
    await page.addInitScript(() => {
      const log: any = { starts: 0, created: 0, resumed: 0, vibrate: null };
      // @ts-ignore
      window.__audioLog = log;
      class FakeParam { setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} }
      class FakeNode { connect() { return this; } disconnect() {} }
      class FakeOsc extends FakeNode {
        type = 'sine'; frequency = new FakeParam();
        start() { log.starts++; } stop() {}
      }
      class FakeGain extends FakeNode { gain = new FakeParam(); }
      class FakeCtx {
        state = 'suspended'; currentTime = 0; destination = new FakeNode();
        constructor() { log.created++; }
        resume() { log.resumed++; this.state = 'running'; return Promise.resolve(); }
        createOscillator() { return new FakeOsc(); }
        createGain() { return new FakeGain(); }
      }
      // @ts-ignore
      window.AudioContext = FakeCtx;
      // @ts-ignore
      window.webkitAudioContext = FakeCtx;
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        value: (p: any) => { log.vibrate = p; return true; },
      });
    });
    await page.reload();
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    // The first gesture unlocks audio
    await page.keyboard.press('Shift');
    const unlocked = await page.evaluate(() => (window as any).__audioLog);
    expect(unlocked.created).toBe(1);
    expect(unlocked.resumed).toBeGreaterThanOrEqual(1);

    await page.evaluate(() => {
      // @ts-ignore
      startTimer(0.02, 'Chime', 2);
    });
    await expect(page.locator('#timer-text')).toHaveText('Done · Step 2 · Chime', { timeout: 10000 });
    const log = await page.evaluate(() => (window as any).__audioLog);
    expect(log.starts).toBe(3);
    expect(log.created).toBe(1);
    expect(log.vibrate).toEqual([200, 100, 200]);

    // A finished pill is replaced by the next timer
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(1, 'Next', 3);
    });
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'running');
    await expect(page.locator('#timer-text')).toContainText('Next');
    await page.locator('.timer-cancel').click();
    await expect(page.locator('#timer-widget')).toBeHidden();
  });

  test('without Web Audio a timer still finishes visibly and throws nothing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      // @ts-ignore
      delete window.AudioContext;
      // @ts-ignore
      delete window.webkitAudioContext;
    });
    await page.reload();
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');
    await page.mouse.click(5, 5);
    await page.keyboard.press('Shift');

    await page.evaluate(() => {
      // @ts-ignore
      startTimer(0.02, 'Silent', 2);
    });
    await expect(page.locator('#timer-text')).toHaveText('Done · Step 2 · Silent', { timeout: 10000 });
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'done');
    const red = await page.locator('#timer-widget').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(red).toBe('rgb(139, 45, 26)');
    expect(errors).toEqual([]);
    await page.locator('#timer-widget').click();
    await expect(page.locator('#timer-widget')).toBeHidden();
  });
});

async function boxOf(page: any, selector: string) {
  return (await page.locator(selector).boundingBox())!;
}

function expectSameBox(a: any, b: any, what: string) {
  for (const k of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs(a[k] - b[k]), `${what}: ${k} ${a[k]} -> ${b[k]}`).toBeLessThanOrEqual(1);
  }
}

/** The cooking fixture with durations on steps 3 and 4, on the cook spread (wide) or the Method tab. */
async function openDurationRecipe(page: any) {
  const recipe = await createCookingRecipe(page, { durations: { 3: 8, 4: 2 } });
  await openRecipe(page, recipe.id, 'Steady Stew');
  if (isPhone(page)) {
    await openTab(page, 'method');
    await page.waitForTimeout(400); // the tab crossfade holds the animation lock
  }
  return recipe;
}

test.describe('A timer for across the kitchen (glanceable-cooking G5)', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  // family-recipe-ui › Timer widget displays as fixed speech bubble › The time is readable across the kitchen
  test('the time is readable across the kitchen', async ({ page }) => {
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');
    if (isPhone(page)) await openTab(page, 'method');
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(0.05, 'Simmer', 2);
    });
    const phone = isPhone(page);
    const check = async () => {
      const m = await page.evaluate(() => {
        const w = document.getElementById('timer-widget')!.getBoundingClientRect();
        const label = document.querySelector('#timer-widget .timer-label') as HTMLElement;
        const time = document.querySelector('#timer-widget .timer-time') as HTMLElement | null;
        const step = document.querySelector('.prep-step .step-text') as HTMLElement;
        const lr = label.getBoundingClientRect();
        const tr = time && time.offsetParent ? time.getBoundingClientRect() : null;
        return {
          height: w.height,
          labelSize: parseFloat(getComputedStyle(label).fontSize),
          timeSize: time ? parseFloat(getComputedStyle(time).fontSize) : 0,
          numeric: time ? getComputedStyle(time).fontVariantNumeric : '',
          stepSize: parseFloat(getComputedStyle(step).fontSize),
          gap: tr ? tr.left - lr.right : null,
        };
      });
      expect(m.height, '#timer-widget height').toBeGreaterThanOrEqual(44);
      expect(m.labelSize).toBe(phone ? 14 : 16);
      return m;
    };
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'running');
    const running = await check();
    expect(running.timeSize).toBe(phone ? 22 : 26);
    expect(running.timeSize).toBeGreaterThanOrEqual(running.stepSize);
    expect(running.numeric).toContain('tabular-nums');
    expect(running.gap!, 'space between label and time').toBeGreaterThanOrEqual(6);

    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'done', { timeout: 10000 });
    await check();
    await page.locator('#timer-widget').click();
  });

  // cooking-guidance › Frontend timer execution › The pill names its step
  test('the pill names its step', async ({ page }) => {
    await openDurationRecipe(page);
    const label = page.locator('#timer-widget .timer-label');
    const time = page.locator('#timer-widget .timer-time');

    await page.locator('.prep-step[data-step="3"] .step-duration').click();
    await expect(label).toHaveText('Step 3');
    await expect(time).toHaveText('8:00');

    await page.evaluate(() => {
      // @ts-ignore
      startTimer(5, 'Simmer', 2);
    });
    await expect(label).toHaveText('Step 2 · Simmer');
    await expect(time).toHaveText(/^\d+:\d\d$/);
    // No text node between the two: the pill never reads "Label:7:42"
    const between = await page.locator('#timer-text').evaluate((el) =>
      Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()).length);
    expect(between).toBe(0);

    await page.evaluate(() => {
      // @ts-ignore
      startTimer(5, 'Simmer');
    });
    await expect(label).toHaveText('Simmer');
    await page.locator('.timer-cancel').click();
  });

  // family-recipe-ui › Timer widget displays as fixed speech bubble › One width in every state
  test('one width in every state', async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await openDurationRecipe(page);
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(10, 'Step 2 · a label far too long for the pill to hold', 2);
    });
    const widget = '#timer-widget';
    await expect(page.locator('#timer-widget .timer-time')).toHaveText('10:00');
    const start = await boxOf(page, widget);
    expect(await page.locator('#timer-widget .timer-label').evaluate(
      (el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');

    await page.locator('.prep-step[data-step="3"] .step-duration').click();
    await expect(page.locator('#timer-widget .timer-label')).toHaveText('Tap again to replace');
    expectSameBox(await boxOf(page, widget), start, 'Tap again to replace');

    await page.clock.runFor(9 * 60 * 1000 + 10 * 1000);
    await expect(page.locator('#timer-widget .timer-time')).toHaveText('0:50');
    expectSameBox(await boxOf(page, widget), start, 'the last minute');

    await page.clock.runFor(60 * 1000);
    await expect(page.locator(widget)).toHaveAttribute('data-state', 'done');
    expectSameBox(await boxOf(page, widget), start, 'Done');
    await page.locator(widget).click();
  });

  // cooking-guidance › Frontend timer execution › The chime repeats until acknowledged
  test('the chime repeats every 15s and stops by itself 5 minutes after zero', async ({ page }) => {
    await installAudioStub(page);
    await page.clock.install();
    await page.reload();
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(0.5, 'Chime', 2);
    });
    await page.clock.runFor(30 * 1000);
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'done');
    await expect(page.locator('#timer-text')).toHaveText(/^Done · Step 2 · Chime/);
    expect(await chimes(page)).toBe(3);
    await page.clock.runFor(15 * 1000);
    expect(await chimes(page)).toBe(6);
    await page.clock.runFor(15 * 1000);
    expect(await chimes(page)).toBe(9);
    expect(await page.evaluate(() => (window as any).__audioLog.vibrations)).toBe(3);

    await page.clock.runFor(271 * 1000); // 301s after zero
    const atStop = await chimes(page);
    expect(atStop).toBeGreaterThanOrEqual(60);
    await page.clock.runFor(299 * 1000); // 600s after zero
    expect(await chimes(page), 'a chime started after the 300-second mark').toBe(atStop);
    await expect(page.locator('#timer-widget')).toBeVisible();
    await page.locator('#timer-widget').click();
  });

  test('a tap on the finished pill or its ✕ stops the repeats at once', async ({ page }) => {
    await installAudioStub(page);
    await page.clock.install();
    await page.reload();
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');
    for (const target of ['#timer-text', '.timer-cancel']) {
      await page.evaluate(() => {
        // @ts-ignore
        startTimer(0.5, 'Chime', 2);
      });
      await page.clock.runFor(30 * 1000);
      await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'done');
      await page.locator(target).click();
      await expect(page.locator('#timer-widget')).toBeHidden();
      const after = await chimes(page);
      await page.clock.runFor(60 * 1000);
      expect(await chimes(page), `a chime started after a tap on ${target}`).toBe(after);
    }
  });

  // cooking-guidance › Frontend timer execution › The finished pill pulses without moving
  test('the finished pill pulses without moving', async ({ page }) => {
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(0.5, 'Pulse', 2);
    });
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'running');
    const runningBg = await page.locator('#timer-widget').evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(0.02, 'Pulse', 2);
    });
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'done', { timeout: 10000 });
    const look = await page.locator('#timer-widget').evaluate((el) => {
      const cs = getComputedStyle(el);
      const props = new Set<string>();
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try { rules = sheet.cssRules; } catch { continue; }
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSKeyframesRule && rule.name === cs.animationName) {
            for (const kf of Array.from(rule.cssRules) as CSSKeyframeRule[]) {
              for (let i = 0; i < kf.style.length; i++) props.add(kf.style[i]);
            }
          }
        }
      }
      return { name: cs.animationName, bg: cs.backgroundColor, props: Array.from(props) };
    });
    expect(look.name).not.toBe('none');
    expect(look.bg).not.toBe(runningBg);
    expect(look.props.length).toBeGreaterThan(0);
    for (const p of look.props) expect(['opacity', 'box-shadow']).toContain(p);

    const boxes: any[] = await page.evaluate(() => new Promise((resolve) => {
      const out: any[] = [];
      const t0 = performance.now();
      const sample = () => {
        const r = document.getElementById('timer-widget')!.getBoundingClientRect();
        out.push({ x: r.x, y: r.y, width: r.width, height: r.height });
        if (performance.now() - t0 < 1500) requestAnimationFrame(sample); else resolve(out);
      };
      sample();
    }));
    for (const b of boxes) expectSameBox(b, boxes[0], 'finished pill frame');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.locator('#timer-widget').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await page.locator('#timer-widget').click();
  });
});

test.describe('The running pill leads to its step (glanceable-cooking G7)', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  async function stepWhollyVisible(page: any, n: number): Promise<boolean> {
    return page.evaluate((step: number) => {
      const el = document.querySelector(`#page-right-content .prep-step[data-step="${step}"]`);
      const pr = document.getElementById('page-right')!.getBoundingClientRect();
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1;
    }, n);
  }

  // cooking-guidance › The running pill leads to its step › Timer's recipe is open
  test("tapping the running pill scrolls the timer's step into view", async ({ page }) => {
    const recipe = await createCookingRecipe(page);
    await openRecipe(page, recipe.id, 'Steady Stew');
    if (isPhone(page)) await openTab(page, 'method');
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(10, 'Oven', 9);
    });
    await page.locator('#page-right').evaluate((el) => { el.scrollTop = 0; });
    if (isPhone(page)) {
      await page.waitForTimeout(400); // the Method tab's crossfade holds the lock
      await openTab(page, 'ingredients');
    }
    expect(await stepWhollyVisible(page, 9)).toBe(false);

    const anchors = [
      { name: 'note-input', selector: '#note-input' },
      { name: 'message-input', selector: '#message-input' },
      { name: 'timer-widget', selector: '#timer-widget' },
    ];
    const present = [];
    for (const a of anchors) if (await page.locator(a.selector).isVisible()) present.push(a);
    const result = await trackAnchors(page, present, async () => {
      await page.locator('#timer-widget .timer-label').click();
      await expect.poll(() => stepWhollyVisible(page, 9)).toBe(true);
    });
    expectAnchorsStill(result);
    if (isPhone(page)) await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
    await page.locator('.timer-cancel').click();
  });

  // cooking-guidance › The running pill leads to its step › Another recipe is open
  test("tapping the running pill from another recipe opens the timer's recipe at its step", async ({ page }) => {
    const recipe = await createCookingRecipe(page);
    const { second } = await seedTwoRecipes(page);
    await openRecipe(page, recipe.id, 'Steady Stew');
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(10, 'Oven', 9);
    });
    await openRecipe(page, second, 'Other Recipe');
    const before = await page.locator('#timer-widget .timer-time').textContent();
    await page.locator('#timer-widget .timer-label').click();
    await expect(page.locator('#page-right-content .recipe-title')).toContainText('Steady Stew', { timeout: 10000 });
    await expect.poll(() => stepWhollyVisible(page, 9), { timeout: 10000 }).toBe(true);
    if (isPhone(page)) await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'running');
    await expect(page.locator('#timer-widget .timer-time')).not.toHaveText(before!);
    await expect(page.locator('.prep-step[data-step="9"]')).toHaveClass(/timer-active/);
    await page.locator('.timer-cancel').click();
  });

  // cooking-guidance › The running pill leads to its step › A timer with no step
  test('tapping a pill with no step changes nothing', async ({ page }) => {
    const recipe = await createCookingRecipe(page);
    await openRecipe(page, recipe.id, 'Steady Stew');
    if (isPhone(page)) await openTab(page, 'ingredients');
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(10, 'Plain');
    });
    const scroll = await page.locator('#page-right').evaluate((el) => el.scrollTop);
    const tab = await page.locator('#page-right').getAttribute('data-tab');
    await page.locator('#timer-widget .timer-label').click();
    await page.waitForTimeout(500);
    expect(await page.locator('#page-right').evaluate((el) => el.scrollTop)).toBe(scroll);
    expect(await page.locator('#page-right').getAttribute('data-tab')).toBe(tab);
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'running');
    await page.locator('.timer-cancel').click();
  });

  // cooking-guidance › The running pill leads to its step › Finished pill still dismisses
  test('tapping the finished pill dismisses it without scrolling', async ({ page }) => {
    const recipe = await createCookingRecipe(page);
    await openRecipe(page, recipe.id, 'Steady Stew');
    if (isPhone(page)) await openTab(page, 'method');
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(0.02, 'Oven', 9);
    });
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'done', { timeout: 10000 });
    await page.locator('#page-right').evaluate((el) => { el.scrollTop = 0; });
    await page.locator('#timer-widget').click();
    await expect(page.locator('#timer-widget')).toBeHidden();
    await page.waitForTimeout(500);
    expect(await page.locator('#page-right').evaluate((el) => el.scrollTop)).toBe(0);
  });
});
