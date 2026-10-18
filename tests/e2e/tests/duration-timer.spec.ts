import { test, expect, Page } from '@playwright/test';
import {
  authenticate, chimes, createCookingRecipe, expectHitArea, installAudioStub, isPhone, openRecipe, openTab,
} from './helpers';

/**
 * cooking-guidance › A step's duration starts its timer. One test per scenario.
 * Steps 3 and 4 of the cooking fixture carry 8 and 2 minute durations.
 */

async function openDurationRecipe(page: Page) {
  const recipe = await createCookingRecipe(page, { durations: { 3: 8, 4: 2 } });
  await openRecipe(page, recipe.id);
  await expect(page.locator(`#page-right-content .recipe-title`)).toHaveText(recipe.title);
  await expect(page.locator('#page-right-content .prep-step[data-step="3"] .step-duration')).toHaveCount(1);
  if (isPhone(page)) {
    await openTab(page, 'method');
    await page.waitForTimeout(400); // the tab crossfade holds the animation lock
  }
  return recipe;
}

function chip(page: Page, step: number) {
  return page.locator(`#page-right-content .prep-step[data-step="${step}"] .step-duration`);
}

const label = (page: Page) => page.locator('#timer-widget .timer-label');

test.describe("A step's duration starts its timer", () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('the duration is a button', async ({ page }) => {
    await openDurationRecipe(page);
    const button = chip(page, 3);
    await expect(button).toHaveText('8 min');
    expect(await button.evaluate((el) => el.tagName)).toBe('BUTTON');
    await expect(button).toHaveAttribute('type', 'button');
    await expect(button).toHaveAttribute('aria-label', 'Start a 8 minute timer for step 3');
    expect(await button.evaluate((el) => getComputedStyle(el).fontSize)).toBe('15px');
    await button.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expectHitArea(page, '#page-right-content .prep-step[data-step="3"] .step-duration');

    // The step's box is the one the former span gave it
    const step = page.locator('#page-right-content .prep-step[data-step="3"]');
    const withButton = (await step.boundingBox())!;
    const chipLook = await button.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color, pad: cs.padding, radius: cs.borderRadius, border: cs.borderTopWidth };
    });
    await button.evaluate((el) => {
      const span = document.createElement('span');
      span.className = 'step-duration';
      span.textContent = el.textContent;
      el.replaceWith(span);
    });
    const withSpan = (await step.boundingBox())!;
    const spanLook = await page.locator('#page-right-content .prep-step[data-step="3"] span.step-duration').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color, pad: cs.padding, radius: cs.borderRadius, border: cs.borderTopWidth };
    });
    for (const k of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(withButton[k] - withSpan[k]), `step ${k}`).toBeLessThanOrEqual(1);
    }
    expect(chipLook).toEqual(spanLook);
  });

  test('tapping it starts a local timer', async ({ page }) => {
    await openDurationRecipe(page);
    let chatRequests = 0;
    await page.route('**/api/chat', (route) => { chatRequests++; return route.abort(); });
    const step = page.locator('#page-right-content .prep-step[data-step="3"]');
    const mark = await step.getAttribute('aria-current');

    await chip(page, 3).click();
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'running');
    await expect(label(page)).toHaveText('Step 3');
    await expect(page.locator('#timer-widget .timer-time')).toHaveText(/^(8:00|7:5\d)$/);
    await expect(step).toHaveClass(/timer-active/);
    expect(await step.getAttribute('aria-current')).toBe(mark);
    await page.waitForTimeout(300);
    expect(chatRequests).toBe(0);
    await page.locator('.timer-cancel').click();
  });

  test('a running timer is not replaced by one tap', async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await openDurationRecipe(page);
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(10, 'Simmer', 2);
    });
    const widget = page.locator('#timer-widget');
    const box = (await widget.boundingBox())!;

    await chip(page, 3).click();
    await expect(label(page)).toHaveText('Tap again to replace');
    await expect(chip(page, 3)).toHaveAttribute('data-confirm', '');
    await expect(page.locator('#page-right-content .prep-step[data-step="2"]')).toHaveClass(/timer-active/);
    const confirmBox = (await widget.boundingBox())!;
    for (const k of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(confirmBox[k] - box[k]), `pill ${k}`).toBeLessThanOrEqual(1);
    }
    // The prompt is readable in full: the label gets the pill to itself
    await expect(page.locator('#timer-widget .timer-time')).toHaveCount(0);
    const fit = await label(page).evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(fit.scroll, `"Tap again to replace" is cut off: ${JSON.stringify(fit)}`).toBeLessThanOrEqual(fit.client);

    // A second tap within the window replaces it
    await chip(page, 3).click();
    await expect(label(page)).toHaveText('Step 3');
    await expect(page.locator('#timer-widget .timer-time')).toHaveText('8:00');
    await expect(chip(page, 3)).not.toHaveAttribute('data-confirm');
    await expect(page.locator('#page-right-content .prep-step[data-step="3"]')).toHaveClass(/timer-active/);

    // Without a second tap the window closes after 4 seconds
    await chip(page, 4).click();
    await expect(label(page)).toHaveText('Tap again to replace');
    await expect(chip(page, 4)).toHaveAttribute('data-confirm', '');
    await page.clock.runFor(4100);
    await expect(label(page)).toHaveText('Step 3');
    await expect(page.locator('#timer-widget .timer-time'), 'the running timer kept counting').toHaveText(/^7:5\d$/);
    await expect(chip(page, 4)).not.toHaveAttribute('data-confirm');
    await chip(page, 4).click();
    await expect(label(page)).toHaveText('Tap again to replace');
    await page.locator('.timer-cancel').click();
  });

  test('a finished timer is replaced at once', async ({ page }) => {
    await installAudioStub(page);
    await page.clock.install();
    await page.reload();
    await openDurationRecipe(page);
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(0.5, 'Simmer', 2);
    });
    await page.clock.runFor(31 * 1000);
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'done');
    await chip(page, 4).click();
    await expect(page.locator('#timer-widget')).toHaveAttribute('data-state', 'running');
    await expect(label(page)).toHaveText('Step 4');
    await expect(chip(page, 4)).not.toHaveAttribute('data-confirm');
    // The finished timer is acknowledged: its chime repeats stop
    const after = await chimes(page);
    await page.clock.runFor(60 * 1000);
    expect(await chimes(page), 'the finished chime kept repeating over the new timer').toBe(after);
    await page.locator('.timer-cancel').click();
  });

  test('the confirm belongs to the recipe it was asked on', async ({ page }) => {
    await page.clock.install();
    await page.reload();
    const first = await openDurationRecipe(page);
    const second = await createCookingRecipe(page, { durations: { 3: 8, 4: 2 } });
    await page.evaluate(() => {
      // @ts-ignore
      startTimer(10, 'Simmer', 5);
    });
    await chip(page, 3).click();
    await expect(label(page)).toHaveText('Tap again to replace');
    const asked = await page.evaluate(() => Date.now());

    await openRecipe(page, second.id);
    await expect(page.locator('#page-right-content .recipe-title')).toHaveText(second.title);
    if (isPhone(page)) {
      await openTab(page, 'method');
      await page.waitForTimeout(400);
    }
    await chip(page, 3).click();
    const tapped = await page.evaluate(() => Date.now());
    expect(tapped - asked, 'the second tap must land inside the 4-second window').toBeLessThan(4000);
    await expect(label(page), `step 3 of ${first.title} was confirmed, not this recipe's`).toHaveText('Tap again to replace');
    await page.locator('.timer-cancel').click();
  });

  test('duration buttons are inert during a page turn', async ({ page }) => {
    // The phone's tab crossfade takes the animation lock inside the tap, so a
    // chip tap can be landed inside it deterministically; a page turn above
    // 600px takes the lock only once the recipe list has come back, and by the
    // time an observer sees it the page may already be redrawn.
    test.skip(!isPhone(page), 'the lock is only taken synchronously by the phone tab crossfade');
    await openDurationRecipe(page);
    const started = await page.evaluate(() => {
      (document.querySelector('.page-tab[data-tab="ingredients"]') as HTMLElement).click();
      (document.querySelector('#page-right-content .prep-step[data-step="3"] .step-duration') as HTMLElement).click();
      return getComputedStyle(document.getElementById('timer-widget')!).display !== 'none';
    });
    expect(started).toBe(false);
    await page.waitForTimeout(1000);
    await expect(page.locator('#timer-widget')).toBeHidden();
  });
});
