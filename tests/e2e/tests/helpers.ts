import { Locator, Page, expect } from '@playwright/test';

export interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface Step {
  step_number: number;
  instruction: string;
  duration_minutes?: number;
}

export interface Recipe {
  id?: string;
  title: string;
  description?: string;
  ingredients: Ingredient[];
  steps: Step[];
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  /** Set it on creation to suppress the pending-difficulty re-render mid-test. */
  difficulty?: number;
  /** Set it on creation to skip the mock LLM's background auto-tagging. */
  tags?: string[];
}

export type TabName = 'ingredients' | 'method' | 'notes';

/**
 * Authenticate with the server (navigation only, relies on DEV_USER_EMAIL)
 */
export async function authenticate(page: Page): Promise<void> {
  await page.goto('/chat');

  // Wait for chat page to load
  try {
    await expect(page.locator('.app-container')).toBeVisible({ timeout: 5000 });
  } catch (e) {
    console.error(`Failed to load chat page. Current URL: ${page.url()}`);
    throw e;
  }
}

/**
 * Create a recipe via the API
 */
export async function createRecipe(page: Page, recipe: Recipe): Promise<string> {
  const apiKey = 'test-api-key-for-playwright';

  const response = await page.request.post('/api/recipes', {
    data: recipe,
    headers: {
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok()) {
    console.error(`API request failed: ${response.status()} ${response.statusText()}`);
    console.error(await response.text());
  }

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.id;
}

/**
 * Create multiple test recipes. Each carries explicit tags, which skips the
 * mock LLM's background auto-tagging and keeps the contents filters stable.
 */
export async function seedRecipes(page: Page, count: number = 3): Promise<string[]> {
  // Add unique suffix to avoid conflicts when tests run in parallel
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const recipes: Recipe[] = [
    {
      title: `Chicken Curry ${uniqueSuffix}`,
      description: 'A flavorful, aromatic curry with coconut milk',
      ingredients: [
        { name: 'chicken breast, cubed', quantity: 2, unit: 'lbs' },
        { name: 'coconut milk', quantity: 1, unit: 'can' },
        { name: 'curry powder', quantity: 2, unit: 'tbsp' },
        { name: 'onion, diced', quantity: 1 },
        { name: 'garlic, minced', quantity: 3, unit: 'cloves' },
        { name: 'ginger, grated', quantity: 1, unit: 'tbsp' },
        { name: 'tomatoes, diced', quantity: 2 },
        { name: 'salt and pepper', notes: 'to taste' },
      ],
      steps: [
        { step_number: 1, instruction: 'Heat oil in a large pan over medium heat' },
        { step_number: 2, instruction: 'Sauté onion until softened, about 5 minutes' },
        { step_number: 3, instruction: 'Add garlic and ginger, cook for 1 minute' },
        { step_number: 4, instruction: 'Add chicken and brown on all sides' },
        { step_number: 5, instruction: 'Stir in curry powder and cook for 1 minute' },
        { step_number: 6, instruction: 'Add tomatoes and coconut milk' },
        { step_number: 7, instruction: 'Simmer for 20-25 minutes until chicken is cooked through' },
        { step_number: 8, instruction: 'Season with salt and pepper' },
        { step_number: 9, instruction: 'Serve over rice' },
      ],
      prep_time_minutes: 15,
      cook_time_minutes: 30,
      servings: 4,
      tags: ['main', 'curry'],
    },
    {
      title: `Simple Pasta ${uniqueSuffix}`,
      description: 'Quick and easy pasta dish',
      ingredients: [
        { name: 'pasta', quantity: 1, unit: 'lb' },
        { name: 'olive oil', quantity: 2, unit: 'tbsp' },
        { name: 'garlic, minced', quantity: 4, unit: 'cloves' },
        { name: 'red pepper flakes', quantity: 1, unit: 'tsp' },
        { name: 'salt', notes: 'to taste' },
        { name: 'fresh parsley' },
      ],
      steps: [
        { step_number: 1, instruction: 'Boil pasta according to package directions' },
        { step_number: 2, instruction: 'Heat olive oil in a pan' },
        { step_number: 3, instruction: 'Add garlic and red pepper flakes' },
        { step_number: 4, instruction: 'Drain pasta and toss with garlic oil' },
        { step_number: 5, instruction: 'Garnish with parsley' },
      ],
      prep_time_minutes: 5,
      cook_time_minutes: 15,
      servings: 4,
      tags: ['main'],
    },
    {
      title: `Chocolate Chip Cookies ${uniqueSuffix}`,
      description: 'Classic homemade cookies',
      ingredients: [
        { name: 'all-purpose flour', quantity: 2.25, unit: 'cups' },
        { name: 'baking soda', quantity: 1, unit: 'tsp' },
        { name: 'salt', quantity: 1, unit: 'tsp' },
        { name: 'butter, softened', quantity: 1, unit: 'cup' },
        { name: 'granulated sugar', quantity: 0.75, unit: 'cup' },
        { name: 'brown sugar', quantity: 0.75, unit: 'cup' },
        { name: 'eggs', quantity: 2 },
        { name: 'vanilla extract', quantity: 2, unit: 'tsp' },
        { name: 'chocolate chips', quantity: 2, unit: 'cups' },
      ],
      steps: [
        { step_number: 1, instruction: 'Preheat oven to 375°F' },
        { step_number: 2, instruction: 'Mix flour, baking soda, and salt' },
        { step_number: 3, instruction: 'Beat butter and sugars until creamy' },
        { step_number: 4, instruction: 'Add eggs and vanilla' },
        { step_number: 5, instruction: 'Gradually blend in flour mixture' },
        { step_number: 6, instruction: 'Stir in chocolate chips' },
        { step_number: 7, instruction: 'Drop spoonfuls onto baking sheet' },
        { step_number: 8, instruction: 'Bake for 9-11 minutes' },
      ],
      prep_time_minutes: 15,
      cook_time_minutes: 10,
      servings: 24,
      tags: ['dessert'],
    },
  ];

  const ids: string[] = [];
  for (let i = 0; i < Math.min(count, recipes.length); i++) {
    const id = await createRecipe(page, recipes[i]);
    ids.push(id);
  }

  return ids;
}

/** The phone breakpoint, the one the app itself uses (max-width: 600px). */
export function isPhone(page: Page): boolean {
  return page.viewportSize()!.width <= 600;
}

/**
 * The tablet band the app's CSS uses: above the 600px phone breakpoint and
 * inside `@media (max-width: 1024px)` (static/styles.css:1836).
 */
export function isTablet(page: Page): boolean {
  const width = page.viewportSize()!.width;
  return width > 600 && width <= 1024;
}

/**
 * The row that holds "clear ticks": the Ingredients heading above 600px, the
 * meta line on the phone, where the panels carry no heading (the paper tab
 * names them).
 */
export const CLEAR_TICKS_ROW = '.tab-panel[data-tab="ingredients"] :is(.section-header, .recipe-meta-line):has(.clear-ticks):visible';

/**
 * The difficulty's slot: the end of the Ingredients heading above 600px (in
 * cook mode, the left page), the "⋯" popover on the phone, which has no
 * heading.
 */
export function difficultySlot(page: Page): Locator {
  return page.locator(isPhone(page)
    ? '#page-right-content .recipe-more-panel .meta-difficulty'
    : '.tab-panel[data-tab="ingredients"] > .section-header .meta-difficulty');
}

/**
 * A desk: above the phone breakpoint with a mouse or trackpad (the `chromium`
 * project), where the book's type is about 90% of its counter size
 * (lighter-book L1). The `ipad` project is a touch screen at counter size.
 */
export async function isDesk(page: Page): Promise<boolean> {
  return page.evaluate(() => window.matchMedia('(min-width: 601px) and (hover: hover) and (pointer: fine)').matches);
}

/**
 * The section tab strip: the paper tabs on the page's top edge. Only the phone
 * has one; above 600px both sections are on the spread at once.
 */
export function tabSelector(_page: Page, tab: TabName): string {
  return `.page-tab[data-tab="${tab}"]`;
}

/** Taps a section tab and waits for the right page to actually adopt it. */
export async function openTab(page: Page, tab: TabName): Promise<void> {
  await page.locator(tabSelector(page, tab)).click();
  await expect(page.locator('#page-right')).toHaveAttribute('data-tab', tab);
}

/** Opens a recipe on the right page and waits for it to render. */
export async function openRecipe(page: Page, recipeId: string): Promise<void> {
  await page.evaluate((id) => {
    // @ts-ignore - fetchAndDisplayRecipe is exposed by app.js
    fetchAndDisplayRecipe(id);
  }, recipeId);
  await expect(page.locator('.recipe-title')).toBeVisible({ timeout: 10000 });
}

/** Writes a note in the note input and sends it with Enter. */
export async function sendNote(page: Page, text: string): Promise<void> {
  await page.locator('#message-input').fill(text);
  await page.locator('#message-input').press('Enter');
}

/**
 * The x of the book's spine — the middle of the two-page spread. The note input
 * is a slip over the foot of the left page in every state above 600px, so
 * which side of this line it falls on is the assertion.
 */
export async function spineX(page: Page): Promise<number> {
  const pages = (await page.locator('.pages-container').boundingBox())!;
  return pages.x + pages.width / 2;
}

/**
 * The container the whole thread is rendered into on this viewport. The phone
 * swaps it into the right page on its Notes paper tab; above 600px Notes is a
 * spread mode and the thread takes the left page.
 */
export function notesThread(page: Page) {
  return page.locator(isPhone(page)
    ? '#page-right-content .notes-thread'
    : '#page-left-content .notes-thread');
}

/**
 * Puts the spread back in contents mode, where the contents share the left page
 * with the open recipe and the right page holds the whole of it — today's
 * layout, and what the assertions written before spread modes describe. A no-op
 * on a phone, which has no spread and so no mode.
 */
export async function useContentsMode(page: Page): Promise<void> {
  if (isPhone(page)) return;
  const tab = page.locator('.spread-tab[data-mode="contents"]');
  await expect(tab).toBeVisible();
  // The strip honours the animation lock, so a tap that lands inside a page
  // turn is ignored by design. Retry rather than sleep through the turn.
  await expect(async () => {
    await tab.click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'contents', { timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

/**
 * Opens the whole-thread view by the route this viewport actually offers: the
 * Notes paper tab on a phone, the left-edge Notes tab above 600px — and, while
 * no recipe is open (where the strip shows the contents filters instead), by
 * reaching for the note input, which is the only way into notes mode there.
 */
export async function openNotesView(page: Page): Promise<void> {
  if (isPhone(page)) {
    await page.locator('.page-tab[data-tab="notes"]').click();
    await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'notes');
  } else {
    // The Notes tab is the only way in on desktop, and it is on the strip in
    // every view: beside the filters while browsing, beside Contents and Cook
    // while a recipe is open. Focusing the input no longer opens notes mode.
    const tab = page.locator('.spread-tab[data-mode="notes"]');
    await expect(async () => {
      await tab.click();
      await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'notes', { timeout: 1000 });
    }).toPass({ timeout: 15000 });
  }
  await expect(notesThread(page)).toBeVisible();
}

/** The thread entries margin-notes.js holds for this session. */
export async function threadEntries(page: Page): Promise<Array<{ kind: string; text: string }>> {
  return page.evaluate(() =>
    // @ts-ignore - getMarginThread is exposed by app.js
    getMarginThread().map((n: { kind: string; text: string }) => ({ kind: n.kind, text: n.text }))
  );
}

/** Waits for the assistant's reply to this turn to reach the page margin. */
export async function expectReply(page: Page, contains: string): Promise<void> {
  await expect(page.locator('#page-margin .margin-note[data-kind="reply"]'))
    .toContainText(contains, { timeout: 15000 });
}

/** One element whose box the layout-stability harness watches. */
export interface Anchor {
  name: string;
  selector: string;
}

export interface AnchorFrame {
  t: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shown: boolean;
  text: string;
}

export interface AnchorDeviation {
  selector: string;
  /** Whether the anchor was displayed on the first frame; one that was not is judged from its first displayed frame. */
  shownAtStart: boolean;
  /** Frames on which the anchor was not displayed, counted from its first displayed frame. */
  hiddenFrames: number;
  dx: number;
  dy: number;
  dwidth: number;
  dheight: number;
  frames: AnchorFrame[];
}

export type AnchorResult = Record<string, AnchorDeviation>;

/**
 * The anchors of family-recipe-ui › Nothing on the page moves unless the cook
 * acted on it. M is the mid-method step, ceil(steps ÷ 2), counted from the
 * displayed recipe; `.book-container` is one at ≤600px. Anchors that are not displayed when tracking starts (the
 * timer pill before a timer, the mid step on the phone's Ingredients tab) are
 * judged from the first frame they are shown.
 */
export async function ANCHORS(page: Page): Promise<Anchor[]> {
  const steps = await page.locator('#page-right-content .prep-step').count();
  const anchors: Anchor[] = [
    { name: 'note-input', selector: '#note-input' },
    { name: 'message-input', selector: '#message-input' },
    { name: 'recipe-title', selector: '#page-right-content .recipe-title' },
  ];
  // The phone's Ingredients tab does not display the method, so its mid-step is
  // tracked only where it is on screen when the anchors are taken
  if (steps > 0) {
    const m = Math.ceil(steps / 2);
    const selector = `#page-right-content .prep-step[data-step="${m}"]`;
    if (await page.locator(selector).isVisible()) anchors.push({ name: `mid-step-${m}`, selector });
  }
  // The page arrows are not displayed at ≤600px (the phone turns pages by edge tap)
  if (!isPhone(page)) anchors.push({ name: 'page-next', selector: '#page-next' });
  // The book itself is an anchor where the chrome above it can come and go
  else anchors.push({ name: 'book-container', selector: '.book-container' });
  anchors.push({ name: 'timer-widget', selector: '#timer-widget' });
  return anchors;
}

/**
 * Samples every anchor's `getBoundingClientRect()` and displayed state on each
 * animation frame while `action` runs, and until 500ms after the last DOM
 * mutation under `.book-container` (15s cap). Pass `settle: false` to stop as
 * soon as `action` resolves, for interactions whose end the action itself
 * marks. Returns each anchor's maximum deviation from its first displayed frame.
 */
export async function trackAnchors(
  page: Page,
  anchors: Anchor[],
  action: () => Promise<void>,
  opts: { settle?: boolean; quietMs?: number; capMs?: number } = {},
): Promise<AnchorResult> {
  const { settle = true, quietMs = 500, capMs = 15000 } = opts;
  await page.evaluate((list) => {
    const w = window as any;
    const frames: Record<string, any[]> = {};
    for (const a of list) frames[a.name] = [];
    const state = { frames, running: true, lastMutation: performance.now(), start: performance.now() };
    w.__anchorTrack = state;
    const observer = new MutationObserver(() => { state.lastMutation = performance.now(); });
    const root = document.querySelector('.book-container') || document.body;
    observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    w.__anchorTrackObserver = observer;
    const sample = () => {
      if (!state.running) return;
      const t = performance.now();
      for (const a of list) {
        const el = document.querySelector(a.selector) as HTMLElement | null;
        if (!el) {
          frames[a.name].push({ t, x: 0, y: 0, width: 0, height: 0, shown: false, text: '' });
          continue;
        }
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const shown = r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
        frames[a.name].push({ t, x: r.x, y: r.y, width: r.width, height: r.height, shown, text: (el.textContent || '').trim().slice(0, 80) });
      }
      requestAnimationFrame(sample);
    };
    sample();
  }, anchors);

  await action();

  if (settle) {
    await page.waitForFunction(
      ({ quiet, cap }) => {
        const s = (window as any).__anchorTrack;
        const now = performance.now();
        return now - s.lastMutation >= quiet || now - s.start >= cap;
      },
      { quiet: quietMs, cap: capMs },
      { timeout: capMs + 5000, polling: 50 },
    );
  }

  const frames: Record<string, AnchorFrame[]> = await page.evaluate(() => {
    const w = window as any;
    w.__anchorTrack.running = false;
    w.__anchorTrackObserver.disconnect();
    return w.__anchorTrack.frames;
  });

  const result: AnchorResult = {};
  for (const a of anchors) {
    const list = frames[a.name];
    const firstShown = list.findIndex(f => f.shown);
    const dev: AnchorDeviation = {
      selector: a.selector,
      shownAtStart: list.length > 0 && list[0].shown,
      hiddenFrames: 0,
      dx: 0, dy: 0, dwidth: 0, dheight: 0,
      frames: list,
    };
    if (firstShown >= 0) {
      const base = list[firstShown];
      for (const f of list.slice(firstShown)) {
        if (!f.shown) { dev.hiddenFrames++; continue; }
        dev.dx = Math.max(dev.dx, Math.abs(f.x - base.x));
        dev.dy = Math.max(dev.dy, Math.abs(f.y - base.y));
        dev.dwidth = Math.max(dev.dwidth, Math.abs(f.width - base.width));
        dev.dheight = Math.max(dev.dheight, Math.abs(f.height - base.height));
      }
    }
    result[a.name] = dev;
  }
  return result;
}

/**
 * Asserts that every tracked anchor was displayed on the first frame and then
 * neither moved more than `tolerance` px in x, y, width or height nor was
 * hidden on any frame. Anchors named in `late` (default: the timer pill, which
 * appears only once a timer starts) may first appear mid-interaction and are
 * judged from their first displayed frame instead.
 */
export function expectAnchorsStill(
  result: AnchorResult,
  tolerance = 1,
  late: string[] = ['timer-widget'],
): void {
  const moved: string[] = [];
  for (const [name, d] of Object.entries(result)) {
    if (!d.shownAtStart && !late.includes(name)) {
      moved.push(`${name} (${d.selector}): not displayed when the interaction started`);
      continue;
    }
    const deltas = { dx: d.dx, dy: d.dy, dwidth: d.dwidth, dheight: d.dheight };
    const over = Object.entries(deltas)
      .filter(([, v]) => v > tolerance)
      .map(([k, v]) => `${k}=${v.toFixed(1)}px`);
    if (d.hiddenFrames > 0) over.push(`hidden on ${d.hiddenFrames} frame(s)`);
    if (over.length) moved.push(`${name} (${d.selector}): ${over.join(' ')}`);
  }
  expect(moved, `anchors moved (tolerance ${tolerance}px):\n${moved.join('\n')}`).toEqual([]);
}

/**
 * family-recipe-ui › Every control the cook taps has a 44px hit area: over a
 * 5x5 grid spread evenly across the 44x44px square centred on the control,
 * `elementFromPoint` must return the control or a descendant at every grid
 * point inside the viewport.
 */
export async function expectHitArea(page: Page, selector: string): Promise<void> {
  const misses: string[] = await page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const out: string[] = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const x = cx - 22 + (44 * i) / 4;
        const y = cy - 22 + (44 * j) / 4;
        if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
        const hit = document.elementFromPoint(x, y);
        if (!hit || !el.contains(hit)) {
          const desc = hit ? `${hit.tagName.toLowerCase()}${hit.id ? '#' + hit.id : ''}${hit.className && typeof hit.className === 'string' ? '.' + hit.className.split(/\s+/).join('.') : ''}` : 'nothing';
          out.push(`(${x.toFixed(0)},${y.toFixed(0)}) -> ${desc}`);
        }
      }
    }
    return out;
  });
  expect(misses, `${selector} hit area under 44x44px; missed points:\n${misses.join('\n')}`).toEqual([]);
}

