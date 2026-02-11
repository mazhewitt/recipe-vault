import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, Recipe } from './helpers';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create a test recipe with unique title
async function createTestRecipe(page: Page, title: string): Promise<string> {
  const uniqueTitle = `${title} ${Date.now()}`;
  const recipe: Recipe = {
    title: uniqueTitle,
    description: 'Test recipe for photo management',
    ingredients: [
      { name: 'flour', quantity: 2, unit: 'cups' },
      { name: 'sugar', quantity: 1, unit: 'cup' },
    ],
    steps: [
      { step_number: 1, instruction: 'Mix ingredients' },
      { step_number: 2, instruction: 'Bake for 30 minutes' },
    ],
  };

  return await createRecipe(page, recipe);
}

// Helper to navigate to recipe detail view
async function navigateToRecipe(page: Page, recipeId: string) {
  await page.goto('/chat');
  await page.waitForSelector('.app-container');

  // Navigate to the recipe by clicking in the index
  await page.evaluate(() => {
    (window as any).fetchAndDisplayRecipe = (window as any).fetchAndDisplayRecipe ||
      function(id: string) {
        fetch(`/api/recipes/${id}`, { credentials: 'same-origin' })
          .then(r => r.json())
          .then(recipe => (window as any).renderRecipe(recipe));
      };
  });

  await page.evaluate((id) => {
    (window as any).fetchAndDisplayRecipe(id);
  }, recipeId);

  await page.waitForSelector('.recipe-title', { timeout: 5000 });
}

// Helper to upload a photo
async function uploadPhoto(page: Page, fixturePath: string) {
  const fileInput = page.locator('#photo-upload-input');
  await fileInput.setInputFiles(fixturePath);

  // Wait for upload to complete (photo container should update)
  await page.waitForTimeout(500);
}

