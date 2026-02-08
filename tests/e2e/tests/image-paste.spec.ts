import { test, expect, Page } from '@playwright/test';
import { authenticate } from './helpers';

/**
 * Create a base64 encoded test image of specified size
 */
function createTestImage(sizeInKB: number): { base64: string; mediaType: string } {
  // Create a 1x1 PNG with repeated data to reach target size
  // PNG header: 89 50 4E 47 0D 0A 1A 0A
  const pngHeader = 'iVBORw0KGgo=';

  // Calculate how much padding we need (rough estimate)
  const targetBytes = sizeInKB * 1024;
  const padding = 'A'.repeat(Math.max(0, targetBytes - 100));

  return {
    base64: pngHeader + padding,
    mediaType: 'image/png'
  };
}

/**
 * Simulate pasting an image by directly calling the paste handler logic
 */
async function pasteImage(page: Page, imageData: string, mediaType: string, sizeInBytes: number) {
  // Create a mock clipboard event with image data
  await page.evaluate(
    ({ data, type, size }) => {
      const mockFile = new File([new Uint8Array(size)], 'test-image.png', { type });
      Object.defineProperty(mockFile, 'size', { value: size });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(mockFile);

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      });

      // Store the base64 data for the mock file reader
      (window as any)._testImageData = `data:${type};base64,${data}`;

      // Mock FileReader for the test
      const originalFileReader = (window as any).FileReader;
      (window as any).FileReader = function() {
        this.readAsDataURL = function() {
          setTimeout(() => {
            this.result = (window as any)._testImageData;
            if (this.onloadend) this.onloadend();
          }, 0);
        };
      };

      const textarea = document.getElementById('message-input') as HTMLTextAreaElement;
      textarea.dispatchEvent(pasteEvent);

      // Restore original FileReader after a delay
      setTimeout(() => {
        (window as any).FileReader = originalFileReader;
      }, 100);
    },
    { data: imageData, type: mediaType, size: sizeInBytes }
  );

  // Wait for the async paste handler to complete
  await page.waitForTimeout(200);
}

