import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, openRecipe, isPhone, Recipe } from './helpers';

const RECIPE: Recipe = {
  title: 'Responsive Test Recipe',
  description: 'Test for the book-only layout',
  ingredients: [{ name: 'test ingredient', quantity: 1 }],
  steps: [{ step_number: 1, instruction: 'test step' }],
  difficulty: 3,
};

async function seedAndOpen(page: Page): Promise<void> {
  const recipeId = await createRecipe(page, { ...RECIPE, title: `${RECIPE.title} ${Date.now()}` });
  await openRecipe(page, recipeId);
}

test.describe('Responsive Layout (book only)', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('the notepad column and the mobile tab bar are gone', async ({ page }) => {
    for (const gone of ['#tab-book', '#tab-chat', '.mobile-tab-bar', '.mobile-tab',
                        '.notepad-container', '.notepad', '#messages', '.text-input']) {
      await expect(page.locator(gone), `${gone} must not exist`).toHaveCount(0);
    }

    // The note input is the single chat surface, and it lives in the book column
    await expect(page.locator('.book-container > form.note-input#note-input')).toHaveCount(1);
    await expect(page.locator('#message-input')).toBeVisible();
    await expect(page.locator('#send-button')).toBeVisible();
  });

  test('phone shows the paper tabs and the note input below the book', async ({ page }) => {
    test.skip(!isPhone(page), 'phone layout only');
    await seedAndOpen(page);

    // Paper tabs on the page's top edge; the desktop edge tabs stay hidden
    const paperTabs = page.locator('.page-tabs');
    await expect(paperTabs).toBeVisible();
    await expect(page.locator('.page-tab')).toHaveCount(3);
    await expect(page.locator('.page-tab[data-tab="ingredients"]')).toHaveClass(/active/);
    await expect(page.locator('.edge-tabs')).toBeHidden();

    // The note input is a static bar beneath the book, not a slip on the page
    const position = await page.locator('.note-input').evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('static');
    const book = (await page.locator('.recipe-book').boundingBox())!;
    const input = (await page.locator('.note-input').boundingBox())!;
    expect(input.y).toBeGreaterThanOrEqual(book.y + book.height - 1);
    expect(input.width).toBeGreaterThan(page.viewportSize()!.width * 0.9);

    // 44px touch targets on the send and attach buttons
    for (const sel of ['#send-button', '#clipboard-button']) {
      const box = (await page.locator(sel).boundingBox())!;
      expect(box.height, `${sel} height`).toBeGreaterThanOrEqual(44);
      expect(box.width, `${sel} width`).toBeGreaterThanOrEqual(44);
    }

    // One page at a time: the contents page is not on screen while a recipe is open
    await expect(page.locator('#page-left')).toBeHidden();
    await expect(page.locator('#page-right')).toBeVisible();
    await expect(page.locator('#page-right-content')).toContainText('test ingredient');

    // Nothing overflows sideways
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
  });

  test('phone hides both tab strips on the contents page', async ({ page }) => {
    test.skip(!isPhone(page), 'phone layout only');
    await seedAndOpen(page);
    await expect(page.locator('.page-tabs')).toBeVisible();

    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible();

    await expect(page.locator('.page-tabs')).toBeHidden();
    await expect(page.locator('.edge-tabs')).toBeHidden();
    // The contents page is the visible page now
    await expect(page.locator('#page-left')).toBeVisible();
    await expect(page.locator('#note-page-number')).toHaveText('p. 1');
  });

  test('desktop shows the edge tabs and the note input on the right page', async ({ page }) => {
    test.skip(isPhone(page), 'wide layout only');
    await seedAndOpen(page);

    // Edge tabs on the book's outer edge; the phone paper tabs stay hidden
    await expect(page.locator('.edge-tabs')).toBeVisible();
    await expect(page.locator('.edge-tab')).toHaveCount(3);
    await expect(page.locator('.edge-tab[data-tab="ingredients"]')).toHaveClass(/active/);
    await expect(page.locator('.page-tabs')).toBeHidden();

    // The note input is a slip pinned over the foot of the right page
    const position = await page.locator('.note-input').evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('absolute');
    const input = (await page.locator('.note-input').boundingBox())!;
    const pages = (await page.locator('.pages-container').boundingBox())!;
    const rightPage = (await page.locator('#page-right').boundingBox())!;
    // Right of the spine...
    expect(input.x).toBeGreaterThan(pages.x + pages.width / 2);
    // ...and over the page rather than below the book
    expect(input.y).toBeLessThan(rightPage.y + rightPage.height);

    // The recipe is on the right page and the contents stay on the left
    await expect(page.locator('#page-right-content')).toContainText('test ingredient');
    await expect(page.locator('#page-left-content .index-recipe-item.current')).toHaveCount(1);
  });

  test('desktop hides the edge tabs on the contents page', async ({ page }) => {
    test.skip(isPhone(page), 'wide layout only');
    await seedAndOpen(page);
    await expect(page.locator('.edge-tabs')).toBeVisible();

    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible();

    await expect(page.locator('.edge-tabs')).toBeHidden();
    await expect(page.locator('.page-tabs')).toBeHidden();
  });

  test('tablet widths collapse the margin beneath the page content', async ({ page, isMobile }) => {
    test.skip(isMobile, 'viewport cannot be resized under mobile emulation');
    // 601-1024px: book full width, margin under the content, edge tabs still shown
    await page.setViewportSize({ width: 900, height: 1000 });

    const recipeId = await createRecipe(page, {
      title: `Tablet Layout ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: Array.from({ length: 14 }, (_, i) => ({
        step_number: i + 1,
        instruction: `Step ${i + 1}: stir the mixture slowly and evenly until smooth`,
      })),
      difficulty: 3,
    });
    await openRecipe(page, recipeId);

    await expect(page.locator('.edge-tabs')).toBeVisible();
    await expect(page.locator('.page-tabs')).toBeHidden();

    const direction = await page.locator('#page-right').evaluate(el => getComputedStyle(el).flexDirection);
    expect(direction).toBe('column');

    await page.locator('#message-input').fill('hello tablet');
    await page.locator('#message-input').press('Enter');
    await expect(page.locator('#page-margin .margin-note')).toHaveCount(1, { timeout: 10000 });

    const contentBottom = await page.locator('#page-right-content').evaluate(
      el => el.getBoundingClientRect().bottom
    );
    const margin = (await page.locator('#page-margin').boundingBox())!;
    // Directly beneath the content, not overlapping it and not at the page foot
    expect(margin.y).toBeGreaterThanOrEqual(contentBottom - 1);
    expect(margin.y).toBeLessThanOrEqual(contentBottom + 60);

    // The note input is still a slip over the page at this width
    const position = await page.locator('.note-input').evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('absolute');
  });
});
