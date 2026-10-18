import { test, expect, Page } from '@playwright/test';
import {
  authenticate,
  createCookingRecipe,
  createRecipe,
  expectHitArea,
  isPhone,
  notesThread,
  openNotesView,
  openRecipe,
  openTab,
  paceChat,
  sendNote,
  threadEntries,
  useContentsMode,
} from './helpers';

/**
 * web-chat › The latest reply is a sticky note above the input, A turn keeps
 * the slip still and the input live, and Status lines speak the cook's
 * language. `#page-margin` is the sticky: one note, directly above the slip.
 */

const sticky = (page: Page) => page.locator('#page-margin');
const stickyNote = (page: Page) => page.locator('#page-margin .margin-note');

async function newRecipe(page: Page, name: string): Promise<string> {
  return createRecipe(page, {
    title: `${name} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
    steps: [{ step_number: 1, instruction: 'Mix' }],
    servings: 4,
    // Assessed already, so no difficulty refresh re-renders the page mid-test
    difficulty: 3,
  } as Parameters<typeof createRecipe>[1]);
}

/** Selects a spread mode, retrying through a page turn's animation lock. */
async function selectMode(page: Page, mode: 'contents' | 'cook' | 'notes') {
  const tab = page.locator(`.spread-tab[data-mode="${mode}"]`);
  await expect(async () => {
    await tab.click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', mode, { timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

/** Everything the geometry scenarios assert, read in one go. */
async function geometry(page: Page) {
  return page.evaluate(() => {
    const box = (sel: string) => {
      const r = document.querySelector(sel)!.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    const margin = document.getElementById('page-margin')!;
    return {
      position: getComputedStyle(margin).position,
      inPageRight: !!margin.closest('#page-right'),
      sticky: box('#page-margin'),
      input: box('#note-input'),
      pageLeft: box('#page-left'),
      pageRight: box('#page-right'),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
}

function expectAboveTheSlip(g: Awaited<ReturnType<typeof geometry>>, phone: boolean) {
  expect(g.inPageRight).toBe(false);
  expect(['absolute', 'fixed']).toContain(g.position);
  const gap = g.input.top - g.sticky.bottom;
  expect(gap, 'sticky bottom 0-8px above the slip').toBeGreaterThanOrEqual(-0.5);
  expect(gap, 'sticky bottom 0-8px above the slip').toBeLessThanOrEqual(8.5);
  if (phone) {
    expect(g.sticky.left).toBeGreaterThanOrEqual(0);
    expect(g.sticky.right).toBeLessThanOrEqual(g.viewport.width);
    expect(g.sticky.top).toBeGreaterThanOrEqual(0);
  } else {
    expect(g.sticky.left).toBeGreaterThanOrEqual(g.pageLeft.left - 0.5);
    expect(g.sticky.right).toBeLessThanOrEqual(g.pageLeft.right + 0.5);
    // ...so it cannot intersect the right page
    expect(g.sticky.right).toBeLessThanOrEqual(g.pageRight.left + 0.5);
  }
}

test.describe('The reply sticky', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('sits directly above the slip with a recipe open, in every spread mode but notes', async ({ page }) => {
    const id = await newRecipe(page, 'Sticky Geometry');
    await openRecipe(page, id);
    await sendNote(page, 'hello sticky');
    await expect(stickyNote(page)).toContainText('mock assistant', { timeout: 10000 });
    await expect(stickyNote(page)).toHaveCount(1);

    const modes = isPhone(page) ? [null] : (['cook', 'contents'] as const);
    for (const mode of modes) {
      if (mode) await selectMode(page, mode);
      await expect(sticky(page)).toBeVisible();
      expectAboveTheSlip(await geometry(page), isPhone(page));
    }
  });

  test('sits directly above the slip on the contents page', async ({ page }) => {
    await newRecipe(page, 'Sticky Contents');
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();
    await sendNote(page, 'hello contents');
    await expect(stickyNote(page)).toContainText('mock assistant', { timeout: 10000 });
    await expect(sticky(page)).toBeVisible();
    expectAboveTheSlip(await geometry(page), isPhone(page));
  });

  test('looks like a sticky note: yellow paper, Kalam in biro blue', async ({ page }) => {
    const id = await newRecipe(page, 'Sticky Look');
    await openRecipe(page, id);
    await sendNote(page, 'hello look');
    await expect(stickyNote(page)).toContainText('mock assistant', { timeout: 10000 });
    const look = await page.evaluate(() => {
      const probe = (v: string) => {
        const el = document.createElement('div');
        el.style.color = `var(${v})`;
        document.body.appendChild(el);
        const c = getComputedStyle(el).color;
        el.remove();
        return c;
      };
      const margin = document.getElementById('page-margin')!;
      const note = margin.querySelector('.margin-note')!;
      return {
        background: getComputedStyle(margin).backgroundColor,
        sticky: probe('--color-sticky'),
        font: getComputedStyle(note).fontFamily,
        color: getComputedStyle(note).color,
        biro: probe('--color-biro'),
      };
    });
    expect(look.background).toBe(look.sticky);
    expect(look.font).toContain('Kalam');
    expect(look.color).toBe(look.biro);
  });

  test('a long reply is capped at 40% of the page and scrolls inside the sticky', async ({ page }) => {
    const id = await newRecipe(page, 'Sticky Cap');
    await openRecipe(page, id);
    let body = '';
    for (let i = 1; i <= 60; i++) body += `event: chunk\ndata: {"text":"Line ${i} of a very long reply.\\n\\n"}\n\n`;
    body += 'event: done\ndata: {"conversation_id":"cap"}\n\n';
    await page.route('**/api/chat', route => route.fulfill({
      status: 200, headers: { 'content-type': 'text/event-stream' }, body,
    }));
    await sendNote(page, 'tell me everything');
    await expect(sticky(page)).toContainText('Line 60', { timeout: 10000 });

    const m = await page.evaluate((phone) => {
      const margin = document.getElementById('page-margin')!;
      const pageEl = document.getElementById(phone ? 'page-right' : 'page-left')!;
      return {
        height: margin.getBoundingClientRect().height,
        cap: pageEl.clientHeight * 0.4,
        scrolls: margin.scrollHeight > margin.clientHeight + 1,
      };
    }, isPhone(page));
    expect(m.height).toBeLessThanOrEqual(m.cap + 1);
    expect(m.scrolls).toBe(true);
  });

  test('a long reply on a short desktop leaves every contents-page tab tappable', async ({ page }) => {
    test.skip(isPhone(page), 'the tab strip is a row above the contents at ≤600px');
    await page.setViewportSize({ width: 1280, height: 720 });
    await newRecipe(page, 'Sticky Tabs');
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();
    let body = '';
    for (let i = 1; i <= 40; i++) body += `event: chunk\ndata: {"text":"Line ${i} of a very long reply.\\n"}\n\n`;
    body += 'event: done\ndata: {"conversation_id":"tabs"}\n\n';
    await page.route('**/api/chat', route => route.fulfill({
      status: 200, headers: { 'content-type': 'text/event-stream' }, body,
    }));
    await sendNote(page, 'tell me everything');
    await expect(sticky(page)).toContainText('Line 40', { timeout: 10000 });
    await expect(sticky(page)).toBeVisible();
    expect(await sticky(page).evaluate(el => el.scrollHeight > el.clientHeight + 1), 'sticky is capped').toBe(true);

    const tabs = page.locator('.contents-tab:visible');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const sel = await tabs.nth(i).evaluate((el, n) => {
        el.setAttribute('data-hit-probe', String(n));
        return `[data-hit-probe="${n}"]`;
      }, i);
      await expectHitArea(page, sel);
    }
  });

  test('can be dismissed, stays dismissed across a recipe and mode switch, and a new reply shows again', async ({ page }) => {
    const a = await newRecipe(page, 'Dismiss A');
    const b = await newRecipe(page, 'Dismiss B');
    await openRecipe(page, a);
    await sendNote(page, 'hello a');
    await expect(stickyNote(page)).toContainText('mock assistant', { timeout: 10000 });

    await expectHitArea(page, '#page-margin .note-dismiss');
    await expect(page.locator('#page-margin .note-dismiss')).toHaveAttribute('aria-label', 'Dismiss note');
    await page.locator('#page-margin .note-dismiss').click();
    await expect(sticky(page)).toBeHidden();
    // Still in the thread
    expect((await threadEntries(page)).filter(e => e.kind === 'reply')).toHaveLength(1);

    await openRecipe(page, b);
    await expect(page.locator('#page-right-content .recipe-title')).toContainText('Dismiss B');
    await openRecipe(page, a);
    await expect(page.locator('#page-right-content .recipe-title')).toContainText('Dismiss A');
    await expect(sticky(page)).toBeHidden();

    if (!isPhone(page)) {
      await selectMode(page, 'contents');
      await expect(sticky(page)).toBeHidden();
      await selectMode(page, 'cook');
      await expect(sticky(page)).toBeHidden();
    }

    await sendNote(page, 'hello again');
    await expect(sticky(page)).toBeVisible({ timeout: 10000 });
    await expect(stickyNote(page)).toContainText('mock assistant', { timeout: 10000 });
  });

  test('is not shown beside the full thread, and comes back after', async ({ page }) => {
    const id = await newRecipe(page, 'Sticky Notes Mode');
    await openRecipe(page, id);
    await sendNote(page, 'hello notes');
    await expect(stickyNote(page)).toContainText('mock assistant', { timeout: 10000 });
    await expect(sticky(page)).toBeVisible();

    await openNotesView(page);
    await expect(sticky(page)).toBeHidden();
    await expect(notesThread(page)).toContainText('mock assistant');

    if (isPhone(page)) {
      // The tab switch honours the crossfade's animation lock; retry through it
      await expect(async () => {
        await page.locator('.page-tab[data-tab="method"]').click();
        await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'method', { timeout: 1000 });
      }).toPass({ timeout: 15000 });
    } else {
      await selectMode(page, 'cook');
    }
    await expect(sticky(page)).toBeVisible();
  });
});

test.describe('A turn in progress', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('shows one in-flight line: Thinking…, then the tool label, then the reply', async ({ page }) => {
    const id = await newRecipe(page, 'In Flight');
    await openRecipe(page, id);
    await paceChat(page, 700);
    await sendNote(page, 'list all recipes');

    const status = page.locator('#page-margin .margin-note[data-kind="status"]');
    await expect(status).toHaveText('Thinking…');
    await expect(stickyNote(page)).toHaveCount(1);
    await expect(status).toHaveText('Looking through the book…', { timeout: 5000 });
    await expect(stickyNote(page)).toHaveCount(1);
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toBeVisible({ timeout: 10000 });
    await expect(status).toHaveCount(0);
    await expect(stickyNote(page)).toHaveCount(1);

    // Nothing of the in-flight line was stored
    await expect.poll(async () => (await threadEntries(page)).map(e => e.kind), { timeout: 10000 })
      .toEqual(['user', 'reply']);
  });

  test('the in-flight line is the last entry of the open thread, and is not stored', async ({ page }) => {
    const id = await newRecipe(page, 'In Flight Thread');
    await openRecipe(page, id);
    await openNotesView(page);
    await paceChat(page, 700);
    await sendNote(page, 'hello thread');

    const last = notesThread(page).locator('.thread-note').last();
    await expect(last).toHaveText('Thinking…');
    await expect(last).toHaveAttribute('data-kind', 'status');
    await expect(sticky(page)).toBeHidden();
    await expect(last).toContainText('mock assistant', { timeout: 10000 });
    await expect(notesThread(page).locator('.thread-note[data-kind="status"]')).toHaveCount(0);
    expect((await threadEntries(page)).map(e => e.kind)).toEqual(['user', 'reply']);
  });

  test('no plumbing reaches the page through list, timer and halve turns', async ({ page }) => {
    const id = await newRecipe(page, 'No Plumbing');
    await openRecipe(page, id);
    // Record every text the watched regions ever show, not just the last one
    await page.evaluate(() => {
      const w = window as unknown as { __plumbing: string[] };
      w.__plumbing = [];
      const bad = /Using tool|Timer set|start_timer|update_recipe|list_recipes/;
      const check = () => {
        const regions = [
          document.getElementById('page-margin'),
          document.getElementById('note-input'),
          ...Array.from(document.querySelectorAll('.notes-thread')),
        ];
        for (const r of regions) {
          const t = r ? r.textContent || '' : '';
          if (bad.test(t)) w.__plumbing.push(t.slice(0, 120));
        }
      };
      new MutationObserver(check).observe(document.body, { subtree: true, childList: true, characterData: true });
    });

    for (const [note, reply] of [['list all recipes', 'Here are'], ['start a timer', 'Timer started'], ['halve this recipe', 'serves 2']]) {
      await sendNote(page, note);
      await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toContainText(reply, { timeout: 10000 });
      await expect(page.locator('#send-button')).not.toHaveAttribute('aria-disabled', 'true');
    }
    await openNotesView(page);
    await expect(notesThread(page)).toContainText('serves 2');

    const seen = await page.evaluate(() => (window as unknown as { __plumbing: string[] }).__plumbing);
    expect(seen).toEqual([]);
    expect((await threadEntries(page)).filter(e => e.kind === 'status')).toEqual([]);
  });

  test('the textarea stays enabled and focused, and a second send waits for the turn', async ({ page }) => {
    const id = await newRecipe(page, 'Live Input');
    await openRecipe(page, id);
    let posts = 0;
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('/api/chat')) posts++;
    });
    await paceChat(page, 700);

    const input = page.locator('#message-input');
    await input.focus();
    await input.fill('first note');
    await input.press('Enter');

    const status = page.locator('#page-margin .margin-note[data-kind="status"]');
    await expect(status).toHaveText('Thinking…');
    await expect(input).not.toBeDisabled();
    await expect(input).toBeFocused();
    await expect(page.locator('#send-button')).toHaveAttribute('aria-disabled', 'true');

    // Typing the next note mid-turn works; sending it does not
    await input.pressSequentially('second note');
    await input.press('Enter');
    await page.locator('#note-input').evaluate((f: HTMLFormElement) => f.requestSubmit());
    await expect(input).toHaveValue('second note');

    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#send-button')).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10000 });
    expect(posts).toBe(1);
    await expect(input).not.toBeDisabled();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('second note');

    // After the turn, Enter sends as normal
    await input.press('Enter');
    await expect.poll(() => posts, { timeout: 10000 }).toBe(2);
    await expect(input).toHaveValue('');
  });

  test('the textarea grows to three lines and then scrolls', async ({ page }) => {
    const input = page.locator('#message-input');
    const oneLine = (await page.locator('#note-input').boundingBox())!.height;
    await input.focus();
    for (let i = 1; i <= 7; i++) {
      await input.pressSequentially(`line ${i}`);
      if (i < 7) await input.press('Shift+Enter');
    }
    const m = await input.evaluate((el: HTMLTextAreaElement) => {
      const cs = getComputedStyle(el);
      const px = (v: string) => parseFloat(v) || 0;
      return {
        height: el.getBoundingClientRect().height,
        lineHeight: px(cs.lineHeight),
        cap: 3 * px(cs.lineHeight) + px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.borderTopWidth) + px(cs.borderBottomWidth),
        scrolls: el.scrollHeight > el.clientHeight,
      };
    });
    expect(m.height).toBeLessThanOrEqual(m.cap + 0.5);
    expect(m.height).toBeGreaterThan(m.cap - m.lineHeight / 2);
    expect(m.scrolls).toBe(true);
    const sevenLines = (await page.locator('#note-input').boundingBox())!.height;
    expect(sevenLines - oneLine).toBeLessThanOrEqual(2 * m.lineHeight + 1);
  });

  test('statusLabelFor speaks the cook\'s language', async ({ page }) => {
    const labels = await page.evaluate(async () => {
      const chat = await import('/static/chat.js');
      const tools = ['start_timer', 'set_servings', 'display_recipe', 'update_recipe', 'create_recipe', 'list_recipes', 'get_recipe',
        'display_meal_plan', 'fetch', 'jina_fetch', 'duckduckgo_search', 'duckduckgo_news_search', 'search',
        'delete_recipe', 'something_new'];
      return Object.fromEntries(tools.map(t => [t, chat.statusLabelFor(t)]));
    });
    expect(labels).toEqual({
      start_timer: 'Setting a timer…',
      set_servings: 'Adjusting the servings…',
      display_recipe: 'Opening the recipe…',
      update_recipe: 'Updating the recipe…',
      create_recipe: 'Writing it into the book…',
      list_recipes: 'Looking through the book…',
      get_recipe: 'Looking through the book…',
      display_meal_plan: 'Laying out the meal…',
      fetch: 'Looking it up…',
      jina_fetch: 'Looking it up…',
      duckduckgo_search: 'Looking it up…',
      duckduckgo_news_search: 'Looking it up…',
      search: 'Looking it up…',
      delete_recipe: 'Working on it…',
      something_new: 'Working on it…',
    });
  });

  test('a reply dismissed mid-stream stays dismissed for the rest of its stream', async ({ page }) => {
    const id = await newRecipe(page, 'Dismiss Streaming');
    await openRecipe(page, id);
    await paceChat(page, 500);
    await page.route('**/api/chat', route => route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: 'event: chunk\ndata: {"text":"one "}\n\n'
        + 'event: chunk\ndata: {"text":"two "}\n\n'
        + 'event: chunk\ndata: {"text":"three"}\n\n'
        + 'event: done\ndata: {"conversation_id":"dismiss-stream"}\n\n',
    }));
    await sendNote(page, 'stream it');
    await expect(page.locator('#page-margin .margin-note[data-kind="reply"]')).toContainText('one', { timeout: 10000 });
    await page.locator('#page-margin .note-dismiss').click();
    await expect(sticky(page)).toBeHidden();
    await expect(page.locator('#send-button')).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10000 });
    await expect(sticky(page)).toBeHidden();
    expect((await threadEntries(page)).find(e => e.kind === 'reply')!.text).toBe('one two three');
  });
});

test.describe('The sticky in the notes spread', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('notes mode on the wide book hides the sticky; contents mode shows it', async ({ page }) => {
    test.skip(isPhone(page), 'no spread modes at ≤600px');
    const id = await newRecipe(page, 'Notes Spread');
    await openRecipe(page, id);
    await useContentsMode(page);
    await sendNote(page, 'hello spread');
    await expect(stickyNote(page)).toContainText('mock assistant', { timeout: 10000 });
    await selectMode(page, 'notes');
    await expect(sticky(page)).toBeHidden();
    await selectMode(page, 'contents');
    await expect(sticky(page)).toBeVisible();
  });
});

/** A hand-built three-paragraph reply, so the sticky is at least three lines tall. */
async function routeThreeLineReply(page: Page) {
  let body = '';
  for (let i = 1; i <= 3; i++) {
    body += `event: chunk\ndata: {"text":"Line ${i} of the reply about the stew.\\n\\n"}\n\n`;
  }
  body += 'event: done\ndata: {"conversation_id":"sticky-clearance"}\n\n';
  await page.route('**/api/chat', route => route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    body,
  }));
}

/** Scrolls a page to its end and returns the sticky's top edge. */
async function scrollToEnd(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate(async (el) => {
    el.scrollTop = el.scrollHeight;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return document.getElementById('page-margin')!.getBoundingClientRect().top;
  });
}

async function bottomOf(page: Page, selector: string): Promise<number> {
  const box = (await page.locator(selector).last().boundingBox())!;
  return box.y + box.height;
}

async function stickyClearance(page: Page): Promise<string> {
  return page.locator('.book-container').evaluate(el => getComputedStyle(el).getPropertyValue('--sticky-clearance').trim());
}

/** web-chat › The reply sticky never hides the end of the page. */
test.describe('The reply sticky never hides the end of the page', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('the last ingredient clears the sticky', async ({ page }) => {
    test.skip(isPhone(page), 'the ingredients are on the left page above 600px');
    const recipe = await createCookingRecipe(page);
    await openRecipe(page, recipe.id);
    await selectMode(page, 'cook');
    await routeThreeLineReply(page);
    await sendNote(page, 'tell me about it');
    await expect(stickyNote(page)).toContainText('Line 3 of the reply', { timeout: 10000 });
    expect(await page.locator('#page-left .ingredient-item').count()).toBeGreaterThanOrEqual(15);

    const stickyTop = await scrollToEnd(page, '#page-left');
    expect(await bottomOf(page, '#page-left .ingredient-item')).toBeLessThanOrEqual(stickyTop + 0.5);
  });

  test('the last contents row clears the sticky', async ({ page }) => {
    for (let i = 0; i < 3; i++) await newRecipe(page, 'Clearance Row');
    await page.reload();
    await expect(page.locator('.index-title')).toBeVisible();
    await routeThreeLineReply(page);
    await sendNote(page, 'hello contents');
    await expect(stickyNote(page)).toContainText('Line 3 of the reply', { timeout: 10000 });

    const stickyTop = await scrollToEnd(page, '#page-left');
    expect(await bottomOf(page, '#page-left .index-recipe-item')).toBeLessThanOrEqual(stickyTop + 0.5);
  });

  test('the phone footer links clear the sticky', async ({ page }) => {
    test.skip(!isPhone(page), 'the footer links are the phone\'s');
    const recipe = await createCookingRecipe(page);
    // A recipe after it, so both footer links are live
    await createCookingRecipe(page);
    await openRecipe(page, recipe.id);
    await routeThreeLineReply(page);
    await sendNote(page, 'tell me about it');
    await expect(stickyNote(page)).toContainText('Line 3 of the reply', { timeout: 10000 });

    let stickyTop = await scrollToEnd(page, '#page-right');
    expect(await bottomOf(page, '#page-right .tab-panel[data-tab="ingredients"] .ingredient-item'))
      .toBeLessThanOrEqual(stickyTop + 0.5);
    for (const tab of ['ingredients', 'method'] as const) {
      if (tab === 'method') await openTab(page, 'method');
      stickyTop = await scrollToEnd(page, '#page-right');
      for (const link of ['.footer-prev', '.footer-next']) {
        expect(await bottomOf(page, `#page-right ${link}`), `${link} on ${tab}`).toBeLessThanOrEqual(stickyTop + 0.5);
      }
    }
    await expectHitArea(page, '#page-right .footer-prev');
    await expectHitArea(page, '#page-right .footer-next');
  });

  test('no clearance without a sticky, in notes mode or on the phone Notes tab', async ({ page }) => {
    const recipe = await createCookingRecipe(page);
    await openRecipe(page, recipe.id);
    const scroller = isPhone(page) ? '#page-right' : '#page-left';
    const padding = () => page.locator(scroller).evaluate(el => getComputedStyle(el).paddingBottom);
    const before = await padding();
    expect(await stickyClearance(page)).toBe('0px');

    await routeThreeLineReply(page);
    await sendNote(page, 'tell me about it');
    await expect(stickyNote(page)).toContainText('Line 3 of the reply', { timeout: 10000 });
    await expect.poll(() => stickyClearance(page)).not.toBe('0px');

    if (isPhone(page)) await openTab(page, 'notes');
    else await selectMode(page, 'notes');
    await expect.poll(() => stickyClearance(page)).toBe('0px');
    expect(await padding()).toBe(before);
  });
});
