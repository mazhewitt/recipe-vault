import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, Recipe } from './helpers';

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

  await page.waitForSelector('.recipe-title', { timeout: 5000 });
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

    // Photo should be visible
    const photo = page.locator('.recipe-photo');
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

    const photo = page.locator('.recipe-photo');
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

    const photo = page.locator('.recipe-photo');
    await expect(photo).toBeVisible({ timeout: 10000 });
    await photo.click();
    await expect(page.locator('#photo-preview-overlay')).toHaveClass(/visible/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#photo-preview-overlay')).not.toHaveClass(/visible/);
  });

  test('should navigate to index when clicking "Recipe Book" header', async ({ page }) => {
    const isMobile = page.viewportSize()!.width <= 600;
    if (isMobile) {
      test.skip(true, 'Header is hidden on mobile');
      return;
    }

    const recipeId = await createTestRecipe(page, 'Header Nav Test');
    await navigateToRecipe(page, recipeId);

    const header = page.locator('#recipe-book-header');
    await expect(header).toBeVisible();
    await expect(header).toHaveClass(/clickable/);
    await header.click();

    // Should show index
    await expect(page.locator('.index-title')).toBeVisible();
    await expect(page.locator('.index-title')).toContainText('Index');
    
    // We can check if the index is rendered by looking for recipe items
    await expect(page.locator('.index-recipe-item').first()).toBeVisible();
  });
});
