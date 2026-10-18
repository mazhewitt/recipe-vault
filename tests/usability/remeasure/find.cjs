// Re-measures the "find a recipe" journey findings (2026-10-17 usability audit). One line per finding id.
// Usage: node tests/usability/remeasure/find.cjs [port=3011] [comma-separated ids]
// Needs a server from `tests/usability/fresh.sh <port>` (the seeded 10-recipe book).
const P = require('../probe.cjs');
const port = +(process.argv[2] || 3011);

async function gesture(page, cdp, x0, y0, path) {
  const pt = (x, y) => [{ x: Math.round(x), y: Math.round(y), id: 1, radiusX: 8, radiusY: 8, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x0, y0) });
  for (const [dx, dy] of path) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x0 + dx, y0 + dy) });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const line = (n, dx, dy) => Array.from({ length: n }, (_, i) => [dx * (i + 1) / n, dy * (i + 1) / n]);
const title = (page) => page.evaluate(() => document.querySelector('#page-right-content .recipe-title')?.textContent || null);

const checks = {
  // Phone: tapping the page number of a contents row opens recipe #1 instead (edge overlay on top)
  async 'phone-edge-zone-steals-contents-taps'() {
    const { page, close } = await P.open('phone', { port });
    const b = await page.locator('.index-recipe-item').nth(2).locator('.index-page-number').boundingBox();
    const hit = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); if (!e) return 'none'; const nav = e.closest('.mobile-edge-nav, .gutter-chevron, .page-tabs'); if (nav) return nav.id || nav.className; return e.closest('.index-recipe-item') ? 'row' : (e.id || e.className || e.tagName); }, [b.x + b.width / 2, b.y + b.height / 2]);
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(1200);
    const t = await title(page); await close();
    return `tap "p. 7" on Granny's Beef Lasagne row: hit=${hit}, opened="${t}" (expected Granny's Beef Lasagne)`;
  },
  // Phone: invisible 60px prev/next zones lie over the recipe text
  async 'phone-edge-zones-cover-recipe-text'() {
    const { page, close } = await P.open('phone', { port });
    await P.openFromContents(page, 2);
    await page.locator('.page-tab[data-tab="method"]').tap(); await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const steps = [...document.querySelectorAll('.prep-step')];
      const under = steps.filter(s => { const n = s.querySelector('.step-number').getBoundingClientRect(); const e = document.elementFromPoint(n.left + n.width / 2, n.top + n.height / 2); return e && e.closest('.mobile-edge-nav, button, [role=tab]'); }).length;
      const en = document.getElementById('mobile-edge-next'); const pg = document.getElementById('page-right').getBoundingClientRect();
      const zone = en ? (() => { const b = en.getBoundingClientRect(); return `each edge zone ${Math.round(b.width)}x${Math.round(b.height)}px = ${Math.round(200 * b.width / pg.width)}% of page width, opacity ${getComputedStyle(en).opacity}`; })() : 'no edge zones in the DOM';
      return `${under}/${steps.filter(s => s.getBoundingClientRect().top < innerHeight).length} visible step numbers sit under a navigation control; ${zone}`;
    });
    await close(); return r;
  },
  // Phone: a vertical scroll with some sideways drift turns the page
  async 'phone-diagonal-scroll-turns-page'() {
    const out = [];
    for (const [name, path] of [['31deg drift', line(12, -130, -220)], ['sideways wobble then scroll', [[-5, -2], [-10, -4], [-15, -6], ...line(12, -120, -300).map(([x, y]) => [x - 15, y - 6])]], ['20deg drift', line(12, -110, -300)]]) {
      const { page, close } = await P.open('phone', { port });
      const cdp = await page.context().newCDPSession(page);
      await P.openFromContents(page, 2);
      await gesture(page, cdp, 255, 600, path); await page.waitForTimeout(1200);
      const t = await title(page); out.push(`${name}: ${t === "Granny's Beef Lasagne" ? 'stayed' : 'TURNED to ' + t}`);
      await close();
    }
    return out.join('; ');
  },
  // Timer pill sits on top of the ">" arrow
  async 'timer-pill-covers-next-arrow'() {
    const out = [];
    for (const vp of ['tablet', 'tablet-landscape', 'desktop']) {
      const { page, close } = await P.open(vp, { port });
      await P.openFromContents(page, 2);
      await page.evaluate(() => window.startTimer(5, 'Brown the mince', 2)); await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const nb = document.getElementById('page-next'); const r = nb.getBoundingClientRect(); let c = 0, t = 0;
        for (let x = r.left + 1; x < r.right; x += 2) for (let y = r.top + 1; y < r.bottom; y += 2) { t++; const e = document.elementFromPoint(x, y); if (e && !nb.contains(e)) c++; }
        const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return `${Math.round(100 * c / t)}% covered, centre->${e.closest('#timer-widget') ? 'timer' : 'arrow'}`;
      });
      out.push(`${vp}: ${r}`); await close();
    }
    return out.join('; ');
  },
  // Header -> contents shows a frame with an empty left page and the whole recipe re-flowed on the right
  async 'header-return-intermediate-frame'() {
    const out = [];
    for (const vp of ['tablet', 'desktop']) {
      const { page, close } = await P.open(vp, { port });
      await P.openFromContents(page, 2); await page.waitForTimeout(400);
      const r = await P.track(page, async () => { await page.locator('#recipe-book-header').click(); }, { ms: 900 });
      const cls = r.shifts.reduce((a, s) => a + s.value, 0);
      await P.openFromContents(page, 2); await page.waitForTimeout(400);
      await page.route('**/api/recipes', async (route) => { await new Promise(res => setTimeout(res, 400)); route.continue(); });
      await page.locator('#recipe-book-header').click(); await page.waitForTimeout(150);
      const mid = await page.evaluate(() => ({ leftEmpty: !document.getElementById('page-left-content').innerText.trim(), rightIngr: !!document.querySelector('#page-right-content .tab-panel[data-tab="ingredients"]') }));
      out.push(`${vp}: CLS=${cls.toFixed(3)}, mid-frame(list 400ms) leftEmpty=${mid.leftEmpty} recipeWithIngredientsOnRight=${mid.rightIngr}`);
      await close();
    }
    return out.join('; ');
  },
  // Next waits for a forced list refetch, which also empties the prefetch cache
  async 'next-waits-for-list-and-ignores-prefetch'() {
    const { page, close } = await P.open('tablet', { port });
    await P.openFromContents(page, 2); await page.waitForTimeout(2000);
    let t0 = Date.now();
    const reqs = []; page.on('request', r => { const p = new URL(r.url()).pathname; if (/^\/api\/recipes(\/[^/]+)?$/.test(p)) reqs.push({ k: p === '/api/recipes' ? 'list' : 'recipe', t: Date.now() - t0 }); });
    await page.route(/\/api\/recipes(\/[^/]+)?$/, async (route) => { await new Promise(res => setTimeout(res, 300)); route.continue(); });
    t0 = Date.now();
    await page.locator('#page-next').click();
    let firstMotion = null, contentAt = null;
    while (Date.now() - t0 < 4000) {
      const s = await page.evaluate(() => ({ ov: !!document.querySelector('.page-turn-overlay,.skeleton'), t: document.querySelector('#page-right-content .recipe-title')?.textContent }));
      if (s.ov && firstMotion === null) firstMotion = Date.now() - t0;
      if (s.t === 'Lemon Drizzle Cake') { contentAt = Date.now() - t0; break; }
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(800); await close();
    return `300ms API latency: first visible response ${firstMotion}ms, new recipe at ${contentAt}ms; requests during first 1.6s: ${reqs.slice(0, 4).map(r => r.k).join(',')}${(() => { const before = reqs.filter(r => contentAt === null || r.t <= contentAt); return before.length ? ` (${before.map(r => r.k).join(',')} before the new recipe showed${before.some(r => r.k === 'recipe') ? ': recipe fetched despite prefetch' : ''})` : ' (none before the new recipe showed; later ones are neighbour prefetches)'; })()}`;
  },
  // No URL/history state: reload and Back lose the recipe
  async 'no-history-reload-loses-recipe'() {
    const { page, close } = await P.open('tablet', { port });
    const h0 = await page.evaluate(() => history.length);
    await P.openFromContents(page, 2);
    const h1 = await page.evaluate(() => [history.length, location.pathname + location.search + location.hash]);
    await page.reload(); await page.waitForSelector('.app-container'); await page.waitForTimeout(900);
    const vm = await page.evaluate(() => document.body.dataset.viewMode);
    await close();
    return `history.length ${h0}->${h1[0]} on open (url ${h1[1]}); after reload viewMode=${vm}${vm === 'recipe' ? '' : ' (recipe lost)'}`;
  },
  // Returning to the contents scrolls the title and A-Z off even when the highlighted row was already visible
  async 'contents-return-scrolls-title-away'() {
    const out = [];
    for (const vp of ['tablet-landscape', 'desktop', 'phone']) {
      const { page, close } = await P.open(vp, { port });
      const before = await page.evaluate(() => { const c = document.querySelectorAll('.index-recipe-item')[2].getBoundingClientRect(); const p = document.getElementById('page-left').getBoundingClientRect(); return c.bottom <= p.bottom; });
      await P.openFromContents(page, 2);
      await page.locator('#recipe-book-header').click({ force: true }); await page.waitForTimeout(900);
      const r = await page.evaluate(() => { const pg = document.getElementById('page-left'); const t = document.querySelector('.index-alphabet-nav').getBoundingClientRect(); const p = pg.getBoundingClientRect(); return `scrollTop=${pg.scrollTop}/${pg.scrollHeight - pg.clientHeight} A-Z visible=${t.top >= p.top}`; });
      out.push(`${vp}: row visible at top=${before}, after return ${r}`); await close();
    }
    return out.join('; ');
  },
  // A-Z strip scrolls away with the list
  async 'alphabet-strip-scrolls-away'() {
    const { page, close } = await P.open('phone', { port });
    await page.locator('.index-alpha-letter[data-letter="M"]').tap(); await page.waitForTimeout(900);
    const r = await page.evaluate(() => { const a = document.querySelector('.index-alphabet-nav').getBoundingClientRect(); const p = document.getElementById('page-left').getBoundingClientRect(); return `after jumping to M: A-Z bottom=${Math.round(a.bottom)} page top=${Math.round(p.top)} visible=${a.bottom > p.top}`; });
    await close(); return r;
  },
  async 'touch-targets-under-44px'() {
    const out = [];
    for (const vp of ['phone', 'tablet', 'tablet-landscape']) {
      const { page, close } = await P.open(vp, { port });
      const r = await page.evaluate(() => {
        const sz = (s) => { const e = [...document.querySelectorAll(s)].find(x => x.getBoundingClientRect().width > 0 && getComputedStyle(x).display !== 'none'); if (!e) return '-'; const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; };
        return `A-Z ${sz('.index-alpha-letter.active')}, filter tab ${sz('.contents-tab')}, arrow ${sz('#page-next')}, header ${sz('#recipe-book-header')}`;
      });
      out.push(`${vp}: ${r}`); await close();
    }
    return out.join('; ');
  },
  // Tablet/desktop: opening a recipe moves the note input across the spine
  async 'open-recipe-moves-note-input'() {
    const out = [];
    for (const vp of ['tablet', 'desktop']) {
      const { page, close } = await P.open(vp, { port });
      const r = await P.track(page, async () => { await page.locator('.index-recipe-item').nth(2).click(); }, { ms: 1500, anchors: ['#note-input'] });
      const m = r.moves['#note-input']; out.push(`${vp}: dx=${m.end[0] - m.start[0]}px flips=${m.visFlips}`); await close();
    }
    return out.join('; ');
  },
  // Tablet: Contents spread tab while cooking pushes the method down
  async 'contents-tab-reflows-method'() {
    const { page, close } = await P.open('tablet', { port });
    await P.openFromContents(page, 2);
    const r = await P.track(page, async () => { await page.locator('.spread-tab[data-mode="contents"]').click(); }, { ms: 800, anchors: ['.prep-step:nth-child(1)', '.tab-panel[data-tab="method"]'] });
    const m = r.moves['.prep-step:nth-child(1)']; await close();
    return `step 1 moved dy=${m.end[1] - m.start[1]}px when the Contents tab was tapped`;
  },
  // Phone: "next recipe" footer link moves between consecutive taps
  async 'phone-footer-next-moves'() {
    const { page, close } = await P.open('phone', { port });
    await P.openFromContents(page, 2);
    await page.locator('.page-tab[data-tab="method"]').tap(); await page.waitForTimeout(400);
    await page.evaluate(() => { const p = document.getElementById('page-right'); p.scrollTop = p.scrollHeight; }); await page.waitForTimeout(200);
    const a = await page.locator('.footer-next').boundingBox();
    await page.touchscreen.tap(a.x + a.width / 2, a.y + a.height / 2); await page.waitForTimeout(1300);
    const b = await page.locator('.footer-next').boundingBox();
    const tab = await page.evaluate(() => document.getElementById('page-right').dataset.tab);
    await close();
    return `footer-next y ${Math.round(a.y)} -> ${Math.round(b.y)} (dy=${Math.round(b.y - a.y)}); tab after next=${tab} (was method)`;
  },
  async 'tablet-no-swipe'() {
    const { page, close } = await P.open('tablet', { port });
    const cdp = await page.context().newCDPSession(page);
    await P.openFromContents(page, 2);
    await gesture(page, cdp, 600, 600, line(12, -300, 0)); await page.waitForTimeout(1200);
    const t = await title(page); await close();
    return `swipe left 300px on tablet: ${t === "Granny's Beef Lasagne" ? 'no navigation' : 'navigated to ' + t}`;
  },
};

(async () => {
  const only = process.argv[3] ? process.argv[3].split(',') : Object.keys(checks);
  for (const id of only) {
    try { console.log(`${id}: ${await checks[id]()}`); } catch (e) { console.log(`${id}: ERROR ${e.message.split('\n')[0]}`); }
  }
})();
