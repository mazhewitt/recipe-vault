import { test, expect, Page } from '@playwright/test';
import {
  authenticate, createRecipe, openRecipe, sendNote, isPhone,
  openNotesView, notesThread,
} from './helpers';

/**
 * Notes belong to the recipe that was open when their turn began. The reply
 * sticky and the Notes view show that recipe's conversation and nothing else; notes
 * written while the contents or a meal plan is on the page form the book-level
 * thread. The store itself is never filtered or cleared — the server keeps the
 * whole session either way — so everything here is about what is displayed.
 *
 * The scoping applies at every width: the phone has no spread modes but it has
 * the same thread.
 */

async function makeRecipe(page: Page, name: string): Promise<string> {
  return createRecipe(page, {
    title: `${name} ${Date.now()}`,
    ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
    steps: [
      { step_number: 1, instruction: 'Mix' },
      { step_number: 2, instruction: 'Bake' },
    ],
    servings: 4,
    // Already assessed, so the difficulty backfill cannot re-render mid-test
    difficulty: 3,
  });
}

/** Every entry in the store, with the recipe it was filed under. */
async function storedEntries(page: Page): Promise<Array<{ kind: string; text: string; recipeId: string | null }>> {
  return page.evaluate(() =>
    // @ts-ignore - getMarginThread is exposed by app.js
    getMarginThread().map((n: { kind: string; text: string; recipeId: string | null }) =>
      ({ kind: n.kind, text: n.text, recipeId: n.recipeId }))
  );
}

/** Replies held in the store, however they are currently displayed. */
async function storedReplies(page: Page): Promise<number> {
  return (await storedEntries(page)).filter(n => n.kind === 'reply').length;
}

