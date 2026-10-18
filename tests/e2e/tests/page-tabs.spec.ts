import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, openRecipe, openTab, sendNote, isPhone, tabSelector,
         useContentsMode, openNotesView, notesThread } from './helpers';

/**
 * The Ingredients / Method / Notes tabs. One state, #page-right[data-tab], two
 * strips: paper tabs on the page's top edge on a phone, edge tabs on the book's
 * outer edge on wider viewports. CSS decides what the state means at each width:
 * the phone shows one panel at a time, the desktop scrolls one long page and
 * swaps the Notes panel in.
 */

async function createLongRecipe(page: Page, name: string): Promise<string> {
  return createRecipe(page, {
    title: `${name} ${Date.now()}`,
    ingredients: Array.from({ length: 20 }, (_, i) => ({
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

/** Recipe list in the order the page numbers are derived from. */
async function recipeList(page: Page): Promise<Array<{ id: string; title: string }>> {
  return page.evaluate(() =>
    // @ts-ignore - fetchRecipeList is exposed by app.js
    fetchRecipeList(true)
  );
}

/** The reply sticky's bottom edge is 0-8px above the note input's top edge. */
async function expectStickyAboveInput(page: Page): Promise<void> {
  const gap = await page.evaluate(() =>
    document.getElementById('note-input')!.getBoundingClientRect().top
      - document.getElementById('page-margin')!.getBoundingClientRect().bottom);
  expect(gap).toBeGreaterThanOrEqual(-0.5);
  expect(gap).toBeLessThanOrEqual(8.5);
}

async function isAnimating(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const M = await import('/static/page-transitions.js');
    return M.isAnimating();
  });
}

/**
 * Records what a tab switch does to the page: every opacity the crossfade sets
 * on #page-right-content, every .page-turn-overlay added to the document and
 * every data-nav-direction set on <html>. Install before the tap.
 */
async function watchTabAnimation(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    const log = { opacities: [] as string[], overlays: 0, navDirections: 0 };
    w.__tabAnimationLog = log;
    const content = document.getElementById('page-right-content')!;
    new MutationObserver(() => {
      const value = content.style.opacity;
      if (value !== '' && log.opacities[log.opacities.length - 1] !== value) log.opacities.push(value);
    }).observe(content, { attributes: true, attributeFilter: ['style'] });
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof Element && node.classList.contains('page-turn-overlay')) log.overlays++;
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(() => {
      if (document.documentElement.hasAttribute('data-nav-direction')) log.navDirections++;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-nav-direction'] });
  });
}

async function animationLog(page: Page): Promise<{ opacities: string[]; overlays: number; navDirections: number }> {
  return page.evaluate(() => (window as unknown as Record<string, unknown>).__tabAnimationLog as {
    opacities: string[]; overlays: number; navDirections: number;
  });
}

test.describe('Page tabs', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('phone: Method shows the steps and hides the ingredients', async ({ page }) => {
    test.skip(!isPhone(page), 'paper tabs are the phone layout');
    const recipeId = await createLongRecipe(page, 'Phone Tabs');
    await openRecipe(page, recipeId);

    const ingredients = page.locator('#page-right-content .ingredients-list');
    const steps = page.locator('#page-right-content .prep-list');

    await expect(ingredients).toBeVisible();
    await expect(ingredients).toContainText('ingredient number 1');
    await expect(steps).toBeHidden();

    await page.locator(tabSelector(page, 'method')).click();

    await expect(steps).toBeVisible();
    await expect(steps).toContainText('Step 1:');
    await expect(ingredients).toBeHidden();
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
    await expect(page.locator('.page-tab[data-tab="method"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.page-tab[data-tab="ingredients"]')).toHaveAttribute('aria-selected', 'false');

    // ...and back again. The phone crossfade holds the shared navigation lock
    // for 200ms, and a tap inside that window is ignored by design.
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);
    await page.locator(tabSelector(page, 'ingredients')).click();
    await expect(ingredients).toBeVisible();
    await expect(steps).toBeHidden();
  });

  test('phone: Notes shows the whole thread instead of the reply sticky', async ({ page }) => {
    test.skip(!isPhone(page), 'paper tabs are the phone layout');
    const recipeId = await createLongRecipe(page, 'Phone Notes');
    await openRecipe(page, recipeId);

    await sendNote(page, 'hello phone notes');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
      .toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('#page-margin')).toBeVisible();
    await expectStickyAboveInput(page);

    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);
    await page.locator(tabSelector(page, 'notes')).click();

    const thread = page.locator('#page-right-content .notes-thread');
    await expect(thread).toBeVisible();
    await expect(thread.locator('.thread-note[data-kind="user"]')).toHaveText('hello phone notes');
    await expect(thread.locator('.thread-note[data-kind="reply"]')).toContainText('mock assistant');
    // The panel replaces the recipe body, and the sticky does not double up
    await expect(page.locator('#page-right-content .ingredients-list')).toBeHidden();
    await expect(page.locator('#page-right-content .prep-list')).toBeHidden();
    await expect(page.locator('#page-margin')).toBeHidden();

    // Leaving the Notes tab brings the sticky back, above the input bar
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);
    await page.locator(tabSelector(page, 'method')).click();
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
    await expect(page.locator('#page-margin')).toBeVisible();
    await expectStickyAboveInput(page);
  });

  test('a tab tap during a page turn is ignored', async ({ page }) => {
    const recipeId = await createLongRecipe(page, 'Tab Lock');
    await openRecipe(page, recipeId);
    // Contents mode, where the right page holds both sections. Above 600px the
    // edge strip is inert ribbons, so the tap there is setActiveTab itself,
    // the call the delegated listener would make; the phone taps its paper tab.
    await useContentsMode(page);
    const tapMethod = async () => {
      if (isPhone(page)) {
        await page.locator(tabSelector(page, 'method')).dispatchEvent('click');
      } else {
        // @ts-ignore - setActiveTab is exposed by app.js
        await page.evaluate(() => { setActiveTab('method'); });
      }
    };
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'ingredients');

    // A real page turn, held open by a slow render so the tap lands inside it
    await page.evaluate(async () => {
      const M = await import('/static/page-transitions.js');
      // deliberately not awaited: the lock must still be held when we tap
      M.animatePageTurn('forward', () => new Promise(r => setTimeout(r, 1500)));
    });
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(true);

    // dispatchEvent, not click(): a view transition covers the page mid-turn,
    // but the delegated listener is the same one a tap would reach
    await tapMethod();

    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'ingredients');
    await expect(page.locator(tabSelector(page, 'method'))).not.toHaveClass(/active/);

    // Once the turn is over the very same tap works — so the assertion above is
    // about the lock, not about a tab that never worked
    await expect.poll(() => isAnimating(page), { timeout: 10000 }).toBe(false);
    await tapMethod();
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
  });

  test('phone: the footer shows the page number and turns the page', async ({ page }) => {
    test.skip(!isPhone(page), 'the phone footer is hidden above 600px');
    await createLongRecipe(page, 'AAA Footer');
    await createLongRecipe(page, 'ZZZ Footer');

    const list = await recipeList(page);
    expect(list.length).toBeGreaterThan(1);
    await openRecipe(page, list[0].id);

    const footer = page.locator('.phone-footer');
    await expect(footer).toBeVisible();
    // Cosmetic page number: the contents take p.1-2, then two pages per recipe
    await expect(page.locator('.footer-page')).toHaveText('p. 3');
    await expect(page.locator('#note-page-number')).toHaveText('p. 3');
    await expect(page.locator('.recipe-title')).toHaveText(list[0].title);

    await page.locator('.footer-next').click();

    await expect(page.locator('.recipe-title')).toHaveText(list[1].title, { timeout: 10000 });
    await expect(page.locator('.footer-page')).toHaveText('p. 5');
    await expect(page.locator('#note-page-number')).toHaveText('p. 5');

    // ...and back
    await page.locator('.footer-prev').click();
    await expect(page.locator('.recipe-title')).toHaveText(list[0].title, { timeout: 10000 });
    await expect(page.locator('.footer-page')).toHaveText('p. 3');
  });

  test('desktop: no section tabs, so nothing at the edge scrolls the page', async ({ page }) => {
    test.skip(isPhone(page), 'the wide layout');
    const recipeId = await createLongRecipe(page, 'Edge Ribbons');
    await openRecipe(page, recipeId);
    // Contents mode is where the old tabs used to scroll the right page between
    // its two section headers; nothing there may do it now
    await useContentsMode(page);

    const scrollTop = () => page.locator('#page-right').evaluate(el => el.scrollTop);
    // The page really does overflow, so a scroll would have somewhere to go
    const overflow = await page.locator('#page-right').evaluate(el => el.scrollHeight - el.clientHeight);
    expect(overflow).toBeGreaterThan(50);
    expect(await scrollTop()).toBe(0);

    // lighter-book removed the inert ribbons: no strip on the right edge
    await expect(page.locator('.edge-tabs, .edge-tab')).toHaveCount(0);
    const right = (await page.locator('#page-right').boundingBox())!;
    const tabBefore = await page.locator('#page-right').getAttribute('data-tab');
    for (const y of [70 + 46, 168 + 46]) {
      await page.mouse.click(right.x + right.width - 6, right.y + y);
      await page.waitForTimeout(600);
      expect(await scrollTop(), `a click at the right edge (${y}px down) scrolled the right page`).toBe(0);
      await expect(page.locator('#page-right')).toHaveAttribute('data-tab', tabBefore!);
    }
  });

  // The desktop Notes edge tab is gone: Notes is a left-page spread mode above
  // 600px, and the thread it shows is covered by spread-modes.spec.ts. The
  // value stays legal on #page-right[data-tab] for the phone, which is what the
  // cases below exercise.

  test('a re-render keeps the open tab and refills the thread', async ({ page }) => {
    const recipeId = await createLongRecipe(page, 'Tab Persist');
    await openRecipe(page, recipeId);

    await sendNote(page, 'hello persist');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
      .toHaveCount(1, { timeout: 10000 });

    await openNotesView(page);
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);
    // Above 600px the method stays on the right page beside the thread; scroll
    // it, so the refresh has a place to keep (the phone's Notes tab is short)
    const scrollBefore = await page.locator('#page-right').evaluate(el => {
      el.scrollTop = el.scrollHeight;
      return el.scrollTop;
    });
    if (!isPhone(page)) expect(scrollBefore).toBeGreaterThan(0);

    // A refresh of the recipe already on the page — the path a photo upload and
    // an AI update_recipe both take — must leave the reader where they were and
    // refill the thread: on the phone that is the Notes tab, above 600px it is
    // notes spread mode.
    await openRecipe(page, recipeId);
    await expect(page.locator('#page-right-content .tab-panel[data-tab="method"]')).toHaveCount(1);
    expect(Math.abs(await page.locator('#page-right').evaluate(el => el.scrollTop) - scrollBefore)).toBeLessThanOrEqual(1);

    if (isPhone(page)) {
      await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'notes');
    } else {
      await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'notes');
    }
    const thread = notesThread(page);
    await expect(thread.locator('.thread-note')).toHaveCount(2);
    await expect(thread.locator('.thread-note[data-kind="user"]')).toHaveText('hello persist');
  });

  test('a note written with Notes open lands in the thread as it arrives', async ({ page }) => {
    const recipeId = await createLongRecipe(page, 'Live Notes');
    await openRecipe(page, recipeId);

    await openNotesView(page);
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);

    const thread = notesThread(page);
    await expect(thread).toBeVisible();
    await expect(thread).toHaveAttribute('data-empty', 'true');

    // The Notes panel is the only surface on screen here (the reply sticky is
    // hidden beside the full thread), so it has to stay live without a tab switch
    await sendNote(page, 'live note');

    await expect(thread.locator('.thread-note[data-kind="user"]')).toHaveText('live note', { timeout: 10000 });
    await expect(thread.locator('.thread-note[data-kind="reply"]')).toContainText('mock assistant', { timeout: 15000 });
    await expect(thread).toBeVisible();
  });

  test('the contents sticky note survives a visit to the Notes tab', async ({ page }) => {
    const recipeId = await createLongRecipe(page, 'Sticky After Notes');
    await openRecipe(page, recipeId);
    await openNotesView(page);
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);

    // #page-right[data-tab] is not reset on the way back to the contents, so
    // anything keyed on it alone would still be hiding the sticky here
    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible({ timeout: 10000 });

    await sendNote(page, 'hello contents');

    const sticky = page.locator('#page-margin .margin-note[data-kind="reply"]');
    await expect(sticky).toHaveCount(1, { timeout: 15000 });
    await expect(sticky.first()).toBeVisible();
    await expect(sticky.first()).toContainText('mock assistant');
    await expectStickyAboveInput(page);
  });

  test('opening a different recipe resets the tab to Ingredients', async ({ page }) => {
    const first = await createLongRecipe(page, 'AAA Reset');
    await createLongRecipe(page, 'ZZZ Reset');

    const list = await recipeList(page);
    const other = list.find(r => r.id !== first)!;
    expect(other).toBeTruthy();

    await openRecipe(page, first);
    // Contents mode: the strip that carries the Method tab is hidden in cook mode
    await useContentsMode(page);
    // The phone taps its paper tab. Above 600px the edge strip is inert ribbons
    // and nothing offers the tab, so the state is set directly: the reset under
    // test belongs to opening a recipe, not to the strip.
    if (isPhone(page)) {
      await openTab(page, 'method');
    } else {
      await page.evaluate(() => {
        // @ts-ignore - setActiveTab is exposed by app.js
        setActiveTab('method', { force: true });
      });
      await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
    }
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);

    await openRecipe(page, other.id);
    await expect(page.locator('.recipe-title')).toHaveText(other.title, { timeout: 10000 });

    // Only this assertion separates the reset from chat.html's static markup:
    // the tab was demonstrably 'method' one line earlier
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'ingredients');
    // The paper tabs carry the selection
    await expect(page.locator('.page-tab[data-tab="ingredients"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.page-tab[data-tab="method"]')).toHaveAttribute('aria-selected', 'false');
    // ...and the new recipe opens in cook mode, so above 600px the ingredients
    // are on the left page rather than the right
    const ingredientsPage = isPhone(page) ? '#page-right-content' : '#page-left-content';
    await expect(page.locator(`${ingredientsPage} .ingredients-list`)).toBeVisible();
  });

  test('phone: the tab switch crossfades without an overlay or a nav direction', async ({ page }) => {
    test.skip(!isPhone(page), 'the crossfade is the phone tab switch');
    const recipeId = await createLongRecipe(page, 'Crossfade');
    await openRecipe(page, recipeId);
    await watchTabAnimation(page);

    await page.locator(tabSelector(page, 'method')).click();
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
    await expect.poll(() => isAnimating(page), { timeout: 5000 }).toBe(false);

    const log = await animationLog(page);
    // It faded: the panel went to opacity 0 and back
    expect(log.opacities).toContain('0');
    // ...as a crossfade, not a page turn
    expect(log.overlays).toBe(0);
    expect(log.navDirections).toBe(0);
    expect(await page.evaluate(() =>
      document.getElementById('page-right-content')!.style.opacity)).toBe('');
  });

  test('phone: reduced motion switches the tab without a fade', async ({ page }) => {
    test.skip(!isPhone(page), 'the crossfade is the phone tab switch');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const recipeId = await createLongRecipe(page, 'Reduced Motion');
    await openRecipe(page, recipeId);
    await watchTabAnimation(page);

    await page.locator(tabSelector(page, 'method')).click();

    // Applied on the spot: no fade-out step, and the lock is already free
    await expect(page.locator('#page-right-content .prep-list')).toBeVisible();
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
    const log = await animationLog(page);
    expect(log.opacities).toEqual([]);
    expect(log.overlays).toBe(0);
    expect(log.navDirections).toBe(0);
  });
});

