import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, seedRecipes, openRecipe, sendNote, isPhone, openNotesView, notesThread, paceChat } from './helpers';

/**
 * The note input is the only chat surface now: a note goes into the thread,
 * the latest reply is drawn on the sticky above it, and the Notes tab shows the whole
 * thread. Nothing is prefixed with a speaker name.
 */
test.describe('Notes and replies', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  async function openTestRecipe(page: Page, name: string) {
    const recipeId = await createRecipe(page, {
      title: `${name} ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      servings: 4,
      // Already assessed, so no difficulty refresh re-renders the page mid-test
      difficulty: 3,
    });
    await openRecipe(page, recipeId);
    return recipeId;
  }

  test('a sent note appears in the Notes tab with no "User:" prefix', async ({ page }) => {
    await openTestRecipe(page, 'Note Recipe');

    await sendNote(page, 'Hello!');
    // The reply lands while Ingredients is still the open tab
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
      .toHaveCount(1, { timeout: 10000 });

    await openNotesView(page);

    const thread = notesThread(page);
    await expect(thread).toBeVisible();
    const userNote = thread.locator('.thread-note[data-kind="user"]');
    await expect(userNote).toHaveCount(1);
    // Exactly the text that was typed - no "User:" and no other speaker label
    await expect(userNote).toHaveText('Hello!');
    await expect(thread).not.toContainText('User:');
    await expect(thread).not.toContainText('AI:');
  });

  test('the reply is a margin note and is repeated in the thread', async ({ page }) => {
    await openTestRecipe(page, 'Reply Recipe');

    await sendNote(page, 'hello there');

    const reply = page.locator('#page-margin .margin-note[data-kind="reply"]');
    await expect(reply).toHaveCount(1, { timeout: 10000 });
    await expect(reply.first()).toBeVisible();
    await expect(reply.first()).toContainText('mock assistant');
    await expect(reply.first()).not.toContainText('AI:');

    await openNotesView(page);
    const threadReply = notesThread(page).locator('.thread-note[data-kind="reply"]');
    await expect(threadReply).toHaveCount(1);
    await expect(threadReply.first()).toContainText('mock assistant');
    await expect(threadReply.first()).not.toContainText('AI:');
  });

  test('the "list" reply names the seeded recipe', async ({ page }) => {
    await seedRecipes(page, 1);
    await openTestRecipe(page, 'List Recipe');

    // Paced, so the in-flight line can be read between the stream's events
    await paceChat(page, 700);
    await sendNote(page, 'list all recipes');

    // The in-flight line in the cook's words first, then the reply itself
    const status = page.locator('#page-margin .margin-note[data-kind="status"]');
    await expect(status).toHaveText('Looking through the book…', { timeout: 10000 });

    const reply = page.locator('#page-margin .margin-note[data-kind="reply"]');
    await expect(reply).toHaveCount(1, { timeout: 10000 });
    await expect(reply.first()).toContainText('Chicken Curry');

    await openNotesView(page);
    await expect(notesThread(page)).toContainText('Chicken Curry');
  });

  test('a note that triggers display_recipe shows a recipe on the right page', async ({ page }) => {
    const [recipeId] = await seedRecipes(page, 1);
    await page.reload();
    await expect(page.locator('#message-input')).toBeVisible();

    // The mock LLM's display_recipe names a fixed id that is not in the book;
    // this used to pass only through the 404 fall-through to the first recipe,
    // which recipe-url-state removes (a recipe_artifact 404 now shows "Recipe
    // not found"). So the stream carries the seeded recipe's id.
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: `event: tool_use\ndata: {"tool":"display_recipe"}\n\nevent: recipe_artifact\ndata: {"recipe_id":"${recipeId}"}\n\nevent: done\ndata: {"conversation_id":"c1"}\n\n`,
      });
    });
    await sendNote(page, 'show me the recipe');

    // The recipe_artifact event opens the recipe on the right page
    const title = page.locator('#page-right-content .recipe-title');
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).not.toBeEmpty();
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'recipe');
    // The recipe opens in cook mode, so above 600px its ingredients take the
    // left page and the method the right; the phone keeps them on its one page
    const ingredientsPage = isPhone(page) ? '#page-right-content' : '#page-left-content';
    await expect(page.locator(`${ingredientsPage} .ingredients-list`)).toHaveCount(1);
    await expect(page.locator('.ingredients-list')).toHaveCount(1);
  });

  test('sending an empty note does nothing', async ({ page }) => {
    await openTestRecipe(page, 'Empty Note Recipe');

    await sendNote(page, '   ');
    await page.waitForTimeout(1000);

    await expect(page.locator('#page-margin .margin-note')).toHaveCount(0);
    await openNotesView(page);
    await expect(notesThread(page)).toHaveAttribute('data-empty', 'true');
  });
});

/**
 * web-chat › A turn keeps the slip still and the input live: the send button
 * shows when it cannot send, and a follow-up typed meanwhile waits for the cook.
 */
test.describe('The send button during a turn', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  /** Holds every /api/chat open until `release()`, counting the POSTs. */
  async function holdChat(page: Page) {
    const held: Array<() => Promise<void>> = [];
    let posts = 0;
    await page.route('**/api/chat', route => {
      posts++;
      held.push(() => route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: 'event: chunk\ndata: {"text":"Done."}\n\nevent: done\ndata: {"conversation_id":"held"}\n\n',
      }));
    });
    return {
      posts: () => posts,
      release: async () => { while (held.length) await held.shift()!(); },
    };
  }

  function sendLook(page: Page) {
    return page.locator('#send-button').evaluate(el => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { opacity: parseFloat(cs.opacity), cursor: cs.cursor, box: { x: r.x, y: r.y, width: r.width, height: r.height } };
    });
  }

  test('the send button looks unavailable during a turn', async ({ page }) => {
    const chat = await holdChat(page);
    await openRecipe(page, (await createRecipe(page, {
      title: `Dim Send ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      servings: 4,
      difficulty: 3,
    })));
    const idle = await sendLook(page);
    expect(idle.opacity).toBe(1);
    expect(idle.cursor).toBe('pointer');

    await sendNote(page, 'how long?');
    await expect(page.locator('#send-button')).toHaveAttribute('aria-disabled', 'true');
    await expect.poll(async () => (await sendLook(page)).opacity).toBeLessThanOrEqual(0.5);
    const busy = await sendLook(page);
    expect(busy.cursor).toBe('not-allowed');
    for (const k of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(busy.box[k] - idle.box[k]), `send button ${k} moved`).toBeLessThanOrEqual(1);
    }
    // Hovering it changes nothing while it cannot send
    await page.locator('#send-button').hover();
    await page.waitForTimeout(300);
    expect((await sendLook(page)).opacity).toBeLessThanOrEqual(0.5);

    await chat.release();
    await expect(page.locator('#send-button')).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10000 });
    await expect.poll(async () => (await sendLook(page)).opacity).toBe(1);
    expect((await sendLook(page)).cursor).toBe('pointer');
  });

  test('a follow-up typed during a turn is kept, not sent', async ({ page }) => {
    const chat = await holdChat(page);
    await openRecipe(page, (await createRecipe(page, {
      title: `Kept Follow-up ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix' }],
      servings: 4,
      difficulty: 3,
    })));
    await sendNote(page, 'first');
    await expect(page.locator('#send-button')).toHaveAttribute('aria-disabled', 'true');
    const input = page.locator('#message-input');
    await input.pressSequentially('and the oven?');
    await input.press('Enter');
    await expect(input).toHaveValue('and the oven?');

    await chat.release();
    await expect(page.locator('#send-button')).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(input).toHaveValue('and the oven?');
    expect(chat.posts()).toBe(1);

    await input.press('Enter');
    await expect.poll(() => chat.posts()).toBe(2);
    await chat.release();
  });
});
