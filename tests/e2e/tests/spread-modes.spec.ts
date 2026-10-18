import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, seedRecipes, openRecipe, isPhone, spineX } from './helpers';

/**
 * The contextual left page. One state, body[data-spread-mode], three values:
 *   contents - the contents, as the book has always shown them
 *   cook     - the open recipe's ingredients, with the method opposite
 *   notes    - the conversation for the open recipe, plus the input
 *
 * The mode is selected by the left-edge strip, which swaps its filter buttons
 * for Contents / Cook / Notes while a recipe is open, and implicitly by opening
 * a recipe (cook) and going back to the contents (contents). Focusing the note
 * input selects nothing: the slip keeps one position so a click cannot move it.
 *
 * Below 600px there is no spread, so there is no mode: every case here is
 * either skipped on the phone or asserts that the phone is untouched.
 */

/** Skips a case that only means something where the spread has two pages. */
function skipOnPhone(page: Page) {
  test.skip(isPhone(page), 'there is no spread, and so no spread mode, at 600px and below');
}

async function createLongRecipe(page: Page, name: string): Promise<string> {
  return createRecipe(page, {
    title: `${name} ${Date.now()}`,
    ingredients: Array.from({ length: 40 }, (_, i) => ({
      name: `ingredient number ${i + 1}`,
      quantity: i + 1,
      unit: 'g',
    })),
    steps: Array.from({ length: 20 }, (_, i) => ({
      step_number: i + 1,
      instruction: `Step ${i + 1}: stir the mixture slowly and evenly until it is completely smooth`,
    })),
    servings: 4,
    // Already assessed, so the pending-difficulty refresh cannot re-render mid-test
    difficulty: 3,
  });
}

type Box = { x: number; y: number; width: number; height: number };

/** The largest difference, in px, between two boxes on any edge or size. */
function boxDelta(a: Box, b: Box): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y),
    Math.abs(a.width - b.width), Math.abs(a.height - b.height));
}

/** The slip's box, after asserting it is displayed. */
async function slipBox(page: Page): Promise<Box> {
  await expect(page.locator('.note-input')).toBeVisible();
  return (await page.locator('.note-input').boundingBox())!;
}

/**
 * Scrolls the left page to its foot and returns how far, in px, the bottom of
 * the last `selector` match reaches below the slip's top edge (<= 0 clears it).
 */
async function lastLineOverlap(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const left = document.getElementById('page-left')!;
    left.scrollTop = left.scrollHeight;
    const items = left.querySelectorAll(sel);
    const last = items[items.length - 1];
    if (!last) throw new Error(`no ${sel} on the left page`);
    const slip = document.querySelector('.note-input')!.getBoundingClientRect();
    return last.getBoundingClientRect().bottom - slip.top;
  }, selector);
}

/** Whether the left page actually scrolls, so a clearance check has teeth. */
async function leftPageOverflows(page: Page): Promise<boolean> {
  return page.locator('#page-left').evaluate(el => el.scrollHeight > el.clientHeight + 50);
}

async function isAnimating(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const M = await import('/static/page-transitions.js');
    return M.isAnimating();
  });
}

/** The mode the body is carrying, which is the only place the mode lives. */
async function spreadMode(page: Page): Promise<string | undefined> {
  return page.evaluate(() => document.body.dataset.spreadMode);
}

/** Selects a spread mode from the left-edge strip and waits for the body to adopt it. */
async function selectMode(page: Page, mode: 'contents' | 'cook' | 'notes') {
  await page.locator(`.spread-tab[data-mode="${mode}"]`).click();
  await expect(page.locator('body')).toHaveAttribute('data-spread-mode', mode);
}

