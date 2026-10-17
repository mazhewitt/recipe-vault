import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, expectHitArea, threadEntries, isTablet, paceChat, useContentsMode } from './helpers';

/**
 * These cover the reply sticky (#page-margin) of the wide layout, where it sits
 * at the foot of the left page directly above the slip. The phone's sticky,
 * above the input bar, is asserted in reply-sticky.spec.ts.
 */
function skipOnPhone(page: Page) {
  test.skip(page.viewportSize()!.width <= 600, 'the sticky sits above the slip on the left page only above 600px');
}

/** The sticky's bottom edge is 0-8px above the slip, and it lies inside the left page. */
async function expectAboveTheSlip(page: Page) {
  const g = await page.evaluate(() => {
    const r = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
    return { sticky: r('#page-margin'), input: r('#note-input'), left: r('#page-left'), right: r('#page-right') };
  });
  expect(g.input.top - g.sticky.bottom).toBeGreaterThanOrEqual(-0.5);
  expect(g.input.top - g.sticky.bottom).toBeLessThanOrEqual(8.5);
  expect(g.sticky.left).toBeGreaterThanOrEqual(g.left.left - 0.5);
  expect(g.sticky.right).toBeLessThanOrEqual(g.left.right + 0.5);
  expect(g.sticky.right).toBeLessThanOrEqual(g.right.left + 0.5);
}

async function openRecipe(page: Page, recipeId: string) {
  await page.evaluate((id) => {
    // @ts-ignore - fetchAndDisplayRecipe is exposed by app.js
    fetchAndDisplayRecipe(id);
  }, recipeId);
  await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 10000 });
}

async function send(page: Page, text: string) {
  await page.locator('#message-input').fill(text);
  await page.locator('#message-input').press('Enter');
}

