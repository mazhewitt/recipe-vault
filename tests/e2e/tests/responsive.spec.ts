import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, openRecipe, isPhone, isTablet, useContentsMode, Recipe } from './helpers';

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

  test('desktop shows the edge tabs, and the slip sits at the foot of the left page', async ({ page }) => {
    test.skip(isPhone(page), 'wide layout only');
    await seedAndOpen(page);
    // Contents mode: the arrangement this case describes — the whole recipe on
    // the right page, the contents on the left, the section strip on the outer
    // edge. Cook mode splits the recipe and hides that strip
    // (spread-modes.spec.ts).
    await useContentsMode(page);

    // Edge ribbons on the book's outer edge; the phone paper tabs stay hidden.
    // Two of them: Notes is a left-page spread mode now, not a section.
    await expect(page.locator('.edge-tabs')).toBeVisible();
    await expect(page.locator('.edge-tab')).toHaveCount(2);
    await expect(page.locator('.page-tabs')).toBeHidden();

    // Contents mode keeps the slip: it has one home in every mode
    await expect(page.locator('.note-input')).toBeVisible();

    // The recipe is on the right page and the contents stay on the left
    await expect(page.locator('#page-right-content')).toContainText('test ingredient');
    await expect(page.locator('#page-left-content .index-recipe-item.current')).toHaveCount(1);

    // Back in cook mode the slip is a pinned absolute over the foot of the LEFT
    // page — the one position it holds in every state, so that clicking into
    // it cannot move it
    await page.locator('.spread-tab[data-mode="cook"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    const position = await page.locator('.note-input').evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('absolute');
    const input = (await page.locator('.note-input').boundingBox())!;
    const pages = (await page.locator('.pages-container').boundingBox())!;
    const leftPage = (await page.locator('#page-left').boundingBox())!;
    // Left of the spine...
    expect(input.x + input.width).toBeLessThanOrEqual(pages.x + pages.width / 2);
    // ...and over the page rather than below the book
    expect(input.y).toBeLessThan(leftPage.y + leftPage.height);
  });

  test('desktop hides the edge tabs on the contents page', async ({ page }) => {
    test.skip(isPhone(page), 'wide layout only');
    await seedAndOpen(page);
    await useContentsMode(page);
    await expect(page.locator('.edge-tabs')).toBeVisible();

    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible();

    await expect(page.locator('.edge-tabs')).toBeHidden();
    await expect(page.locator('.page-tabs')).toBeHidden();
  });

  test('tablet: the reply sits on the sticky above the slip', async ({ page }) => {
    test.skip(!isTablet(page), 'the 601-1024px band; the ipad project supplies it');
    // Runs at the project viewport (ipad: 810x1080) rather than resizing, so the
    // tablet CSS is exercised as a real device sees it. Book full width, the
    // reply on the sticky above the slip, edge ribbons still shown.
    // viewport-contract.spec.ts guarantees a project is in this band, so this
    // skip cannot go silent.
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

    await page.locator('#message-input').fill('hello tablet');
    await page.locator('#message-input').press('Enter');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toHaveCount(1, { timeout: 10000 });

    // The same place in cook and contents modes: above the slip, on the left page
    for (const mode of ['cook', 'contents']) {
      if (mode === 'contents') await useContentsMode(page);
      const g = await page.evaluate(() => {
        const r = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        return {
          sticky: r('page-margin'), input: r('note-input'), left: r('page-left'), right: r('page-right'),
          inRight: !!document.getElementById('page-margin')!.closest('#page-right'),
        };
      });
      expect(g.inRight).toBe(false);
      expect(g.input.top - g.sticky.bottom).toBeGreaterThanOrEqual(-0.5);
      expect(g.input.top - g.sticky.bottom).toBeLessThanOrEqual(8.5);
      expect(g.sticky.left).toBeGreaterThanOrEqual(g.left.left - 0.5);
      expect(g.sticky.right).toBeLessThanOrEqual(g.right.left + 0.5);
    }

    // The note input is still a slip over the page at this width
    const position = await page.locator('.note-input').evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('absolute');
  });
});
