import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, isPhone, line, openRecipe, touchGesture, useContentsMode, waitForTurn } from './helpers';

const API_HEADERS = { 'X-API-Key': 'test-api-key-for-playwright' };

/**
 * Empties the book, and proves it emptied. Page numbers and the footer counts
 * below are properties of the FULL list, so a book holding only this test's
 * recipes is a precondition rather than a convenience — it cannot be scoped
 * away, only guaranteed.
 *
 * The DELETE fails transiently often enough to matter: the e2e server runs a
 * 5-connection pool over one shared-cache in-memory SQLite, and every
 * POST /api/recipes spawns background auto-tag and auto-difficulty writes that
 * hold transactions on the row for ~50ms afterwards. So retry, and assert the
 * result. The previous version discarded every response, and one swallowed 500
 * anywhere in the suite left a stray recipe for a later exact count to trip on.
 *
 * TODO: three spec files carry a copy of this; fold them into helpers.ts.
 */
async function clearRecipes(page: Page) {
  let titles: string[] = [];
  // Three sweeps, then one final read, so the last sweep is checked too.
  for (let attempt = 0; attempt < 4; attempt++) {
    const list = await page.request.get('/api/recipes', { headers: API_HEADERS });
    expect(list.ok(), `GET /api/recipes -> ${list.status()}`).toBeTruthy();
    const remaining: Array<{ id: string; title: string }> = await list.json();
    titles = remaining.map(r => r.title);
    if (remaining.length === 0) return;
    if (attempt === 3) break;
    for (const r of remaining) {
      const res = await page.request.delete(`/api/recipes/${r.id}`, { headers: API_HEADERS });
      // 404 means someone else already removed it, which is still "gone"
      if (!res.ok() && res.status() !== 404) {
        console.warn(`DELETE /api/recipes/${r.id} (${r.title}) -> ${res.status()} ${await res.text()}`);
      }
    }
  }
  expect(titles, 'clearRecipes could not empty the book').toEqual([]);
}

async function openBook(page: Page) {
  await page.reload();
  await expect(page.locator('.index-title')).toBeVisible();
}

/**
 * Two mains and one sweet, alphabetical: Apple Crumble (dessert), Beef Stew
 * (main), Chicken Pie (main). Tags are explicit, so the mock auto-tagger never
 * runs and the filters are deterministic.
 */
async function seedTagged(page: Page, suffix: string) {
  const apple = await createRecipe(page, { title: `Apple Crumble ${suffix}`, ingredients: [], steps: [], tags: ['dessert'] });
  const beef = await createRecipe(page, { title: `Beef Stew ${suffix}`, ingredients: [], steps: [], tags: ['main'] });
  const chicken = await createRecipe(page, { title: `Chicken Pie ${suffix}`, ingredients: [], steps: [], tags: ['main'] });
  return { apple, beef, chicken };
}

function entry(page: Page, recipeId: string) {
  return page.locator(`.index-recipe-item[data-recipe-id="${recipeId}"]`);
}

/**
 * The rows this test seeded, matched by the unique suffix in their titles.
 * Scoping by it keeps the counts exact without them also standing in for
 * "nobody else left a recipe behind" — clearRecipes says that separately.
 */
function seeded(page: Page, suffix: string, within = '') {
  return page.locator(`${within} .index-recipe-item`.trim()).filter({ hasText: suffix });
}

/** Selects a tab and waits for the strip to adopt it. */
async function selectFilter(page: Page, tab: 'all' | 'mains' | 'sweets' | 'meals') {
  await page.locator(`.contents-tab-${tab}`).click();
  await expect(page.locator(`.contents-tab-${tab}`)).toHaveAttribute('aria-pressed', 'true');
}

