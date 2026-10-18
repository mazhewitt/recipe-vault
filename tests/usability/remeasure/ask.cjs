// Re-measures the "ask the assistant / notes" findings (2026-10-17 usability audit).
// Usage: node tests/usability/remeasure/ask.cjs [port=3013]
// Needs a server from `tests/usability/fresh.sh <port>`. Mutates the book (halves the lasagne), so
// re-run fresh.sh before running it again.
// Prints one line per finding id. Each block starts from a fresh P.open; no reliance on other scripts' state.
const P = require('../probe.cjs');
const PORT = +(process.argv[2] || 3013);
const PHOTO = require('path').join(__dirname, '..', '..', 'e2e', 'fixtures', 'test-photo.jpg');
const out = (id, msg) => console.log(`${id}: ${msg}`);

async function rect(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s); if (!el) return null;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vis: r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' };
  }, sel);
}
async function openLasagne(page) {
  const items = page.locator('.index-recipe-item'); const n = await items.count();
  for (let i = 0; i < n; i++) if (/Lasagne/.test(await items.nth(i).innerText())) { await items.nth(i).click(); await page.waitForTimeout(1300); return; }
  throw new Error('lasagne not found');
}
async function send(page, text, ms = 1100) { await page.fill('#message-input', text); await page.click('#send-button'); await page.waitForTimeout(ms); }
async function slowChat(page, ms) {
  await page.route('**/api/chat', async (route) => { const resp = await route.fetch(); const body = await resp.body(); await new Promise((r) => setTimeout(r, ms)); await route.fulfill({ response: resp, body }); });
}
const pageRect = (page) => page.evaluate(() => { const r = document.querySelector('#page-right').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left) }; });

