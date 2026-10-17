// Re-measures the "at the counter" persona findings (2026-10-17 usability audit). One line per finding id.
// Usage: node tests/usability/remeasure/counter.cjs [port=3015]
// Needs a server from `tests/usability/fresh.sh <port>`. Halves the lasagne, so re-run fresh.sh
// before running it again. Every check opens its own
// browser via P.open, so nothing depends on state left by another script or check.
const P = require('../probe.cjs');
const fs = require('fs');
const port = Number(process.argv[2] || 3015);
const STATIC = require('path').join(__dirname, '..', '..', '..', 'static');
const out = (id, msg) => console.log(`${id}: ${msg}`);

async function openRecipe(vp, name, opts = {}) {
  const o = await P.open(vp, { port, ...opts });
  const items = await o.page.locator('.index-recipe-item').allInnerTexts();
  const i = items.findIndex((t) => t.includes(name));
  const loc = o.page.locator('.index-recipe-item').nth(i);
  if (vp === 'desktop') await loc.click(); else await loc.tap();
  await o.page.waitForTimeout(1500);
  return o;
}
const tapSel = async (page, vp, sel) => { const l = page.locator(sel).first(); if (vp === 'desktop') await l.click(); else await l.tap(); };
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), r: Math.round(r.right) }; }, sel);
const overlap = (a, b) => (a && b ? Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y)) : 0);
const hit = (page, sel) => page.evaluate((s) => { const b = document.querySelector(s); if (!b) return 'absent'; const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); if (!e) return 'offscreen'; if (e === b || b.contains(e)) return 'reachable'; return 'BLOCKED by ' + (e.closest('#page-margin') ? '#page-margin' : e.closest('#timer-widget') ? '#timer-widget' : (e.id || e.className)); }, sel);

async function guard(id, fn) { try { await fn(); } catch (e) { out(id, 'ERROR ' + e.message.split('\n')[0]); } }