test.describe('Contents filter tabs', () => {
  test.beforeEach(async ({ page }) => {
    await clearRecipes(page);
    await authenticate(page);
  });

  test('the strip renders with All active, Meals hidden and the specified colours', async ({ page }) => {
    await seedTagged(page, Date.now().toString());
    await openBook(page);

    await expect(page.locator('.contents-tabs')).toHaveAttribute('aria-label', 'Contents filter');
    // Four filters. The strip also holds the three spread tabs, which wear the
    // same paper-tab face but carry data-mode instead of data-filter. Contents
    // and Cook are on screen only while a recipe is open; Notes joins the
    // filters here, as the way into the book-level thread (spread-modes.spec.ts).
    await expect(page.locator('.contents-tab[data-filter]')).toHaveCount(4);
    await expect(page.locator('.contents-tab[data-mode]')).toHaveCount(3);
    await expect(page.locator('.spread-tab')).toHaveCount(3);
    for (const mode of ['contents', 'cook']) {
      await expect(page.locator(`.spread-tab[data-mode="${mode}"]`)).toBeHidden();
    }
    // The whole strip is a desktop affordance: the phone has its own paper tabs
    // and no spread to put a mode on, so .spread-tab is display:none there.
    if (!isPhone(page)) {
      await expect(page.locator('.spread-tab[data-mode="notes"]')).toBeVisible();
    }
    await expect(page.locator('.contents-tab-all')).toHaveText('All');
    await expect(page.locator('.contents-tab-mains')).toBeVisible();
    await expect(page.locator('.contents-tab-sweets')).toBeVisible();

    // Meals waits on meal-plan persistence (RV-107)
    await expect(page.locator('.contents-tab-meals')).toBeHidden();

    await expect(page.locator('.contents-tab-all')).toHaveClass(/is-active/);
    await expect(page.locator('.contents-tab-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.contents-tab-mains')).toHaveAttribute('aria-pressed', 'false');

    // Leather All, tan Mains with dark ink for contrast, accent-brown Sweets
    const face = (selector: string) =>
      page.locator(selector).evaluate(el => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, color: s.color };
      });
    expect((await face('.contents-tab-all')).background).toBe('rgb(139, 45, 26)');
    expect(await face('.contents-tab-mains')).toEqual({ background: 'rgb(201, 168, 108)', color: 'rgb(45, 36, 24)' });
    expect((await face('.contents-tab-sweets')).background).toBe('rgb(107, 68, 35)');

    // The section tabs on the right page are a different strip and untouched:
    // its role="tab" buttons are there, none of them here. Two of them now —
    // Notes left that strip when it became a spread mode.
    await expect(page.locator('.edge-tabs[role="tablist"] .edge-tab[role="tab"]')).toHaveCount(2);
    await expect(page.locator('.contents-tab[role="tab"]')).toHaveCount(0);
  });

  test('Mains lists only main-tagged recipes and counts them in the footer', async ({ page }) => {
    const suffix = Date.now().toString();
    const { apple, beef, chicken } = await seedTagged(page, suffix);
    await openBook(page);

    await selectFilter(page, 'mains');
    await expect(page.locator('.contents-tab-all')).toHaveAttribute('aria-pressed', 'false');

    await expect(seeded(page, suffix)).toHaveCount(2);
    await expect(page.locator('.index-recipe-item')).toHaveCount(2);
    await expect(entry(page, beef)).toHaveCount(1);
    await expect(entry(page, chicken)).toHaveCount(1);
    await expect(entry(page, apple)).toHaveCount(0);

    // The footer counts the whole book, so it stays absolute — clearRecipes is
    // what licenses that here and in the footer assertions below.
    await expect(page.locator('.index-footer').first()).toContainText('2 mains');
  });

  test('Sweets lists only desserts, in the singular', async ({ page }) => {
    const suffix = Date.now().toString();
    const { apple, beef } = await seedTagged(page, suffix);
    await openBook(page);

    await selectFilter(page, 'sweets');

    await expect(seeded(page, suffix)).toHaveCount(1);
    await expect(page.locator('.index-recipe-item')).toHaveCount(1);
    await expect(entry(page, apple)).toHaveCount(1);
    await expect(entry(page, beef)).toHaveCount(0);

    await expect(page.locator('.index-footer').first()).toContainText('1 sweet');
  });

  test('the A-Z strip only enables letters present in the filtered list', async ({ page }) => {
    await seedTagged(page, Date.now().toString());
    await openBook(page);

    // All: A, B and C are reachable
    for (const letter of ['A', 'B', 'C']) {
      await expect(page.locator(`.index-alpha-letter[data-letter="${letter}"]`)).toBeEnabled();
    }

    await selectFilter(page, 'mains');
    await expect(page.locator('.index-alpha-letter[data-letter="A"]')).toBeDisabled();
    await expect(page.locator('.index-alpha-letter[data-letter="B"]')).toBeEnabled();
    await expect(page.locator('.index-alpha-letter[data-letter="C"]')).toBeEnabled();

    await selectFilter(page, 'sweets');
    await expect(page.locator('.index-alpha-letter[data-letter="A"]')).toBeEnabled();
    await expect(page.locator('.index-alpha-letter[data-letter="B"]')).toBeDisabled();
    await expect(page.locator('.index-alpha-letter[data-letter="C"]')).toBeDisabled();
  });

  test('a filter that matches nothing shows a message, a dead strip and a zero footer', async ({ page }) => {
    const suffix = Date.now().toString();
    await createRecipe(page, { title: `Apple Crumble ${suffix}`, ingredients: [], steps: [], tags: ['dessert'] });
    await openBook(page);

    await selectFilter(page, 'mains');

    await expect(page.locator('.index-empty')).toHaveText('No mains yet. Ask me to tag a recipe as a main course.');
    await expect(seeded(page, suffix)).toHaveCount(0);
    await expect(page.locator('.index-recipe-item')).toHaveCount(0);
    await expect(page.locator('.index-footer')).toHaveText('0 mains');

    // Every letter is disabled, none is left clickable
    await expect(page.locator('.index-alpha-letter')).toHaveCount(26);
    await expect(page.locator('.index-alpha-letter:not([disabled])')).toHaveCount(0);

    // The title survives, so the reader still knows where they are
    await expect(page.locator('.index-title')).toBeVisible();
  });

  test('page numbers stay the same on every tab', async ({ page }) => {
    const { apple, beef, chicken } = await seedTagged(page, Date.now().toString());
    await openBook(page);

    // p. 3 / 5 / 7 are positions in the FULL alphabetical list, so they hold
    // only while the seeded trio is the whole book — an enforced precondition
    // (the beforeEach sweep), not luck.
    await expect(entry(page, apple).locator('.index-page-number')).toHaveText('p. 3');
    await expect(entry(page, beef).locator('.index-page-number')).toHaveText('p. 5');
    await expect(entry(page, chicken).locator('.index-page-number')).toHaveText('p. 7');

    // Beef and Chicken are 2nd and 3rd in the FULL list, not 1st and 2nd of the filter
    await selectFilter(page, 'mains');
    await expect(entry(page, beef).locator('.index-page-number')).toHaveText('p. 5');
    await expect(entry(page, beef)).toHaveAttribute('data-page', '5');
    await expect(entry(page, chicken).locator('.index-page-number')).toHaveText('p. 7');

    await selectFilter(page, 'sweets');
    await expect(entry(page, apple).locator('.index-page-number')).toHaveText('p. 3');
  });

  test('the forward arrow ignores the filter and opens the first recipe of the full list', async ({ page }) => {
    const suffix = Date.now().toString();
    await seedTagged(page, suffix);
    await openBook(page);

    await selectFilter(page, 'mains');
    await expect(seeded(page, suffix)).toHaveCount(2);
    await expect(page.locator('.index-recipe-item')).toHaveCount(2);

    // Apple Crumble is a dessert and not on this tab, but it is still page 3 —
    // and it is first in the book because the beforeEach sweep emptied it
    // The phone's chevrons are hidden on the contents, so turn with a swipe left there
    if (isPhone(page)) {
      const w = await page.evaluate(() => document.querySelector('.pages-container')!.getBoundingClientRect().width);
      await touchGesture(page, 320, 420, line(10, -0.45 * w, 0));
    } else {
      await page.locator('#page-next').click();
    }
    await expect(page.locator('.recipe-title')).toContainText(`Apple Crumble ${suffix}`);
  });

  test('the filter survives a reload but not a fresh browser session', async ({ page, browser, baseURL }) => {
    const suffix = Date.now().toString();
    await seedTagged(page, suffix);
    await openBook(page);

    await selectFilter(page, 'sweets');
    expect(await page.evaluate(() => sessionStorage.getItem('rv-contents-filter'))).toBe('dessert');

    await openBook(page);
    await expect(page.locator('.contents-tab-sweets')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.contents-tab-sweets')).toHaveClass(/is-active/);
    await expect(page.locator('.contents-tab-all')).toHaveAttribute('aria-pressed', 'false');
    await expect(seeded(page, suffix)).toHaveCount(1);
    await expect(page.locator('.index-recipe-item')).toHaveCount(1);

    // A new context is a new session: the book opens on All again
    const context = await browser.newContext({ baseURL });
    const fresh = await context.newPage();
    await authenticate(fresh);
    await expect(fresh.locator('.index-title')).toBeVisible();
    await expect(fresh.locator('.contents-tab-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(seeded(fresh, suffix)).toHaveCount(3);
    await expect(fresh.locator('.index-recipe-item')).toHaveCount(3);
    await context.close();
  });

  test('an unknown stored filter falls back to All', async ({ page }) => {
    const suffix = Date.now().toString();
    await seedTagged(page, suffix);
    await page.evaluate(() => sessionStorage.setItem('rv-contents-filter', 'puddings'));
    await openBook(page);

    await expect(page.locator('.contents-tab-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(seeded(page, suffix)).toHaveCount(3);
    await expect(page.locator('.index-recipe-item')).toHaveCount(3);
  });

  test('the remembered filter still applies while a recipe is open', async ({ page }) => {
    // The contents only stay on the left page beside a recipe above the phone breakpoint
    test.skip(isPhone(page), 'the phone shows one page at a time, so the contents are replaced');

    const suffix = Date.now().toString();
    const { apple, beef } = await seedTagged(page, suffix);
    await openBook(page);

    // The filter is chosen on the contents page: while a recipe is open the
    // strip offers the spread modes instead, and the filter is remembered
    // rather than re-selected (sessionStorage['rv-contents-filter']).
    await selectFilter(page, 'mains');

    await entry(page, beef).click();
    await expect(page.locator('.recipe-title')).toContainText('Beef Stew');

    // Contents mode brings them back beside the recipe, still filtered
    await useContentsMode(page);
    await expect(seeded(page, suffix, '#page-left-content')).toHaveCount(2);
    await expect(page.locator('#page-left-content .index-recipe-item')).toHaveCount(2);
    await expect(entry(page, apple)).toHaveCount(0);
    await expect(page.locator('.index-recipe-item.current')).toHaveAttribute('data-recipe-id', beef);

    // Back to the contents, change the filter, and open the same recipe again.
    // It is a main, so this filter does not list it and no row is highlighted —
    // and it cannot be opened from the contents either, which is why it is
    // opened the way display_recipe and the navigation arrows do.
    await page.locator('#recipe-book-header').click();
    await waitForTurn(page);
    await expect(page.locator('.index-title')).toBeVisible({ timeout: 10000 });
    await selectFilter(page, 'sweets');
    await expect(entry(page, beef)).toHaveCount(0);
    await openRecipe(page, beef);
    await expect(page.locator('#page-right-content .recipe-title')).toContainText('Beef Stew');
    await useContentsMode(page);
    await expect(seeded(page, suffix, '#page-left-content')).toHaveCount(1);
    await expect(page.locator('#page-left-content .index-recipe-item')).toHaveCount(1);
    await expect(page.locator('.index-recipe-item.current')).toHaveCount(0);
  });

  test('the phone renders the filters as a chip row under the contents title', async ({ page }) => {
    test.skip(!isPhone(page), 'the chip row only replaces the edge tabs at 600px and below');

    await seedTagged(page, Date.now().toString());
    await openBook(page);

    const all = (await page.locator('.contents-tab-all').boundingBox())!;
    const mains = (await page.locator('.contents-tab-mains').boundingBox())!;
    const title = (await page.locator('.index-title').boundingBox())!;
    const strip = (await page.locator('.index-alphabet-nav').boundingBox())!;

    // 44px tap targets, laid out as one horizontal row
    expect(all.height).toBeGreaterThanOrEqual(44);
    expect(mains.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(mains.y - all.y)).toBeLessThan(2);
    expect(mains.x).toBeGreaterThan(all.x);

    // Directly under the title, above the rest of the contents
    expect(all.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
    expect(all.y).toBeLessThan(strip.y);
  });

  test('body[data-feature-meals] reveals the Meals tab, which has nothing to list', async ({ page }) => {
    await seedTagged(page, Date.now().toString());
    await openBook(page);

    await expect(page.locator('.contents-tab-meals')).toBeHidden();
    await page.evaluate(() => { document.body.dataset.featureMeals = ''; });
    await expect(page.locator('.contents-tab-meals')).toBeVisible();

    // It sits after Sweets in the strip
    const order = await page.locator('.contents-tabs').evaluate(el =>
      Array.from(el.querySelectorAll('.contents-tab[data-filter]')).map(b => (b as HTMLElement).dataset.filter)
    );
    expect(order).toEqual(['all', 'main', 'dessert', 'meals']);

    await selectFilter(page, 'meals');
    await expect(page.locator('.index-empty')).toHaveText('No meal plans yet');
    await expect(page.locator('.index-footer')).toHaveText('0 meal plans');
  });
});

test.describe('Recipe tag chips', () => {
  test.beforeEach(async ({ page }) => {
    // Sweep even though nothing here counts rows: without it this test leaks
    // Tagged Recipe straight into whichever spec file runs next.
    await clearRecipes(page);
    await authenticate(page);
  });

  test('the meta line shows at most three tags after the difficulty dots', async ({ page }) => {
    const suffix = Date.now().toString();
    const recipeId = await createRecipe(page, {
      title: `Tagged Recipe ${suffix}`,
      ingredients: [],
      steps: [],
      cook_time_minutes: 20,
      difficulty: 2,
      tags: ['main', 'thai', 'vegetarian', 'quick'],
    });

    await page.evaluate((id) => {
      // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
      fetchAndDisplayRecipe(id);
    }, recipeId);
    await expect(page.locator('.recipe-title')).toContainText('Tagged Recipe');

    const chips = page.locator('.recipe-meta-line .recipe-tag');
    await expect(chips).toHaveCount(3);
    await expect(chips.nth(0)).toHaveText('main');

    // The chips follow the difficulty dots on the same line
    const after = await page.locator('.recipe-meta-line').evaluate(el => {
      const dots = el.querySelector('.meta-difficulty');
      const tags = el.querySelector('.recipe-tags');
      return dots && tags ? dots.compareDocumentPosition(tags) : 0;
    });
    expect(after & 4).toBe(4); // Node.DOCUMENT_POSITION_FOLLOWING

    // ...and share and add-photo end the line, after the chips
    const tail = await page.locator('.recipe-meta-line').evaluate(el => {
      const kids = Array.from(el.children);
      return {
        last: kids.slice(-2).map(c => c.className),
        tagsFirst: kids.indexOf(el.querySelector('.recipe-tags')!) < kids.indexOf(el.querySelector('.share-btn')!),
      };
    });
    expect(tail).toEqual({ last: ['share-btn', 'add-photo-btn'], tagsFirst: true });
  });
});