(async () => {
  // ---------- tablet / landscape / desktop: input jump, cook-mode reply placement, cover, halve ----------
  for (const vp of ['tablet', 'tablet-landscape', 'desktop']) {
    const { page, close } = await P.open(vp, { port: PORT });
    // input-jumps-across-spine (open recipe)
    let r = await P.track(page, async () => { await openLasagne(page); }, { ms: 1500, anchors: ['#note-input'] });
    const m = r.moves['#note-input'];
    out('input-jumps-across-spine', `${vp} open recipe: #note-input dx=${m.end[0] - m.start[0]}px maxDev=${m.maxDev}px visFlips=${m.visFlips}`);

    // cook-reply-offscreen: scroll method a bit, ask a question, where does the answer land
    await page.evaluate(() => { document.querySelector('#page-right').scrollTop = 200; });
    await page.waitForTimeout(200);
    await send(page, 'what wine goes with this?');
    const mr = await rect(page, '#page-margin'); const pr = await pageRect(page);
    const st = await page.$eval('#page-right', (e) => Math.round(e.scrollTop));
    out('cook-reply-offscreen', `${vp} method scrollTop=${st}: reply rect y=${mr.y}..${mr.y + mr.h} vs page top=${pr.top} -> visible=${mr.y + mr.h > pr.top && mr.y < pr.bottom}`);

    // cook-reply-covers-recipe: back to top, three replies, measure width/overlap/hit-test/background
    await page.evaluate(() => { document.querySelector('#page-right').scrollTop = 0; });
    await send(page, 'and a side dish?'); await send(page, 'can I freeze it?');
    const cover = await page.evaluate(() => {
      const m = document.querySelector('#page-margin'); const rm = m.getBoundingClientRect();
      const pr = document.querySelector('#page-right').getBoundingClientRect();
      const hits = []; let covered = 0;
      for (const s of ['.recipe-title', '.share-btn', '.add-photo-btn', '.recipe-photo', '.recipe-meta-line', '.section-header', '.prep-step']) {
        const el = document.querySelector(s); if (!el) continue; const r = el.getBoundingClientRect();
        const ix = Math.min(rm.right, r.right) - Math.max(rm.left, r.left), iy = Math.min(rm.bottom, r.bottom) - Math.max(rm.top, r.top);
        if (ix > 2 && iy > 2) covered++;
        if (/btn|photo/.test(s)) { const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); if (t && !el.contains(t)) hits.push(s); }
      }
      // The sticky sits on the LEFT page by design (D3): measure its overlap with the right page, and
      // its own paper (the background is on #page-margin, not the note inside it)
      const onRight = Math.max(0, Math.min(rm.right, pr.right) - Math.max(rm.left, pr.left)) * Math.max(0, Math.min(rm.bottom, pr.bottom) - Math.max(rm.top, pr.top));
      return { w: Math.round(rm.width), h: Math.round(rm.height), onRight: Math.round(onRight), covered, blocked: hits, bg: getComputedStyle(m).backgroundColor };
    });
    out('cook-reply-covers-recipe', `${vp} 3 replies: sticky ${cover.w}x${cover.h}px, overlaps page-right ${cover.onRight}px², overlaps ${cover.covered} recipe elements, taps blocked on [${cover.blocked.join(' ')}], sticky background=${cover.bg}`);

    // debug-status-lines: timer + update
    await send(page, 'set a timer for this step', 1500);
    const statusTexts = await page.$$eval('#page-margin .margin-note', (x) => x.map((n) => n.innerText));
    const leaked = statusTexts.filter((t) => /Using tool:|Timer set:|\d\.\d+ min/.test(t));
    out('debug-status-lines', `${vp} after timer: ${leaked.length}/${statusTexts.length} visible margin notes are technical ${JSON.stringify(leaked)}`);

    // halve-scroll-reset (realistic 300ms recipe GET)
    await page.route(/\/api\/recipes\/[0-9a-f-]{36}$/, async (route) => { if (route.request().method() !== 'GET') return route.continue(); await new Promise((r) => setTimeout(r, 300)); route.continue(); });
    await page.evaluate(() => { document.querySelector('#page-right').scrollTop = 250; });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      window.__h = []; window.__on = true;
      const loop = () => { if (!window.__on) return; const pr = document.querySelector('#page-right'); const s5 = document.querySelector('.prep-step[data-step="5"]'); window.__h.push([Math.round(pr.scrollTop), document.querySelectorAll('.skeleton').length, s5 ? Math.round(s5.getBoundingClientRect().y) : null]); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    });
    await send(page, 'halve it please', 2800);
    const h = await page.evaluate(() => { window.__on = false; return window.__h; });
    await page.unroute(/\/api\/recipes\/[0-9a-f-]{36}$/);
    out('halve-scroll-reset', `${vp} scrollTop ${h[0][0]} -> ${h[h.length - 1][0]}; skeleton frames=${h.filter((f) => f[1] > 0).length}; step5 y ${h[0][2]} -> ${h[h.length - 1][2]}`);

    // cook-to-notes-reflow: switch to Notes mode with the method scrolled
    await page.evaluate(() => { document.querySelector('#page-right').scrollTop = 200; });
    await page.waitForTimeout(200);
    r = await P.track(page, async () => { await page.click('.spread-tab[data-mode="notes"]'); await page.waitForTimeout(700); }, { ms: 1000, anchors: ['.prep-step[data-step="4"]', '#note-input'] });
    const s4 = r.moves['.prep-step[data-step="4"]'];
    out('cook-to-notes-reflow', `${vp} Cook->Notes: method step 4 moved dy=${s4 ? s4.end[1] - s4.start[1] : 'n/a'}px; layout-shift=${r.shifts.reduce((a, s) => a + s.value, 0).toFixed(3)}`);

    // input-hidden-contents-and-meal
    r = await P.track(page, async () => { await page.click('.spread-tab[data-mode="contents"]'); await page.waitForTimeout(800); }, { ms: 1000, anchors: ['#note-input'] });
    const cvis = (await rect(page, '#note-input')).vis;
    await page.click('.spread-tab[data-mode="cook"]'); await page.waitForTimeout(600);
    await send(page, 'plan a meal plan for a dinner party', 3000);
    const mvis = (await rect(page, '#note-input')).vis;
    const mealMargin = await page.$$eval('#page-margin .margin-note', (x) => x.map((n) => n.innerText.slice(0, 40)));
    out('input-hidden-contents-and-meal', `${vp} input visible: contents-tab-with-recipe=${cvis}, after meal plan=${mvis} (viewMode=${await page.evaluate(() => document.body.dataset.viewMode)}, mode=${await page.evaluate(() => document.body.dataset.spreadMode)})`);
    out('reply-filed-out-of-sight', `${vp} meal plan view margin shows ${JSON.stringify(mealMargin)} (expected the meal-plan reply "I've assembled your meal plan")`);
    await close();
  }

  // ---------- display_recipe from contents: reply disappears ----------
  for (const vp of ['phone', 'tablet']) {
    const { page, close } = await P.open(vp, { port: PORT });
    await send(page, 'show me the lasagne', 2500);
    const margin = await page.$$eval('#page-margin .margin-note', (x) => x.length);
    out('reply-filed-out-of-sight', `${vp} "show me the lasagne": recipe open (${await page.evaluate(() => document.body.dataset.viewMode)}), margin notes shown=${margin} (reply filed on book thread)`);
    await close();
  }

  // ---------- phone: reply appended below the footer ----------
  {
    const { page, close } = await P.open('phone', { port: PORT });
    await openLasagne(page);
    await page.tap('.page-tab[data-tab="method"]'); await page.waitForTimeout(400);
    await page.evaluate(() => { document.querySelector('#page-right').scrollTop = 250; });
    await send(page, 'what wine goes with this?');
    const mr = await rect(page, '#page-margin'); const inp = await rect(page, '#note-input');
    out('cook-reply-offscreen', `phone method scrolled: reply y=${mr.y} vs input top=${inp.y} -> visible=${mr.y < inp.y && mr.y + mr.h > 0}`);
    await send(page, 'set a timer', 1500);
    const lines = await page.$$eval('#page-margin .margin-note', (x) => x.map((n) => n.innerText));
    out('debug-status-lines', `phone margin after timer: ${JSON.stringify(lines)}`);
    await close();
  }

  // ---------- focus loss + input disabled while thinking ----------
  for (const vp of ['phone', 'tablet']) {
    const { page, close } = await P.open(vp, { port: PORT });
    await slowChat(page, 1200);
    await page.tap('#message-input'); await page.keyboard.type('first question'); await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const disabled = await page.$eval('#message-input', (e) => e.disabled);
    await page.waitForTimeout(2000);
    const focus = await page.evaluate(() => (document.activeElement && (document.activeElement.id || document.activeElement.tagName)));
    out('focus-lost-after-send', `${vp} textarea disabled while thinking=${disabled}; focus after reply=${focus}`);
    await close();
  }

  // ---------- slip growth: typing, thinking row, image chip ----------
  for (const vp of ['phone', 'tablet', 'desktop']) {
    const { page, close } = await P.open(vp, { port: PORT });
    const before = await rect(page, '#note-input'); const pc0 = await rect(page, '.pages-container');
    await page.click('#message-input');
    for (let i = 0; i < 7; i++) { await page.keyboard.type('line ' + i); if (i < 6) await page.keyboard.press('Shift+Enter'); }
    const typed = await rect(page, '#note-input'); const pc1 = await rect(page, '.pages-container');
    out('slip-grows-over-page', `${vp} 7-line note: slip h ${before.h}->${typed.h} (+${typed.h - before.h}px upward); pages-container h ${pc0.h}->${pc1.h}`);
    await page.fill('#message-input', ''); await page.dispatchEvent('#message-input', 'input');
    await slowChat(page, 1200);
    await page.fill('#message-input', 'hi');
    const r = await P.track(page, async () => { await page.click('#send-button'); await page.waitForTimeout(1800); }, { ms: 2000, anchors: ['#note-input', '.pages-container'] });
    const a = r.moves['#note-input'], b = r.moves['.pages-container'];
    out('thinking-row-jump', `${vp} send: slip maxDev=${a.maxDev}px, pages-container maxDev=${b.maxDev}px`);
    await page.unroute('**/api/chat');
    // sticky on contents
    const sticky = await page.evaluate(() => {
      const m = document.querySelector('#page-margin'); const rm = m.getBoundingClientRect(); let hit = [];
      for (const it of document.querySelectorAll('.index-recipe-item')) { const r = it.getBoundingClientRect(); const ix = Math.min(rm.right, r.right) - Math.max(rm.left, r.left), iy = Math.min(rm.bottom, r.bottom) - Math.max(rm.top, r.top); if (ix > 2 && iy > 2) hit.push(it.innerText.split('\n')[0]); }
      return { w: Math.round(rm.width), h: Math.round(rm.height), hit, dismiss: m.querySelectorAll('button').length };
    });
    const pl = await rect(page, '#page-left');
    out('sticky-covers-contents', `${vp} contents sticky ${sticky.w}x${sticky.h}px overlaps [${sticky.hit.join(', ')}], dismiss controls=${sticky.dismiss}, left page h now ${pl.h}`);
    // image chip
    const s0 = await rect(page, '#note-input');
    await page.setInputFiles('#image-upload', PHOTO); await page.waitForTimeout(400);
    const s1 = await rect(page, '#note-input'); const rm = await rect(page, '.remove-image');
    const chipText = await page.$eval('#image-attachment .image-text', (e) => e.innerText);
    await page.click('.remove-image'); await page.waitForTimeout(200);
    await page.setInputFiles('#image-upload', PHOTO); await page.waitForTimeout(400);
    const again = await page.$eval('#image-attachment', (e) => !e.hidden);
    out('image-chip', `${vp} chip grows slip +${s1.h - s0.h}px; remove target ${rm.w}x${rm.h}px; text "${chipText}"; re-attach same file after remove shows chip=${again}`);
    // targets
    const sb = await rect(page, '#send-button'), cb = await rect(page, '#clipboard-button');
    const fs = await page.evaluate(() => { const n = document.querySelector('#page-margin .margin-note'); return n ? getComputedStyle(n).fontSize : null; });
    out('small-targets-and-text', `${vp} send ${sb.w}x${sb.h}, attach ${cb.w}x${cb.h}, remove-image ${rm.w}x${rm.h}; reply font-size=${fs}`);
    // empty send + sticky hover
    const n0 = await page.evaluate(() => window.getMarginThread().length);
    await page.fill('#message-input', '   '); await page.click('#send-button'); await page.waitForTimeout(300);
    const n1 = await page.evaluate(() => window.getMarginThread().length);
    out('empty-send-silent', `${vp} whitespace send: thread ${n0}->${n1}, textarea keeps ${JSON.stringify(await page.$eval('#message-input', (e) => e.value))}, no feedback`);
    await close();
  }

  // ---------- Notes tab on the contents page ----------
  for (const vp of ['tablet', 'desktop']) {
    const { page, close } = await P.open(vp, { port: PORT });
    await send(page, 'what is good for a rainy day?');
    const r = await P.track(page, async () => { await page.click('.spread-tab[data-mode="notes"]'); await page.waitForTimeout(800); }, { ms: 1000, anchors: ['#note-input', '.index-title'] });
    const active = await page.$$eval('.contents-tabs button', (b) => b.filter((x) => !x.hidden && x.classList.contains('is-active')).map((x) => x.innerText));
    const sticky = await page.$$eval('#page-margin .sticky-note', (x) => x.length);
    out('notes-tab-on-contents', `${vp} Notes tab: input dx=${r.moves['#note-input'].end[0] - r.moves['#note-input'].start[0]}px, contents title dx=${r.moves['.index-title'] ? r.moves['.index-title'].end[0] - r.moves['.index-title'].start[0] : 'n/a'}px, active tabs=${JSON.stringify(active)}, sticky still rendered=${sticky}`);
    await close();
  }

  // ---------- phone: no book-level Notes; thread lost on reload ----------
  {
    const { page, close } = await P.open('phone', { port: PORT });
    await send(page, 'first note'); await send(page, 'second note');
    const shown = await page.$$eval('#page-margin .margin-note', (x) => x.length);
    const tabs = await rect(page, '.page-tabs');
    out('phone-book-thread-unreachable', `phone contents: ${await page.evaluate(() => window.getMarginThread().length)} book entries, ${shown} shown, Notes tab visible=${tabs.vis}`);
    await page.reload(); await page.waitForTimeout(1500);
    out('thread-lost-on-reload', `phone after reload: thread entries=${await page.evaluate(() => window.getMarginThread().length)}`);
    await close();
  }

  // ---------- keyboard (layout viewport shrink) resets contents scroll ----------
  for (const [vp, kh] of [['phone', 500], ['tablet-landscape', 450]]) {
    const { page, close } = await P.open(vp, { port: PORT });
    const sc = await page.evaluate(() => { for (const s of ['#page-left', '#page-left-content']) { const e = document.querySelector(s); if (e.scrollHeight > e.clientHeight + 5) { e.scrollTop = 200; return s; } } return null; });
    await page.waitForTimeout(200);
    const b = await page.$eval(sc, (e) => Math.round(e.scrollTop));
    await page.tap('#message-input');
    await page.setViewportSize({ width: P.VIEWPORTS[vp].viewport.width, height: kh }); await page.waitForTimeout(700);
    out('keyboard-resets-contents-scroll', `${vp} contents ${sc} scrollTop ${b} -> ${await page.$eval(sc, (e) => Math.round(e.scrollTop))} when viewport height drops to ${kh}`);
    await close();
  }

  // ---------- meal plan dead end ----------
  {
    const { page, close } = await P.open('tablet', { port: PORT });
    await send(page, 'plan a meal plan for a dinner party', 3000);
    const disabled = await page.$$eval('.meal-plan-action-btn', (b) => b.filter((x) => x.disabled).length);
    await page.click('.meal-plan-recipe-link >> nth=0'); await page.waitForTimeout(1500);
    const back = await page.$$eval('.meal-plan-recipe-link', (x) => x.length) + await page.$$eval('.contents-tab-meals', (x) => x.filter((b) => !b.hidden).length);
    out('meal-plan-dead-end', `tablet: ${disabled} disabled action buttons on the plan; after opening a recipe from it, routes back to the plan=${back}`);
    await close();
  }
})();
