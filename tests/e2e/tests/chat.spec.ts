import { test, expect } from '@playwright/test';
import { authenticate, seedRecipes } from './helpers';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('user can send chat message', async ({ page }) => {
    // Type a message
    await page.locator('#message-input').fill('Hello!');

    // Send message (press Enter)
    await page.locator('#message-input').press('Enter');

    // Verify message appears in chat history with User: prefix
    await expect(page.locator('#messages')).toContainText('User: Hello!');
  });

  test('assistant response displays', async ({ page }) => {
    // Seed recipes for the mock to work with
    await seedRecipes(page, 1);

    // Send a message that triggers mock response
    await page.locator('#message-input').fill('list all recipes');
    await page.locator('#message-input').press('Enter');

    // Wait for assistant response
    await expect(page.locator('#messages')).toContainText('User: list all recipes', {
      timeout: 5000,
    });

    // Verify AI response appears
    await expect(page.locator('#messages')).toContainText('AI:', { timeout: 10000 });

    // Verify the mock response text
    await expect(page.locator('#messages')).toContainText('Chicken Curry', {
      timeout: 10000,
    });
  });

  test('display_recipe triggers recipe panel update', async ({ page }) => {
    // Seed a recipe
    const recipeIds = await seedRecipes(page, 1);
    const recipeId = recipeIds[0];

    // Set MOCK_RECIPE_ID environment variable for this test
    // Note: The server is already started with MOCK_LLM=true
    // We need to make sure the mock returns the correct recipe ID
    // This is handled by the mock implementation

    // Reload page to ensure clean state
    await page.reload();

    // Wait for page to load
    await expect(page.locator('#message-input')).toBeVisible();

    // Send a message that triggers display_recipe
    await page.locator('#message-input').fill('show me the recipe');
    await page.locator('#message-input').press('Enter');

    // Wait for user message to appear
    await expect(page.locator('#messages')).toContainText('User: show me the recipe', {
      timeout: 5000,
    });

    // Wait for AI response
    await expect(page.locator('#messages')).toContainText('AI:', { timeout: 10000 });

    // Verify recipe panel is updated
    // The mock should trigger display of a recipe - check for recipe title
    await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 10000 });

    // Verify recipe content is displayed (should have recipe title text)
    const recipeTitle = await page.locator('.recipe-title').textContent();
    expect(recipeTitle).toBeTruthy();
    expect(recipeTitle).not.toBe('');
  });
});
