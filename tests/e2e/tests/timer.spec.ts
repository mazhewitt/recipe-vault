import { test, expect } from '@playwright/test';
import { authenticate, createRecipe, expectHitArea, openTab, paceChat, sendNote, spineX } from './helpers';

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
    await expect(page.locator('#timer-text')).toContainText('Test: ');

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
      expect(box.height).toBeLessThanOrEqual(30);
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
    await expect(page.locator('#timer-text')).toHaveText('Done — Done', { timeout: 10000 });
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'done');
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);

    // The finished state stays past the old 3s auto-hide, until tapped
    await page.waitForTimeout(4000);
    await expect(page.locator('#timer-widget')).toBeVisible();
    await expect(page.locator('#timer-text')).toHaveText('Done — Done');
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
    await expect(page.locator('#timer-text')).toHaveText('Done — Chime', { timeout: 10000 });
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
    await expect(page.locator('#timer-text')).toHaveText('Done — Silent', { timeout: 10000 });
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'done');
    const red = await page.locator('#timer-text').evaluate((el) => getComputedStyle(el).color);
    expect(red).toBe('rgb(139, 45, 26)');
    expect(errors).toEqual([]);
    await page.locator('#timer-widget').click();
    await expect(page.locator('#timer-widget')).toBeHidden();
  });
});
