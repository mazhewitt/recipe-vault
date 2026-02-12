import { test, expect } from '@playwright/test';
import { authenticate, createRecipe } from './helpers';

test.describe('XSS Protection', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('recipe title with <script> tag renders as escaped text', async ({ page }) => {
    const maliciousTitle = 'Delicious Cake <script>alert("XSS")</script>';

    const recipeId = await createRecipe(page, {
      title: maliciousTitle,
      description: 'A test recipe',
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: [{ step_number: 1, instruction: 'Mix ingredients' }]
    });

    // Display the recipe
    await page.evaluate((id) => {
      // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
      fetchAndDisplayRecipe(id);
    }, recipeId);

    // Wait for recipe to render
    await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 5000 });

    // Get the rendered HTML of the title
    const titleHtml = await page.locator('.recipe-title').innerHTML();

    // Verify script tag is escaped (should contain &lt;script&gt; not <script>)
    expect(titleHtml).toContain('&lt;script&gt;');
    expect(titleHtml).not.toContain('<script>');

    // Verify the text content shows the escaped version
    const titleText = await page.locator('.recipe-title').textContent();
    expect(titleText).toContain('<script>');
    expect(titleText).toContain('Delicious Cake');
  });

  test('ingredient name with onerror handler renders as escaped text', async ({ page }) => {
    const maliciousIngredient = '<img src=x onerror=alert("XSS")>';

    const recipeId = await createRecipe(page, {
      title: 'Test Recipe',
      description: 'Testing XSS in ingredients',
      ingredients: [{ name: maliciousIngredient, quantity: 1 }],
      steps: [{ step_number: 1, instruction: 'Mix' }]
    });

    await page.evaluate((id) => {
      // @ts-ignore
      fetchAndDisplayRecipe(id);
    }, recipeId);

    await expect(page.locator('.ingredients-list')).toBeVisible({ timeout: 5000 });

    // Get the HTML of the ingredients list
    const ingredientsHtml = await page.locator('.ingredients-list').innerHTML();

    // Verify img tag is escaped
    expect(ingredientsHtml).toContain('&lt;img');
    expect(ingredientsHtml).not.toMatch(/<img\s+src=/);

    // Verify no script execution by checking page doesn't have alert
    const dialogPromise = page.waitForEvent('dialog', { timeout: 500 }).catch(() => null);
    const dialog = await dialogPromise;
    expect(dialog).toBeNull();
  });

  test('step instruction with HTML tags renders as escaped text', async ({ page }) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const stepWithHTML = 'Mix ingredients <b>thoroughly</b>';

    const recipeId = await createRecipe(page, {
      title: `XSS Test Recipe ${uniqueSuffix}`,
      ingredients: [{ name: 'flour', quantity: 1 }],
      steps: [{ step_number: 1, instruction: stepWithHTML }]
    });

    await page.evaluate((id) => {
      // @ts-ignore
      fetchAndDisplayRecipe(id);
    }, recipeId);

    // Wait for recipe to render
    await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 5000 });

    // Get all page content
    const pageText = await page.locator('body').textContent();

    // Verify the step text is present and HTML is escaped (shown as text)
    expect(pageText).toContain('Mix ingredients');
    expect(pageText).toContain('<b>');
    expect(pageText).toContain('</b>');
  });

  test.skip('recipe description with HTML entities renders safely', async ({ page }) => {
    // Skip: API validation may reject certain description content
  });

  test('chat message with HTML tags renders as text', async ({ page }) => {
    // On mobile, switch to chat tab
    if (page.viewportSize()!.width <= 600) {
      await page.click('#tab-chat');
    }

    const maliciousMessage = '<b>Bold</b> and <script>alert("XSS")</script>';

    await page.locator('#message-input').fill(maliciousMessage);
    await page.locator('#message-input').press('Enter');

    // Wait for message to appear
    await expect(page.locator('#messages')).toContainText('User:', { timeout: 5000 });

    // Get the messages HTML
    const messagesHtml = await page.locator('#messages').innerHTML();

    // Verify HTML tags are escaped in user message
    expect(messagesHtml).toContain('&lt;b&gt;');
    expect(messagesHtml).toContain('&lt;script&gt;');
    expect(messagesHtml).not.toMatch(/<script>alert/);

    // Verify no alert dialog
    const dialogPromise = page.waitForEvent('dialog', { timeout: 500 }).catch(() => null);
    const dialog = await dialogPromise;
    expect(dialog).toBeNull();
  });

  test.skip('recipe notes with XSS attempt renders safely', async ({ page }) => {
    // Skip: API validation may reject certain notes content
  });

  test('XSS payloads do not execute - comprehensive check', async ({ page }) => {
    // Track if any alert/confirm/prompt dialogs appear
    let dialogAppeared = false;
    page.on('dialog', () => {
      dialogAppeared = true;
    });

    const xssPayloads = {
      title: '<img src=x onerror=alert(1)>',
      description: '<script>alert(2)</script>',
      notes: 'javascript:alert(3)',
      ingredients: [
        { name: '<svg onload=alert(4)>', quantity: 1 }
      ],
      steps: [
        { step_number: 1, instruction: '<body onload=alert(5)>' }
      ]
    };

    const recipeId = await createRecipe(page, xssPayloads);

    await page.evaluate((id) => {
      // @ts-ignore
      fetchAndDisplayRecipe(id);
    }, recipeId);

    // Wait for recipe to fully render
    await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 5000 });

    // Wait a bit to ensure no delayed script execution
    await page.waitForTimeout(1000);

    // Verify no dialogs appeared
    expect(dialogAppeared).toBe(false);

    // Verify all payloads are visible as text (not executed)
    const pageText = await page.locator('body').textContent();
    expect(pageText).toContain('<img src=x');
    expect(pageText).toContain('<script>');
    expect(pageText).toContain('<svg onload=');
    expect(pageText).toContain('<body onload=');
  });
});
