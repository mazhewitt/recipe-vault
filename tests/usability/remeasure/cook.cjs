// Re-measures the "cook a recipe" findings (2026-10-17 usability audit).
// Usage: node tests/usability/remeasure/cook.cjs [port=3012] [id ...]
// Each check starts from a fresh P.open; needs a server from `tests/usability/fresh.sh <port>` (mock LLM).
// Prints one line per finding id. "FIXED?" hints are heuristics, read the numbers.
const P = require('../probe.cjs');
const port = Number(process.argv[2] || 3012);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = (id, msg) => console.log(`${id}: ${msg}`);

async function openRecipe(vp, re = /Lasagne/, opts = {}) {
  const s = await P.open(vp, { port, ...opts });
  const titles = await s.page.$$eval('.index-recipe-item', (els) => els.map((e) => e.innerText.split('\n')[0]));
  await s.page.locator('.index-recipe-item').nth(titles.findIndex((t) => re.test(t))).click();
  await s.page.waitForTimeout(1300);
  return s;
}
async function drag(cdp, x0, y0, x1, y1, steps = 12) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps }] });
    await sleep(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(500);
}
const title = (page) => page.evaluate(() => document.querySelector('.recipe-title')?.innerText.replace(/\s+/g, ' '));
const rightTop = (page) => page.evaluate(() => Math.round(document.getElementById('page-right').scrollTop));

