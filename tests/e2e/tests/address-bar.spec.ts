import { test, expect, Page } from '@playwright/test';
import { authenticate, createCookingRecipe, isPhone, openRecipe, openTab, simulateAddressBar } from './helpers';

// Android Chrome shows an address bar that hides as a page scrolls. While it
// shows, CSS `vh` is the screen without it, and only `dvh`/`svh` are the area
// actually visible. An emulator has no address bar, so a layout sized in `vh`
// passes every other test and still runs off a real phone: in v2.10.0 the note
// bar sat below a Galaxy's screen, out of reach on a page that cannot scroll.
// Every test here serves the stylesheet as that phone reads it
// (helpers.simulateAddressBar) and checks the controls the cook needs are on
// the visible screen. The desk has no collapsing address bar, so it is skipped.

async function selectMode(page: Page, mode: 'contents' | 'cook' | 'notes') {
  const tab = page.locator(`.spread-tab[data-mode="${mode}"]`);
  await expect(async () => {
    await tab.click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', mode, { timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

/** The page turn has finished (a tap during it is ignored by design). */
async function settled(page: Page) {
  await expect.poll(() => page.evaluate(async () => {
    // @ts-ignore - module path served by the app
    const M = await import('/static/page-transitions.js');
    return M.isAnimating();
  })).toBe(false);
}

/** The note input, its send button and the book's foot lie within the visible screen. */
async function expectOnScreen(page: Page, where: string) {
  const height = page.viewportSize()!.height;
  for (const sel of ['#message-input', '#send-button', '#clipboard-button', '.recipe-book']) {
    const box = await page.locator(sel).boundingBox();
    expect(box, `${where}: ${sel} is laid out`).not.toBeNull();
    expect(box!.y, `${where}: ${sel} top`).toBeGreaterThanOrEqual(-1);
    expect(box!.y + box!.height, `${where}: ${sel} runs off the screen (${height}px)`).toBeLessThanOrEqual(height + 1);
  }
}

test.describe('Under a mobile address bar', () => {
  let rewritten: () => number;

  test.beforeEach(async ({ page }) => {
    test.skip(test.info().project.name === 'chromium', 'the desk has no collapsing address bar');
    rewritten = await simulateAddressBar(page);
    await authenticate(page);
    // The simulation is in effect: the stylesheet has vh values to rewrite
    expect(rewritten(), 'no vh in the stylesheet was rewritten').toBeGreaterThan(0);
  });

  test('the contents page fits the visible screen', async ({ page }) => {
    await expectOnScreen(page, 'contents');
  });

  test('a recipe fits the visible screen in every tab and spread mode', async ({ page }) => {
    const r = await createCookingRecipe(page);
    await openRecipe(page, r.id);
    await settled(page);
    if (isPhone(page)) {
      // A recipe opens on Ingredients; then each other tab
      for (const tab of ['ingredients', 'method', 'notes'] as const) {
        if (tab !== 'ingredients') await openTab(page, tab);
        await settled(page);
        await expectOnScreen(page, `phone ${tab} tab`);
      }
    } else {
      for (const mode of ['cook', 'contents', 'notes'] as const) {
        await selectMode(page, mode);
        await expectOnScreen(page, `${mode} spread`);
      }
    }
  });
});
