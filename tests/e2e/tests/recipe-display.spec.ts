import { test, expect } from '@playwright/test';
import { authenticate, createRecipe, openRecipe, useContentsMode, isPhone } from './helpers';

test.describe('Recipe Display', () => {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('recipe title, ingredients, and steps render', async ({ page }) => {
    const title = `Test Recipe ${uniqueSuffix}`;
    // Create a recipe
    const recipeId = await createRecipe(page, {
      title: title,
      description: 'A test recipe for display testing',
      ingredients: [
        { name: 'flour', quantity: 1, unit: 'cup' },
        { name: 'eggs', quantity: 2 },
        { name: 'milk', quantity: 0.5, unit: 'cup' },
      ],
      steps: [
        { step_number: 1, instruction: 'Mix flour and eggs' },
        { step_number: 2, instruction: 'Add milk' },
        { step_number: 3, instruction: 'Bake for 20 minutes' },
      ],
      prep_time_minutes: 10,
      cook_time_minutes: 20,
      servings: 4,
    });

    await openRecipe(page, recipeId);

    // The right page holds title and method at every width and in every mode
    const rightContent = page.locator('#page-right-content');
    await expect(rightContent.locator('.recipe-title')).toHaveText(title);
    await expect(rightContent).toContainText('Mix flour and eggs');
    await expect(rightContent).toContainText('Add milk');
    await expect(rightContent).toContainText('Bake for 20 minutes');

    // The recipe opens in cook mode: the ingredients on the left page (on the
    // phone, the one page's Ingredients tab). The split itself is
    // spread-modes.spec.ts's to assert.
    const ingredientsSection = page.locator('.ingredients-list');
    await expect(ingredientsSection).toBeVisible();
    await expect(ingredientsSection).toContainText('1 cup flour');
    await expect(ingredientsSection).toContainText('2 eggs');
    await expect(ingredientsSection).toContainText('0.5 cup milk');

    // Contents mode gives the left page to the contents, with the open recipe
    // marked, and leaves the right page as it was (a no-op on the phone)
    await useContentsMode(page);
    await expect(rightContent.locator('.recipe-title')).toHaveText(title);
    await expect(rightContent).toContainText('Bake for 20 minutes');
    if (!isPhone(page)) {
      await expect(page.locator('#page-left-content')).not.toContainText('Mix flour and eggs');
      await expect(page.locator('#page-left-content .index-recipe-item.current')).toHaveCount(1);
      await expect(page.locator('#page-left-content .index-recipe-item.current')).toContainText(title);
    }
  });

  test('long recipe content scrolls', async ({ page }) => {
    const title = `Long Recipe ${uniqueSuffix}`;
    // Create a recipe with many ingredients and steps
    const manyIngredients = Array.from({ length: 30 }, (_, i) => ({
      name: `Ingredient ${i + 1}`,
      quantity: i + 1,
      unit: 'unit',
    }));
    const manySteps = Array.from({ length: 30 }, (_, i) => ({
      step_number: i + 1,
      instruction: `Step ${i + 1}: Do something`,
    }));

    const recipeId = await createRecipe(page, {
      title: title,
      description: 'A recipe with lots of ingredients and steps',
      ingredients: manyIngredients,
      steps: manySteps,
    });

    await openRecipe(page, recipeId);
    // The method scrolls inside the right page (on the phone, the Method tab:
    // the page opens on Ingredients)
    if (isPhone(page)) await page.locator('.page-tab[data-tab="method"]').click();
    const rightPage = page.locator('#page-right');
    await expect(rightPage).toBeVisible();

    const overflowY = await rightPage.evaluate(el => window.getComputedStyle(el).overflowY);
    expect(['auto', 'scroll']).toContain(overflowY);

    // It really is longer than the page, otherwise there is nothing to scroll
    const overflow = await rightPage.evaluate(el => el.scrollHeight - el.clientHeight);
    expect(overflow).toBeGreaterThan(50);

    await expect(page.locator('#page-right-content .prep-step').first()).toBeVisible();

    await rightPage.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => rightPage.evaluate(el => el.scrollTop)).toBeGreaterThan(0);

    await expect(page.locator('#page-right-content .prep-step[data-step="30"]')).toBeInViewport();
  });
});