/**
 * Per-tab scroll on the phone: #page-right is the element that scrolls the
 * phone page, and each tab keeps its own position on it.
 */
test.describe('Phone tab scroll positions', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  const scrollTop = (page: Page) => page.locator('#page-right').evaluate(el => el.scrollTop);
  const scrollTo = (page: Page, top: number) =>
    page.locator('#page-right').evaluate((el, t) => { el.scrollTop = t; }, top);

  /** Switches tab and waits for the crossfade's lock to clear. */
  async function switchTab(page: Page, tab: 'ingredients' | 'method' | 'notes') {
    await openTab(page, tab);
    await expect.poll(() => isAnimating(page)).toBe(false);
  }

  test('phone: a round trip through Ingredients keeps the place in the method', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only: one tab panel at a time');
    await openRecipe(page, await createLongRecipe(page, 'Round Trip'));
    await switchTab(page, 'method');
    await page.locator('#page-right-content .prep-step[data-step="7"]').scrollIntoViewIfNeeded();
    await scrollTo(page, (await scrollTop(page)) + 150);
    const step7 = page.locator('#page-right-content .prep-step[data-step="7"]');
    const before = { y: (await step7.boundingBox())!.y, top: await scrollTop(page) };
    expect(before.top).toBeGreaterThan(100);

    await switchTab(page, 'ingredients');
    await switchTab(page, 'method');

    expect(Math.abs((await step7.boundingBox())!.y - before.y)).toBeLessThanOrEqual(1);
    expect(Math.abs((await scrollTop(page)) - before.top)).toBeLessThanOrEqual(1);
  });

  test('phone: Ingredients and Method keep their own positions', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only: one tab panel at a time');
    await openRecipe(page, await createLongRecipe(page, 'Two Places'));
    await scrollTo(page, 120);
    await switchTab(page, 'method');
    await scrollTo(page, 400);
    await switchTab(page, 'ingredients');
    expect(Math.abs((await scrollTop(page)) - 120)).toBeLessThanOrEqual(1);
    await switchTab(page, 'method');
    expect(Math.abs((await scrollTop(page)) - 400)).toBeLessThanOrEqual(1);
  });

  test('phone: a newly opened recipe starts every tab at the top', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only: one tab panel at a time');
    const first = await createLongRecipe(page, 'First Open');
    const second = await createLongRecipe(page, 'Second Open');
    await openRecipe(page, first);
    await scrollTo(page, 200);
    await switchTab(page, 'method');
    await scrollTo(page, 400);

    await openRecipe(page, second);
    await expect(page.locator('#page-right-content .recipe-title')).toContainText('Second Open');
    await expect.poll(() => isAnimating(page)).toBe(false);
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'ingredients');
    expect(await scrollTop(page)).toBe(0);
    await switchTab(page, 'method');
    expect(await scrollTop(page)).toBe(0);
  });
});
