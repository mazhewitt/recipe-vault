import { test, expect } from '@playwright/test';
import { authenticate, createRecipe, sendNote } from './helpers';

function isPhone(page: any): boolean {
  return page.viewportSize()!.width <= 600;
}

async function openRecipe(page: any, id: string, titleFragment: string) {
  await page.evaluate((recipeId: string) => {
    // @ts-ignore - fetchAndDisplayRecipe is defined in app.js
    fetchAndDisplayRecipe(recipeId);
  }, id);
  await expect(page.locator('.recipe-title')).toContainText(titleFragment);
}

async function seedTwoRecipes(page: any) {
  const suffix = Date.now().toString();
  const first = await createRecipe(page, {
    title: `Timer Recipe ${suffix}`,
    ingredients: [{ name: 'water', quantity: 1, unit: 'cup' }],
    steps: [
      { step_number: 1, instruction: 'Boil the water' },
      { step_number: 2, instruction: 'Steep for four minutes' },
      { step_number: 3, instruction: 'Pour and serve' },
    ],
  });
  const second = await createRecipe(page, {
    title: `Other Recipe ${suffix}`,
    ingredients: [],
    steps: [
      { step_number: 1, instruction: 'Do something' },
      { step_number: 2, instruction: 'Do something else' },
    ],
  });
  return { first, second };
}

function intersects(a: { x: number; y: number; width: number; height: number },
                    b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

test.describe('Timer cover pill (Journal 2.0)', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('pill sits on the book cover and highlights the step', async ({ page }) => {
    const { first, second } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    const widget = page.locator('#timer-widget');
    await expect(widget).toBeHidden();

    await page.evaluate(() => {
      // @ts-ignore - startTimer is defined in app.js
      startTimer(1, 'Test', 2);
    });

    await expect(widget).toBeVisible();
    await expect(page.locator('.recipe-book #timer-widget')).toHaveCount(1);
    await expect(page.locator('#timer-text')).toContainText('Test: ');

    // Fully within the viewport
    const box = (await widget.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

    // Never overlaps the user identity pill
    const userBox = await page.locator('.user-info').boundingBox();
    if (userBox) {
      expect(intersects(box, userBox)).toBe(false);
    }

    // Close target is at least 28x28 at every breakpoint
    const cancelBox = (await page.locator('.timer-cancel').boundingBox())!;
    expect(cancelBox.width).toBeGreaterThanOrEqual(28);
    expect(cancelBox.height).toBeGreaterThanOrEqual(28);

    // Compact pill on the phone
    if (isPhone(page)) {
      expect(box.height).toBeLessThanOrEqual(30);
    }

    // Step 2 carries the highlight, no other step does
    const step2 = page.locator('.prep-step[data-step="2"]');
    await expect(step2).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);
    await expect(page.locator('.prep-step[data-step="1"]')).not.toHaveClass(/timer-active/);

    // Navigating to another recipe removes the highlight
    await openRecipe(page, second, 'Other Recipe');
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);
    await expect(widget).toBeVisible();

    // Navigating back restores it
    await openRecipe(page, first, 'Timer Recipe');
    await expect(page.locator('.prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);

    // Cancel hides the pill and clears the highlight
    await page.locator('.timer-cancel').click();
    await expect(widget).toBeHidden();
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);
  });

  test('timer without a step shows the pill but no highlight', async ({ page }) => {
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    await page.evaluate(() => {
      // @ts-ignore - startTimer is defined in app.js
      startTimer(1, 'No step');
    });

    await expect(page.locator('#timer-widget')).toBeVisible();
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);

    await page.locator('.timer-cancel').click();
    await expect(page.locator('#timer-widget')).toBeHidden();
  });

  test('timer started in the same turn as a recipe display binds to the new recipe', async ({ page }) => {
    const { first, second } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    // Mirror chat.js handling recipe_artifact then timer_start back to back:
    // the display is not awaited before the timer starts.
    await page.evaluate((id: string) => {
      // @ts-ignore - globals defined in app.js
      fetchAndDisplayRecipe(id);
      // @ts-ignore
      startTimer(1, 'Same turn', 2);
    }, second);

    await expect(page.locator('.recipe-title')).toContainText('Other Recipe');
    await expect(page.locator('.prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);

    // The previous recipe must not carry the highlight
    await openRecipe(page, first, 'Timer Recipe');
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);

    await page.locator('.timer-cancel').click();
  });

  test('replacing a timer moves the highlight and completion clears it', async ({ page }) => {
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    await page.evaluate(() => {
      // @ts-ignore
      startTimer(1, 'A', 2);
    });
    await expect(page.locator('.prep-step[data-step="2"]')).toHaveClass(/timer-active/);

    // A second timer replaces the first highlight
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(1, 'B', 3);
    });
    await expect(page.locator('.prep-step[data-step="3"]')).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);

    // A step-less timer removes it
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(1, 'C');
    });
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);

    // Completion clears the highlight (0.02 min = ~1.2s)
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(0.02, 'Done', 2);
    });
    await expect(page.locator('.prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    await expect(page.locator('#timer-text')).toContainText('Done!', { timeout: 10000 });
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);
  });

  test('chat "start a timer" via the mock LLM shows the pill and highlights step 2', async ({ page }) => {
    const { first } = await seedTwoRecipes(page);
    await openRecipe(page, first, 'Timer Recipe');

    await sendNote(page, 'start a timer');

    // The timer_start event is announced in the margin as its own status line
    await expect(page.locator('#page-margin .margin-note[data-kind="status"]')
      .filter({ hasText: 'Timer set' }))
      .toContainText('Timer set: Mock timer', { timeout: 10000 });

    await expect(page.locator('#timer-widget')).toBeVisible();
    await expect(page.locator('#timer-text')).toContainText('Mock timer');
    await expect(page.locator('.prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(1);

    await page.locator('.timer-cancel').click();
    await expect(page.locator('#timer-widget')).toBeHidden();
    await expect(page.locator('.prep-step.timer-active')).toHaveCount(0);
  });
});
