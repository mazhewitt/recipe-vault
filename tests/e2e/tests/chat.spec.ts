import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, seedRecipes, openRecipe, sendNote, isPhone, openNotesView, notesThread } from './helpers';

/**
 * The note input is the only chat surface now: a note goes into the thread,
 * the reply is drawn in the page margin, and the Notes tab shows the whole
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

    await sendNote(page, 'list all recipes');

    // The tool status line first, then the reply itself
    const status = page.locator('#page-margin .margin-note[data-kind="status"]');
    await expect(status).toHaveText('Using tool: list_recipes', { timeout: 10000 });

    const reply = page.locator('#page-margin .margin-note[data-kind="reply"]');
    await expect(reply).toHaveCount(1, { timeout: 10000 });
    await expect(reply.first()).toContainText('Chicken Curry');

    await openNotesView(page);
    await expect(notesThread(page)).toContainText('Chicken Curry');
  });

  test('a note that triggers display_recipe shows a recipe on the right page', async ({ page }) => {
    await seedRecipes(page, 1);
    await page.reload();
    await expect(page.locator('#message-input')).toBeVisible();

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