/**
 * A recipe long enough to cook from: 12 ingredients and 9 two-line-plus steps,
 * so the method overflows the right page on every project. Step 2 is long
 * enough that any padding on `.timer-active` re-wraps it at every width.
 * `difficulty` is set, so no backfill refresh lands mid-test.
 */
export async function createCookingRecipe(
  page: Page,
  opts: { durations?: Record<number, number> } = {},
): Promise<{ id: string; title: string; steps: number }> {
  const title = `Steady Stew ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const instructions = [
    'Pat the beef dry with kitchen paper, season it well with salt and pepper, and leave it on the board for ten minutes while you prepare the vegetables.',
    'Heat two tablespoons of oil in a heavy casserole over a medium-high flame and brown the beef in three batches, turning each piece only once it releases from the pan, so that every side takes on a deep crust; lift each batch onto a plate and keep the fat in the pan for the onions that follow.',
    'Lower the heat, add the onions, carrots and celery to the casserole, and cook them gently for about eight minutes, scraping up the browned bits from the base.',
    'Stir in the garlic and the tomato purée and cook for a further two minutes, until the purée darkens and smells sweet rather than sharp.',
    'Sprinkle over the flour, stir until no dry patches remain, then pour in the red wine a little at a time, stirring all the while so the sauce stays smooth.',
    'Return the beef and any juices to the casserole, add the stock, the bay leaves and the thyme, and bring everything to a gentle simmer on the hob.',
    'Cover with a lid and move the casserole to the oven at 160°C for two and a half hours, checking once an hour and adding a splash of water if it looks dry.',
    'Twenty minutes before the end, add the mushrooms and the pearl onions, stir them in so they sit under the liquid, and return the casserole to the oven uncovered.',
    'Taste and adjust the seasoning, fish out the bay leaves and thyme stalks, scatter over the chopped parsley, and serve with mashed potato or crusty bread.',
  ];
  const ingredients: Ingredient[] = [
    { name: 'beef chuck, cubed', quantity: 1.2, unit: 'kg' },
    { name: 'olive oil', quantity: 3, unit: 'tbsp' },
    { name: 'onions, sliced', quantity: 2 },
    { name: 'carrots, cut into chunks', quantity: 3 },
    { name: 'celery sticks, sliced', quantity: 2 },
    { name: 'garlic cloves, crushed', quantity: 4 },
    { name: 'tomato purée', quantity: 2, unit: 'tbsp' },
    { name: 'plain flour', quantity: 2, unit: 'tbsp' },
    { name: 'red wine', quantity: 400, unit: 'ml' },
    { name: 'beef stock', quantity: 500, unit: 'ml' },
    { name: 'bay leaves', quantity: 2 },
    { name: 'thyme sprigs', quantity: 4 },
    { name: 'chestnut mushrooms, halved', quantity: 250, unit: 'g' },
    { name: 'pearl onions, peeled', quantity: 200, unit: 'g' },
    { name: 'flat-leaf parsley, chopped', notes: 'to serve' },
  ];
  const id = await createRecipe(page, {
    title,
    description: 'A slow beef stew to cook from at the counter',
    ingredients,
    steps: instructions.map((instruction, i) => ({
      step_number: i + 1,
      instruction,
      ...(opts.durations?.[i + 1] ? { duration_minutes: opts.durations[i + 1] } : {}),
    })),
    prep_time_minutes: 30,
    cook_time_minutes: 180,
    servings: 4,
    difficulty: 3,
    tags: ['main'],
  });
  return { id, title, steps: instructions.length };
}

/**
 * Slows `/api/chat` down so the stages of a turn can be watched: the request
 * itself runs unchanged, then its SSE events are re-delivered one per `gapMs`
 * (the first after a gap too, so "Thinking…" stays up for at least that long).
 * A route cannot do this — `route.fulfill` hands the whole body over at once and
 * every stage of the turn renders in one frame — so it wraps `window.fetch`.
 * Calling it again only changes the gap.
 */
export async function paceChat(page: Page, gapMs = 600): Promise<void> {
  await page.evaluate((gap) => {
    const w = window as unknown as { __chatGap: number; __chatPaced?: boolean };
    w.__chatGap = gap;
    if (w.__chatPaced) return;
    w.__chatPaced = true;
    const original = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const res = await original(input, init);
      if (!url.includes('/api/chat') || !res.ok || !res.body) return res;
      const text = await res.text();
      const events = text.split('\n\n').filter(e => e.trim()).map(e => e + '\n\n');
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          for (const event of events) {
            await new Promise(r => setTimeout(r, w.__chatGap));
            controller.enqueue(encoder.encode(event));
          }
          controller.close();
        },
      });
      return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
    };
  }, gapMs);
}

/** One touch-move path: n even steps from the start point to (dx, dy). */
export function line(n: number, dx: number, dy: number): Array<[number, number]> {
  return Array.from({ length: n }, (_, i) => [(dx * (i + 1)) / n, (dy * (i + 1)) / n] as [number, number]);
}

/**
 * Drives a real one-finger touch through CDP `Input.dispatchTouchEvent`: down
 * at (x0, y0), then each [dx, dy] of `path` (offsets from the start) one frame
 * apart, then up. Real touches scroll and fire touch events the way a thumb
 * does, which synthetic dispatchEvent calls do not (as in
 * tests/usability/remeasure/find.cjs gesture()). Every project runs Chromium.
 */
export async function touchGesture(page: Page, x0: number, y0: number, path: Array<[number, number]>): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const pt = (x: number, y: number) => [{ x: Math.round(x), y: Math.round(y), id: 1, radiusX: 8, radiusY: 8, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x0, y0) });
  for (const [dx, dy] of path) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x0 + dx, y0 + dy) });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

export interface RecordedRequests {
  /** `GET /api/recipes`, the list, in the order made (ms since recording began). */
  list: number[];
  /** `GET /api/recipes/:id`, by id. */
  recipe: string[];
  /** Forget everything recorded so far. */
  reset(): void;
}

/**
 * Records the page's recipe requests from now on: `/api/recipes` as a list
 * request and `/api/recipes/:id` as a request for that recipe. Sub-resources
 * (`/api/recipes/:id/photo`, `/share`) are ignored. Only GETs count.
 */
export function recordRequests(page: Page): RecordedRequests {
  const start = Date.now();
  const rec: RecordedRequests = {
    list: [],
    recipe: [],
    reset() { rec.list.length = 0; rec.recipe.length = 0; },
  };
  page.on('request', (req) => {
    if (req.method() !== 'GET') return;
    const path = new URL(req.url()).pathname;
    if (path === '/api/recipes') rec.list.push(Date.now() - start);
    const m = path.match(/^\/api\/recipes\/([^/]+)$/);
    if (m) rec.recipe.push(decodeURIComponent(m[1]));
  });
  return rec;
}

/**
 * Waits until no page turn or tab crossfade holds the shared animation lock.
 * The header, the arrows and the tabs all ignore a click while it is held, and
 * a backward turn's overlay carries a copy of the outgoing left page.
 */
export async function waitForTurn(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(async () => {
    // @ts-ignore - browser-side module import
    const M = await import('/static/page-transitions.js');
    return M.isAnimating();
  }), { timeout: 5000 }).toBe(false);
}

/** Counts OscillatorNode.start() calls and vibrations (window.__audioLog). */
export async function installAudioStub(page: any) {
  await page.addInitScript(() => {
    const log: any = { starts: 0, vibrations: 0 };
    // @ts-ignore
    window.__audioLog = log;
    class FakeParam { setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} }
    class FakeNode { connect() { return this; } disconnect() {} }
    class FakeOsc extends FakeNode {
      type = 'sine'; frequency = new FakeParam();
      start() { log.starts++; } stop() {}
    }
    class FakeGain extends FakeNode { gain = new FakeParam(); }
    class FakeCtx {
      state = 'running'; currentTime = 0; destination = new FakeNode();
      resume() { return Promise.resolve(); }
      createOscillator() { return new FakeOsc(); }
      createGain() { return new FakeGain(); }
    }
    // @ts-ignore
    window.AudioContext = FakeCtx;
    // @ts-ignore
    window.webkitAudioContext = FakeCtx;
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: () => { log.vibrations++; return true; },
    });
  });
}

export async function chimes(page: any): Promise<number> {
  return page.evaluate(() => (window as any).__audioLog.starts);
}
