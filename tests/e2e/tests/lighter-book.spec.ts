import { test, expect, Page } from '@playwright/test';
import { authenticate, createRecipe, isDesk, isPhone, openRecipe } from './helpers';

/**
 * lighter-book: family-recipe-ui › Recipe text is sized for reading from the
 * counter (At the desk, Ingredient rows are evenly spaced), › The book lies on
 * a light linen desk, › A page scrolls like paper, › Times on the meta line read
 * one way, › Typography (Section headers carry one rule, the serif meta line),
 * › The photo is taped to the page; cooking-guidance › A step's duration starts
 * its timer (the clock).
 */

const API_HEADERS = { 'X-API-Key': 'test-api-key-for-playwright' };

// 1x1 pixel JPEG (as counter-readability.spec.ts)
const DOT_JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAFA3PEY8ED5GWEZGPDpCakJEZkBQXl1UXmZicH19f3h9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3n/2wBDAFpGPDpCakJEZkBQXl1UXmZicH19f3h9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3l9f3n/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1FVWV1hZWmNkZWZnaGlqc3R1dnd4eXqGhf8hIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/oooorAP/9k=', 'base64');

/** A recipe longer than either page: 24 ingredients and 16 timed steps. */
async function openLongRecipe(page: Page): Promise<string> {
  const id = await createRecipe(page, {
    title: `Long Paper ${Date.now()}`,
    ingredients: Array.from({ length: 24 }, (_, i) => ({ name: `ingredient ${i + 1}`, quantity: i + 1, unit: 'g' })),
    steps: Array.from({ length: 16 }, (_, i) => ({
      step_number: i + 1,
      instruction: `Step ${i + 1}: stir the pot slowly and evenly until it is smooth and glossy`,
      duration_minutes: 5,
    })),
    prep_time_minutes: 40,
    cook_time_minutes: 150,
    servings: 6,
  });
  await authenticate(page);
  await openRecipe(page, id);
  return id;
}

async function openListRecipe(page: Page): Promise<void> {
  const id = await createRecipe(page, {
    title: `Even Rows ${Date.now()}`,
    ingredients: [
      { name: 'plain flour', quantity: 200, unit: 'g' },
      { name: 'eggs', quantity: 2 },
      { name: 'butter', quantity: 100, unit: 'g' },
      { name: 'milk', quantity: 1, unit: 'cup' },
      { name: 'salt', quantity: 1, unit: 'tsp' },
    ],
    steps: [{ step_number: 1, instruction: 'Mix everything together', duration_minutes: 5 }],
    servings: 4,
  });
  await authenticate(page);
  await openRecipe(page, id);
}

