import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, openRecipe, isPhone, isTablet, useContentsMode, Recipe } from './helpers';

const RECIPE: Recipe = {
  title: 'Responsive Test Recipe',
  description: 'Test for the book-only layout',
  ingredients: [{ name: 'test ingredient', quantity: 1 }],
  steps: [{ step_number: 1, instruction: 'test step' }],
  difficulty: 3,
};

async function seedAndOpen(page: Page): Promise<void> {
  const recipeId = await createRecipe(page, { ...RECIPE, title: `${RECIPE.title} ${Date.now()}` });
  await openRecipe(page, recipeId);
}

test.describe('Responsive Layout (book only)', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('the notepad column and the mobile tab bar are gone', async ({ page }) => {
    for (const gone of ['#tab-book', '#tab-chat', '.mobile-tab-bar', '.mobile-tab',
                        '.notepad-container', '.notepad', '#messages', '.text-input']) {
      await expect(page.locator(gone), `${gone} must not exist`).toHaveCount(0);
    }

    // The note input is the single chat surface, and it lives in the book column
    await expect(page.locator('.book-container > form.note-input#note-input')).toHaveCount(1);
    await expect(page.locator('#message-input')).toBeVisible();
    await expect(page.locator('#send-button')).toBeVisible();
  });

  test('phone shows the paper tabs and the note input below the book', async ({ page }) => {
    test.skip(!isPhone(page), 'phone layout only');
    await seedAndOpen(page);

    // Paper tabs on the page's top edge; the desktop edge tabs stay hidden
    const paperTabs = page.locator('.page-tabs');
    await expect(paperTabs).toBeVisible();
    await expect(page.locator('.page-tab')).toHaveCount(3);
    await expect(page.locator('.page-tab[data-tab="ingredients"]')).toHaveClass(/active/);
    await expect(page.locator('.edge-tabs')).toBeHidden();

    // The note input is a static bar beneath the book, not a slip on the page
    const position = await page.locator('.note-input').evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('static');
    const book = (await page.locator('.recipe-book').boundingBox())!;
    const input = (await page.locator('.note-input').boundingBox())!;
    expect(input.y).toBeGreaterThanOrEqual(book.y + book.height - 1);
    expect(input.width).toBeGreaterThan(page.viewportSize()!.width * 0.9);

    // 44px touch targets on the send and attach buttons
    for (const sel of ['#send-button', '#clipboard-button']) {
      const box = (await page.locator(sel).boundingBox())!;
      expect(box.height, `${sel} height`).toBeGreaterThanOrEqual(44);
      expect(box.width, `${sel} width`).toBeGreaterThanOrEqual(44);
    }

    // One page at a time: the contents page is not on screen while a recipe is open
    await expect(page.locator('#page-left')).toBeHidden();
    await expect(page.locator('#page-right')).toBeVisible();
    await expect(page.locator('#page-right-content')).toContainText('test ingredient');

    // Nothing overflows sideways
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
  });

  test('the user chip shows on the contents page, and on the phone only there', async ({ page }) => {
    // web-chat › Logout UI: on the phone, Logout stays off the cooking screens
    await expect(page.locator('.user-info')).toBeVisible();
    await expect(page.locator('.logout-link')).toBeVisible();
    await seedAndOpen(page);
    if (isPhone(page)) {
      await expect(page.locator('.user-info')).toBeHidden();
      await page.click('#recipe-book-header');
      await expect(page.locator('.index-title')).toBeVisible();
      await expect(page.locator('.user-info')).toBeVisible();
    } else {
      await expect(page.locator('.user-info')).toBeVisible();
    }
  });

  test('hiding the chip on the phone moves nothing', async ({ page }) => {
    // web-chat › Logout UI › Hiding the chip on the phone moves nothing
    test.skip(!isPhone(page), 'the chip only hides at ≤600px');
    await createRecipe(page, { ...RECIPE, title: `${RECIPE.title} ${Date.now()}` });
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();
    await expect(page.locator('.user-info')).toBeVisible();

    // Out of the flow, or keeping its slot while it is not displayed
    const chip = () => page.locator('.user-info').evaluate(el => {
      const cs = getComputedStyle(el);
      return { position: cs.position, display: cs.display, visibility: cs.visibility };
    });

    // Every frame's book box, and every layout shift, through both turns
    await page.evaluate(() => {
      const w = window as any;
      w.__bookBoxes = [];
      w.__shifts = [];
      new PerformanceObserver(list => {
        for (const entry of list.getEntries() as any[]) {
          const sources = (entry.sources || []).map((s: any) => s.node && s.node instanceof Element
            ? `${s.node.tagName.toLowerCase()}.${s.node.className}` : '');
          w.__shifts.push({ value: entry.value, sources });
        }
      }).observe({ type: 'layout-shift', buffered: false });
      const sample = () => {
        const r = document.querySelector('.book-container')!.getBoundingClientRect();
        w.__bookBoxes.push([r.x, r.y, r.width, r.height]);
        requestAnimationFrame(sample);
      };
      sample();
    });
    const entry = page.locator('.index-recipe-item', { hasText: RECIPE.title }).last();
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await expect(page.locator('#page-right-content .recipe-title')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.user-info')).toBeHidden();
    const hidden = await chip();
    const outOfFlow = ['absolute', 'fixed'].includes(hidden.position);
    const keepsSlot = hidden.display !== 'none' && hidden.visibility === 'hidden';
    expect(outOfFlow || keepsSlot, `.user-info hidden as ${JSON.stringify(hidden)}`).toBe(true);
    await page.waitForTimeout(600);
    await page.click('#recipe-book-header');
    await expect(page.locator('.index-title')).toBeVisible();
    await expect(page.locator('.user-info')).toBeVisible();
    await page.waitForTimeout(600);

    const { boxes, shifts } = await page.evaluate(() => ({
      boxes: (window as any).__bookBoxes as number[][],
      shifts: (window as any).__shifts as Array<{ value: number; sources: string[] }>,
    }));
    const base = boxes[0];
    const drift = Math.max(...boxes.map(b => Math.max(...b.map((v, i) => Math.abs(v - base[i])))));
    expect(drift, `.book-container moved ${drift.toFixed(1)}px`).toBeLessThanOrEqual(1);
    const bookShifts = shifts.filter(s => s.sources.some(src => /app-container|book-container/.test(src)));
    expect(bookShifts, JSON.stringify(bookShifts)).toEqual([]);
  });

  test('the tablet slip gives the page number\'s room to the textarea', async ({ page }) => {
    // family-recipe-ui › Note input lives in the book
    test.skip(!isTablet(page), 'tablet band only');
    await seedAndOpen(page);
    await expect(page.locator('.note-page-number')).toBeHidden();
    expect(await page.locator('.note-page-number').evaluate(el => getComputedStyle(el).display)).toBe('none');

    // The placeholder is shown in full: it fits the textarea's content box on one line
    const fit = await page.locator('#message-input').evaluate((el) => {
      const ta = el as HTMLTextAreaElement;
      const cs = getComputedStyle(ta);
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const content = ta.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return { text: ctx.measureText(ta.placeholder).width, content, scrollWidth: ta.scrollWidth, clientWidth: ta.clientWidth };
    });
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
    expect(fit.text, JSON.stringify(fit)).toBeLessThanOrEqual(fit.content);

    // The freed slot is the textarea's: at 810px it is 217px wide, where it
    // was 164px beside the page number. A placeholder-length question fits it.
    // (The spec's 40-character note does not: see the fixme case below.)
    expect(await page.locator('#message-input').evaluate(el => el.clientWidth)).toBeGreaterThanOrEqual(210);
    const before = (await page.locator('#note-input').boundingBox())!;
    await page.locator('#message-input').fill('how long should it rest?');
    await page.waitForTimeout(200);
    const after = (await page.locator('#note-input').boundingBox())!;
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
  });

  // family-recipe-ui › Note input lives in the book › The tablet slip gives the
  // page number's room to the textarea: "typing a 40-character note leaves
  // #note-input's height unchanged" (design G4). NOT MET: at 810px the row is
  // pencil 16 + textarea 217 + two 44px buttons + gaps; 40 characters of Kalam
  // at 16px need ~300px. Meeting it needs a design decision (drop or move a
  // control, widen the slip past the spine, or a font under iOS's 16px
  // no-zoom size) - escalated to the change owner. Kept as fixme so the
  // scenario is visibly unmet rather than quietly weakened.
  test.fixme('the tablet slip holds a 40-character note on one line', async ({ page }) => {
    test.skip(!isTablet(page), 'tablet band only');
    await seedAndOpen(page);
    const before = (await page.locator('#note-input').boundingBox())!;
    await page.locator('#message-input').fill('Can I swap the beef for lamb in this one?');
    await page.waitForTimeout(200);
    const after = (await page.locator('#note-input').boundingBox())!;
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
  });

  test('the page number stays on the slip above 1024px', async ({ page }) => {
    // family-recipe-ui › Note input lives in the book › Page number follows the open page
    test.skip(isPhone(page) || isTablet(page), 'wider than 1024px only');
    await seedAndOpen(page);
    await expect(page.locator('.note-page-number')).toBeVisible();
    await expect(page.locator('.note-page-number')).toHaveText(/^p\. \d+$/);
  });

  test('phone hides both tab strips on the contents page', async ({ page }) => {
    test.skip(!isPhone(page), 'phone layout only');
    await seedAndOpen(page);
    await expect(page.locator('.page-tabs')).toBeVisible();

    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible();

    await expect(page.locator('.page-tabs')).toBeHidden();
    await expect(page.locator('.edge-tabs')).toBeHidden();
    // The contents page is the visible page now
    await expect(page.locator('#page-left')).toBeVisible();
    await expect(page.locator('#note-page-number')).toHaveText('p. 1');
  });

  test('desktop shows the edge tabs, and the slip sits at the foot of the left page', async ({ page }) => {
    test.skip(isPhone(page), 'wide layout only');
    await seedAndOpen(page);
    // Contents mode: the contents on the left, the recipe's title and method
    // on the right as in every mode, the ribbon strip on the outer edge.
    await useContentsMode(page);

    // Edge ribbons on the book's outer edge; the phone paper tabs stay hidden.
    // Two of them: Notes is a left-page spread mode now, not a section.
    await expect(page.locator('.edge-tabs')).toBeVisible();
    await expect(page.locator('.edge-tab')).toHaveCount(2);
    await expect(page.locator('.page-tabs')).toBeHidden();

    // Contents mode keeps the slip: it has one home in every mode
    await expect(page.locator('.note-input')).toBeVisible();

    // The recipe's title and method are on the right page, without the
    // ingredients (cook mode's left page), and the contents are on the left
    await expect(page.locator('#page-right-content .recipe-title')).toBeVisible();
    await expect(page.locator('#page-right-content .tab-panel[data-tab="method"]')).toBeVisible();
    await expect(page.locator('#page-right-content')).not.toContainText('test ingredient');
    await expect(page.locator('#page-left-content .index-recipe-item.current')).toHaveCount(1);

    // Back in cook mode the slip is a pinned absolute over the foot of the LEFT
    // page — the one position it holds in every state, so that clicking into
    // it cannot move it
    await page.locator('.spread-tab[data-mode="cook"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook');
    const position = await page.locator('.note-input').evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('absolute');
    const input = (await page.locator('.note-input').boundingBox())!;
    const pages = (await page.locator('.pages-container').boundingBox())!;
    const leftPage = (await page.locator('#page-left').boundingBox())!;
    // Left of the spine...
    expect(input.x + input.width).toBeLessThanOrEqual(pages.x + pages.width / 2);
    // ...and over the page rather than below the book
    expect(input.y).toBeLessThan(leftPage.y + leftPage.height);
  });

  test('desktop hides the edge tabs on the contents page', async ({ page }) => {
    test.skip(isPhone(page), 'wide layout only');
    await seedAndOpen(page);
    await useContentsMode(page);
    await expect(page.locator('.edge-tabs')).toBeVisible();

    await page.locator('#recipe-book-header').click();
    await expect(page.locator('.index-title')).toBeVisible();

    await expect(page.locator('.edge-tabs')).toBeHidden();
    await expect(page.locator('.page-tabs')).toBeHidden();
  });

  test('tablet: the reply sits on the sticky above the slip', async ({ page }) => {
    test.skip(!isTablet(page), 'the 601-1024px band; the ipad project supplies it');
    // Runs at the project viewport (ipad: 810x1080) rather than resizing, so the
    // tablet CSS is exercised as a real device sees it. Book full width, the
    // reply on the sticky above the slip, edge ribbons still shown.
    // viewport-contract.spec.ts guarantees a project is in this band, so this
    // skip cannot go silent.
    const recipeId = await createRecipe(page, {
      title: `Tablet Layout ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
      steps: Array.from({ length: 14 }, (_, i) => ({
        step_number: i + 1,
        instruction: `Step ${i + 1}: stir the mixture slowly and evenly until smooth`,
      })),
      difficulty: 3,
    });
    await openRecipe(page, recipeId);

    await expect(page.locator('.edge-tabs')).toBeVisible();
    await expect(page.locator('.page-tabs')).toBeHidden();

    await page.locator('#message-input').fill('hello tablet');
    await page.locator('#message-input').press('Enter');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toHaveCount(1, { timeout: 10000 });

    // The same place in cook and contents modes: above the slip, on the left page
    for (const mode of ['cook', 'contents']) {
      if (mode === 'contents') await useContentsMode(page);
      const g = await page.evaluate(() => {
        const r = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        return {
          sticky: r('page-margin'), input: r('note-input'), left: r('page-left'), right: r('page-right'),
          inRight: !!document.getElementById('page-margin')!.closest('#page-right'),
        };
      });
      expect(g.inRight).toBe(false);
      expect(g.input.top - g.sticky.bottom).toBeGreaterThanOrEqual(-0.5);
      expect(g.input.top - g.sticky.bottom).toBeLessThanOrEqual(8.5);
      expect(g.sticky.left).toBeGreaterThanOrEqual(g.left.left - 0.5);
      expect(g.sticky.right).toBeLessThanOrEqual(g.right.left + 0.5);
    }

    // The note input is still a slip over the page at this width
    const position = await page.locator('.note-input').evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('absolute');
  });
});
