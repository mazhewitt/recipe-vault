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

  test('the right-edge strip stays on the edge in cook mode and offers no Notes tab', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Edge Strip');
    await openRecipe(page, recipeId);

    // The strip is the book's furniture and stays put in every mode
    await expect(page.locator('.edge-tabs')).toBeVisible();
    await expect(page.locator('.edge-tab')).toHaveCount(2);
    await expect(page.locator('.edge-tab[data-tab="ingredients"]')).toBeVisible();
    await expect(page.locator('.edge-tab[data-tab="method"]')).toBeVisible();

    // Notes is a left-page mode now, so it has left the right-edge strip entirely
    await expect(page.locator('.edge-tab[data-tab="notes"]')).toHaveCount(0);

    // In cook mode the strip does not decide what the right page shows: the
    // ingredients are on the LEFT page, so a tap on Ingredients must not blank
    // the method the cook is reading
    await page.locator('.edge-tab[data-tab="ingredients"]').click();
    await expect(page.locator('#page-right-content .tab-panel[data-tab="method"]')).toBeVisible();
    await expect(page.locator('#page-left-content .tab-panel[data-tab="ingredients"]')).toBeVisible();

    await selectMode(page, 'contents');
    await expect(page.locator('.edge-tabs')).toBeVisible();
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

    await selectMode(page, 'contents');

    // The contents are back on the left, with the open recipe marked
    await expect(page.locator('#page-left-content .index-recipe-item.current')).toHaveCount(1);
    await expect(page.locator('#page-left-content .index-recipe-item.current'))
      .toHaveAttribute('data-recipe-id', recipeId);

    // ...and the recipe is still on the right, whole: the ingredients went back
    // to the page they were rendered on, in front of the method
    await expect(page.locator('.recipe-title')).toBeVisible();
    await expect(page.locator('.tab-panel[data-tab="ingredients"]')).toHaveCount(1);
    await expect(page.locator('#page-right-content .tab-panel[data-tab="ingredients"]')).toBeVisible();
    const order = await page.locator('#page-right-content').evaluate(el => {
      const ingredients = el.querySelector('.tab-panel[data-tab="ingredients"]')!;
      const method = el.querySelector('.tab-panel[data-tab="method"]')!;
      return ingredients.compareDocumentPosition(method);
    });
    expect(order & 4).toBe(4); // Node.DOCUMENT_POSITION_FOLLOWING

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
    // ...and the right page has the whole recipe back, both sections
    await expect(page.locator('#page-right-content .tab-panel[data-tab="ingredients"]')).toBeVisible();
    await expect(page.locator('#page-right-content .tab-panel[data-tab="method"]')).toBeVisible();
    await expect(page.locator('.tab-panel[data-tab="ingredients"]')).toHaveCount(1);

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

  test('contents mode hides the slip, and the Notes tab brings it back', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createLongRecipe(page, 'Contents Slip');
    await openRecipe(page, recipeId);

    await selectMode(page, 'contents');
    // Nothing to write on while finding a recipe...
    await expect(page.locator('.note-input')).toBeHidden();
    // ...and the way back is the tab on the strip the reader is already using
    await expect(page.locator('.spread-tab[data-mode="notes"]')).toBeVisible();

    await selectMode(page, 'notes');
    await expect(page.locator('.note-input')).toBeVisible();
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

    // The slip stays where it has always been here, and focusing it is inert
    await expect(page.locator('.note-input')).toBeVisible();
    await page.locator('#message-input').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');
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
    // The ingredients are back on the right page, waiting for a contents render
    // that has not landed and now never should
    await expect(page.locator('#page-right-content .tab-panel[data-tab="ingredients"]')).toBeVisible();

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

    // The Recipe Book header reaches showIndex directly, outside a page turn,
    // so nothing holds the animation lock while the list is in flight
    await page.locator('#recipe-book-header').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');

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

    // A refresh of the recipe already on the page — the path a photo upload,
    // an update_recipe and the difficulty backfill all take
    await openRecipe(page, recipeId);

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
