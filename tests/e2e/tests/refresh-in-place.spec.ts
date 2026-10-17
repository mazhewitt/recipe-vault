import { test, expect, Page } from '@playwright/test';
import {
  authenticate, createRecipe, createCookingRecipe, openRecipe, openTab, sendNote, isPhone, useContentsMode,
} from './helpers';

/**
 * family-recipe-ui › Refreshing the open recipe keeps the reader's place.
 *
 * Re-rendering the recipe already on the page - after an update_recipe, a photo
 * upload or a late difficulty - happens in place: no skeleton on any frame,
 * both pages' scroll and the phone's tab restored, and the phone book never
 * changes width. Opening a different recipe still shows the skeleton.
 */

// Minimal 1x1 red JPEG, as contents-page.spec.ts uploads
const RED_DOT_JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAFA3PEY8ED5GWEZGPDpCakJEZkBQXl1UXmZicH19f3h9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3n/2wBDAFpGPDpCakJEZkBQXl1UXmZicH19f3h9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3n/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1FVWV1hZWmNkZWZnaGlqc3R1dnd4eXqGhf8hIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/oooorAP/9k=', 'base64');

interface Watch {
  /** .skeleton elements inserted into either page's content since the watch began */
  skeletons: number;
  /** The worst gap, in px, between the viewport and the phone book's width on any frame */
  widthGap: number;
}

/**
 * Starts recording, in the page, every `.skeleton` inserted into
 * `#page-left-content` / `#page-right-content` (a MutationObserver sees a
 * skeleton even if it is replaced in the same frame) and, on every animation
 * frame, how far `.app-container` and `.recipe-book` fall short of the viewport.
 */