test.describe('Spread modes', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('the book opens on the contents with the filter tabs on the strip', async ({ page }) => {
    await createLongRecipe(page, 'Opening Contents');
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');
    await expect(page.locator('.contents-tab-all')).toBeVisible();
    // Contents and Cook belong to an open recipe and are not on the strip yet.
    // Notes is, on every viewport: it is the only way into the book-level thread.
    for (const mode of ['contents', 'cook']) {
      await expect(page.locator(`.spread-tab[data-mode="${mode}"]`)).toBeHidden();
    }
    if (!isPhone(page)) {
      await expect(page.locator('.spread-tab[data-mode="notes"]')).toBeVisible();
    }
  });

  test('opening a recipe puts the ingredients on the left page and the method on the right', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Cook Split');
    await openRecipe(page, recipeId);

    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');

    // Ingredients left...
    const leftIngredients = page.locator('#page-left-content .tab-panel[data-tab="ingredients"]');
    await expect(leftIngredients).toBeVisible();
    await expect(leftIngredients).toContainText('ingredient number 1');
    // ...method right...
    const rightMethod = page.locator('#page-right-content .tab-panel[data-tab="method"]');
    await expect(rightMethod).toBeVisible();
    await expect(rightMethod).toContainText('Step 1:');
    // ...and the contents on neither page
    await expect(page.locator('.index-recipe-item')).toHaveCount(0);

    // The panel was MOVED, not re-rendered: applyStepHighlight and the tab
    // machinery each use a single querySelector, so a second copy would break them
    await expect(page.locator('.tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect(page.locator('#page-right-content .tab-panel[data-tab="ingredients"]')).toHaveCount(0);

    // The strip has swapped its button sets
    await expect(page.locator('.spread-tab[data-mode="cook"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.spread-tab[data-mode="contents"]')).toBeVisible();
    await expect(page.locator('.contents-tab-all')).toBeHidden();
  });

  test('each half of the spread scrolls independently', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Independent Scroll');
    await openRecipe(page, recipeId);

    const overflow = (id: string) => page.locator(`#${id}`).evaluate(
      el => el.scrollHeight - el.clientHeight
    );
    const scrollTop = (id: string) => page.locator(`#${id}`).evaluate(el => el.scrollTop);

    // Both pages really do overflow, otherwise there is nothing to prove
    expect(await overflow('page-left')).toBeGreaterThan(50);
    expect(await overflow('page-right')).toBeGreaterThan(50);

    await page.locator('#page-left').evaluate(el => { el.scrollTop = 200; });
    await expect.poll(() => scrollTop('page-left'), { timeout: 5000 }).toBeGreaterThan(100);
    // The method did not move with it: that is the whole point of the mode
    expect(await scrollTop('page-right')).toBe(0);

    await page.locator('#page-right').evaluate(el => { el.scrollTop = 200; });
    await expect.poll(() => scrollTop('page-right'), { timeout: 5000 }).toBeGreaterThan(100);
    expect(await scrollTop('page-left')).toBeGreaterThan(100);
  });

  test('the right-edge strip stays on the edge in cook mode as inert ribbons', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Edge Strip');
    await openRecipe(page, recipeId);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');

    // The strip is the book's furniture and stays put in every mode
    await expect(page.locator('.edge-tabs')).toBeVisible();
    await expect(page.locator('.edge-tab')).toHaveCount(2);
    // Notes is a left-page mode now, so it has left the right-edge strip entirely
    await expect(page.locator('.edge-tab[data-tab="notes"]')).toHaveCount(0);

    for (const mode of ['cook', 'notes', 'contents'] as const) {
      if (mode !== 'cook') await selectMode(page, mode);
      await expect(page.locator('.edge-tabs')).toBeVisible();

      for (const tab of ['ingredients', 'method']) {
        const ribbon = page.locator(`.edge-tab[data-tab="${tab}"]`);
        await expect(ribbon).toBeVisible();
        // Ribbons, not controls: not announced, not focusable, no pointer input
        await expect(ribbon).toHaveAttribute('aria-hidden', 'true');
        await expect(ribbon).toHaveAttribute('tabindex', '-1');
        expect(await ribbon.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');

        const box = (await ribbon.boundingBox())!;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        expect(await page.evaluate(({ x, y }) => {
          const hit = document.elementFromPoint(x, y);
          return !!hit && !!hit.closest('.edge-tab');
        }, { x: cx, y: cy }), `elementFromPoint at the ${tab} ribbon`).toBe(false);

        // A click where the ribbon is drawn changes neither page
        const snapshot = () => page.evaluate(() => ({
          left: document.getElementById('page-left-content')!.innerHTML,
          right: document.getElementById('page-right-content')!.innerHTML,
          leftTop: document.getElementById('page-left')!.scrollTop,
          rightTop: document.getElementById('page-right')!.scrollTop,
          mode: document.body.dataset.spreadMode,
        }));
        const before = await snapshot();
        await page.mouse.click(cx, cy);
        await page.waitForTimeout(400);
        expect(await snapshot()).toEqual(before);
      }
    }
  });

  test('cook mode does not scroll the right page to a section header', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Cook No Scroll');
    await openRecipe(page, recipeId);
    const scrollTop = () => page.locator('#page-right').evaluate(el => el.scrollTop);
    expect(await scrollTop()).toBe(0);

    // The sections are on separate pages here, so there is no header on this
    // page to scroll to and scrolling would move the wrong one. The tab value
    // is still legal, so it is set the only way cook mode can reach it.
    // Sampled across the whole animation frame by frame: the scroll it must not
    // start is smooth, so a single read straight afterwards would still be 0.
    const highWaterMark = await page.evaluate(() => new Promise<number>((resolve) => {
      const pageRight = document.getElementById('page-right')!;
      let max = 0;
      const start = performance.now();
      const sample = () => {
        max = Math.max(max, pageRight.scrollTop);
        if (performance.now() - start < 1000) requestAnimationFrame(sample);
        else resolve(max);
      };
      requestAnimationFrame(sample);
      // @ts-ignore - setActiveTab is exposed by app.js
      setActiveTab('method');
    }));
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
    expect(highWaterMark, 'cook mode must not scroll the method page').toBe(0);

    // In contents mode the whole recipe shares one page, and the very same call
    // does scroll to the header — so the assertion above is about the mode
    await selectMode(page, 'contents');
    await page.evaluate(() => {
      // @ts-ignore - setActiveTab is exposed by app.js
      setActiveTab('ingredients', { force: true });
      // @ts-ignore
      setActiveTab('method');
    });
    await expect.poll(scrollTop, { timeout: 5000 }).toBeGreaterThan(0);
  });

  test('phone: the paper tabs keep all three sections and the mode is inert', async ({ page }) => {
    test.skip(!isPhone(page), 'the paper tabs are the phone layout');
    const recipeId = await createLongRecipe(page, 'Phone Tabs Intact');
    await openRecipe(page, recipeId);

    // The phone has no left page to promote Notes to, so it keeps all three
    await expect(page.locator('.page-tabs')).toBeVisible();
    await expect(page.locator('.page-tab')).toHaveCount(3);
    await expect(page.locator('.page-tab[data-tab="notes"]')).toBeVisible();

    // The recipe stays on the one page the reader can see, whatever the
    // attribute says: every spread rule is scoped to min-width 601px
    await expect(page.locator('#page-right-content .tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toHaveCount(0);
    await expect(page.locator('#page-left')).toBeHidden();

    // ...and a mode change is refused outright rather than merely styled away
    const applied = await page.evaluate(() =>
      // @ts-ignore - setSpreadMode is exposed by app.js
      setSpreadMode('cook')
    );
    expect(applied).toBe(false);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');
  });

  test('the Contents tab brings the contents back beside the open recipe', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Contents Beside');
    await openRecipe(page, recipeId);
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();
    const rightBox = (await page.locator('#page-right-content').boundingBox())!;

    await selectMode(page, 'contents');

    // The contents are back on the left, with the open recipe marked
    await expect(page.locator('#page-left-content .index-recipe-item.current')).toHaveCount(1);
    await expect(page.locator('#page-left-content .index-recipe-item.current'))
      .toHaveAttribute('data-recipe-id', recipeId);

    // ...and the right page is exactly as cook mode left it: title and method,
    // no ingredients (they are parked off the page until Cook brings them back),
    // and the same box
    await expect(page.locator('#page-right-content .recipe-title')).toBeVisible();
    await expect(page.locator('#page-right-content .tab-panel[data-tab="method"]')).toBeVisible();
    await expect(page.locator('#page-right-content .tab-panel[data-tab="ingredients"]')).toHaveCount(0);
    await expect(page.locator('.ingredients-list')).toHaveCount(0);
    expect(boxDelta((await page.locator('#page-right-content').boundingBox())!, rightBox)).toBeLessThanOrEqual(1);

    // Cook takes it apart again
    await selectMode(page, 'cook');
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();
    await expect(page.locator('.tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect(page.locator('.index-recipe-item')).toHaveCount(0);
  });

  test('clicking a recipe in the contents beside an open one opens it in cook mode', async ({ page }) => {
    skipOnPhone(page);
    const first = await createLongRecipe(page, 'AAA Jump From');
    const second = await createLongRecipe(page, 'ZZZ Jump To');
    await openRecipe(page, first);

    await selectMode(page, 'contents');
    await page.locator(`#page-left-content .index-recipe-item[data-recipe-id="${second}"]`).click();

    // Scoped to the page: the page-turn overlay carries a dead copy of the
    // outgoing page, title and all, until the animation ends
    await expect(page.locator('#page-right-content .recipe-title'))
      .toContainText('ZZZ Jump To', { timeout: 10000 });
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();
    await expect(page.locator('.tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect(page.locator('.index-recipe-item')).toHaveCount(0);
  });

  test('notes mode gives the conversation the left page and takes the input with it', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Notes Page');
    await openRecipe(page, recipeId);

    await selectMode(page, 'notes');

    // The thread takes the left page...
    await expect(page.locator('#page-left-content .notes-page .notes-thread')).toBeVisible();
    // ...and the right page keeps the method as cook mode showed it, with no
    // ingredients on either page
    await expect(page.locator('#page-right-content .tab-panel[data-tab="ingredients"]')).toHaveCount(0);
    await expect(page.locator('#page-right-content .tab-panel[data-tab="method"]')).toBeVisible();
    await expect(page.locator('.tab-panel[data-tab="ingredients"]')).toHaveCount(0);

    // Exactly one input form in the document — it is repositioned, never copied
    expect(await page.evaluate(() => document.querySelectorAll('.note-input').length)).toBe(1);
    await expect(page.locator('.note-input')).toBeVisible();

    // ...and it sits over the LEFT page, wholly left of the spine
    const spine = await spineX(page);
    const input = (await page.locator('.note-input').boundingBox())!;
    expect(input.x + input.width).toBeLessThanOrEqual(spine);

    // Back to cook and it stays exactly where it was: the slip has one home
    await selectMode(page, 'cook');
    const back = (await page.locator('.note-input').boundingBox())!;
    expect(back.x).toBe(input.x);
    expect(back.y).toBe(input.y);
  });

  test('switching modes does not touch the right page', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Right Page Still');
    await openRecipe(page, recipeId);
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();

    // A mid-method step in view, so a reflow of the method cannot hide in the
    // part of the page nobody is reading
    await page.locator('#page-right-content .prep-step[data-step="10"]').evaluate(el => {
      const right = document.getElementById('page-right')!;
      right.scrollTop += el.getBoundingClientRect().top - right.getBoundingClientRect().top - 40;
    });

    /** Every box the right page draws for the recipe, plus its scroll. */
    const snapshot = () => page.evaluate(() => {
      const right = document.getElementById('page-right-content')!;
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      return {
        scrollTop: document.getElementById('page-right')!.scrollTop,
        title: box(right.querySelector('.recipe-title')!),
        meta: box(right.querySelector('.recipe-meta-line')!),
        steps: Array.from(right.querySelectorAll('.prep-step')).map(box),
      };
    });
    const before = await snapshot();
    expect(before.scrollTop).toBeGreaterThan(0);
    expect(before.steps).toHaveLength(20);

    for (const mode of ['notes', 'contents', 'cook'] as const) {
      await selectMode(page, mode);
      // Wait for the left page to finish drawing what the mode asks for
      if (mode === 'notes') await expect(page.locator('#page-left-content .notes-thread')).toBeVisible();
      if (mode === 'contents') await expect(page.locator('#page-left-content .index-recipe-item.current')).toHaveCount(1);
      if (mode === 'cook') await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();

      await expect(page.locator('#page-right-content .tab-panel[data-tab="ingredients"]'), mode).toHaveCount(0);
      const after = await snapshot();
      expect(Math.abs(after.scrollTop - before.scrollTop), `${mode}: scrollTop`).toBeLessThanOrEqual(1);
      expect(boxDelta(after.title, before.title), `${mode}: title`).toBeLessThanOrEqual(1);
      expect(boxDelta(after.meta, before.meta), `${mode}: meta line`).toBeLessThanOrEqual(1);
      after.steps.forEach((step, i) => {
        expect(boxDelta(step, before.steps[i]), `${mode}: step ${i + 1}`).toBeLessThanOrEqual(1);
      });
    }
  });

  test('the ingredients are relocated, never duplicated', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'One Panel');
    await openRecipe(page, recipeId);
    const leftPanel = page.locator('#page-left-content .tab-panel[data-tab="ingredients"]');
    await expect(leftPanel).toBeVisible();
    // Tag the node itself, so "the same panel" means the same node, not a re-render
    await leftPanel.evaluate(el => { (el as HTMLElement).dataset.probe = 'original'; });

    for (const mode of ['notes', 'contents'] as const) {
      await selectMode(page, mode);
      expect(await page.locator('.ingredients-list').count(), mode).toBeLessThanOrEqual(1);
      // Not on screen on either page
      await expect(page.locator('#page-left-content .ingredients-list'), mode).toHaveCount(0);
      await expect(page.locator('#page-right-content .ingredients-list'), mode).toHaveCount(0);
    }

    await selectMode(page, 'cook');
    await expect(page.locator('.ingredients-list')).toHaveCount(1);
    await expect(leftPanel).toHaveAttribute('data-probe', 'original');
    await expect(leftPanel).toContainText('ingredient number 1');
  });

  test('the slip keeps one position, so clicking it never moves it', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'No Jump');
    await openRecipe(page, recipeId);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');

    // Cook mode: the slip is at the foot of the LEFT page, under the ingredients
    const spine = await spineX(page);
    const before = (await page.locator('.note-input').boundingBox())!;
    expect(before.x + before.width).toBeLessThanOrEqual(spine);

    // Clicking into it types where it stands. It used to open notes mode, which
    // slid the slip across the spine out from under the cursor mid-click.
    await page.locator('#message-input').click();
    await expect(page.locator('#message-input')).toBeFocused();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');

    const after = (await page.locator('.note-input').boundingBox())!;
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
  });

  test('contents mode keeps the slip where it was', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Contents Slip');
    await openRecipe(page, recipeId);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');

    // One home in every mode: the foot of the LEFT page, never hidden
    const spine = await spineX(page);
    const cook = await slipBox(page);
    expect(cook.x + cook.width).toBeLessThanOrEqual(spine);

    await selectMode(page, 'contents');
    expect(boxDelta(await slipBox(page), cook), 'contents mode moved the slip').toBeLessThanOrEqual(1);

    await selectMode(page, 'notes');
    expect(boxDelta(await slipBox(page), cook), 'notes mode moved the slip').toBeLessThanOrEqual(1);
  });

  test('the contents page keeps its slip and gains a Notes tab', async ({ page }) => {
    skipOnPhone(page);
    await seedRecipes(page, 3);
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');

    // No recipe is open, so the strip is the filters — plus Notes, the only way
    // into the book-level thread now that focus does not open it
    await expect(page.locator('.contents-tab[data-filter="all"]')).toBeVisible();
    await expect(page.locator('.spread-tab[data-mode="notes"]')).toBeVisible();
    await expect(page.locator('.spread-tab[data-mode="cook"]')).toBeHidden();
    await expect(page.locator('.spread-tab[data-mode="contents"]')).toBeHidden();

    // The slip is at the foot of the LEFT page here too, the box it keeps once
    // a recipe is open, and focusing it is inert
    const spine = await spineX(page);
    const contents = await slipBox(page);
    expect(contents.x + contents.width).toBeLessThanOrEqual(spine);
    await page.locator('#message-input').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');

    const recipeId = await createLongRecipe(page, 'Contents Home');
    await openRecipe(page, recipeId);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);
    expect(boxDelta(await slipBox(page), contents), 'opening a recipe moved the slip').toBeLessThanOrEqual(1);
  });

  test('a failed recipe load keeps the slip on the left page', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Failed Load');
    const home = await slipBox(page);
    await page.route(`**/api/recipes/${recipeId}`, route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }));

    await page.evaluate((id) => {
      // @ts-ignore - fetchAndDisplayRecipe is exposed by app.js
      fetchAndDisplayRecipe(id);
    }, recipeId);
    await expect(page.locator('#page-right-content')).toContainText('Failed to load recipe', { timeout: 10000 });
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);

    const spine = await spineX(page);
    const after = await slipBox(page);
    expect(after.x + after.width).toBeLessThanOrEqual(spine);
    expect(boxDelta(after, home), 'a failed load moved the slip').toBeLessThanOrEqual(1);
  });

  test("the left page's last line clears the slip", async ({ page }) => {
    skipOnPhone(page);
    // The contents: enough entries that the left page scrolls. All under "A",
    // the first letter group, which the split always keeps on the left page.
    const stamp = Date.now();
    for (let i = 0; i < 60; i++) {
      await createRecipe(page, {
        title: `A Clearance Entry ${stamp} ${String(i).padStart(2, '0')}`,
        ingredients: [{ name: 'salt', quantity: 1, unit: 'g' }],
        steps: [{ step_number: 1, instruction: 'Season.' }],
        servings: 1,
        difficulty: 1,
      });
    }
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();
    await expect(page.locator('#page-left-content .index-recipe-item').first()).toBeVisible();
    expect(await leftPageOverflows(page), 'the contents must overflow the left page').toBe(true);
    expect(await lastLineOverlap(page, '#page-left-content > *'), 'the contents').toBeLessThanOrEqual(0);

    // The ingredients, in cook mode
    const recipeId = await createLongRecipe(page, 'Clearance');
    await openRecipe(page, recipeId);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);
    expect(await leftPageOverflows(page), 'the ingredients must overflow the left page').toBe(true);
    expect(await lastLineOverlap(page, '.ingredient-item'), 'the ingredients').toBeLessThanOrEqual(0);

    // The thread, in notes mode, long enough to scroll
    await selectMode(page, 'notes');
    await page.evaluate(async (id) => {
      const M = await import('/static/margin-notes.js');
      for (let i = 1; i <= 30; i++) M.addNote(`Note ${i} about the stew, long enough to wrap a little on the page.`, 'reply', id);
    }, recipeId);
    await expect(page.locator('#page-left-content .notes-thread > *').nth(29)).toBeAttached();
    expect(await leftPageOverflows(page), 'the thread must overflow the left page').toBe(true);
    expect(await lastLineOverlap(page, '.notes-thread > *'), 'the thread').toBeLessThanOrEqual(0);
  });

  test('cook mode keeps a running timer step highlighted on the method page', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Timer Cook');
    await openRecipe(page, recipeId);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');

    await page.evaluate(() => {
      // @ts-ignore - startTimer is exposed by app.js
      startTimer(5, 'Mock timer', 2);
    });
    await expect(page.locator('#timer-widget')).toBeVisible();

    // The highlighted step is on the method page, and the relocation of the
    // ingredients to the other page leaves applyStepHighlight's single target
    // intact — exactly one highlighted step, on the right
    await expect(page.locator('#page-right-content .prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);

    // It survives a trip through the other two modes and back
    await selectMode(page, 'notes');
    await selectMode(page, 'cook');
    await expect(page.locator('#page-right-content .prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);
  });

  test('a contents render still in flight cannot take the ingredients off the spread', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Contents In Flight');
    await openRecipe(page, recipeId);
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();

    // Hold the contents' round trip open so the reader can change their mind
    // inside it. Only the list itself: /api/recipes/:id must still answer.
    let release: () => void = () => {};
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route(/\/api\/recipes$/, async (route) => {
      await held;
      await route.continue();
    });

    await page.locator('.spread-tab[data-mode="contents"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');
    // The ingredients are parked off the page, waiting for a contents render
    // that has not landed and now never should
    await expect(page.locator('.tab-panel[data-tab="ingredients"]')).toHaveCount(0);

    await selectMode(page, 'cook');
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();

    const settled = page.waitForResponse(resp => /\/api\/recipes$/.test(resp.url()));
    release();
    await settled;
    // A render from before the switch would blank #page-left-content and take
    // the document's only ingredients panel with it
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();
    await expect(page.locator('.tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect(page.locator('.index-recipe-item')).toHaveCount(0);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
  });

  test('going back to the contents does not overwrite a mode chosen while the list loads', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Header In Flight');
    await openRecipe(page, recipeId);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');

    // Hold the contents' round trip open, as above, so the reader can change
    // their mind inside it. Only the list itself: /api/recipes/:id still answers.
    let release: () => void = () => {};
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route(/\/api\/recipes$/, async (route) => {
      await held;
      await route.continue();
    });

    // The Recipe Book header turns the page back, drawing the contents from
    // the list already held, and refreshes the list once the turn is over. The
    // turn holds the animation lock, so wait it out; the refresh is still held.
    await page.locator('#recipe-book-header').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);

    // With no recipe open the strip shows the filters plus Notes, which is the
    // way in — the book-level thread on the left, the contents on the right
    await page.locator('.spread-tab[data-mode="notes"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'notes');
    await expect(page.locator('#page-left-content .notes-thread')).toBeVisible();

    release();
    // The notes-mode render moves the whole list to the right page; waiting for
    // it is what proves the held renders have all landed
    await expect(page.locator('#page-right-content .index-recipe-item').first()).toBeVisible();

    // A render from before the switch would write the two-page split over both
    // pages and take the thread with it
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'notes');
    await expect(page.locator('#page-left-content .notes-thread')).toHaveCount(1);
    await expect(page.locator('#page-left-content .index-recipe-item')).toHaveCount(0);
  });

  test('narrowing past 600px puts the contents back on the page the phone shows', async ({ page }) => {
    skipOnPhone(page);
    const suffix = Date.now().toString();
    const main = await createRecipe(page, {
      title: `Beef Stew ${suffix}`, ingredients: [], steps: [], tags: ['main'], difficulty: 3,
    });
    const dessert = await createRecipe(page, {
      title: `Apple Crumble ${suffix}`, ingredients: [], steps: [], tags: ['dessert'], difficulty: 3,
    });
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    // Notes mode on the contents page: the thread takes the left page and the
    // whole list moves across to the right
    await page.locator('.spread-tab[data-mode="notes"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'notes');
    await expect(page.locator(`#page-right-content .index-recipe-item[data-recipe-id="${main}"]`)).toHaveCount(1);

    await page.setViewportSize({ width: 375, height: 667 });

    // Below 600px the phone shows the left page and hides the right one, so a
    // spread mode read off the body here would leave the contents page blank
    await expect(page.locator(`#page-left-content .index-recipe-item[data-recipe-id="${main}"]`)).toHaveCount(1);
    await expect(page.locator('#page-right-content .index-recipe-item')).toHaveCount(0);
    await expect(page.locator('#page-left-content .notes-thread')).toHaveCount(0);

    // ...and the filter strip is still live: the mode change a tap asks for is
    // refused on a phone, so the tap itself has to draw the contents
    await page.locator('.contents-tab-mains').click();
    await expect(page.locator('.contents-tab-mains')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`#page-left-content .index-recipe-item[data-recipe-id="${main}"]`)).toHaveCount(1);
    await expect(page.locator(`#page-left-content .index-recipe-item[data-recipe-id="${dessert}"]`)).toHaveCount(0);
  });

  test('a mode change during a page turn is ignored', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Mode Lock');
    await openRecipe(page, recipeId);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');

    // A real page turn, held open by a slow render so the tap lands inside it
    await page.evaluate(async () => {
      const M = await import('/static/page-transitions.js');
      // deliberately not awaited: the lock must still be held when we tap
      M.animatePageTurn('forward', () => new Promise(r => setTimeout(r, 1500)));
    });
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(true);

    // dispatchEvent, not click(): a view transition covers the page mid-turn,
    // but the delegated listener is the same one a tap would reach
    await page.locator('.spread-tab[data-mode="contents"]').dispatchEvent('click');

    expect(await spreadMode(page)).toBe('cook');
    await expect(page.locator('.spread-tab[data-mode="contents"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();

    // Once the turn is over the very same tap works — so the assertion above is
    // about the lock, not about a tab that never worked
    await expect.poll(() => isAnimating(page), { timeout: 10000 }).toBe(false);
    await selectMode(page, 'contents');
  });

  test('a displayed meal plan offers no Cook tab and refuses cook mode', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Meal Member');
    await openRecipe(page, recipeId);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');

    await page.evaluate((id) => {
      // @ts-ignore - renderMealPlan is exposed by app.js
      renderMealPlan({
        title: 'Sunday Roast',
        guest_count: null,
        recipes: [{ recipe_id: id, title: 'Meal Member', role: 'centrepiece' }],
      });
    }, recipeId);
    await expect(page.locator('.meal-plan-panel')).toBeVisible();

    // A meal is the one case where several recipes at once is the point
    await expect(page.locator('.spread-tab[data-mode="cook"]')).toBeHidden();
    await expect(page.locator('.spread-tab[data-mode="contents"]')).toBeVisible();
    await expect(page.locator('.spread-tab[data-mode="notes"]')).toBeVisible();

    // The mode the plan inherited from the recipe is dropped, and cook is
    // refused outright rather than merely being off the strip
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');
    const applied = await page.evaluate(() =>
      // @ts-ignore - setSpreadMode is exposed by app.js
      setSpreadMode('cook')
    );
    expect(applied).toBe(false);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');

    // Notes is still offered there — the plan gets the book-level thread
    await selectMode(page, 'notes');
    await expect(page.locator('#page-left-content .notes-thread')).toBeVisible();
    await expect(page.locator('.meal-plan-panel')).toBeVisible();
  });

  test('returning to the contents reverts the strip and restores the remembered filter', async ({ page }) => {
    skipOnPhone(page);
    const dessert = await createRecipe(page, {
      title: `Apple Crumble ${Date.now()}`, ingredients: [], steps: [], tags: ['dessert'], difficulty: 3,
    });
    const main = await createRecipe(page, {
      title: `Beef Stew ${Date.now()}`, ingredients: [], steps: [], tags: ['main'], difficulty: 3,
    });
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    // Leave the contents on a filter that is not the default
    await page.locator('.contents-tab-sweets').click();
    await expect(page.locator('.contents-tab-sweets')).toHaveAttribute('aria-pressed', 'true');

    await openRecipe(page, dessert);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    await expect(page.locator('.contents-tab-sweets')).toBeHidden();

    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible({ timeout: 10000 });

    // The filters are back, on the tab the reader left, and the spread tabs are gone
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');
    await expect(page.locator('.contents-tab-all')).toBeVisible();
    await expect(page.locator('.contents-tab-sweets')).toBeVisible();
    await expect(page.locator('.contents-tab-sweets')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.contents-tab-all')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.spread-tab[data-mode="contents"]')).toBeHidden();
    await expect(page.locator('.spread-tab[data-mode="cook"]')).toBeHidden();
    // Notes stays: the book-level thread is reachable from the contents page too
    await expect(page.locator('.spread-tab[data-mode="notes"]')).toBeVisible();

    // ...and the filter is applied, not merely pressed: the main this test
    // seeded is off the page while the dessert it opened is still on it
    await expect(page.locator(`.index-recipe-item[data-recipe-id="${dessert}"]`)).toHaveCount(1);
    await expect(page.locator(`.index-recipe-item[data-recipe-id="${main}"]`)).toHaveCount(0);
  });

  test('a recipe refresh keeps cook mode and the ingredients on the left page', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Refresh Cook');
    await openRecipe(page, recipeId);
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();
    // Both pages scrolled, so keeping the place is something the refresh has to do
    const scrolled = await page.evaluate(() => {
      const left = document.getElementById('page-left')!;
      const right = document.getElementById('page-right')!;
      left.scrollTop = left.scrollHeight;
      right.scrollTop = right.scrollHeight;
      return { left: left.scrollTop, right: right.scrollTop };
    });
    expect(scrolled.left).toBeGreaterThan(0);
    expect(scrolled.right).toBeGreaterThan(0);

    // A refresh of the recipe already on the page — the path a photo upload,
    // an update_recipe and the difficulty backfill all take
    await openRecipe(page, recipeId);
    await expect(page.locator('#page-right-content .tab-panel[data-tab="method"]')).toBeVisible();
    const kept = await page.evaluate(() => ({
      left: document.getElementById('page-left')!.scrollTop,
      right: document.getElementById('page-right')!.scrollTop,
    }));
    expect(Math.abs(kept.left - scrolled.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(kept.right - scrolled.right)).toBeLessThanOrEqual(1);

    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    const leftIngredients = page.locator('#page-left-content .tab-panel[data-tab="ingredients"]');
    await expect(leftIngredients).toBeVisible();
    await expect(leftIngredients).toContainText('ingredient number 1');
    // The re-render emitted a fresh panel, so the stale one must be gone
    await expect(page.locator('.tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect(page.locator('#page-right-content .tab-panel[data-tab="method"]')).toBeVisible();
  });

  // The project has no JavaScript unit-test runner (eslint and Playwright only),
  // so the module-level claims of task 1.5 are asserted here, in the page, against
  // the globals app.js exposes.
  test('the body attribute is the only source of truth for the mode', async ({ page }) => {
    const recipeId = await createLongRecipe(page, 'Source Of Truth');
    await openRecipe(page, recipeId);

    const observed = await page.evaluate(() => {
      // @ts-ignore - getSpreadMode is exposed by app.js
      const read = () => getSpreadMode();
      const before = document.body.dataset.spreadMode;

      // The getter reports whatever the attribute says, even when nothing in
      // the module wrote it: there is no shadow copy of the mode
      document.body.dataset.spreadMode = 'notes';
      const afterExternalWrite = read();

      // ...and an illegal value reads back as the default rather than itself
      document.body.dataset.spreadMode = 'sideways';
      const afterIllegalWrite = read();

      document.body.dataset.spreadMode = before;
      return { before, afterExternalWrite, afterIllegalWrite, restored: read() };
    });

    expect(observed.afterExternalWrite).toBe('notes');
    expect(observed.afterIllegalWrite).toBe('contents');
    expect(observed.restored).toBe(observed.before);
  });

  test('an unknown mode is rejected and changes nothing', async ({ page }) => {
    const recipeId = await createLongRecipe(page, 'Unknown Mode');
    await openRecipe(page, recipeId);
    const before = await spreadMode(page);

    const results = await page.evaluate(() =>
      // @ts-ignore - setSpreadMode is exposed by app.js
      ['sideways', '', 'COOK', null, undefined].map(mode => setSpreadMode(mode))
    );

    expect(results).toEqual([false, false, false, false, false]);
    expect(await spreadMode(page)).toBe(before);
  });
});

/** book-spread-modes › Each spread mode keeps its own left-page scroll. */
test.describe('Each spread mode keeps its own left-page scroll', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  const leftScroll = (page: Page) => page.locator('#page-left').evaluate(el => el.scrollTop);
  const scrollLeftTo = (page: Page, top: number) =>
    page.locator('#page-left').evaluate((el, t) => { el.scrollTop = t; return el.scrollTop; }, top);

  /** Enough contents rows that the contents column scrolls beside an open recipe. */
  async function fillContents(page: Page) {
    for (let i = 0; i < 12; i++) {
      await createRecipe(page, {
        title: `Scroll Filler ${i} ${Date.now()}`,
        ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        steps: [{ step_number: 1, instruction: 'Mix' }],
        difficulty: 3,
      });
    }
  }

  /** Waits for the contents to be drawn on the left page beside the recipe. */
  async function contentsDrawn(page: Page) {
    await expect(page.locator('#page-left-content .index-recipe-item').first()).toBeVisible();
  }

  /** Puts `count` replies on the open recipe's thread, so the notes page scrolls. */
  async function seedThread(page: Page, recipeId: string, count: number) {
    await page.evaluate(async ({ id, n }) => {
      // @ts-ignore - module path served by the app; the same instance app.js uses
      const M = await import('/static/margin-notes.js');
      for (let i = 1; i <= n; i++) M.addNote(`Seeded reply ${i}: a line or two about the stew so the thread grows.`, 'reply', id);
    }, { id: recipeId, n: count });
  }

  test('contents to cook brings the ingredients back where they were', async ({ page }) => {
    skipOnPhone(page);
    await fillContents(page);
    const recipeId = await createLongRecipe(page, 'Scroll Back');
    await openRecipe(page, recipeId);
    expect(await leftScroll(page)).toBeLessThanOrEqual(1);

    await selectMode(page, 'contents');
    await contentsDrawn(page);
    const end = await page.locator('#page-left').evaluate(el => { el.scrollTop = el.scrollHeight; return el.scrollTop; });
    expect(end, 'the contents must scroll for this case to mean anything').toBeGreaterThan(20);

    await selectMode(page, 'cook');
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();
    expect(await leftScroll(page)).toBeLessThanOrEqual(1);
    const first = (await page.locator('#page-left .ingredient-item').first().boundingBox())!;
    const pageBox = (await page.locator('#page-left').boundingBox())!;
    expect(first.y).toBeGreaterThanOrEqual(pageBox.y);
  });

  test('each mode has its own position', async ({ page }) => {
    skipOnPhone(page);
    await fillContents(page);
    const recipeId = await createLongRecipe(page, 'Scroll Each');
    await openRecipe(page, recipeId);
    await seedThread(page, recipeId, 30);

    // Record a position in each mode
    expect(await scrollLeftTo(page, 50)).toBe(50);
    await selectMode(page, 'contents');
    await contentsDrawn(page);
    expect(await scrollLeftTo(page, 200)).toBe(200);
    await selectMode(page, 'notes');
    await expect(page.locator('#page-left-content .notes-thread .thread-note').first()).toBeVisible();
    const p = await scrollLeftTo(page, 120);
    expect(p, 'the thread must scroll for this case to mean anything').toBeGreaterThan(20);

    await selectMode(page, 'cook');
    expect(await leftScroll(page)).toBeCloseTo(50, 0);
    await selectMode(page, 'contents');
    await contentsDrawn(page);
    await expect.poll(() => leftScroll(page)).toBeCloseTo(200, 0);
    await selectMode(page, 'notes');
    expect(await leftScroll(page)).toBeCloseTo(p, 0);
    await selectMode(page, 'cook');
    expect(await leftScroll(page)).toBeCloseTo(50, 0);
  });

  test('a round trip does not re-centre the contents', async ({ page }) => {
    skipOnPhone(page);
    await fillContents(page);
    // Last in the alphabet, so the current row is centred well down the column
    const recipeId = await createLongRecipe(page, 'Zz Round Trip');
    await openRecipe(page, recipeId);

    await selectMode(page, 'contents');
    await contentsDrawn(page);
    await expect.poll(() => leftScroll(page), { message: 'drawn fresh, the current row is scrolled into view' })
      .toBeGreaterThan(20);
    await scrollLeftTo(page, 0);

    await selectMode(page, 'cook');
    await selectMode(page, 'contents');
    await contentsDrawn(page);
    await page.waitForTimeout(300);
    expect(await leftScroll(page)).toBeLessThanOrEqual(1);
  });

  test('a newly opened recipe starts at the top of its ingredients', async ({ page }) => {
    skipOnPhone(page);
    const a = await createLongRecipe(page, 'Scroll New A');
    const b = await createLongRecipe(page, 'Scroll New B');
    // The page arrows walk the list the page loaded with
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();
    await openRecipe(page, a);
    expect(await scrollLeftTo(page, 200)).toBe(200);

    await openRecipe(page, b);
    await expect(page.locator('#page-right-content .recipe-title')).toContainText('Scroll New B');
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    expect(await leftScroll(page)).toBeLessThanOrEqual(1);

    // ...and by the page arrow, from a scrolled cook page
    expect(await scrollLeftTo(page, 200)).toBe(200);
    await expect.poll(() => isAnimating(page)).toBe(false);
    const bTitle = (await page.locator('#page-right-content .recipe-title').textContent())!;
    await page.locator('#page-prev').click();
    await expect(page.locator('#page-right-content .recipe-title')).not.toHaveText(bTitle, { timeout: 10000 });
    await expect.poll(() => isAnimating(page)).toBe(false);
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    expect(await leftScroll(page)).toBeLessThanOrEqual(1);
  });

  test('restoring moves nothing else, and no frame shows another position', async ({ page }) => {
    skipOnPhone(page);
    await fillContents(page);
    const recipeId = await createLongRecipe(page, 'Scroll Frames');
    await openRecipe(page, recipeId);
    await scrollLeftTo(page, 50);
    await selectMode(page, 'contents');
    await contentsDrawn(page);
    await scrollLeftTo(page, 200);
    const rightBefore = await page.locator('#page-right').evaluate(el => ({ top: el.scrollTop, box: el.getBoundingClientRect().toJSON() }));

    for (const [mode, expected, marker] of [
      ['cook', 50, '#page-left .ingredient-item'],
      ['contents', 200, '#page-left .index-recipe-item'],
    ] as const) {
      // Every frame on which the incoming mode's content is on the left page
      await page.evaluate((sel) => {
        const w = window as any;
        const frames: number[] = w.__leftFrames = [];
        w.__leftSampling = true;
        const sample = () => {
          // A sampler belongs to its own switch; the previous one stops here
          if (!w.__leftSampling || w.__leftFrames !== frames) return;
          if (document.querySelector(sel)) w.__leftFrames.push(document.getElementById('page-left')!.scrollTop);
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, marker);
      await selectMode(page, mode);
      await expect(page.locator(marker).first()).toBeVisible();
      await page.waitForTimeout(300);
      const frames: number[] = await page.evaluate(() => {
        const w = window as any;
        w.__leftSampling = false;
        return w.__leftFrames;
      });
      expect(frames.length).toBeGreaterThan(0);
      const off = frames.filter(t => Math.abs(t - expected) > 1);
      expect(off, `${mode}: frames at another position`).toEqual([]);
    }
    const rightAfter = await page.locator('#page-right').evaluate(el => ({ top: el.scrollTop, box: el.getBoundingClientRect().toJSON() }));
    expect(rightAfter).toEqual(rightBefore);
  });

  test('the phone is unaffected', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only');
    const recipeId = await createLongRecipe(page, 'Scroll Phone');
    await openRecipe(page, recipeId);
    await page.locator('#page-right').evaluate(el => { el.scrollTop = 150; });
    const before = await page.locator('#page-right').evaluate(el => el.scrollTop);
    // @ts-ignore - exposed by app.js
    expect(await page.evaluate(() => window.setSpreadMode('contents'))).toBe(false);
    expect(await page.locator('#page-right').evaluate(el => el.scrollTop)).toBe(before);
  });
});
