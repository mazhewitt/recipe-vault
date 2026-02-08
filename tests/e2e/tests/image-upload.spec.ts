import { test, expect } from '@playwright/test';
import { authenticate } from './helpers';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('Image Upload Feature', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);

    // On mobile, switch to chat tab
    if (page.viewportSize()!.width <= 600) {
      await page.click('#tab-chat');
    }

    // Ensure message input is ready
    await expect(page.locator('#message-input')).toBeVisible();
  });

  test('clicking paperclip icon opens file chooser', async ({ page }) => {
    // Create a dummy image file for uploading
    const testImagePath = path.join(os.tmpdir(), 'test-image.png');
    // Create a simple 1x1 pixel PNG
    const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, buf);

    // Set up file chooser listener
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click the paperclip button
    await page.locator('#clipboard-button').click();
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Verify attachment indicator is visible
    await expect(page.locator('#image-attachment')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#image-attachment')).toContainText('Image attached');

    // Clean up dummy file
    try { fs.unlinkSync(testImagePath); } catch (e) {}
  });

  test('uploading large image shows error', async ({ page }) => {
    // Create a dummy large file (6MB)
    const largeFilePath = path.join(os.tmpdir(), 'large-test-image.png');
    const largeBuf = Buffer.alloc(6 * 1024 * 1024, 'a');
    fs.writeFileSync(largeFilePath, largeBuf);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#clipboard-button').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(largeFilePath);

    // Verify error message is shown
    await expect(page.locator('.paste-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.paste-error')).toContainText('Image too large');

    // Verify attachment indicator is NOT visible
    await expect(page.locator('#image-attachment')).not.toBeVisible();

    // Clean up
    try { fs.unlinkSync(largeFilePath); } catch (e) {}
  });
});
