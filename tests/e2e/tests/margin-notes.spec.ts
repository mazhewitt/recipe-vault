import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, threadEntries } from './helpers';

/**
 * These cover the margin column of the wide layout: the phone stacks the margin
 * under the active panel and hides it entirely on the Notes tab, so the geometry
 * and the sticky-note projection are asserted on the wider projects only.
 */
function skipOnPhone(page: Page) {
  test.skip(page.viewportSize()!.width <= 600, 'the margin is a column only above 600px');
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

  test('reply renders as a margin note with a recipe open', async ({ page }) => {
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
  });

  test('four replies leave three notes visible', async ({ page }) => {
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

    // The margin shows only the three most recent notes...
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(3);
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
    await send(page, 'hello again');

    const sticky = page.locator('#page-margin .sticky-note');
    await expect(sticky).toHaveCount(1, { timeout: 10000 });
    await expect(sticky.first()).toBeVisible();
    await expect(sticky.first()).toContainText('mock assistant');
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

    // "list" makes the mock call a tool first, so the two notes differ in text
    await send(page, 'list all recipes');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
      .toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(2);
    const noteTexts = async () =>
      (await page.locator('#page-margin .margin-note').allTextContents()).map((t) => t.trim());
    const before = await noteTexts();
    expect(before[0]).toContain('Using tool: list_recipes');

    // Turning back to the contents page re-projects the thread as one sticky
    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible();
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1);
    await expect(page.locator('#page-margin .sticky-note')).toHaveCount(1);

    // Opening a recipe again drops the sticky styling and restores the notes
    await openRecipe(page, recipeId);
    await expect(page.locator('#page-margin .sticky-note')).toHaveCount(0);
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(2);
    // ...in their original order, oldest first
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

    const sticky = page.locator('#page-margin .sticky-note[data-kind="error"]');
    await expect(sticky).toHaveCount(1, { timeout: 10000 });
    await expect(sticky.first()).toContainText('Connection error');
  });

  test('tablet layout renders the margin beneath the page content', async ({ page, isMobile }) => {
    test.skip(isMobile, 'viewport cannot be resized under mobile emulation');
    // Inside the <=1024px collapse, above the 600px phone breakpoint
    await page.setViewportSize({ width: 900, height: 1000 });
    const recipeId = await createRecipe(page, {
      title: `Tablet Recipe ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      // Long enough to overflow the page: with a full-height content box the
      // margin would be laid out over the tail of the steps instead of after them
      steps: Array.from({ length: 14 }, (_, i) => ({
        step_number: i + 1,
        instruction: `Step ${i + 1}: stir the mixture slowly and evenly until smooth`,
      })),
      servings: 4,
    });
    await openRecipe(page, recipeId);

    await send(page, 'hello tablet');
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1, { timeout: 10000 });

    // The content box itself, not its last child: the last child is the phone
    // footer, which renderRecipe emits at every width and CSS hides above 600px
    const contentBottom = await page.locator('#page-right-content').evaluate(
      el => el.getBoundingClientRect().bottom
    );
    const margin = (await page.locator('#page-margin').boundingBox())!;
    // Directly beneath the content: neither overlapping it nor pushed to the page bottom
    expect(margin.y).toBeGreaterThanOrEqual(contentBottom - 1);
    expect(margin.y).toBeLessThanOrEqual(contentBottom + 60);
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
    await expect(replies).toHaveCount(2, { timeout: 10000 });
    await expect(replies.first()).toContainText('half a reply');
    await expect(replies.last()).toContainText('mock assistant');
    await expect(page.locator('#page-margin .margin-note.streaming')).toHaveCount(0);
    await expect(page.locator('#page-margin')).toHaveAttribute('aria-busy', 'false');
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

    const sticky = page.locator('#page-margin .sticky-note');
    await expect(sticky).toHaveCount(1, { timeout: 10000 });
    await expect(sticky).toHaveClass(/streaming/);

    // A completed turn clears the streaming state on the sticky
    await page.unroute('**/api/chat');
    await send(page, 'hello done');
    await expect(page.locator('#page-margin .sticky-note')).toContainText('mock assistant', { timeout: 10000 });
    await expect(page.locator('#page-margin .sticky-note')).not.toHaveClass(/streaming/);
  });

  test('tool_use renders a status line', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createRecipe(page, {
      title: `Status Recipe ${Date.now()}`,
      ingredients: [],
      steps: [],
    });
    await openRecipe(page, recipeId);

    // "list" makes the mock call the list_recipes tool before replying
    await send(page, 'list all recipes');

    const status = page.locator('#page-margin .margin-note[data-kind="status"]');
    await expect(status).toHaveCount(1, { timeout: 10000 });
    await expect(status.first()).toHaveText('Using tool: list_recipes');
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

    // The mock LLM answers "halve" with an update_recipe call; the backend then
    // emits a recipe_artifact and the page re-fetches the edited recipe.
    await send(page, 'halve this recipe');

    // Under the 3s difficulty-refresh delay, so only the artifact path can do this
    await expect(page.locator('.meta-serves')).toHaveText('serves 2', { timeout: 2500 });
    expect(fetches).toBeGreaterThanOrEqual(1);

    const reply = page.locator('#page-margin .margin-note[data-kind="reply"]');
    await expect(reply).toHaveCount(1);
    await expect(reply.first()).toContainText('serves 2 now');
  });

  test('adding a note does not restart the fade-in of the notes already in the margin', async ({ page }) => {
    skipOnPhone(page);
    const recipeId = await createRecipe(page, {
      title: `Fade Recipe ${Date.now()}`,
      ingredients: [],
      steps: [],
    });
    await openRecipe(page, recipeId);

    // Driven through the module directly: the mock LLM delivers a reply in one
    // chunk, so a real turn cannot show whether a second render restarts the
    // 200ms fade of the notes that are already on the page.
    const timings = await page.evaluate(async () => {
      const M = await import('/static/margin-notes.js');
      const margin = document.getElementById('page-margin')!;
      M.addNote('first note', 'reply');
      const first = margin.firstElementChild as HTMLElement;
      M.updateStreamingNote('a streaming reply');
      const streaming = margin.lastElementChild as HTMLElement;

      const at = (el: HTMLElement) => {
        const a = el.getAnimations()[0];
        return a ? Number(a.currentTime) : null;
      };
      await new Promise(r => setTimeout(r, 80));
      const before = { first: at(first), streaming: at(streaming) };

      // A further chunk on the streaming note re-renders every visible note
      M.updateStreamingNote('a streaming reply, continued');
      const after = { first: at(first), streaming: at(streaming) };

      return {
        before,
        after,
        sameFirst: first === margin.firstElementChild,
        sameStreaming: streaming === margin.lastElementChild,
      };
    });

    // The nodes are reused...
    expect(timings.sameFirst).toBe(true);
    expect(timings.sameStreaming).toBe(true);
    // ...and their running fade-in is not cancelled and restarted
    expect(timings.before.first).toBeGreaterThan(0);
    expect(timings.before.streaming).toBeGreaterThan(0);
    expect(timings.after.first).toBeGreaterThanOrEqual(timings.before.first!);
    expect(timings.after.streaming).toBeGreaterThanOrEqual(timings.before.streaming!);
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

  test('a forward page turn does not cover the margin notes', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the page-turn overlay is the desktop path');
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

    await send(page, 'hello turn');
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1, { timeout: 10000 });

    // Measure the overlay the moment it is inserted, against the margin it must not hide
    const rects = await page.evaluate(() => new Promise<{ overlayRight: number; marginLeft: number; marginWidth: number }>((resolve, reject) => {
      const container = document.querySelector('.pages-container')!;
      const observer = new MutationObserver(() => {
        const overlay = container.querySelector('.page-turn-overlay') as HTMLElement | null;
        if (!overlay) return;
        observer.disconnect();
        const o = overlay.getBoundingClientRect();
        const m = document.getElementById('page-margin')!.getBoundingClientRect();
        resolve({ overlayRight: o.right, marginLeft: m.left, marginWidth: m.width });
      });
      observer.observe(container, { childList: true });
      setTimeout(() => { observer.disconnect(); reject(new Error('no page-turn overlay appeared')); }, 5000);
      // @ts-ignore - loadNextRecipe is exposed by app.js
      loadNextRecipe();
    }));

    expect(rects.marginWidth).toBeGreaterThan(0);
    // The overlay carries only the page content, so it must stop before the margin
    expect(rects.overlayRight).toBeLessThanOrEqual(rects.marginLeft + 1);
  });
});