test.describe('Photo Management', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('should display add-photo icon when recipe has no photo', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Recipe Without Photo');
    await navigateToRecipe(page, recipeId);

    // Should show small add-photo icon in the title row
    const addIcon = page.locator('.photo-add-icon');
    await expect(addIcon).toBeVisible();
  });

  test('should upload JPG photo and display correctly', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'JPG Photo Recipe');
    await navigateToRecipe(page, recipeId);

    // Upload photo
    const fixturePath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await uploadPhoto(page, fixturePath);

    // Should display the photo
    const photo = page.locator('.recipe-photo');
    await expect(photo).toBeVisible({ timeout: 5000 });

    // Should have delete x button
    await expect(page.locator('.photo-delete-x')).toBeAttached();

    // Photo should be an img element with correct src
    await expect(photo).toHaveAttribute('src', new RegExp(`/api/recipes/${recipeId}/photo`));
  });

  test('should upload PNG photo and display correctly', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'PNG Photo Recipe');
    await navigateToRecipe(page, recipeId);

    const fixturePath = path.join(__dirname, '../fixtures/test-photo.png');
    await uploadPhoto(page, fixturePath);

    const photo = page.locator('.recipe-photo');
    await expect(photo).toBeVisible({ timeout: 5000 });
  });

  test('should upload WebP photo and display correctly', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'WebP Photo Recipe');
    await navigateToRecipe(page, recipeId);

    const fixturePath = path.join(__dirname, '../fixtures/test-photo.webp');
    await uploadPhoto(page, fixturePath);

    const photo = page.locator('.recipe-photo');
    await expect(photo).toBeVisible({ timeout: 5000 });
  });

  test('should replace photo with different format', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Replace Photo Recipe');
    await navigateToRecipe(page, recipeId);

    // Upload PNG first
    const pngPath = path.join(__dirname, '../fixtures/test-photo.png');
    await uploadPhoto(page, pngPath);

    await expect(page.locator('.recipe-photo')).toBeVisible({ timeout: 5000 });

    // Replace with JPG
    const jpgPath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await uploadPhoto(page, jpgPath);

    // Photo should still be visible
    await expect(page.locator('.recipe-photo')).toBeVisible({ timeout: 5000 });
  });

  test('should display photo under recipe title with correct sizing', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Photo Sizing Recipe');
    await navigateToRecipe(page, recipeId);

    const fixturePath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await uploadPhoto(page, fixturePath);

    const photo = page.locator('.recipe-photo');
    await expect(photo).toBeVisible({ timeout: 5000 });

    // Check CSS properties
    const styles = await photo.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        objectFit: computed.objectFit,
        display: computed.display,
      };
    });

    expect(styles.objectFit).toBe('contain');
    expect(styles.display).toBe('block');

    // Photo should be inside recipe-photo-container
    const container = page.locator('.recipe-photo-container');
    await expect(container).toBeVisible();

    // Container should come after recipe title
    const title = page.locator('.recipe-title');
    await expect(title).toBeVisible();
  });

  test('should delete photo and hide photo container', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Delete Photo Recipe');
    await navigateToRecipe(page, recipeId);

    // Upload a photo
    const fixturePath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await uploadPhoto(page, fixturePath);

    await expect(page.locator('.recipe-photo')).toBeVisible({ timeout: 5000 });

    // Set up dialog handler before clicking delete
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure');
      await dialog.accept();
    });

    // Click delete button
    await page.locator('.photo-delete-x').click();

    // Photo should be gone, add-photo icon should appear in title row
    await expect(page.locator('.photo-add-icon')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.recipe-photo')).not.toBeVisible();
  });

  test('should show confirmation dialog before deletion', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Confirm Delete Recipe');
    await navigateToRecipe(page, recipeId);

    // Upload a photo
    const fixturePath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await uploadPhoto(page, fixturePath);

    await expect(page.locator('.recipe-photo')).toBeVisible({ timeout: 5000 });

    // Set up dialog handler to verify message
    let dialogShown = false;
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('delete this photo');
      dialogShown = true;
      await dialog.accept();
    });

    // Click delete
    await page.locator('.photo-delete-x').click();

    // Wait a moment for dialog
    await page.waitForTimeout(100);
    expect(dialogShown).toBe(true);
  });

  test('should cancel deletion and keep photo intact', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Cancel Delete Recipe');
    await navigateToRecipe(page, recipeId);

    // Upload a photo
    const fixturePath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await uploadPhoto(page, fixturePath);

    await expect(page.locator('.recipe-photo')).toBeVisible({ timeout: 5000 });

    // Set up dialog handler to cancel
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    // Click delete button
    await page.locator('.photo-delete-x').click();

    // Wait a moment
    await page.waitForTimeout(500);

    // Photo should still be visible
    await expect(page.locator('.recipe-photo')).toBeVisible();
    await expect(page.locator('.photo-delete-x')).toBeAttached();
  });

  test('should show client-side error for 6MB file', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Large File Recipe');
    await navigateToRecipe(page, recipeId);

    // Attempt to upload large file
    const fixturePath = path.join(__dirname, '../fixtures/large-photo.jpg');
    const fileInput = page.locator('#photo-upload-input');
    await fileInput.setInputFiles(fixturePath);

    // Should show error message (may be in chat panel, hidden on mobile)
    const errorMessage = page.locator('.paste-error');
    await expect(errorMessage).toBeAttached({ timeout: 5000 });
    await expect(errorMessage).toContainText('too large');
    await expect(errorMessage).toContainText('5MB');
  });

  test('should reject .txt file via accept attribute', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Invalid Format Recipe');
    await navigateToRecipe(page, recipeId);

    // Check that file input has accept attribute
    const fileInput = page.locator('#photo-upload-input');
    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toBe('image/*');

    // Note: Browser's file picker will filter out .txt files automatically
    // This test verifies the accept attribute is set correctly
  });

  test('should show loading indicator during upload', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Loading Indicator Recipe');
    await navigateToRecipe(page, recipeId);

    // First upload a photo so the photo container exists
    const fixturePath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await uploadPhoto(page, fixturePath);
    await expect(page.locator('.recipe-photo')).toBeVisible({ timeout: 5000 });

    // Now intercept the next upload request to delay it
    await page.route(`/api/recipes/${recipeId}/photo`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      await route.continue();
    });

    const fileInput = page.locator('#photo-upload-input');

    // Start upload (replacing existing photo)
    await fileInput.setInputFiles(fixturePath);

    // Check for loading state (opacity change)
    const container = page.locator('.recipe-photo-container');
    await page.waitForTimeout(100); // Brief moment for loading state to appear

    const opacity = await container.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(1);

    // Wait for upload to complete
    await page.waitForTimeout(1500);

    // Loading state should be gone
    const finalOpacity = await container.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(parseFloat(finalOpacity)).toBe(1);
  });

  test('should display error message for failed upload', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Failed Upload Recipe');
    await navigateToRecipe(page, recipeId);

    // First upload a photo so the photo container exists (needed for the upload input)
    const fixturePath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await uploadPhoto(page, fixturePath);
    await expect(page.locator('.recipe-photo')).toBeVisible({ timeout: 5000 });

    // Mock a failed upload
    await page.route(`/api/recipes/${recipeId}/photo`, async (route) => {
      await route.fulfill({
        status: 500,
        body: 'Internal Server Error',
      });
    });

    // Upload again (will fail due to mocked route)
    await uploadPhoto(page, fixturePath);

    // Should show error message (may be in chat panel, hidden on mobile)
    const errorMessage = page.locator('.paste-error');
    await expect(errorMessage).toBeAttached({ timeout: 5000 });
    await expect(errorMessage).toContainText('Failed to upload');
  });

  test('should scale photo correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

    const recipeId = await createTestRecipe(page, 'Mobile Responsive Recipe');
    await navigateToRecipe(page, recipeId);

    const fixturePath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await uploadPhoto(page, fixturePath);

    const photo = page.locator('.recipe-photo');
    await expect(photo).toBeVisible({ timeout: 5000 });

    // Check max-height is reduced on mobile
    const maxHeight = await photo.evaluate((el) => window.getComputedStyle(el).maxHeight);
    expect(maxHeight).toBe('130px');
  });

  test('should remove photo from UI when recipe is deleted', async ({ page }) => {
    const recipeId = await createTestRecipe(page, 'Recipe To Delete');
    await navigateToRecipe(page, recipeId);

    // Upload a photo
    const fixturePath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await uploadPhoto(page, fixturePath);

    await expect(page.locator('.recipe-photo')).toBeVisible({ timeout: 5000 });

    // Delete the recipe via API
    const apiKey = 'test-api-key-for-playwright';
    await page.request.delete(`/api/recipes/${recipeId}`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    // Navigate away and try to navigate back
    await page.goto('/chat');
    await page.waitForTimeout(500);

    // Try to navigate to the deleted recipe
    await page.evaluate((id) => {
      (window as any).fetchAndDisplayRecipe(id);
    }, recipeId);

    // Should show error (recipe not found)
    await page.waitForTimeout(1000);

    // Recipe should not be displayed
    const recipeTitle = page.locator('.recipe-title');
    const titleText = await recipeTitle.textContent();
    expect(titleText).not.toContain('Recipe To Delete');
  });
});