(async () => {
  // 1. A reply sent in cook mode lands on top of the recipe title / photo / share buttons
  await guard('cook-reply-covers-title', async () => {
    for (const vp of ['tablet', 'tablet-landscape', 'desktop']) {
      const { page, close } = await openRecipe(vp, 'Lemon');
      await P.sendNote(page, 'how fluffy is fluffy?');
      const m = await rect(page, '#page-margin');
      const t = await rect(page, '#page-right .recipe-title');
      const pol = await rect(page, '#page-right .recipe-polaroid');
      const pr = await rect(page, '#page-right');
      const bg = await page.evaluate(() => getComputedStyle(document.querySelector('#page-margin .margin-note')).backgroundColor);
      out('cook-reply-covers-title', `${vp}: margin ${m.w}x${m.h} at x=${m.x} (page-right x=${pr.x}, sticks out left by ${Math.max(0, pr.x - m.x)}px); overlap title=${overlap(m, t)}px² polaroid=${overlap(m, pol)}px²; note bg=${bg}; share-btn ${await hit(page, '.share-btn')}; add-photo ${await hit(page, '.add-photo-btn')}`);
      await close();
    }
  });

  // 2. update_recipe (halve) while scrolled down the method: skeleton flash + scroll reset
  await guard('refresh-loses-place', async () => {
    for (const vp of ['tablet', 'phone']) {
      const { page, close } = await openRecipe(vp, 'Lasagne');
      if (vp === 'phone') { await page.locator('.page-tab[data-tab="method"]').tap(); await page.waitForTimeout(500); }
      await page.evaluate(() => { const e = document.getElementById('page-right'); e.scrollTop = Math.min(300, e.scrollHeight - e.clientHeight); });
      await page.waitForTimeout(300);
      const before = await page.evaluate(() => document.getElementById('page-right').scrollTop);
      await page.evaluate(() => { window.__m = { skel: 0, minW: 1e9 }; window.__on = true; const loop = () => { if (document.querySelector('#page-right-content .skeleton')) window.__m.skel++; window.__m.minW = Math.min(window.__m.minW, document.querySelector('.app-container').getBoundingClientRect().width); if (window.__on) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
      await P.sendNote(page, 'halve it', { waitMs: 3000 });
      const m = await page.evaluate(() => { window.__on = false; return { ...window.__m, after: document.getElementById('page-right').scrollTop, tab: document.getElementById('page-right').dataset.tab, w: document.querySelector('.app-container').getBoundingClientRect().width }; });
      out('refresh-loses-place', `${vp}: page-right scrollTop ${before} -> ${m.after}; skeleton frames=${m.skel}; app-container min width ${Math.round(m.minW)} vs ${Math.round(m.w)}; tab after=${m.tab}`);
      await close();
    }
  });

  // 3. Phone: invisible 60px prev/next strips sit over the ingredient quantities
  await guard('phone-edge-strips-steal-taps', async () => {
    const { page, close } = await openRecipe('phone', 'Lemon');
    const strips = await page.evaluate(() => ['mobile-edge-prev', 'mobile-edge-next'].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return `${id} ${Math.round(r.width)}x${Math.round(r.height)} op=${getComputedStyle(document.getElementById(id)).opacity}`; }).join(', '));
    const q = await page.locator('.ingredient-qty').first().boundingBox();
    const under = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e.id || e.className; }, [q.x + 8, q.y + q.height / 2]);
    const t0 = await page.evaluate(() => document.querySelector('.recipe-title').innerText.replace(/\n/g, ' '));
    await page.touchscreen.tap(q.x + 8, q.y + q.height / 2);
    await page.waitForTimeout(1500);
    const t1 = await page.evaluate(() => document.querySelector('.recipe-title') ? document.querySelector('.recipe-title').innerText.replace(/\n/g, ' ') : 'contents');
    out('phone-edge-strips-steal-taps', `${strips}; element under first quantity="${under}"; tapping "225 g" turned "${t0}" -> "${t1}"`);
    await close();
  });

  // 4. Phone: a mostly-vertical (62deg) drag is taken as a swipe and turns the page
  await guard('phone-diagonal-scroll-turns-page', async () => {
    const { page, close } = await openRecipe('phone', 'Lasagne');
    await page.locator('.page-tab[data-tab="method"]').tap(); await page.waitForTimeout(500);
    const res = [];
    for (const [dx, dy] of [[-125, -240], [-60, -110]]) {
      const t0 = await page.evaluate(() => document.querySelector('.recipe-title').innerText.replace(/\n/g, ' '));
      const prevented = await page.evaluate(async ([dx, dy]) => {
        const x0 = 250, y0 = 600; const target = document.elementFromPoint(x0, y0);
        const mk = (x, y) => new Touch({ identifier: 1, target, clientX: x, clientY: y });
        target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [mk(x0, y0)], changedTouches: [mk(x0, y0)] }));
        let p = false;
        for (let i = 1; i <= 10; i++) { const ev = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [mk(x0 + dx * i / 10, y0 + dy * i / 10)], changedTouches: [mk(x0 + dx * i / 10, y0 + dy * i / 10)] }); target.dispatchEvent(ev); p = p || ev.defaultPrevented; await new Promise((r) => setTimeout(r, 16)); }
        target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [mk(x0 + dx, y0 + dy)] }));
        return p;
      }, [dx, dy]);
      await page.waitForTimeout(1200);
      const t1 = await page.evaluate(() => document.querySelector('.recipe-title').innerText.replace(/\n/g, ' '));
      res.push(`drag(${dx},${dy}) ${Math.round(Math.atan2(-dy, -dx) * 180 / Math.PI)}deg scrollSuppressed=${prevented} ${t0 === t1 ? 'stayed' : 'TURNED to ' + t1}`);
    }
    out('phone-diagonal-scroll-turns-page', res.join('; '));
    await close();
  });

  // 5/6. Contents and Notes tabs re-flow the open recipe (ingredients cross the spine, method drops)
  await guard('mode-switch-reflows-recipe', async () => {
    for (const vp of ['tablet', 'tablet-landscape']) {
      const { page, close } = await openRecipe(vp, 'Lasagne');
      const A = ['.prep-step[data-step="1"]', '.tab-panel[data-tab="ingredients"]', '#note-input'];
      const parts = [];
      for (const mode of ['notes', 'cook', 'contents', 'cook']) {
        const r = await P.track(page, () => tapSel(page, vp, `.spread-tab[data-mode="${mode}"]`), { ms: 900, anchors: A });
        const s = r.moves['.prep-step[data-step="1"]'], ing = r.moves['.tab-panel[data-tab="ingredients"]'], ni = r.moves['#note-input'];
        const cls = r.shifts.reduce((a, x) => a + x.value, 0);
        parts.push(`->${mode}: step1 dy=${s && s.end ? s.end[1] - s.start[1] : '?'} ingredients dx=${ing && ing.end ? ing.end[0] - ing.start[0] : '?'} input vis ${ni.start[4]}->${ni.end[4]} CLS=${cls.toFixed(3)}`);
      }
      out('mode-switch-reflows-recipe', `${vp}: ${parts.join(' | ')}`);
      await close();
    }
  });

  // 7. Opening a recipe moves the note slip across the spine
  await guard('note-slip-crosses-spine', async () => {
    for (const vp of ['tablet', 'tablet-landscape', 'desktop']) {
      const { page, close } = await P.open(vp, { port });
      const r = await P.track(page, () => P.openFromContents(page, 3), { ms: 1500, anchors: ['#note-input', '#send-button'] });
      const m = r.moves['#note-input'];
      out('note-slip-crosses-spine', `${vp}: #note-input dx=${m.end[0] - m.start[0]}px maxDev=${m.maxDev}px visFlips=${m.visFlips}`);
      await close();
    }
  });

  // 8/9/10/14. Timer: highlight pushes steps, pill covers next arrow, done state vanishes, status lines
  await guard('timer', async () => {
    for (const vp of ['tablet', 'tablet-landscape', 'desktop', 'phone']) {
      const { page, close } = await openRecipe(vp, 'Lemon');
      if (vp === 'phone') { await page.locator('.page-tab[data-tab="method"]').tap(); await page.waitForTimeout(500); }
      const r = await P.track(page, () => P.sendNote(page, 'set a timer', { waitMs: 2000 }), { ms: 2200, anchors: ['.prep-step[data-step="2"]', '.prep-step[data-step="3"]', '.prep-step[data-step="5"]'] });
      const s2 = r.moves['.prep-step[data-step="2"]'], s3 = r.moves['.prep-step[data-step="3"]'];
      out('timer-highlight-pushes-steps', `${vp}: step2 height ${s2.start[3]}->${s2.end[3]}px, step3 dy=${s3.end[1] - s3.start[1]}px`);
      const nb = vp === 'phone' ? 'n/a (no arrow)' : await hit(page, '#page-next');
      const pill = await rect(page, '#timer-widget');
      out('timer-pill-covers-next', `${vp}: pill ${pill.w}x${pill.h} at ${pill.x},${pill.y}; #page-next ${nb}; cancel ${JSON.stringify(await rect(page, '.timer-cancel')).replace(/"/g, '')}`);
      const statuses = await page.evaluate(() => [...document.querySelectorAll('.margin-note[data-kind="status"]')].map((n) => n.innerText));
      out('debug-status-lines', `${vp}: ${statuses.length} status notes shown: ${JSON.stringify(statuses)}`);
      // wait for "Done" then time how long it stays
      const t = await page.evaluate(async () => {
        const txt = document.getElementById('timer-text'); const w = document.getElementById('timer-widget');
        const t0 = performance.now(); let doneAt = null;
        while (performance.now() - t0 < 15000) {
          if (doneAt === null && /Done/.test(txt.textContent)) doneAt = performance.now();
          if (doneAt !== null && getComputedStyle(w).display === 'none') return Math.round(performance.now() - doneAt);
          await new Promise((r) => setTimeout(r, 50));
        }
        return -1;
      });
      out('timer-done-vanishes', `${vp}: "Done!" visible for ${t}ms then pill hidden; audio alert code present=${/Audio|AudioContext|vibrate/.test(fs.readFileSync(STATIC + '/timer.js', 'utf8'))}`);
      await close();
    }
  });

  // 11/17. Reading size at arm's length, title wrapping
  await guard('recipe-text-small', async () => {
    for (const vp of ['tablet', 'tablet-landscape', 'phone']) {
      const { page, close } = await openRecipe(vp, 'Lemon');
      const f = await page.evaluate(() => { const g = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontSize : '-'; }; return `ingredient=${g('.ingredient-item')} step=${g('.step-text')} duration=${g('.step-duration')} timerText=${g('#timer-text')}`; });
      const used = await page.evaluate(() => { const pl = document.getElementById('page-left'), pr = document.getElementById('page-right'); const lc = document.getElementById('page-left-content'), rc = document.getElementById('page-right-content'); return `left page filled ${Math.round(100 * lc.scrollHeight / pl.clientHeight)}%, right ${Math.round(100 * rc.scrollHeight / pr.clientHeight)}%`; });
      out('recipe-text-small', `${vp}: ${f}; ${used}`);
      const t = await rect(page, '#page-right .recipe-title');
      const lines = await page.evaluate(() => { const e = document.querySelector('#page-right .recipe-title'); return Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).fontSize) / 1.4); });
      out('title-wraps', `${vp}: "Lemon Drizzle Cake" title box ${t.w}x${t.h} (~${lines} lines)`);
      await close();
    }
    const { page, close } = await openRecipe('phone', 'Lasagne');
    const t = await rect(page, '#page-right .recipe-title');
    out('title-wraps', `phone: "Granny's Beef Lasagne" title box ${t.w}x${t.h}`);
    await close();
  });

  // 12. Touch targets under 44px visible in cook mode
  await guard('small-touch-targets', async () => {
    for (const vp of ['tablet', 'tablet-landscape', 'phone']) {
      const { page, close } = await openRecipe(vp, 'Lemon');
      const small = await page.evaluate(() => {
        const o = [];
        document.querySelectorAll('button, a, [role=tab], #recipe-book-header, .mobile-edge-nav').forEach((el) => {
          const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          if (r.width < 1 || r.height < 1 || cs.display === 'none' || cs.visibility === 'hidden') return;
          if (r.bottom < 0 || r.top > innerHeight) return;
          if (r.width < 44 || r.height < 44) o.push(`${(el.getAttribute('aria-label') || el.innerText || el.id).trim().slice(0, 14)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        });
        return o;
      });
      out('small-touch-targets', `${vp}: ${small.length} under 44px: ${small.join('; ')}`);
      await close();
    }
  });

  // 13. Ingredients / Method edge tabs do nothing in cook mode; Cook tab is a no-op too
  await guard('edge-tabs-noop-in-cook', async () => {
    const { page, close } = await openRecipe('tablet', 'Lemon');
    const shot = () => page.evaluate(() => JSON.stringify([document.getElementById('page-right').scrollTop, ...['.tab-panel[data-tab="method"]', '.tab-panel[data-tab="ingredients"]'].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.height)]; })]));
    const a = await shot(); await page.locator('.edge-tab[data-tab="method"]').tap(); await page.waitForTimeout(600); const b = await shot();
    await page.locator('.edge-tab[data-tab="ingredients"]').tap(); await page.waitForTimeout(600); const c = await shot();
    await page.locator('.spread-tab[data-mode="cook"]').tap(); await page.waitForTimeout(600); const d = await shot();
    out('edge-tabs-noop-in-cook', `tablet: panels before=${a} afterMethod=${b} afterIngredients=${c} afterCook=${d} -> ${a === b && b === c && c === d ? 'NO visible change from 3 taps' : 'changed'}`);
    await close();
  });

  // 15. Phone: the reply lands below the fold, no scroll into view
  await guard('phone-reply-offscreen', async () => {
    const { page, close } = await openRecipe('phone', 'Lasagne');
    await P.sendNote(page, 'how thick should the sauce be?');
    const m = await page.evaluate(() => { const n = document.querySelector('#page-margin .margin-note:last-child'); const r = n.getBoundingClientRect(); const pr = document.getElementById('page-right').getBoundingClientRect(); return `reply top=${Math.round(r.top)} vs visible page bottom=${Math.round(pr.bottom)} (inside scroller, ${Math.round(r.top - pr.bottom)}px below)`; });
    out('phone-reply-offscreen', `phone: ${m}`);
    await close();
  });

  // 16. Sending a note grows the slip / squeezes the phone book while "Thinking..." shows
  await guard('sending-shifts-layout', async () => {
    for (const vp of ['tablet', 'phone']) {
      const { page, close } = await openRecipe(vp, 'Lemon');
      const r = await P.track(page, () => P.sendNote(page, 'hello there', { waitMs: 2000 }), { ms: 2200, anchors: ['#note-input', '#message-input', '.recipe-book', '#page-right'] });
      out('sending-shifts-layout', `${vp}: note-input maxDev=${r.moves['#note-input'].maxDev}px, .recipe-book maxDev=${r.moves['.recipe-book'].maxDev}px, #page-right maxDev=${r.moves['#page-right'].maxDev}px; textarea disabled while sending=${/input\.disabled = loading/.test(fs.readFileSync(STATIC + '/chat.js', 'utf8'))}`);
      await close();
    }
  });

  // 18. Packed ingredients split a quantity from its unit across lines (contents / notes modes)
  await guard('packed-ingredients-split', async () => {
    for (const vp of ['tablet', 'tablet-landscape']) {
      const { page, close } = await openRecipe(vp, 'Lasagne');
      await tapSel(page, vp, '.spread-tab[data-mode="notes"]'); await page.waitForTimeout(600);
      const n = await page.evaluate(() => { const split = [...document.querySelectorAll('.ingredient-qty')].filter((q) => q.getClientRects().length > 1).map((q) => q.innerText); const packed = [...document.querySelectorAll('.ingredient-line')].filter((l) => l.querySelectorAll('.ingredient-item').length > 1).length; return `${packed} packed lines; qty split across lines: ${JSON.stringify(split)}`; });
      out('packed-ingredients-split', `${vp} notes mode: ${n}`);
      await close();
    }
  });

  // 19. Step duration chips look like buttons but are inert spans; 20. no screen wake lock
  await guard('static-checks', async () => {
    const { page, close } = await openRecipe('tablet', 'Lemon');
    const d = await page.evaluate(() => { const e = document.querySelector('.step-duration'); const cs = getComputedStyle(e); return `tag=${e.tagName} bg=${cs.backgroundColor} cursor=${cs.cursor} listeners=${typeof e.onclick === 'function'}`; });
    out('duration-chip-looks-tappable', `tablet: ${d}`);
    await close();
    const js = fs.readdirSync(STATIC).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(`${STATIC}/${f}`, 'utf8')).join('\n');
    out('no-wake-lock', `navigator.wakeLock used=${/wakeLock/.test(js)}`);
  });

  // chrome budget (context for the walkthrough)
  await guard('chrome-budget', async () => {
    for (const vp of ['tablet', 'tablet-landscape', 'phone']) {
      const { page, close } = await openRecipe(vp, 'Lasagne');
      const a = await page.evaluate(() => {
        const V = innerWidth * innerHeight;
        const vis = (e) => { const r = e.getBoundingClientRect(); return Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)); };
        let paper = 0; ['page-left', 'page-right'].forEach((id) => { paper += vis(document.getElementById(id)); });
        let text = 0; document.querySelectorAll('.ingredient-line, .prep-step').forEach((e) => { text += vis(e); });
        return `paper ${Math.round(100 * paper / V)}%, ingredient+step blocks ${Math.round(100 * text / V)}%, everything else ${Math.round(100 * (V - paper) / V)}%`;
      });
      out('chrome-budget', `${vp}: ${a}`);
      await close();
    }
  });
})();