async function selectCook(page: Page) {
  const tab = page.locator('.spread-tab[data-mode="cook"]');
  await expect(async () => {
    await tab.click();
    await expect(page.locator('body')).toHaveAttribute('data-spread-mode', 'cook', { timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

async function fontSize(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
}

test.describe('A lighter book', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('ingredient rows are evenly spaced', async ({ page }) => {
    await openListRecipe(page);
    let items;
    if (isPhone(page)) {
      await expect(page.locator('#page-right')).toHaveAttribute('data-tab', 'ingredients');
      items = page.locator('#page-right-content .ingredient-item');
    } else {
      await selectCook(page);
      items = page.locator('#page-left-content .ingredient-item');
    }
    await expect(items).toHaveCount(5);
    const rows = await items.evaluateAll(els => els.map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: r.top,
        bottom: r.bottom,
        height: r.height,
        lineHeight: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
        display: cs.display,
      };
    }));
    for (const [i, row] of rows.entries()) {
      // A block, not a list-item: no marker
      expect(row.display).toBe('block');
      expect(Math.abs(row.height - rows[0].height)).toBeLessThanOrEqual(1);
      // A wrapped line sits closer than the next row
      expect(row.lineHeight).toBeLessThanOrEqual(1.5);
      if (i > 0) expect(Math.abs(row.top - rows[i - 1].bottom)).toBeLessThanOrEqual(1);
    }
  });

  test('at the desk the type is about 90% of the counter size', async ({ page }) => {
    test.skip(isPhone(page), 'the phone has its own sizes');
    await openListRecipe(page);
    await selectCook(page);
    const desk = await isDesk(page);
    // The chromium project has a mouse; the ipad project is a touch screen
    expect(desk).toBe(test.info().project.name === 'chromium');

    expect(await fontSize(page, '#page-right-content .prep-step .step-text')).toBe(desk ? 16 : 18);
    expect(await fontSize(page, '#page-left-content .ingredient-item')).toBe(desk ? 16 : 18);
    expect(await fontSize(page, '#page-right-content .step-duration')).toBe(desk ? 14 : 15);
    expect(await fontSize(page, '.recipe-title')).toBe(desk ? 24 : 27);
    const method = await page.locator('#page-right-content .prep-list').evaluate(el => {
      const cs = getComputedStyle(el);
      return parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
    });
    expect(method).toBeGreaterThanOrEqual(1.6);
  });

  test('the book lies on a light linen desk', async ({ page }) => {
    await expect(page.locator('#recipe-book-header')).toBeAttached();
    const look = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const root = getComputedStyle(document.documentElement);
      return {
        background: body.backgroundColor,
        image: body.backgroundImage,
        wood: root.getPropertyValue('--color-wood-dark').trim(),
        label: getComputedStyle(document.getElementById('recipe-book-header')!).color,
        email: getComputedStyle(document.querySelector('.user-email')!).color,
      };
    });
    expect(look.background).toBe('rgb(236, 228, 212)'); // --color-desk
    expect(look.wood).toBe('');
    if (isPhone(page)) {
      // On the leather strip
      expect(look.label).toBe('rgb(212, 196, 168)'); // --color-label-cream
    } else {
      expect(look.image).toContain('radial-gradient');
      expect(look.label).toBe('rgb(107, 68, 35)'); // --color-accent-brown
      expect(look.email).toBe('rgb(45, 36, 24)'); // --color-ink-dark
    }
  });

  test('a page scrolls like paper', async ({ page }) => {
    test.skip(isPhone(page), 'the spread above 600px');
    await openLongRecipe(page);
    await selectCook(page);

    for (const id of ['page-left', 'page-right']) {
      const look = await page.locator(`#${id}`).evaluate(el => {
        const cs = getComputedStyle(el);
        const strip = getComputedStyle(el.querySelector('.page-content')!, '::after');
        return {
          overflow: el.scrollHeight - el.clientHeight,
          scrollbar: cs.scrollbarWidth,
          gutter: (el as HTMLElement).offsetWidth - el.clientWidth,
          // The binding shadow is a background layer, not a pseudo-element
          // that scrolls away
          binding: cs.backgroundImage.startsWith('linear-gradient(90deg'),
          pseudo: getComputedStyle(el, el.id === 'page-left' ? '::after' : '::before').content,
          strip: {
            position: strip.position,
            image: strip.backgroundImage,
            pointer: strip.pointerEvents,
            height: parseFloat(strip.height),
            marginBottom: parseFloat(strip.marginBottom),
          },
        };
      });
      expect(look.overflow, `${id} is longer than the page`).toBeGreaterThan(100);
      expect(look.scrollbar).toBe('none');
      expect(look.gutter, `${id} draws no scrollbar`).toBe(0);
      expect(look.binding).toBe(true);
      expect(look.pseudo).toBe('none');
      // The fade: a sticky strip out of the flow's height, taking no input
      expect(look.strip.position).toBe('sticky');
      expect(look.strip.image).toContain('linear-gradient');
      expect(look.strip.pointer).toBe('none');
      expect(look.strip.height).toBeGreaterThanOrEqual(28);
      expect(look.strip.marginBottom).toBe(-look.strip.height);

      // Scrolled to the end, the last line lies wholly above the page's foot,
      // so the strip's fade is below it
      const clear = await page.locator(`#${id}`).evaluate(el => {
        el.scrollTop = el.scrollHeight;
        const items = el.querySelectorAll('.ingredient-item, .prep-step');
        const last = items[items.length - 1].getBoundingClientRect();
        const foot = parseFloat(getComputedStyle(el).paddingBottom);
        return el.getBoundingClientRect().bottom - foot - last.bottom;
      });
      expect(clear, `${id}'s last line clears the foot`).toBeGreaterThanOrEqual(-1);
    }
  });

  test('headers carry one rule, the meta line is serif, times read one way', async ({ page }) => {
    await openLongRecipe(page);
    const headers = await page.locator('.section-header').evaluateAll(els => els.map(el => {
      const cs = getComputedStyle(el);
      const text = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
      return { text, decoration: cs.textDecorationLine, rule: cs.borderBottomWidth };
    }));
    expect(headers.map(h => h.text)).toEqual(['Ingredients', 'Method']);
    for (const h of headers) {
      expect(h.decoration).toBe('none');
      expect(h.rule).toBe('1px');
    }

    const meta = page.locator('#page-right-content .recipe-meta-line');
    const font = await meta.evaluate(el => ({ family: getComputedStyle(el).fontFamily, numeric: getComputedStyle(el).fontVariantNumeric }));
    expect(font.family).toContain('Libre Baskerville');
    expect(font.numeric).toContain('tabular-nums');
    await expect(meta.locator('.meta-total')).toHaveText('3h 10m');
    await expect(meta.locator('.meta-breakdown')).toHaveText('(40m prep · 2h 30m cook)');
  });

  test('a duration chip shows a clock', async ({ page }) => {
    await openLongRecipe(page);
    if (isPhone(page)) await page.locator('.page-tab[data-tab="method"]').click();
    const chip = page.locator('#page-right-content .step-duration').first();
    await expect(chip).toHaveText('5 min');
    const look = await chip.evaluate(el => {
      const cs = getComputedStyle(el);
      return { image: cs.backgroundImage, left: parseFloat(cs.paddingLeft), size: parseFloat(cs.fontSize) };
    });
    expect(look.image).toContain('data:image/svg+xml');
    // Room for the 0.8em clock and a gap before the time
    expect(look.left).toBeGreaterThanOrEqual(6 + 0.8 * look.size);
  });

  test('the photo is taped to the page, clear of the next arrow', async ({ page }) => {
    const id = await createRecipe(page, {
      title: `Taped Photo ${Date.now()}`,
      ingredients: [{ name: 'flour', quantity: 200, unit: 'g' }],
      steps: [{ step_number: 1, instruction: 'Bake' }],
    });
    const upload = await page.request.post(`/api/recipes/${id}/photo`, {
      headers: API_HEADERS,
      multipart: { photo: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: DOT_JPEG } },
    });
    expect(upload.ok()).toBeTruthy();
    await authenticate(page);
    await openRecipe(page, id);
    const polaroid = page.locator('#page-right-content .recipe-polaroid');
    await expect(polaroid.locator('.recipe-photo')).toBeVisible();

    const tape = await polaroid.evaluate(el => {
      const cs = getComputedStyle(el, '::before');
      return { content: cs.content, pointer: cs.pointerEvents, width: parseFloat(cs.width), photo: el.getBoundingClientRect().width };
    });
    expect(tape.content).toBe('""');
    expect(tape.pointer).toBe('none');
    expect(tape.width / tape.photo).toBeGreaterThan(0.3);
    expect(tape.width / tape.photo).toBeLessThan(0.6);

    if (!isPhone(page)) {
      const photo = (await polaroid.boundingBox())!;
      const next = (await page.locator('#page-next').boundingBox())!;
      const overlap = photo.x < next.x + next.width && next.x < photo.x + photo.width
        && photo.y < next.y + next.height && next.y < photo.y + photo.height;
      expect(overlap, 'the photo overlaps the next arrow').toBe(false);
    }
  });

  test('the left page has a margin rule, the text clear of it', async ({ page }) => {
    test.skip(isPhone(page), 'the spread above 600px');
    await openListRecipe(page);
    await selectCook(page);
    const m = await page.evaluate(() => {
      const left = document.getElementById('page-left')!;
      const x = left.getBoundingClientRect().x;
      const tabs = [...document.querySelectorAll<HTMLElement>('.contents-tabs .contents-tab')]
        .map(el => el.getBoundingClientRect())
        .filter(r => r.width > 0)
        .map(r => [Math.round(r.x - x), Math.round(r.right - x)]);
      return {
        image: getComputedStyle(left).backgroundImage,
        text: Math.round(document.querySelector('#page-left-content .ingredient-item')!.getBoundingClientRect().x - x),
        tabs,
      };
    });
    // The first layer is the rule: transparent to 50px, then 1px of faint leather
    expect(m.image.startsWith('linear-gradient(90deg, rgba(0, 0, 0, 0) 50px, rgba(139, 45, 26, 0.16) 50px')).toBe(true);
    expect(m.text).toBe(62);
    expect(m.tabs.length).toBeGreaterThan(0);
    for (const tab of m.tabs) expect(tab).toEqual([10, 36]);
  });
});