test.describe('Notes scoped to their recipe', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('a recipe shows its own notes and not another recipe\'s', async ({ page }) => {
    const first = await makeRecipe(page, 'AAA Scoped');
    const second = await makeRecipe(page, 'ZZZ Scoped');

    await openRecipe(page, first);
    await sendNote(page, 'note about the first');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
      .toHaveCount(1, { timeout: 10000 });

    // The second recipe starts with an empty sticky, not the first one's reply
    await openRecipe(page, second);
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(0);
    await openNotesView(page);
    await expect(notesThread(page)).toHaveAttribute('data-empty', 'true');
    await expect(notesThread(page)).toContainText('No notes yet.');

    await sendNote(page, 'note about the second');
    await expect.poll(() => storedReplies(page), { timeout: 15000 }).toBe(2);
    await expect(notesThread(page)).toContainText('note about the second');
    await expect(notesThread(page)).not.toContainText('note about the first');

    // ...and the first recipe still has its own, whole
    await openRecipe(page, first);
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toHaveCount(1);
    await openNotesView(page);
    await expect(notesThread(page).locator('.thread-note[data-kind="user"]'))
      .toHaveText('note about the first');
    await expect(notesThread(page).locator('.thread-note[data-kind="reply"]'))
      .toContainText('mock assistant');
    await expect(notesThread(page)).not.toContainText('note about the second');

    // The store kept everything: this is a display filter, not a deletion
    const stored = await storedEntries(page);
    expect(stored.filter(n => n.kind === 'user').map(n => n.text))
      .toEqual(['note about the first', 'note about the second']);
    // ...and only notes, replies and errors: progress is never stored
    expect(stored.filter(n => n.kind === 'status')).toEqual([]);
    expect(new Set(stored.map(n => n.recipeId))).toEqual(new Set([first, second]));
  });

  test('a reply that completes after paging on stays with the recipe it answers', async ({ page }) => {
    const first = await makeRecipe(page, 'AAA Late Reply');
    const second = await makeRecipe(page, 'ZZZ Late Reply');

    // The reply cannot land until the reader has moved on, which is the whole
    // point: stamping at render time would file it under whatever is on screen
    await page.route('**/api/chat', async (route) => {
      await new Promise(r => setTimeout(r, 1500));
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body:
          'event: chunk\ndata: {"text":"answer for the first recipe"}\n\n' +
          'event: done\ndata: {"conversation_id":"late-reply"}\n\n',
      });
    });

    await openRecipe(page, first);
    await sendNote(page, 'question about the first');
    await openRecipe(page, second);
    await expect(page.locator('.recipe-title')).toContainText('ZZZ Late Reply');

    // The reply arrives here, with the second recipe on the page
    await expect.poll(() => storedReplies(page), { timeout: 15000 }).toBe(1);
    const stored = await storedEntries(page);
    expect(stored.find(n => n.kind === 'reply')!.recipeId).toBe(first);

    await expect(page.locator('#page-margin .margin-note')).toHaveCount(0);
    await openNotesView(page);
    await expect(notesThread(page)).toHaveAttribute('data-empty', 'true');

    // ...and it is waiting on the recipe it answers
    await openRecipe(page, first);
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
      .toContainText('answer for the first recipe');
    await openNotesView(page);
    await expect(notesThread(page)).toContainText('question about the first');
    await expect(notesThread(page)).toContainText('answer for the first recipe');
  });

  test('notes written on the contents page form the book-level thread', async ({ page }) => {
    const recipeId = await makeRecipe(page, 'Book Thread');
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    await sendNote(page, 'note from the contents page');
    // The reply itself, not the in-flight line, so the turn is over
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1);
    expect((await storedEntries(page)).every(n => n.recipeId === null)).toBe(true);

    // A recipe does not inherit the book's thread
    await openRecipe(page, recipeId);
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(0);
    await openNotesView(page);
    await expect(notesThread(page)).toHaveAttribute('data-empty', 'true');

    // ...and the book's thread is still there when the reader comes back
    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1);
    await expect(page.locator('#page-margin')).toContainText('mock assistant');
  });

  test('the book thread takes the left page when no recipe is open', async ({ page }) => {
    test.skip(isPhone(page), 'notes mode is a spread mode; the phone has its Notes paper tab instead');
    // Two letter groups, so the contents really do split across both pages and
    // the half the thread is about to take is a half worth missing
    const aaa = await makeRecipe(page, 'Aaa Book Thread Page');
    const zzz = await makeRecipe(page, 'Zzz Book Thread Page');
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    await sendNote(page, 'a note while browsing');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toHaveCount(1, { timeout: 10000 });

    // The Notes tab sits beside the filters on the contents page, and opens the
    // book-level thread there
    await page.locator('.spread-tab[data-mode="notes"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'notes');
    const thread = page.locator('#page-left-content .notes-thread');
    await expect(thread).toBeVisible();
    await expect(thread).toContainText('a note while browsing');
    await expect(thread).toContainText('mock assistant');
    // ...and the whole contents move to the right page rather than being left
    // as the severed second half of a two-page split: the title, the A-Z strip
    // and both letter groups are all still reachable
    const contents = page.locator('#page-right-content');
    await expect(contents.locator('.index-title')).toBeVisible();
    await expect(contents.locator('.index-alphabet-nav')).toBeVisible();
    await expect(contents.locator(`.index-recipe-item[data-recipe-id="${aaa}"]`)).toHaveCount(1);
    await expect(contents.locator(`.index-recipe-item[data-recipe-id="${zzz}"]`)).toHaveCount(1);
    // The A-Z strip points at the page the groups are actually on...
    await expect(contents.locator('.index-alpha-letter[data-letter="A"]'))
      .toHaveAttribute('data-target-page', 'right');
    // ...and none of the contents is left on the page the thread holds
    await expect(page.locator('#page-left-content .index-recipe-item')).toHaveCount(0);

    // Leaving notes mode gives the contents both pages back
    await page.locator('.contents-tab-all').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');
    await expect(page.locator('#page-left-content .index-title')).toBeVisible();
    await expect(page.locator(`#page-left-content .index-recipe-item[data-recipe-id="${aaa}"]`))
      .toHaveCount(1);
    await expect(page.locator(`#page-right-content .index-recipe-item[data-recipe-id="${zzz}"]`))
      .toHaveCount(1);
  });

  test('a recipe displayed mid-turn does not claim that turn\'s notes', async ({ page }) => {
    const recipeId = await makeRecipe(page, 'Mid Turn');
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();

    // The turn displays a recipe and then replies: the notes were written
    // before that recipe was on the page, so they stay on the book thread
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body:
          `event: recipe_artifact\ndata: {"recipe_id":"${recipeId}"}\n\n` +
          'event: chunk\ndata: {"text":"here is the one I made"}\n\n' +
          'event: done\ndata: {"conversation_id":"mid-turn"}\n\n',
      });
    });

    await sendNote(page, 'show me that recipe');
    await expect(page.locator('.recipe-title')).toContainText('Mid Turn', { timeout: 10000 });
    await expect.poll(() => storedReplies(page), { timeout: 15000 }).toBe(1);

    expect((await storedEntries(page)).every(n => n.recipeId === null)).toBe(true);
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(0);
    await openNotesView(page);
    await expect(notesThread(page)).toHaveAttribute('data-empty', 'true');

    // The announcement is waiting where the reader was standing when they wrote it
    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#page-margin')).toContainText('here is the one I made');
  });

  test('phone: the notes are scoped even though there are no spread modes', async ({ page }) => {
    test.skip(!isPhone(page), 'the phone layout, where the mode has no effect at all');
    const first = await makeRecipe(page, 'AAA Phone Scoped');
    const second = await makeRecipe(page, 'ZZZ Phone Scoped');

    await openRecipe(page, first);
    await sendNote(page, 'phone note about the first');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
      .toHaveCount(1, { timeout: 10000 });

    await openRecipe(page, second);
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(0);
    await page.locator('.page-tab[data-tab="notes"]').click();
    const thread = page.locator('#page-right-content .notes-thread');
    await expect(thread).toHaveAttribute('data-empty', 'true');
    await expect(thread).not.toContainText('phone note about the first');

    // The scoping is the thread's, not the spread's: the phone never leaves
    // contents mode, and its single page is unchanged
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents');
    await expect(page.locator('#page-left')).toBeHidden();
  });
});