const checks = {
  // 1. Note input crosses the spine when a recipe opens
  async 'note-input-crosses-spine-on-open'() {
    const res = [];
    for (const vp of ['tablet', 'tablet-landscape', 'desktop']) {
      const { page, close } = await P.open(vp, { port });
      const titles = await page.$$eval('.index-recipe-item', (els) => els.map((e) => e.innerText.split('\n')[0]));
      const r = await P.track(page, () => page.locator('.index-recipe-item').nth(titles.findIndex((t) => /Lasagne/.test(t))).click(), { ms: 1800, anchors: ['#note-input'] });
      const m = r.moves['#note-input'];
      res.push(`${vp} dx=${m.end[0] - m.start[0]}px flips=${m.visFlips}`);
      await close();
    }
    return res.join('; ');
  },
  // 2. Photo preview on touch: opens on touchend and the synthesized click closes it
  async 'touch-photo-preview-closes-instantly'() {
    const res = [];
    for (const vp of ['tablet', 'phone', 'desktop']) {
      const { page, close } = await openRecipe(vp, /Lemon/);
      await page.evaluate(() => {
        window.__opens = 0;
        const ov = document.getElementById('photo-preview-overlay');
        new MutationObserver(() => { if (ov.classList.contains('visible')) window.__opens++; }).observe(ov, { attributes: true });
      });
      const b = await page.locator('.recipe-photo').boundingBox();
      if (vp === 'desktop') await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      else await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(500);
      const st = await page.evaluate(() => [window.__opens, document.getElementById('photo-preview-overlay').classList.contains('visible')]);
      res.push(`${vp} opened=${st[0]}x visibleAfter500ms=${st[1]}`);
      await close();
    }
    return res.join('; ');
  },
  // 3. Cook-mode margin notes sit over the title / share / photo controls
  async 'cook-margin-notes-cover-header'() {
    const res = [];
    for (const vp of ['tablet', 'tablet-landscape', 'desktop']) {
      const { page, close } = await openRecipe(vp);
      await P.sendNote(page, 'hello there', { waitMs: 2000 });
      const h = await page.evaluate(() => {
        const covered = [];
        for (const s of ['.recipe-title', '.share-btn', '.add-photo-btn', '.recipe-photo']) {
          const el = document.querySelector(s); const b = el.getBoundingClientRect();
          const hit = document.elementFromPoint(b.x + b.width / 2, b.y + Math.min(b.height / 2, 20));
          if (hit && hit.closest('#page-margin')) covered.push(s);
        }
        // The reply is a sticky above the slip on the LEFT page now (D3), so what matters is whether it
        // reaches the right page at all, not how far it sits from the right page's left edge.
        const m = document.getElementById('page-margin').getBoundingClientRect();
        const pr = document.getElementById('page-right').getBoundingClientRect();
        const ix = Math.max(0, Math.min(m.right, pr.right) - Math.max(m.left, pr.left)) * Math.max(0, Math.min(m.bottom, pr.bottom) - Math.max(m.top, pr.top));
        return { covered, marginW: Math.round(m.width), overRightPage: Math.round(ix), bg: getComputedStyle(document.getElementById('page-margin')).backgroundColor };
      });
      res.push(`${vp} stickyW=${h.marginW} overlapsPageRight=${h.overRightPage}px² bg=${h.bg} covered=[${h.covered.join(',')}]`);
      await close();
    }
    return res.join('; ');
  },
  // 4. Timer pill sits on top of the next-recipe arrow
  async 'timer-pill-over-next-arrow'() {
    const res = [];
    for (const vp of ['tablet', 'tablet-landscape', 'desktop']) {
      const { page, close } = await openRecipe(vp);
      await page.evaluate(() => window.startTimer(5, 'Test', 2));
      await page.waitForTimeout(200);
      const o = await page.evaluate(() => {
        const n = document.getElementById('page-next').getBoundingClientRect();
        const c = document.querySelector('.timer-cancel').getBoundingClientRect();
        const t = document.getElementById('timer-widget').getBoundingClientRect();
        const ix = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return { pillOverNextPx2: Math.round(ix(t, n)), cancelOverNextPx2: Math.round(ix(c, n)), nextArea: Math.round(n.width * n.height) };
      });
      res.push(`${vp} pill∩next=${o.pillOverNextPx2}px² (of ${o.nextArea}) ✕∩next=${o.cancelOverNextPx2}px²`);
      await close();
    }
    return res.join('; ');
  },
  // 5. Step highlight resizes the step and pushes the method down, then back on expiry
  async 'timer-highlight-reflows-method'() {
    const res = [];
    for (const vp of ['tablet', 'phone', 'tablet-landscape', 'desktop']) {
      const { page, close } = await openRecipe(vp);
      if (vp === 'phone') { await page.click('.page-tab[data-tab="method"]'); await page.waitForTimeout(400); }
      const A = ['.prep-step[data-step="2"]', '.prep-step[data-step="3"]'];
      const r1 = await P.track(page, () => page.evaluate(() => window.startTimer(0.05, 'T', 2)), { ms: 400, anchors: A });
      const r2 = await P.track(page, async () => {}, { ms: 3600, anchors: A });
      const d = (r, k, i) => (r.moves[k].end[i] - r.moves[k].start[i]);
      res.push(`${vp} start: step2 dh=${d(r1, A[0], 3)} step3 dy=${d(r1, A[1], 1)}, expiry: step3 dy=${d(r2, A[1], 1)}`);
      await close();
    }
    return res.join('; ');
  },
  // 6. Expiry is silent and the "Done" pill vanishes after 3s
  async 'timer-expiry-silent-and-fleeting'() {
    const { page, close } = await openRecipe('tablet');
    await page.evaluate(() => {
      window.__audio = 0; window.__vib = 0;
      // The chime is oscillators on a context created at the first gesture (D7), so count note starts
      const os = window.OscillatorNode && OscillatorNode.prototype.start; if (os) OscillatorNode.prototype.start = function (...a) { window.__audio++; return os.apply(this, a); };
      const pl = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__audio++; return pl.call(this); };
      if (navigator.vibrate) navigator.vibrate = () => { window.__vib++; return true; };
      window.startTimer(0.02, 'T', 2);
    });
    let doneVisibleMs = 0;
    for (let i = 0; i < 60; i++) {
      const s = await page.evaluate(() => ({ t: document.getElementById('timer-text').textContent, d: getComputedStyle(document.getElementById('timer-widget')).display }));
      if (/Done/.test(s.t) && s.d !== 'none') doneVisibleMs += 100;
      await page.waitForTimeout(100);
    }
    const a = await page.evaluate(() => [window.__audio, window.__vib, Notification.permission]);
    await close();
    return `audioPlays=${a[0]} vibrations=${a[1]} notificationPermission=${a[2]} doneShownFor≈${doneVisibleMs}ms (of a ~4.8s window after expiry)`;
  },
  // 7. Phone: 60px nav overlays cover the recipe text; a tap on a quantity turns the page, drags there do not scroll
  async 'phone-edge-nav-covers-content'() {
    const { page, close } = await openRecipe('phone');
    const g = await page.evaluate(() => {
      const items = [...document.querySelectorAll('.ingredient-item')];
      let covered = 0;
      for (const it of items) { const q = it.querySelector('.ingredient-qty') || it; const r = q.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + 4, r.y + r.height / 2); if (hit && hit.closest('.mobile-edge-nav')) covered++; }
      const p = document.getElementById('mobile-edge-prev').getBoundingClientRect();
      return { covered, total: items.length, w: Math.round(p.width), h: Math.round(p.height) };
    });
    const before = await title(page);
    const q = await page.locator('.ingredient-qty').nth(4).boundingBox();
    await page.touchscreen.tap(q.x + 6, q.y + q.height / 2);
    await page.waitForTimeout(1200);
    const after = await title(page);
    await close();
    const s2 = await openRecipe('phone');
    const cdp = await s2.page.context().newCDPSession(s2.page);
    await drag(cdp, 30, 650, 30, 350);
    const edgeScroll = await rightTop(s2.page);
    await s2.close();
    return `strips ${g.w}x${g.h} each; ingredient starts under strip ${g.covered}/${g.total}; tap qty -> "${before}" became "${after}"; 300px vertical drag at x=30 scrolled ${edgeScroll}px`;
  },
  // 8. Phone: a natural thumb-arc scroll is classified as a swipe and swallowed
  async 'phone-diagonal-scroll-swallowed'() {
    const res = [];
    for (const [dx, dy] of [[0, -200], [60, -200], [80, -150], [110, -200]]) {
      const { page, close } = await openRecipe('phone');
      const cdp = await page.context().newCDPSession(page);
      await drag(cdp, 150, 650, 150 + dx, 650 + dy);
      res.push(`dx=${dx},dy=${dy} -> scrolled ${await rightTop(page)}px, recipe="${(await title(page)).slice(0, 14)}"`);
      await close();
    }
    return res.join('; ');
  },
  // 9. Phone: one scroll position shared by Ingredients and Method; checking an ingredient loses the method place
  async 'phone-tab-switch-loses-place'() {
    const { page, close } = await openRecipe('phone');
    await page.click('.page-tab[data-tab="method"]'); await page.waitForTimeout(400);
    await page.evaluate(() => { const s = document.querySelector('.prep-step[data-step="7"]'); const pr = document.getElementById('page-right'); pr.scrollTop += s.getBoundingClientRect().top - pr.getBoundingClientRect().top - 60; });
    await page.waitForTimeout(200);
    const y0 = await page.evaluate(() => Math.round(document.querySelector('.prep-step[data-step="7"]').getBoundingClientRect().top));
    await page.click('.page-tab[data-tab="ingredients"]'); await page.waitForTimeout(500);
    await page.click('.page-tab[data-tab="method"]'); await page.waitForTimeout(500);
    const y1 = await page.evaluate(() => Math.round(document.querySelector('.prep-step[data-step="7"]').getBoundingClientRect().top));
    await close();
    return `step 7 top y=${y0} before -> ${y1} after Ingredients->Method round trip (moved ${y1 - y0}px; viewport 844)`;
  },
  // 10. Phone: a reply to a note lands beneath the recipe, off-screen
  async 'phone-reply-offscreen'() {
    const { page, close } = await openRecipe('phone');
    await P.sendNote(page, 'how long do I rest it?', { waitMs: 2500 });
    const m = await page.evaluate(() => { const n = [...document.querySelectorAll('#page-margin .margin-note')].pop(); return n ? [Math.round(n.getBoundingClientRect().top), innerHeight] : [null, innerHeight]; });
    await close();
    return `latest reply top y=${m[0]} vs viewport height ${m[1]} (${m[0] > m[1] ? 'OFF-SCREEN' : 'visible'})`;
  },
  // 11. Tapping Notes (or Contents) re-inserts the ingredients above the method on the right page
  async 'notes-tab-moves-method'() {
    const { page, close } = await openRecipe('tablet');
    const y = () => page.evaluate(() => Math.round(document.querySelector('#page-right .tab-panel[data-tab=method] .section-header').getBoundingClientRect().top));
    const a = await y();
    const b = await page.locator('.spread-tab[data-mode="notes"]').boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(500);
    const n = await y();
    const c = await page.locator('.spread-tab[data-mode="contents"]').boundingBox();
    await page.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2); await page.waitForTimeout(500);
    const ct = await y();
    await close();
    return `tablet method header y: cook=${a} notes=${n} (moved ${n - a}px) contents=${ct} (moved ${ct - a}px)`;
  },
  // 12. Right-edge Ingredients/Method tabs do nothing in cook mode
  async 'edge-tabs-noop-in-cook'() {
    const { page, close } = await openRecipe('tablet');
    const snap = () => page.evaluate(() => [document.getElementById('page-right').scrollTop, document.getElementById('page-left').scrollTop, document.querySelector('#page-right-content').innerText.length, document.querySelector('#page-left-content').innerText.length].join(','));
    const a = await snap();
    for (const t of ['method', 'ingredients']) { const b = await page.locator(`.edge-tab[data-tab="${t}"]`).boundingBox(); await page.touchscreen.tap(b.x + 13, b.y + 40); await page.waitForTimeout(400); }
    const b = await snap();
    await close();
    return `[rightScroll,leftScroll,rightTextLen,leftTextLen] before=${a} after both taps=${b} (${a === b ? 'NO-OP' : 'changed'})`;
  },
  // 13. Reading size at arm's length
  async 'small-text-at-arms-length'() {
    const res = [];
    for (const vp of ['tablet', 'tablet-landscape', 'phone', 'desktop']) {
      const { page, close } = await openRecipe(vp);
      const f = await page.evaluate(() => {
        const fs = (s) => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
        const pl = document.getElementById('page-left'); const last = [...document.querySelectorAll('#page-left .ingredient-item')].pop();
        const emptyFrac = last && pl.getBoundingClientRect().height > 0 ? Math.round(100 * (pl.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom) / pl.getBoundingClientRect().height) : null;
        return `ingredient=${fs('.ingredient-item')}px step=${fs('.prep-step .step-text')}px duration=${fs('.step-duration')}px leftPageEmptyBelowList=${emptyFrac}%`;
      });
      res.push(`${vp} ${f}`);
      await close();
    }
    return res.join('; ');
  },
  // 14. Touch targets below 44px that the cook uses
  async 'small-touch-targets'() {
    const res = [];
    for (const vp of ['tablet', 'phone']) {
      const { page, close } = await openRecipe(vp);
      await page.evaluate(() => window.startTimer(5, 'T', 2));
      // Counted by hit area, not the visual box: D9 gives small visuals a transparent 44px ::before.
      // A 5x5 grid over the 44x44 square centred on the control must all land on it. The edge tabs are
      // inert ribbons (D11), not controls, so they are listed as such.
      const t = await page.evaluate(() => ['#page-prev', '#page-next', '.spread-tab[data-mode="cook"]', '.edge-tab[data-tab="method"]', '.timer-cancel', '.share-btn', '.add-photo-btn', '#send-button', '#recipe-book-header'].map((s) => {
        const el = document.querySelector(s); const r = el.getBoundingClientRect();
        if (!(r.width && r.height && getComputedStyle(el).display !== 'none')) return null;
        if (getComputedStyle(el).pointerEvents === 'none') return `${s}=ribbon(not a control)`;
        const cx = r.x + r.width / 2, cy = r.y + r.height / 2; let miss = 0;
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const x = cx - 22 + i * 11, y = cy - 22 + j * 11; if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue; const e = document.elementFromPoint(x, y); if (!(e && (e === el || el.contains(e)))) miss++; }
        return miss ? `${s}=${Math.round(r.width)}x${Math.round(r.height)}(hit44 misses ${miss}/25)` : null;
      }).filter(Boolean).join(' '));
      res.push(`${vp}: ${t}`);
      await close();
    }
    return res.join('; ');
  },
  // 15. Nothing keeps the cook's place or the screen awake
  async 'no-place-keeping-or-wake-lock'() {
    // Instrument on the contents page, then open: the lock is requested as the recipe opens (D10)
    const { page, close } = await P.open('tablet', { port });
    await page.evaluate(() => { window.__wl = 0; if (navigator.wakeLock) { const o = navigator.wakeLock.request.bind(navigator.wakeLock); navigator.wakeLock.request = (...a) => { window.__wl++; return o(...a); }; } });
    await P.openFromContents(page, 0);
    await page.waitForTimeout(500);
    const b = await page.locator('.ingredient-item').nth(2).boundingBox();
    await page.touchscreen.tap(b.x + 30, b.y + b.height / 2);
    const s = await page.locator('.prep-step').nth(3).boundingBox();
    await page.touchscreen.tap(s.x + 60, s.y + 10);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ wl: window.__wl, marked: document.querySelectorAll('.ingredient-item[class*=" "], .prep-step[class*=" "]:not(.timer-active), [aria-checked="true"], [aria-current="step"]').length }));
    await close();
    return `wakeLock requests=${r.wl}; elements marked after tapping an ingredient and a step=${r.marked}`;
  },
  // 16. Tool/debug status lines shown to the cook
  async 'debug-status-lines'() {
    const res = [];
    for (const vp of ['tablet', 'phone']) {
      const { page, close } = await openRecipe(vp);
      await P.sendNote(page, 'start a timer for step 2', { waitMs: 2000 });
      const t = await page.evaluate(() => [...document.querySelectorAll('#page-margin .margin-note[data-kind="status"]')].map((n) => n.innerText));
      res.push(`${vp}: ${JSON.stringify(t)}`);
      await close();
    }
    return res.join('; ');
  },
  // 17. Tablet portrait title squeezed to a word per line
  async 'tablet-title-word-per-line'() {
    const res = [];
    for (const vp of ['tablet', 'phone']) {
      const { page, close } = await openRecipe(vp);
      const t = await page.evaluate(() => { const e = document.querySelector('.recipe-title'); const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)} lines≈${Math.round(r.height / parseFloat(getComputedStyle(e).lineHeight || 43) || r.height / 43)}`; });
      res.push(`${vp} title ${t}`);
      await close();
    }
    return res.join('; ');
  },
  // 18. Note slip grows upward while "Thinking..."
  async 'note-input-grows-while-thinking'() {
    const { page, close } = await openRecipe('tablet');
    const r = await P.track(page, () => P.sendNote(page, 'hello', { waitMs: 100 }), { ms: 2000, anchors: ['#note-input'] });
    await close();
    return `tablet #note-input maxDev=${r.moves['#note-input'].maxDev}px during send`;
  },
  // 19. Timer pill width changes while ticking / at Done (left edge moves)
  async 'timer-pill-width-jitter'() {
    const { page, close } = await openRecipe('phone');
    await page.evaluate(() => window.startTimer(0.2, 'Lasagne', 2));
    const ws = new Set();
    for (let i = 0; i < 16; i++) { ws.add(Math.round(await page.evaluate(() => document.getElementById('timer-widget').getBoundingClientRect().width))); await page.waitForTimeout(1000); }
    await close();
    return `phone pill widths seen over 16s: ${[...ws].sort((a, b) => a - b).join(',')}px`;
  },
};

(async () => {
  const only = process.argv.slice(3);
  for (const [id, fn] of Object.entries(checks)) {
    if (only.length && !only.includes(id)) continue;
    try { out(id, await fn()); } catch (e) { out(id, 'ERROR ' + e.message.split('\n')[0]); }
  }
})();