async function startWatch(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __watch: { skeletons: number; widthGap: number; stop: boolean } };
    w.__watch = { skeletons: 0, widthGap: 0, stop: false };
    const observer = new MutationObserver(records => {
      for (const r of records) {
        r.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches('.skeleton') || node.querySelector('.skeleton')) w.__watch.skeletons++;
        });
      }
    });
    for (const id of ['page-left-content', 'page-right-content']) {
      observer.observe(document.getElementById(id)!, { childList: true, subtree: true });
    }
    const frame = () => {
      if (w.__watch.stop) { observer.disconnect(); return; }
      const vw = document.documentElement.clientWidth;
      for (const sel of ['.app-container', '.recipe-book']) {
        const el = document.querySelector(sel);
        if (el) w.__watch.widthGap = Math.max(w.__watch.widthGap, Math.abs(vw - el.getBoundingClientRect().width));
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

async function stopWatch(page: Page): Promise<Watch> {
  return page.evaluate(() => {
    const w = window as unknown as { __watch: { skeletons: number; widthGap: number; stop: boolean } };
    w.__watch.stop = true;
    return { skeletons: w.__watch.skeletons, widthGap: w.__watch.widthGap };
  });
}

/** Scrolls both pages to a mid-method place (the Method tab on the phone) and returns the scroll. */
async function scrollToMidMethod(page: Page): Promise<{ left: number; right: number }> {
  if (isPhone(page)) await openTab(page, 'method');
  await page.locator('#page-right-content .prep-step[data-step="5"]').evaluate(el => {
    const right = document.getElementById('page-right')!;
    right.scrollTop += el.getBoundingClientRect().top - right.getBoundingClientRect().top - 40;
    const left = document.getElementById('page-left')!;
    left.scrollTop = left.scrollHeight;
  });
  await page.waitForTimeout(200);
  const scroll = await readScroll(page);
  expect(scroll.right, 'the right page has to be scrolled for the check to mean anything').toBeGreaterThan(0);
  return scroll;
}

async function readScroll(page: Page): Promise<{ left: number; right: number }> {
  return page.evaluate(() => ({
    left: document.getElementById('page-left')!.scrollTop,
    right: document.getElementById('page-right')!.scrollTop,
  }));
}

/** The in-place contract, checked after a refresh has landed. */
async function expectInPlace(page: Page, watch: Watch, scroll: { left: number; right: number }) {
  expect(watch.skeletons, 'a .skeleton was inserted during the refresh').toBe(0);
  const after = await readScroll(page);
  expect(Math.abs(after.right - scroll.right), '#page-right.scrollTop').toBeLessThanOrEqual(1);
  if (isPhone(page)) {
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method');
    expect(watch.widthGap, 'phone book width on every frame').toBeLessThanOrEqual(1);
  } else {
    expect(Math.abs(after.left - scroll.left), '#page-left.scrollTop').toBeLessThanOrEqual(1);
  }
}

test.describe('Refreshing the open recipe keeps the reader\'s place', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('an update_recipe refreshes in place', async ({ page }) => {
    const recipe = await createCookingRecipe(page);
    await openRecipe(page, recipe.id);
    await expect(page.locator('.meta-serves')).toHaveText('serves 4');
    const scroll = await scrollToMidMethod(page);

    await startWatch(page);
    // The mock LLM answers "halve" with update_recipe (servings: 2)
    await sendNote(page, 'halve it');
    await expect(page.locator('#page-right-content .meta-serves')).toHaveText('serves 2', { timeout: 10000 });
    await page.waitForTimeout(300);
    await expectInPlace(page, await stopWatch(page), scroll);
  });

  test('a refresh in contents mode keeps the contents where the reader left them', async ({ page }) => {
    test.skip(isPhone(page), 'no spread modes at ≤600px');
    // Enough entries that the contents column scrolls
    const suffix = Date.now();
    for (let i = 0; i < 30; i++) {
      await createRecipe(page, { title: `Filler ${String(i).padStart(2, '0')} ${suffix}`, ingredients: [], steps: [], difficulty: 1 });
    }
    const recipe = await createCookingRecipe(page);
    await openRecipe(page, recipe.id);
    await useContentsMode(page);
    await expect(page.locator('#page-left-content .index-recipe-item.current')).toHaveCount(1);
    // renderIndex scrolls the column to the current entry; the reader then
    // scrolls it somewhere else, and that is the place a refresh must keep
    // (near the top: "Steady Stew" sorts after every filler, so the current
    // entry is near the foot and a reset would land far from here)
    await scrollToMidMethod(page);
    await page.locator('#page-left').evaluate(el => { el.scrollTop = 60; });
    const scroll = await readScroll(page);
    expect(scroll.left, 'the contents have to scroll for the check to mean anything').toBeGreaterThan(0);

    await startWatch(page);
    await sendNote(page, 'halve it');
    await expect(page.locator('#page-right-content .meta-serves')).toHaveText('serves 2', { timeout: 10000 });
    // The contents are re-drawn after the recipe, once the list has been re-read
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    await expectInPlace(page, await stopWatch(page), scroll);
  });

  test('a photo upload refreshes in place', async ({ page }) => {
    const recipe = await createCookingRecipe(page);
    await openRecipe(page, recipe.id);
    await expect(page.locator('#page-right-content .recipe-photo')).toHaveCount(0);
    await scrollToMidMethod(page);

    // The add-photo button opens the hidden file input, as the cook would.
    // Reaching it scrolls the page up to the meta line, so the place to keep
    // is the one the page has when the upload starts, not step 5.
    const chooser = page.waitForEvent('filechooser');
    await page.locator('#page-right-content .add-photo-btn').click();
    const fileChooser = await chooser;
    await page.locator('#page-right').evaluate(el => { el.scrollTop += 120; });
    const scroll = await readScroll(page);
    expect(scroll.right).toBeGreaterThan(0);

    await startWatch(page);
    await fileChooser.setFiles({ name: 'dot.jpg', mimeType: 'image/jpeg', buffer: RED_DOT_JPEG });
    await expect(page.locator('#page-right-content .recipe-photo')).toHaveCount(1, { timeout: 10000 });
    await page.waitForTimeout(300);
    await expectInPlace(page, await stopWatch(page), scroll);
  });

  test('a late difficulty lands in its reserved slot without a refresh skeleton', async ({ page }) => {
    const recipe = await createCookingRecipe(page);
    // The page's first read says the difficulty is not assessed yet, and every
    // later read (the 3s poll) says it is. Not the backend's backfill, which
    // races: see .scratch/recipe-create-spawns-two-racing-writers/.
    let reads = 0;
    await page.route(`**/api/recipes/${recipe.id}`, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      const body = await response.json();
      body.difficulty = reads++ === 0 ? null : 3;
      await route.fulfill({ response, json: body });
    });
    await openRecipe(page, recipe.id);

    // The slot is there, empty, and as wide as a full one
    const slot = page.locator('#page-right-content .recipe-meta-line .meta-difficulty');
    await expect(slot).toHaveCount(1);
    await expect(slot.locator('.difficulty-dot')).toHaveCount(0);
    const scroll = await scrollToMidMethod(page);

    const boxes = () => page.evaluate(() => {
      const right = document.getElementById('page-right-content')!;
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height];
      };
      const line = right.querySelector('.recipe-meta-line')!;
      return {
        line: box(line),
        slot: box(line.querySelector('.meta-difficulty')!),
        others: Array.from(line.children).filter(el => !el.matches('.meta-difficulty')).map(box),
        steps: Array.from(right.querySelectorAll('.prep-step')).map(box),
      };
    });
    const before = await boxes();

    await startWatch(page);
    await expect(slot.locator('.difficulty-dot.filled')).toHaveCount(3, { timeout: 10000 });
    await page.waitForTimeout(300);
    await expectInPlace(page, await stopWatch(page), scroll);

    const after = await boxes();
    const delta = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    expect(delta(after.line, before.line), 'meta line box').toBeLessThanOrEqual(1);
    expect(delta(after.slot, before.slot), 'difficulty slot box').toBeLessThanOrEqual(1);
    expect(after.others).toHaveLength(before.others.length);
    after.others.forEach((b, i) => expect(delta(b, before.others[i]), `meta item ${i}`).toBeLessThanOrEqual(1));
    after.steps.forEach((b, i) => expect(delta(b, before.steps[i]), `step ${i + 1}`).toBeLessThanOrEqual(1));
  });

  test('opening a different, uncached recipe still shows the skeleton', async ({ page }) => {
    const first = await createCookingRecipe(page);
    const second = await createRecipe(page, {
      title: `Other Recipe ${Date.now()}`,
      ingredients: [{ name: 'salt', quantity: 1, unit: 'pinch' }],
      steps: [{ step_number: 1, instruction: 'Season' }],
      difficulty: 2,
    });
    await openRecipe(page, first.id);

    // Hold the second recipe's read, so the skeleton has time to be seen
    await page.route(`**/api/recipes/${second}`, async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.continue();
    });
    await startWatch(page);
    await page.evaluate((id) => {
      // @ts-ignore - fetchAndDisplayRecipe is exposed by app.js
      fetchAndDisplayRecipe(id);
    }, second);
    await expect(page.locator('#page-right-content .skeleton').first()).toBeVisible();
    await expect(page.locator('#page-right-content .recipe-title')).toContainText('Other Recipe', { timeout: 10000 });
    const watch = await stopWatch(page);
    expect(watch.skeletons).toBeGreaterThan(0);
    // The phone book keeps its width while the skeleton stands in for the page
    if (isPhone(page)) expect(watch.widthGap, 'phone book width on every frame').toBeLessThanOrEqual(1);
  });
});
