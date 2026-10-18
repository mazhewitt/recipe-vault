// Re-measures the "manage recipes + edge states" findings (2026-10-17 usability audit).
// Usage: node tests/usability/remeasure/manage.cjs [port=3014] [comma-separated ids to run, default all]
// Needs a server from `tests/usability/fresh.sh <port>` (the seeded 10-recipe book). Creates and deletes its
// own throwaway recipes for the late-difficulty checks; replaces the Lasagne photo with the fixture and
// halves the lasagne, so re-run fresh.sh before running it again.
const P = require('../probe.cjs');
const path = require('path');
const { chromium } = P;
const PORT = +(process.argv[2] || 3014);
const BASE = `http://127.0.0.1:${PORT}`;
const KEY = { 'X-API-Key': 'test-api-key-for-playwright', 'Content-Type': 'application/json' };
const FIX = path.join(__dirname, '..', '..', 'e2e', 'fixtures') + path.sep;
const api = async (m, p, b) => { const r = await fetch(BASE + p, { method: m, headers: KEY, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t }; } };
const out = (id, s) => console.log(`${id}: ${s}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function idByTitle(re) {
  const l = (await api('GET', '/api/recipes')).b;
  const r = Array.isArray(l) && l.find((x) => re.test(x.title));
  return r ? r.id : null;
}
async function openRecipe(page, id) {
  const item = page.locator(`.index-recipe-item[data-recipe-id="${id}"]`);
  if (await item.count()) { await item.first().scrollIntoViewIfNeeded(); await item.first().click(); }
  else await page.evaluate((i) => window.fetchAndDisplayRecipe(i), id);
  await page.waitForTimeout(1200);
}
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
async function run(id, fn) { if (ONLY && !ONLY.includes(id)) return; try { await fn(); } catch (e) { out(id, 'ERROR ' + e.message.split('\n')[0]); } }

(async () => {
  const las = await idByTitle(/Lasagne/);
  const roast = await idByTitle(/Sunday Roast/);
  if (!las || !roast) { console.log('seeded book not found - run tests/usability/fresh.sh ' + PORT); process.exit(1); }

  // 1. Phone: the whole book narrows and re-centres while a refreshed recipe is loading
  await run('phone-book-narrows-during-reload', async () => {
    const { page, close } = await P.open('phone', { port: PORT });
    await openRecipe(page, las);
    await page.route('**/api/recipes/*', async (r) => { if (r.request().method() === 'GET') await sleep(500); r.continue(); });
    const res = {};
    for (const [label, act] of [
      ['photo-upload', async () => { const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.add-photo-btn')]); await fc.setFiles(FIX + 'test-photo.jpg'); }],
      ['chat-update', async () => { await page.fill('#message-input', 'halve it'); await page.click('#send-button'); }],
    ]) {
      const r = await P.track(page, act, { ms: 3000, anchors: ['.app-container', '.recipe-book'] });
      const m = r.moves['.recipe-book'];
      res[label] = `maxDev=${m ? m.maxDev : 'n/a'}px`;
    }
    out('phone-book-narrows-during-reload', `book width deviation (390px viewport; 0 = fixed): photo-upload ${res['photo-upload']}, chat update_recipe ${res['chat-update']}`);
    await close();
  });

  // 2. Photo upload re-renders through the skeleton and loses the reader's scroll position
  await run('photo-upload-resets-scroll', async () => {
    const parts = [];
    for (const vp of ['phone', 'tablet', 'desktop']) {
      const { page, close } = await P.open(vp, { port: PORT });
      await openRecipe(page, las);
      if (vp === 'phone') { await page.click('.page-tab[data-tab="method"]'); await page.waitForTimeout(300); }
      // Open the chooser first: page.click scrolls the button (top of the page) into view, which
      // would itself reset the scroll the check is about. Then scroll down and upload.
      const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.add-photo-btn')]);
      await page.evaluate(() => { document.getElementById('page-right').scrollTop = 200; });
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => document.getElementById('page-right').scrollTop);
      const r = await P.track(page, async () => { await fc.setFiles(FIX + 'test-photo.jpg'); }, { ms: 2000, anchors: ['#page-right-content', '.recipe-polaroid'] });
      const after = await page.evaluate(() => document.getElementById('page-right').scrollTop);
      parts.push(`${vp} scrollTop ${before}->${after}, content height maxDev ${r.moves['#page-right-content']?.maxDev}px`);
      await close();
    }
    out('photo-upload-resets-scroll', parts.join('; '));
  });

  // 3. Late difficulty dots re-render the page and push the method down
  await run('late-difficulty-reflow', async () => {
    const parts = [];
    for (const vp of ['phone', 'tablet']) {
      const c = await api('POST', '/api/recipes', { title: 'Zz Remeasure Dots', description: 'x', prep_time_minutes: 15, cook_time_minutes: 30, servings: 4, tags: ['main', 'quick'],
        ingredients: Array.from({ length: 6 }, (_, i) => ({ name: 'ingredient ' + (i + 1), quantity: i + 1, unit: 'g' })),
        steps: Array.from({ length: 6 }, (_, i) => ({ instruction: 'Step ' + (i + 1) + ' instruction text that is reasonably long.', duration_minutes: 5 })) });
      const id = c.b.id;
      const { page, close } = await P.open(vp, { port: PORT });
      const t0 = Date.now();
      await page.route(`**/api/recipes/${id}`, async (route) => { if (Date.now() - t0 < 6000) { const resp = await route.fetch(); const j = await resp.json(); j.difficulty = null; return route.fulfill({ response: resp, json: j }); } return route.continue(); });
      await page.evaluate((i) => window.fetchAndDisplayRecipe(i), id);
      await page.waitForTimeout(500);
      if (vp === 'phone') { await page.click('.page-tab[data-tab="method"]'); await page.waitForTimeout(700); }
      const r = await P.track(page, async () => {}, { ms: 12000, anchors: ['.prep-step:nth-child(3)', '.recipe-tags', '.recipe-meta-line'] });
      const dots = await page.evaluate(() => document.querySelectorAll('.difficulty-dot').length);
      parts.push(`${vp} dots=${dots} step3 maxDev=${r.moves['.prep-step:nth-child(3)']?.maxDev}px tags maxDev=${r.moves['.recipe-tags']?.maxDev}px meta dh=${r.moves['.recipe-meta-line'] ? r.moves['.recipe-meta-line'].end[3] - r.moves['.recipe-meta-line'].start[3] : 'n/a'}px`);
      await close();
      await api('DELETE', `/api/recipes/${id}`);
    }
    out('late-difficulty-reflow', parts.join('; '));
  });

  // 4 + 5. Timer pill covers the next-recipe button; Logout sits directly above the timer's cancel x
  await run('timer-pill-covers-next', async () => {
    const parts = []; const gaps = [];
    for (const vp of ['phone', 'tablet', 'tablet-landscape', 'desktop']) {
      const { page, close } = await P.open(vp, { port: PORT });
      await openRecipe(page, las);
      await P.sendNote(page, 'start a timer', { waitMs: 1500 });
      const m = await page.evaluate(() => {
        const n = document.getElementById('page-next').getBoundingClientRect();
        const hit = (x, y) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className) : null; };
        const lo = document.querySelector('.logout-link').getBoundingClientRect(); const ca = document.querySelector('.timer-cancel').getBoundingClientRect();
        return { centre: n.width ? hit(n.x + n.width / 2, n.y + n.height / 2) : 'no-button', corner: n.width ? hit(n.x + 4, n.y + 4) : 'no-button', gap: Math.round(ca.top - lo.bottom), dx: Math.round(Math.abs((ca.x + ca.width / 2) - (lo.x + lo.width / 2))), cancel: `${Math.round(ca.width)}x${Math.round(ca.height)}`, logout: `${Math.round(lo.width)}x${Math.round(lo.height)}` };
      });
      if (vp !== 'phone') parts.push(`${vp} next-centre->${m.centre} next-corner->${m.corner}`);
      gaps.push(`${vp} gap=${m.gap}px dx=${m.dx}px cancel=${m.cancel} logout=${m.logout}`);
      await close();
    }
    out('timer-pill-covers-next', parts.join('; ') + '  (fixed when every centre/corner hits page-nav next)');
    out('logout-above-timer-cancel', gaps.join('; '));
  });

  // 6. Phone: the invisible 60px prev/next edge strips sit over ingredient quantities and the title
  await run('phone-edge-strip-over-content', async () => {
    const { page, close } = await P.open('phone', { port: PORT });
    await openRecipe(page, las);
    const q = await page.evaluate(() => { const r = document.querySelectorAll('.ingredient-qty')[2].getBoundingClientRect(); const e = document.elementFromPoint(r.x + 6, r.y + r.height / 2); const se = document.getElementById('mobile-edge-prev'); const s = se && se.getBoundingClientRect(); return { x: r.x + 6, y: r.y + r.height / 2, hit: e.id || e.className, strip: s ? `${Math.round(s.width)}x${Math.round(s.height)}` : 'none' }; });
    await page.touchscreen.tap(q.x, q.y); await page.waitForTimeout(1500);
    const t = await page.evaluate(() => document.querySelector('.recipe-title')?.textContent);
    out('phone-edge-strip-over-content', `3rd ingredient qty hit=${q.hit} strip=${q.strip}; tapping it -> "${t}" (expected Granny's Beef Lasagne)`);
    await close();
  });

  // 7. The clickable "Recipe Book" header is an invisible full-width bar above the book
  await run('header-full-width-hit-zone', async () => {
    const parts = [];
    for (const vp of ['tablet', 'desktop', 'phone']) {
      const { page, close } = await P.open(vp, { port: PORT });
      const m = await page.evaluate(() => { const h = document.getElementById('recipe-book-header'); const r = h.getBoundingClientRect(); const g = document.createRange(); g.selectNodeContents(h); const t = g.getBoundingClientRect(); return `hit ${Math.round(r.width)}x${Math.round(r.height)} vs label ${Math.round(t.width)}px`; });
      parts.push(`${vp} ${m}`);
      await close();
    }
    out('header-full-width-hit-zone', parts.join('; '));
  });

  // 8. A failed recipe load forces contents mode, which hides the note input entirely (tablet/desktop)
  await run('failed-load-hides-note-input', async () => {
    const { page, close } = await P.open('tablet', { port: PORT });
    await openRecipe(page, las);
    await page.route(`**/api/recipes/${roast}`, (r) => r.fulfill({ status: 500, body: 'boom' }));
    await page.evaluate((i) => window.fetchAndDisplayRecipe(i), roast);
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => ({ disp: getComputedStyle(document.getElementById('note-input')).display, mode: document.body.dataset.spreadMode, msg: document.getElementById('page-right-content').innerText.trim() }));
    out('failed-load-hides-note-input', `after "${m.msg}": spread=${m.mode} note-input display=${m.disp}`);
    await close();
  });

  // 9. Rotating a phone into landscape opens the spread in contents mode: no note input, Method tab shows ingredients
  await run('phone-rotate-landscape-loses-input', async () => {
    const { page, close } = await P.open('phone', { port: PORT });
    await openRecipe(page, las);
    await page.click('.page-tab[data-tab="method"]');
    await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(800);
    const m = await page.evaluate(() => ({ disp: getComputedStyle(document.getElementById('note-input')).display, mode: document.body.dataset.spreadMode, left: document.getElementById('page-left-content').innerText.trim().slice(0, 14) }));
    out('phone-rotate-landscape-loses-input', `844x390: spread=${m.mode} note-input display=${m.disp} left page="${m.left}"`);
    await close();
  });

  // 10. Long titles wrap to 3-4 lines because share/photo/polaroid sit in the same flex row
  await run('long-title-wraps', async () => {
    const parts = [];
    for (const vp of ['phone', 'tablet', 'tablet-landscape', 'desktop']) {
      const { page, close } = await P.open(vp, { port: PORT });
      for (const [n, id] of [['roast', roast], ['lasagne', las]]) {
        await page.goto('/chat'); await page.waitForTimeout(600);
        await openRecipe(page, id);
        const h = await page.evaluate(() => { const t = document.querySelector('.recipe-title').getBoundingClientRect(); const row = document.querySelector('.recipe-title-row').getBoundingClientRect(); return `${Math.round(t.height / 43)}l/${Math.round(t.width)}of${Math.round(row.width)}px`; });
        parts.push(`${vp}:${n}=${h}`);
      }
      await close();
    }
    out('long-title-wraps', parts.join(' '));
  });

  // 11. First paint: static "Ask me to find..." placeholder, then phone filter tabs drop 66px when the contents arrive
  await run('first-paint-placeholder-jump', async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ ...P.VIEWPORTS.phone, baseURL: BASE });
    const page = await ctx.newPage();
    await page.route('**/api/recipes', async (r) => { await sleep(700); r.continue(); });
    await page.goto('/chat', { waitUntil: 'commit' }); await page.waitForSelector('.app-container'); await page.waitForTimeout(300);
    const a = await page.evaluate(() => ({ y: Math.round(document.querySelector('.contents-tab-all').getBoundingClientRect().y), t: document.getElementById('page-left-content').innerText.trim().slice(0, 25) }));
    await page.waitForTimeout(1200);
    const b = await page.evaluate(() => ({ y: Math.round(document.querySelector('.contents-tab-all').getBoundingClientRect().y), t: document.getElementById('page-left-content').innerText.trim().slice(0, 14) }));
    out('first-paint-placeholder-jump', `phone All tab y ${a.y}->${b.y} (${b.y - a.y}px); first text "${a.t}" then "${b.t.replace(/\n/g, ' ')}"`);
    await browser.close();
  });

  // 12. Web-font swap reflows an open recipe: compare fallback-font layout (fonts aborted) with Kalam/Baskerville layout
  await run('font-swap-reflow', async () => {
    const parts = [];
    for (const vp of ['phone', 'tablet', 'desktop']) {
      const pos = {};
      for (const mode of ['fallback', 'webfont']) {
        const browser = await chromium.launch();
        const page = await (await browser.newContext({ ...P.VIEWPORTS[vp], baseURL: BASE })).newPage();
        if (mode === 'fallback') await page.route('**fonts.gstatic.com/**', (r) => r.abort());
        await page.goto('/chat'); await page.waitForSelector('.index-recipe-item'); await page.evaluate(() => document.fonts.ready);
        await page.locator(`.index-recipe-item[data-recipe-id="${las}"]`).click(); await page.waitForTimeout(1500);
        if (vp === 'phone') { await page.click('.page-tab[data-tab="method"]'); await page.waitForTimeout(500); }
        pos[mode] = await page.evaluate(() => ({ t: Math.round(document.querySelector('.recipe-title').getBoundingClientRect().height), s: Math.round(document.querySelector('.prep-step:nth-child(6)').getBoundingClientRect().y), u: Math.round(document.querySelector('.user-info').getBoundingClientRect().width) }));
        await browser.close();
      }
      parts.push(`${vp} title h ${pos.fallback.t}->${pos.webfont.t}, step6 y ${pos.fallback.s}->${pos.webfont.s} (${pos.webfont.s - pos.fallback.s}px), user chip w ${pos.fallback.u}->${pos.webfont.u}`);
    }
    out('font-swap-reflow', parts.join('; '));
  });

  // 13. Share: a new token per tap; toast placed away from the button
  await run('share-new-token-each-tap', async () => {
    const { page, close, context } = await P.open('tablet', { port: PORT });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
    await openRecipe(page, las);
    const urls = [];
    for (let i = 0; i < 2; i++) { await page.click('.share-btn'); await page.waitForTimeout(500); urls.push(await page.evaluate(() => navigator.clipboard.readText())); await page.waitForTimeout(2000); }
    const t = await page.evaluate(() => { const b = document.querySelector('.share-btn').getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}`; });
    out('share-new-token-each-tap', `two taps -> ${urls.join(' , ')} (distinct=${urls[0] !== urls[1]}); share button ${t}`);
    await close();
  });

  // 14. Share page: og:image relative, copy button height, photo without dimensions
  await run('share-page-issues', async () => {
    const s = await api('POST', `/api/recipes/${las}/share`);
    const html = await (await fetch(BASE + s.b.url)).text();
    const og = (html.match(/og:image" content="([^"]+)"/) || [])[1];
    const img = (html.match(/<img[^>]*>/) || [''])[0];
    const browser = await chromium.launch(); const page = await (await browser.newContext({ ...P.VIEWPORTS.phone })).newPage();
    await page.goto(BASE + s.b.url);
    const b = await page.evaluate(() => { const r = document.getElementById('copyBtn').getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; });
    const steps = await page.evaluate(() => document.querySelector('ol li')?.innerText.slice(0, 12));
    out('share-page-issues', `og:image="${og}" (absolute=${/^https?:/.test(og || '')}); img has width/height=${/width=|height=/.test(img)}; copy button ${b}; first step text "${steps}" inside a numbered <ol>`);
    await browser.close();
  });

  // 15. Photo upload errors appear at the foot of the left page (or nowhere in contents mode)
  await run('photo-error-far-or-hidden', async () => {
    const parts = [];
    for (const [vp, mode] of [['tablet', 'cook'], ['tablet', 'contents'], ['phone', '-']]) {
      const { page, close } = await P.open(vp, { port: PORT });
      await openRecipe(page, las);
      if (mode === 'contents') { await page.click('.spread-tab[data-mode="contents"]'); await page.waitForTimeout(800); }
      const r = await P.track(page, async () => { const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.add-photo-btn')]); await fc.setFiles(FIX + 'large-photo.jpg'); await page.waitForTimeout(400); }, { ms: 600, anchors: ['.recipe-book'] });
      const m = await page.evaluate(() => { const e = document.querySelector('.paste-error'); const b = document.querySelector('.add-photo-btn').getBoundingClientRect(); if (!e) return 'none'; const r = e.getBoundingClientRect(); return r.width ? `${Math.round(Math.hypot(r.x - b.x, r.y - b.y))}px from button` : 'invisible'; });
      parts.push(`${vp}/${mode}: ${m}, book maxDev ${r.moves['.recipe-book']?.maxDev}px`);
      await close();
    }
    out('photo-error-far-or-hidden', parts.join('; '));
  });

  // 16. Small touch targets in this journey
  await run('small-manage-targets', async () => {
    const parts = [];
    for (const vp of ['phone', 'tablet']) {
      const { page, close } = await P.open(vp, { port: PORT });
      await openRecipe(page, las);
      const m = await page.evaluate(() => ['.share-btn', '.add-photo-btn', '.logout-link', '#recipe-book-header', '#page-next'].map((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return `${s}=${Math.round(r.width)}x${Math.round(r.height)}`; }).join(' '));
      parts.push(`${vp}: ${m}`);
      await close();
    }
    out('small-manage-targets', parts.join('; '));
  });

  // 17. Resizing in the contents view re-fetches the recipe list on every resize event
  await run('resize-refetch-storm', async () => {
    const { page, close } = await P.open('desktop', { port: PORT });
    let n = 0; page.on('request', (r) => { if (/\/api\/recipes(\?|$)/.test(r.url())) n++; });
    for (let i = 0; i < 20; i++) await page.setViewportSize({ width: 900 + i * 10, height: 800 });
    await page.waitForTimeout(800);
    out('resize-refetch-storm', `20 resize events on the contents page -> ${n} GET /api/recipes`);
    await close();
  });

  // 18. Crossing 600px resets the recipe page's scroll
  await run('breakpoint-resets-scroll', async () => {
    const { page, close } = await P.open('desktop', { port: PORT });
    await openRecipe(page, las);
    await page.evaluate(() => { document.getElementById('page-right').scrollTop = 200; });
    const a = await page.evaluate(() => document.getElementById('page-right').scrollTop);
    await page.setViewportSize({ width: 500, height: 800 }); await page.waitForTimeout(500);
    const b = await page.evaluate(() => document.getElementById('page-right').scrollTop);
    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(500);
    const c = await page.evaluate(() => ({ st: document.getElementById('page-right').scrollTop, mode: document.body.dataset.spreadMode }));
    out('breakpoint-resets-scroll', `scrollTop 1280:${a} -> 500:${b} -> 1280:${c.st} (mode ${c.mode})`);
    await close();
  });

  // 19. Render-blocking marked.js from the CDN delays first paint
  await run('cdn-script-blocks-paint', async () => {
    const browser = await chromium.launch(); const page = await (await browser.newContext({ ...P.VIEWPORTS.tablet, baseURL: BASE })).newPage();
    await page.route('**cdn.jsdelivr.net/**', async (r) => { await sleep(3000); r.continue(); });
    await page.goto('/chat'); await page.waitForTimeout(300);
    const fcp = await page.evaluate(() => Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || -1));
    out('cdn-script-blocks-paint', `jsdelivr delayed 3000ms -> FCP ${fcp}ms`);
    await browser.close();
  });

  // 20. Backend: difficulty backfill loses a SQLite lock race with auto-tagging (no difficulty ever arrives)
  await run('difficulty-backfill-lock-race', async () => {
    const c = await api('POST', '/api/recipes', { title: 'Zz Remeasure Race', description: 'x', servings: 2, ingredients: [{ name: 'oats', quantity: 1, unit: 'g' }], steps: [{ instruction: 'Bake.', duration_minutes: 5 }] });
    await sleep(3000);
    const g = await api('GET', `/api/recipes/${c.b.id}`);
    out('difficulty-backfill-lock-race', `created without difficulty+tags -> after 3s difficulty=${g.b.difficulty} tags=${JSON.stringify(g.b.tags)} (see server.log for "database is locked")`);
    await api('DELETE', `/api/recipes/${c.b.id}`);
  });
})();
