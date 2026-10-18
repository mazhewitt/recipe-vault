import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, useContentsMode, Recipe, isPhone, isTablet, line, touchGesture } from './helpers';

// Helper to create a test recipe with unique title
async function createTestRecipe(page: Page, title: string): Promise<string> {
  const uniqueTitle = `${title} ${Date.now()}`;
  const recipe: Recipe = {
    title: uniqueTitle,
    description: 'Test recipe for UI improvements',
    ingredients: [
      { name: 'flour', quantity: 2, unit: 'cups' },
    ],
    steps: [
      { step_number: 1, instruction: 'Mix ingredients' },
    ],
  };

  return await createRecipe(page, recipe);
}

// Helper to navigate to recipe detail view
async function navigateToRecipe(page: Page, recipeId: string) {
  await page.goto('/chat');
  await page.waitForSelector('.app-container');

  await page.evaluate((id) => {
    (window as any).fetchAndDisplayRecipe(id);
  }, recipeId);

  await page.waitForSelector('#page-right-content .recipe-title', { timeout: 5000 });
}

// 1x1 pixel red JPEG
const RED_DOT_JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAFA3PEY8ED5GWEZGPDpCakJEZkBQXl1UXmZicH19f3h9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3n/2wBDAFpGPDpCakJEZkBQXl1UXmZicH19f3h9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3n/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1FVWV1hZWmNkZWZnaGlqc3R1dnd4eXqGhf8hIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/oooorAP/9k=', 'base64');

test.describe('UI Improvements', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('should not show photo upload/delete controls', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Display Only Photo');
    
    // Inject a photo filename so it renders
    await page.request.post(`/api/recipes/${recipeId}/photo`, {
      headers: {
        'X-API-Key': 'test-api-key-for-playwright',
      },
      multipart: {
        photo: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: RED_DOT_JPEG,
        }
      }
    });

    await navigateToRecipe(page, recipeId);

    // Photo should be visible, in its polaroid frame on the right page,
    // floated in the title row beside the title
    const photo = page.locator('#page-right-content .recipe-title-row > .recipe-polaroid .recipe-photo');
    await expect(photo).toBeVisible({ timeout: 10000 });

    // Photo upload input should be absent
    await expect(page.locator('#photo-upload-input')).not.toBeAttached();

    // Delete button should be absent
    await expect(page.locator('.photo-delete-x')).not.toBeAttached();

    // Add photo icon should be absent
    await expect(page.locator('.photo-add-icon')).not.toBeAttached();
  });

  test('should open photo preview on click and close on overlay click', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Photo Preview Test');
    
    // Inject a photo
    await page.request.post(`/api/recipes/${recipeId}/photo`, {
      headers: {
        'X-API-Key': 'test-api-key-for-playwright',
      },
      multipart: {
        photo: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: RED_DOT_JPEG,
        }
      }
    });

    await navigateToRecipe(page, recipeId);

    const photo = page.locator('#page-right-content .recipe-polaroid .recipe-photo');
    await expect(photo).toBeVisible({ timeout: 10000 });
    await photo.click();

    // Overlay should be visible
    const overlay = page.locator('#photo-preview-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveClass(/visible/);

    // Clicking overlay should close it
    await overlay.click({ position: { x: 10, y: 10 } });
    await expect(overlay).not.toHaveClass(/visible/);
  });

  test('should close photo preview on Escape key', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Photo Preview Escape Test');
    
    // Inject a photo
    await page.request.post(`/api/recipes/${recipeId}/photo`, {
      headers: {
        'X-API-Key': 'test-api-key-for-playwright',
      },
      multipart: {
        photo: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: RED_DOT_JPEG,
        }
      }
    });

    await navigateToRecipe(page, recipeId);

    const photo = page.locator('#page-right-content .recipe-polaroid .recipe-photo');
    await expect(photo).toBeVisible({ timeout: 10000 });
    await photo.click();
    await expect(page.locator('#photo-preview-overlay')).toHaveClass(/visible/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#photo-preview-overlay')).not.toHaveClass(/visible/);
  });

  // The book header is the documented way back to the contents at every width
  test('should navigate to index when clicking "Recipe Book" header', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Header Nav Test');
    await navigateToRecipe(page, recipeId);

    // While the recipe is open, the contents column marks it as the current
    // entry — in contents mode, the one of the three spread modes that keeps
    // the contents on the left page beside an open recipe
    await useContentsMode(page);
    await expect(page.locator('#page-left-content .index-recipe-item.current')).toHaveCount(1);

    const header = page.locator('#recipe-book-header');
    await expect(header).toBeVisible();
    await expect(header).toHaveClass(/clickable/);
    await header.click();

    // Should show index
    await expect(page.locator('#page-left-content .index-title')).toBeVisible();
    await expect(page.locator('#page-left-content .index-title')).toContainText('Contents');
    await expect(page.locator('#page-left-content .index-recipe-item').first()).toBeVisible();
    // ...and the recipe is off the page
    await expect(page.locator('body')).toHaveAttribute('data-view-mode', 'index');
    await expect(page.locator('#page-right-content .recipe-title')).toHaveCount(0);
  });
});

/**
 * The photo preview on a touch screen. locator.tap(), not click(): Playwright's
 * click() sends mouse events even on a touch project, which is how a tap that
 * never opened the preview went unnoticed.
 */
test.describe('Photo preview on touch', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isPhone(page) && !isTablet(page), 'touch projects only');
    await authenticate(page);
    const recipeId = await createTestRecipe(page, 'Photo Tap Test');
    await page.request.post(`/api/recipes/${recipeId}/photo`, {
      headers: { 'X-API-Key': 'test-api-key-for-playwright' },
      multipart: { photo: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: RED_DOT_JPEG } },
    });
    await navigateToRecipe(page, recipeId);
    await expect(page.locator('#page-right-content .recipe-polaroid .recipe-photo')).toBeVisible({ timeout: 10000 });
  });

  const photo = (page: Page) => page.locator('#page-right-content .recipe-polaroid .recipe-photo');
  const overlay = (page: Page) => page.locator('#photo-preview-overlay');

  test('tapping the photo opens the preview and it stays open', async ({ page }) => {
    await photo(page).tap();
    await expect(overlay(page)).toHaveClass(/visible/);
    await expect(overlay(page)).toBeVisible();
    await page.waitForTimeout(500);
    await expect(overlay(page)).toHaveClass(/visible/);
    await expect(overlay(page)).toBeVisible();
  });

  test('tapping the overlay closes the preview and it stays closed', async ({ page }) => {
    await photo(page).tap();
    await expect(overlay(page)).toHaveClass(/visible/);
    await page.waitForTimeout(300);
    await overlay(page).tap({ position: { x: 10, y: 10 } });
    await expect(overlay(page)).not.toHaveClass(/visible/);
    await page.waitForTimeout(500);
    await expect(overlay(page)).not.toHaveClass(/visible/);
  });

  test('a 40px drag that starts on the photo opens nothing', async ({ page }) => {
    const box = (await photo(page).boundingBox())!;
    await touchGesture(page, box.x + box.width / 2, box.y + box.height / 2, line(6, -40, 0));
    await page.waitForTimeout(500);
    await expect(overlay(page)).not.toHaveClass(/visible/);
  });
});