test.describe('Margin notes', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('reply renders on the sticky above the slip with a recipe open', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createRecipe(page, {
      title: `Margin Recipe ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      servings: 4,
    });
    await openRecipe(page, recipeId);

    await send(page, 'hello there');

    const reply = page.locator('#page-margin .margin-note[data-kind="reply"]');
    await expect(reply).toHaveCount(1, { timeout: 10000 });
    await expect(reply.first()).toBeVisible();
    await expect(reply.first()).toContainText('mock assistant');
    await expectAboveTheSlip(page);
  });

  test('four replies leave one note on the sticky', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createRecipe(page, {
      title: `Margin Cap ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      servings: 4,
    });
    await openRecipe(page, recipeId);

    for (let i = 1; i <= 4; i++) {
      await send(page, `hello number ${i}`);
      // Each turn's reply must land before the next message is sent
      await expect
        .poll(async () => (await threadEntries(page)).filter(n => n.kind === 'reply').length,
              { timeout: 10000 })
        .toBe(i);
    }

    // The sticky shows only the latest reply...
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1);
    await expect(page.locator('#page-margin .margin-note')).toHaveAttribute('data-kind', 'reply');
    // ...while the store keeps every entry (4 user + 4 replies)
    const kinds = await page.evaluate(() =>
      // @ts-ignore - getMarginThread is exposed by app.js
      getMarginThread().map((n: { kind: string }) => n.kind)
    );
    expect(kinds.filter((k) => k === 'reply')).toHaveLength(4);
    expect(kinds.filter((k) => k === 'user')).toHaveLength(4);
  });

  test('reply on the contents page renders one sticky note', async ({ page }) => {
    skipOnPhone(page);
    await createRecipe(page, {
      title: `Sticky Recipe ${Date.now()}`,
      ingredients: [],
      steps: [],
    });
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    await send(page, 'hello contents');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('#send-button')).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10000 });
    await send(page, 'hello again');
    await expect.poll(async () => (await threadEntries(page)).filter(n => n.kind === 'reply').length,
      { timeout: 10000 }).toBe(2);

    const sticky = page.locator('#page-margin .margin-note');
    await expect(sticky).toHaveCount(1);
    await expect(sticky.first()).toBeVisible();
    await expect(sticky.first()).toContainText('mock assistant');
    // Above the slip on the left page, clear of the contents' second half
    await expectAboveTheSlip(page);

    // ...and dismissible
    await expectHitArea(page, '#page-margin .note-dismiss');
    await page.locator('#page-margin .note-dismiss').click();
    await expect(page.locator('#page-margin')).toBeHidden();
  });

  test('margin re-projects when the view mode changes', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createRecipe(page, {
      title: `View Mode Recipe ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      servings: 4,
    });
    await openRecipe(page, recipeId);

    // "list" makes the mock call a tool first; the tool leaves no line behind
    await send(page, 'list all recipes');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
      .toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1);
    const noteTexts = async () =>
      (await page.locator('#page-margin .margin-note').allTextContents()).map((t) => t.trim());
    const before = await noteTexts();
    expect(before.join(' ')).not.toContain('Using tool');

    // Turning back to the contents page leaves that reply behind: it was
    // written under the recipe, and the contents page shows the book thread
    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible();
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(0);

    // A note written here belongs to the book, and projects as the one sticky
    // (The mock's reply text depends on the conversation so far, so it is not asserted.)
    await send(page, 'hello contents');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('#send-button')).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10000 });
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1);

    // Opening the recipe again swaps in the recipe's own latest reply
    await openRecipe(page, recipeId);
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1);
    expect(await noteTexts()).toEqual(before);
  });

  test('an error on the contents page is shown as a sticky note', async ({ page }) => {
    skipOnPhone(page);
    await createRecipe(page, {
      title: `Error Sticky ${Date.now()}`,
      ingredients: [],
      steps: [],
    });
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: 'event: error\ndata: {"message":"Connection error. Please try again."}\n\n',
      });
    });
    await send(page, 'hello error');

    const sticky = page.locator('#page-margin .margin-note[data-kind="error"]');
    await expect(sticky).toHaveCount(1, { timeout: 10000 });
    await expect(sticky.first()).toContainText('Connection error');
    // In the leather red
    const colours = await sticky.first().evaluate((el) => {
      const probe = document.createElement('div');
      probe.style.color = 'var(--color-leather)';
      document.body.appendChild(probe);
      const leather = getComputedStyle(probe).color;
      probe.remove();
      return { note: getComputedStyle(el).color, leather };
    });
    expect(colours.note).toBe(colours.leather);
  });

  test('tablet: the reply sits on the sticky above the slip', async ({ page }) => {
    test.skip(!isTablet(page), 'the tablet band, above the 600px phone breakpoint');
    // Runs at the ipad project's own 810x1080 viewport rather than resizing
    const recipeId = await createRecipe(page, {
      title: `Tablet Recipe ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      // Long enough to overflow the page: the sticky must still sit above the
      // slip, not after the tail of the steps
      steps: Array.from({ length: 14 }, (_, i) => ({
        step_number: i + 1,
        instruction: `Step ${i + 1}: stir the mixture slowly and evenly until smooth`,
      })),
      servings: 4,
    });
    await openRecipe(page, recipeId);

    await send(page, 'hello tablet');
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1, { timeout: 10000 });
    await expectAboveTheSlip(page);

    // The same in contents mode: there is no margin column to collapse any more
    await useContentsMode(page);
    await expect(page.locator('#page-margin')).toBeVisible();
    await expectAboveTheSlip(page);
  });

  // One chunk and then end of stream, with no `done` event: what the browser
  // sees when the connection drops mid-reply.
  async function routeInterruptedStream(page: Page, text: string) {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: `event: chunk\ndata: {"text":"${text}"}\n\n`,
      });
    });
  }

  test('an interrupted stream leaves a streaming note and does not eat the next reply', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createRecipe(page, {
      title: `Interrupted Recipe ${Date.now()}`,
      ingredients: [],
      steps: [],
    });
    await openRecipe(page, recipeId);

    await routeInterruptedStream(page, 'half a reply');
    await send(page, 'hello interrupted');
    const streaming = page.locator('#page-margin .margin-note.streaming');
    await expect(streaming).toHaveCount(1, { timeout: 10000 });
    await expect(streaming.first()).toContainText('half a reply');
    // The live region is busy while the note grows, so it is announced once
    await expect(page.locator('#page-margin')).toHaveAttribute('aria-busy', 'true');

    // The next turn must start its own note rather than overwrite the partial one
    await page.unroute('**/api/chat');
    await send(page, 'hello again');
    const replies = page.locator('#page-margin .margin-note[data-kind="reply"]');
    await expect(replies).toContainText('mock assistant', { timeout: 10000 });
    await expect(replies).toHaveCount(1);
    await expect(page.locator('#page-margin .margin-note.streaming')).toHaveCount(0);
    await expect(page.locator('#page-margin')).toHaveAttribute('aria-busy', 'false');
    // ...and the partial reply is still in the thread, intact
    const stored = (await threadEntries(page)).filter(n => n.kind === 'reply').map(n => n.text);
    expect(stored).toHaveLength(2);
    expect(stored[0]).toBe('half a reply');
  });

  test('a streaming sticky on the contents page carries the streaming state', async ({ page }) => {
    skipOnPhone(page);
    await createRecipe(page, {
      title: `Sticky Streaming ${Date.now()}`,
      ingredients: [],
      steps: [],
    });
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    await routeInterruptedStream(page, 'still writing');
    await send(page, 'hello sticky');

    const sticky = page.locator('#page-margin .margin-note');
    await expect(sticky).toHaveCount(1, { timeout: 10000 });
    await expect(sticky).toHaveClass(/streaming/);

    // A completed turn clears the streaming state on the sticky
    await page.unroute('**/api/chat');
    await send(page, 'hello done');
    await expect(page.locator('#page-margin .margin-note')).toContainText('mock assistant', { timeout: 10000 });
    await expect(page.locator('#page-margin .margin-note')).not.toHaveClass(/streaming/);
  });

  test('tool_use shows a cook-language in-flight line and stores nothing', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createRecipe(page, {
      title: `Status Recipe ${Date.now()}`,
      ingredients: [],
      steps: [],
    });
    await openRecipe(page, recipeId);

    // "list" makes the mock call the list_recipes tool before replying; the
    // stream is paced so the in-flight line can be read between its events
    await paceChat(page, 700);
    await send(page, 'list all recipes');

    const status = page.locator('#page-margin .margin-note[data-kind="status"]');
    await expect(status).toHaveText('Looking through the book…', { timeout: 10000 });
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1);
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toBeVisible({ timeout: 10000 });
    await expect(status).toHaveCount(0);
    expect((await threadEntries(page)).map(n => n.kind)).toEqual(['user', 'reply']);
  });

  test('halving a recipe re-renders the page and adds a one-line note', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createRecipe(page, {
      title: `Halve Recipe ${Date.now()}`,
      description: 'Serves four',
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      servings: 4,
      // Set so the recipe needs no difficulty assessment: without it the page
      // would refresh anyway 3s later and hide a broken recipe_artifact path.
      difficulty: 3,
    } as Parameters<typeof createRecipe>[1]);
    await openRecipe(page, recipeId);
    await expect(page.locator('.meta-serves')).toHaveText('serves 4');

    // Count re-fetches of this recipe triggered after the message is sent
    let fetches = 0;
    await page.route(`**/api/recipes/${recipeId}`, async (route) => {
      fetches++;
      await route.continue();
    });

    // The re-render is in place: record any skeleton it inserts, and the
    // right page's scroll (the method is short, so the scroll is whatever the
    // page allows - zero is still a place to keep)
    await page.evaluate(() => {
      const w = window as unknown as { __skeletons: number };
      w.__skeletons = 0;
      new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {
        if (n instanceof Element && (n.matches('.skeleton') || n.querySelector('.skeleton'))) w.__skeletons++;
      }))).observe(document.getElementById('page-right-content')!, { childList: true, subtree: true });
    });
    const scrollBefore = await page.locator('#page-right').evaluate(el => el.scrollTop);

    // The mock LLM answers "halve" with an update_recipe call; the backend then
    // emits a recipe_artifact and the page re-fetches the edited recipe.
    await send(page, 'halve this recipe');

    // Under the 3s difficulty-refresh delay, so only the artifact path can do this
    await expect(page.locator('.meta-serves')).toHaveText('serves 2', { timeout: 2500 });
    expect(fetches).toBeGreaterThanOrEqual(1);
    // ...without a skeleton, and without moving the page
    expect(await page.evaluate(() => (window as unknown as { __skeletons: number }).__skeletons)).toBe(0);
    expect(Math.abs(await page.locator('#page-right').evaluate(el => el.scrollTop) - scrollBefore)).toBeLessThanOrEqual(1);

    const reply = page.locator('#page-margin .margin-note[data-kind="reply"]');
    await expect(reply).toHaveCount(1);
    await expect(reply.first()).toContainText('serves 2 now');
  });

  test('a streaming reply\'s element is reused across chunks, so its fade-in plays once', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createRecipe(page, {
      title: `Fade Recipe ${Date.now()}`,
      ingredients: [],
      steps: [],
    });
    await openRecipe(page, recipeId);
    // Driven through the module directly: the mock LLM delivers a reply in one
    // chunk, so a real turn cannot show whether a second chunk restarts the
    // 200ms fade of the note that is already on the sticky.
    const timings = await page.evaluate(async (id) => {
      const M = await import('/static/margin-notes.js');
      const margin = document.getElementById('page-margin')!;
      // Stamped with the open recipe, as a real turn would: the sticky shows
      // that recipe's notes and nothing else
      M.updateStreamingNote('a streaming reply', id);
      const streaming = margin.querySelector('.margin-note') as HTMLElement;

      const at = (el: HTMLElement) => {
        const a = el.getAnimations().find(x => (x as CSSAnimation).animationName === 'marginNoteIn');
        return a ? Number(a.currentTime) : null;
      };
      await new Promise(r => setTimeout(r, 80));
      const before = at(streaming);

      // A further chunk re-renders the sticky
      M.updateStreamingNote('a streaming reply, continued', id);
      const after = at(streaming);
      const same = streaming === margin.querySelector('.margin-note');
      M.finalizeStreamingNote();
      return { before, after, same };
    }, recipeId);

    // The node is reused...
    expect(timings.same).toBe(true);
    // ...and its running fade-in is not cancelled and restarted
    expect(timings.before).toBeGreaterThan(0);
    expect(timings.after).toBeGreaterThanOrEqual(timings.before!);
  });

  test('duplicate recipe_artifact ids in one turn fetch the recipe once', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createRecipe(page, {
      title: `Duplicate Artifact ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      servings: 4,
      // Assessed already, so no 3s difficulty refresh adds a fetch
      difficulty: 3,
    } as Parameters<typeof createRecipe>[1]);

    let fetches = 0;
    await page.route(`**/api/recipes/${recipeId}`, async (route) => {
      fetches++;
      await route.continue();
    });
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body:
          `event: recipe_artifact\ndata: {"recipe_id":"${recipeId}"}\n\n` +
          `event: recipe_artifact\ndata: {"recipe_id":"${recipeId}"}\n\n` +
          'event: done\ndata: {"conversation_id":"dup-turn"}\n\n',
      });
    });

    await send(page, 'show me that recipe');
    await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 10000 });
    // Long enough for a second fetch (and its page turn) to have happened
    await page.waitForTimeout(1500);
    expect(fetches).toBe(1);
  });

  test('the reply sticky keeps its box through a page turn', async ({ page }) => {
    // page-transitions.js takes the overlay path above 600px, tablet included
    skipOnPhone(page);
    await createRecipe(page, {
      title: `Turn Recipe ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      servings: 4,
    });
    const listed = await (await page.request.get('/api/recipes', {
      headers: { 'X-API-Key': 'test-api-key-for-playwright' },
    })).json();
    const recipes = Array.isArray(listed) ? listed : listed.recipes;
    expect(recipes.length).toBeGreaterThan(1);
    await page.reload();
    await openRecipe(page, recipes[0].id);

    // A reply belongs to the recipe it was written under, so turning the page
    // would take it away. The in-flight line belongs to no page: it stays on the
    // sticky whichever page is displayed, so a turn taken mid-turn is where the
    // sticky has to hold still. Paced so the line stays up through the turn.
    await paceChat(page, 3000);
    await send(page, 'hello turn');
    await expect(page.locator('#page-margin .margin-note[data-kind="status"]')).toHaveText('Thinking…');
    const before = (await page.locator('#page-margin').boundingBox())!;
    expect(before.width).toBeGreaterThan(0);

    // Sample the sticky on every frame of the page turn, and the overlay as it
    // appears: the sticky must not move, and the overlay (which carries the
    // right page) must never cover it.
    const seen = await page.evaluate(() => new Promise<{
      boxes: Array<{ x: number; y: number; width: number; height: number }>;
      overlay: { left: number; right: number; top: number; bottom: number } | null;
    }>((resolve) => {
      const margin = document.getElementById('page-margin')!;
      const container = document.querySelector('.pages-container')!;
      const boxes: Array<{ x: number; y: number; width: number; height: number }> = [];
      let overlay: { left: number; right: number; top: number; bottom: number } | null = null;
      const start = performance.now();
      const sample = () => {
        const el = container.querySelector('.page-turn-overlay');
        if (el && !overlay) {
          const o = el.getBoundingClientRect();
          overlay = { left: o.left, right: o.right, top: o.top, bottom: o.bottom };
        }
        const r = margin.getBoundingClientRect();
        boxes.push({ x: r.x, y: r.y, width: r.width, height: r.height });
        if (performance.now() - start < 1500) requestAnimationFrame(sample);
        else resolve({ boxes, overlay });
      };
      requestAnimationFrame(sample);
      // @ts-ignore - loadNextRecipe is exposed by app.js
      loadNextRecipe();
    }));

    expect(seen.overlay, 'a page-turn overlay appeared').not.toBeNull();
    // Shown on every frame of the turn, so the box checks below are not vacuous
    expect(seen.boxes.length).toBeGreaterThan(10);
    for (const b of seen.boxes) {
      expect(Math.abs(b.x - before.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(b.y - before.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(b.width - before.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(b.height - before.height)).toBeLessThanOrEqual(1);
    }
    const o = seen.overlay!;
    const intersects = o.left < before.x + before.width - 1 && o.right > before.x + 1
      && o.top < before.y + before.height - 1 && o.bottom > before.y + 1;
    expect(intersects, 'the page-turn overlay covers the sticky').toBe(false);
  });

  test('a contents-to-recipe turn does not pin the right page to a full height', async ({ page }) => {
    // The height lock exists for the tablet band only, and the CSS it compensates
    // for (static/styles.css:1866-1882) is scoped to the recipe/meal view modes.
    // A turn that STARTS in index mode must therefore not lock: there
    // #page-right-content is still `.page-content { height: 100% }`, so a pinned
    // min-height would hold #page-margin at the bottom of a full-height box for
    // the whole turn and then snap it up.
    test.skip(!isTablet(page), 'the height lock only fires in the tablet band');
    await createRecipe(page, {
      title: `Contents Turn ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      servings: 4,
    });
    await page.reload();
    // Start on the contents page, not on a recipe
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');
    const row = page.locator('.index-recipe-item').first();
    await expect(row).toBeVisible();

    // Sample the inline min-height across the whole turn: the lock sets it on
    // #page-right-content and clears it again on unlock, so a single read after
    // the fact would miss it.
    const pinned: string[] = await page.evaluate(() => new Promise<string[]>((resolve) => {
      const content = document.getElementById('page-right-content')!;
      const seen: string[] = [];
      const start = performance.now();
      const sample = () => {
        const v = content.style.minHeight;
        if (v && !seen.includes(v)) seen.push(v);
        if (performance.now() - start < 1200) requestAnimationFrame(sample);
        else resolve(seen);
      };
      requestAnimationFrame(sample);
      (document.querySelector('.index-recipe-item') as HTMLElement).click();
    }));

    // The turn really happened (and landed on the recipe page)
    await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 10000 });
    expect(pinned, 'index-mode turn must not pin #page-right-content').toEqual([]);
  });
});