test.describe('Image Paste Feature', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);

    // On mobile, switch to chat tab
    if (page.viewportSize()!.width <= 600) {
      await page.click('#tab-chat');
    }

    // Ensure message input is ready
    await expect(page.locator('#message-input')).toBeVisible();
  });

  test('small image paste shows attachment indicator', async ({ page }) => {
    const testImage = createTestImage(500); // 500KB, well under 5MB limit

    await pasteImage(page, testImage.base64, testImage.mediaType, 500 * 1024);

    // Verify attachment indicator is visible
    await expect(page.locator('#image-attachment')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('#image-attachment')).toContainText('Image attached');

    // Verify remove button is present
    await expect(page.locator('.remove-image')).toBeVisible();
  });

  test('large image paste shows error', async ({ page }) => {
    const testImage = createTestImage(6000); // 6MB, over 5MB limit

    await pasteImage(page, testImage.base64, testImage.mediaType, 6 * 1024 * 1024);

    // Verify error message is shown
    await expect(page.locator('.paste-error')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('.paste-error')).toContainText('Image too large');

    // Verify attachment indicator is NOT visible
    await expect(page.locator('#image-attachment')).not.toBeVisible();
  });

  test('remove button clears attached image', async ({ page }) => {
    const testImage = createTestImage(500);

    await pasteImage(page, testImage.base64, testImage.mediaType, 500 * 1024);

    // Verify attachment is shown
    await expect(page.locator('#image-attachment')).toBeVisible({ timeout: 2000 });

    // Click remove button
    await page.locator('.remove-image').click();

    // Verify attachment indicator is hidden
    await expect(page.locator('#image-attachment')).not.toBeVisible();
  });

  test('can send message with image only', async ({ page }) => {
    const testImage = createTestImage(500);

    await pasteImage(page, testImage.base64, testImage.mediaType, 500 * 1024);

    // Verify attachment is shown
    await expect(page.locator('#image-attachment')).toBeVisible({ timeout: 2000 });

    // Send without typing text (just press Enter)
    await page.locator('#message-input').press('Enter');

    // Verify message was sent - look for AI response
    await expect(page.locator('#messages')).toContainText('AI:', { timeout: 10000 });

    // Verify attachment indicator is cleared after send
    await expect(page.locator('#image-attachment')).not.toBeVisible();
  });

  test('can send message with text only', async ({ page }) => {
    // Type a message without pasting image
    await page.locator('#message-input').fill('What recipes do you have?');
    await page.locator('#message-input').press('Enter');

    // Verify user message appears
    await expect(page.locator('#messages')).toContainText('User: What recipes do you have?');

    // Verify AI response appears
    await expect(page.locator('#messages')).toContainText('AI:', { timeout: 10000 });
  });

  test('can send message with both image and text', async ({ page }) => {
    const testImage = createTestImage(500);

    // Paste image first
    await pasteImage(page, testImage.base64, testImage.mediaType, 500 * 1024);

    // Verify attachment is shown
    await expect(page.locator('#image-attachment')).toBeVisible({ timeout: 2000 });

    // Type accompanying text
    await page.locator('#message-input').fill('This is my grandmas recipe, can you extract it?');

    // Send message
    await page.locator('#message-input').press('Enter');

    // Verify user message appears with text
    await expect(page.locator('#messages')).toContainText('User: This is my grandmas recipe', { timeout: 5000 });

    // Verify AI response appears
    await expect(page.locator('#messages')).toContainText('AI:', { timeout: 10000 });

    // Verify attachment indicator is cleared after send
    await expect(page.locator('#image-attachment')).not.toBeVisible();
  });

  test('error message auto-dismisses after timeout', async ({ page }) => {
    const testImage = createTestImage(6000);

    await pasteImage(page, testImage.base64, testImage.mediaType, 6 * 1024 * 1024);

    // Verify error message is shown
    await expect(page.locator('.paste-error')).toBeVisible({ timeout: 2000 });

    // Wait for auto-dismiss (3 seconds)
    await page.waitForTimeout(3500);

    // Verify error is no longer visible
    await expect(page.locator('.paste-error')).not.toBeVisible();
  });

  test('multiple images - only latest is attached', async ({ page }) => {
    const firstImage = createTestImage(500);
    const secondImage = createTestImage(600);

    // Paste first image
    await pasteImage(page, firstImage.base64, firstImage.mediaType, 500 * 1024);
    await expect(page.locator('#image-attachment')).toBeVisible({ timeout: 2000 });

    // Paste second image (should replace first)
    await pasteImage(page, secondImage.base64, secondImage.mediaType, 600 * 1024);

    // Should still show only one attachment indicator
    const attachmentCount = await page.locator('#image-attachment').count();
    expect(attachmentCount).toBeLessThanOrEqual(1);

    // Verify indicator is still visible (with second image)
    await expect(page.locator('#image-attachment')).toBeVisible();
  });

  test('textarea does not receive data URL when pasting image', async ({ page }) => {
    const testImage = createTestImage(500);

    // Get initial textarea value
    const initialValue = await page.locator('#message-input').inputValue();

    await pasteImage(page, testImage.base64, testImage.mediaType, 500 * 1024);

    // Wait a moment for any potential paste to occur
    await page.waitForTimeout(200);

    // Get final textarea value
    const finalValue = await page.locator('#message-input').inputValue();

    // Verify no data URL was pasted into textarea
    expect(finalValue).not.toContain('data:image');
    expect(finalValue).toBe(initialValue);
  });

  test('can paste and send multiple times in same session', async ({ page }) => {
    // First image and send
    const firstImage = createTestImage(500);
    await pasteImage(page, firstImage.base64, firstImage.mediaType, 500 * 1024);
    await expect(page.locator('#image-attachment')).toBeVisible({ timeout: 2000 });

    await page.locator('#message-input').fill('First recipe');
    await page.locator('#message-input').press('Enter');

    await expect(page.locator('#messages')).toContainText('User: First recipe', { timeout: 5000 });
    await expect(page.locator('#image-attachment')).not.toBeVisible();

    // Wait for AI response
    await expect(page.locator('#messages')).toContainText('AI:', { timeout: 10000 });

    // Second image and send
    const secondImage = createTestImage(600);
    await pasteImage(page, secondImage.base64, secondImage.mediaType, 600 * 1024);
    await expect(page.locator('#image-attachment')).toBeVisible({ timeout: 2000 });

    await page.locator('#message-input').fill('Second recipe');
    await page.locator('#message-input').press('Enter');

    await expect(page.locator('#messages')).toContainText('User: Second recipe', { timeout: 5000 });
    await expect(page.locator('#image-attachment')).not.toBeVisible();
  });

  test('attachment indicator shows on mobile', async ({ page }) => {
    // Skip if not mobile viewport
    if (page.viewportSize()!.width > 600) {
      test.skip();
    }

    const testImage = createTestImage(500);
    await pasteImage(page, testImage.base64, testImage.mediaType, 500 * 1024);

    // Verify attachment indicator is visible on mobile
    await expect(page.locator('#image-attachment')).toBeVisible({ timeout: 2000 });

    // Verify it doesn't break layout
    const indicator = page.locator('#image-attachment');
    const box = await indicator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
