import { test, expect } from '@playwright/test';
import { authenticate, createRecipe } from './helpers';

test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('mobile tab switching works', async ({ page }) => {
    // Only run this test on mobile viewports
    if (page.viewportSize()!.width > 600) return;

    // Default should be book tab
    const bookContainer = page.locator('.book-container');
    const notepadContainer = page.locator('.notepad-container');
    const tabBook = page.locator('#tab-book');
    const tabChat = page.locator('#tab-chat');

    await expect(bookContainer).toBeVisible();
    await expect(notepadContainer).not.toBeVisible();
    await expect(tabBook).toHaveClass(/active/);

    // Switch to Chat tab
    await tabChat.click();
    await expect(bookContainer).not.toBeVisible();
    await expect(notepadContainer).toBeVisible();
    await expect(tabChat).toHaveClass(/active/);
    await expect(tabBook).not.toHaveClass(/active/);

    // Switch back to Book tab
    await tabBook.click();
    await expect(bookContainer).toBeVisible();
    await expect(notepadContainer).not.toBeVisible();
    await expect(tabBook).toHaveClass(/active/);
  });

  test('recipe renders single-page on mobile', async ({ page }) => {
    // Only run this test on mobile viewports
    if (page.viewportSize()!.width > 600) return;

    // Create a recipe
    const recipeId = await createRecipe(page, {
      title: 'Responsive Test Recipe',
      description: 'Test for mobile rendering',
      ingredients: [{ name: 'test ingredient', quantity: 1 }],
      steps: [{ step_number: 1, instruction: 'test step' }],
    });

    // Display the recipe
    await page.evaluate((id) => {
      // @ts-ignore
      fetchAndDisplayRecipe(id);
    }, recipeId);

    // Wait for render
    await page.waitForTimeout(500);

    // Verify left page is visible and full width
    const leftPage = page.locator('#page-left');
    const rightPage = page.locator('#page-right');

    await expect(leftPage).toBeVisible();
    await expect(rightPage).not.toBeVisible();

    // Check width of left page is nearly same as book-container
    const leftWidth = await leftPage.evaluate(el => el.getBoundingClientRect().width);
    const containerWidth = await page.locator('.pages-container').evaluate(el => el.getBoundingClientRect().width);
    
    // On mobile, the left page should be 100% of the pages-container
    expect(leftWidth).toBeCloseTo(containerWidth, 0);

    // Verify both ingredients and preparation are in the left content
    const leftContent = page.locator('#page-left-content');
    await expect(leftContent).toContainText('ingredients:');
    await expect(leftContent).toContainText('preparation');
    await expect(leftContent).toContainText('test ingredient');
    await expect(leftContent).toContainText('test step');
  });

  test('tablet layout stacks components', async ({ page }) => {
    // Only run this test on tablet viewports (e.g., 768px wide)
    const viewport = page.viewportSize()!;
    if (viewport.width <= 600 || viewport.width > 1024) return;

    const bookContainer = page.locator('.book-container');
    const notepadContainer = page.locator('.notepad-container');

    // Both should be visible in tablet layout
    await expect(bookContainer).toBeVisible();
    await expect(notepadContainer).toBeVisible();

    // Verify stacked layout (column)
    const containerFlexDir = await page.locator('.app-container').evaluate(el => 
      window.getComputedStyle(el).flexDirection
    );
    expect(containerFlexDir).toBe('column');

    // Verify book is on top via order property
    const bookOrder = await bookContainer.evaluate(el => 
      window.getComputedStyle(el).order
    );
    expect(bookOrder).toBe('-1');
  });
});
