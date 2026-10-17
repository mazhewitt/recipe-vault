// Browser probe library for Recipe Vault usability audits (see tests/usability/README.md).
// Needs a server from tests/usability/fresh.sh <port>, and Playwright installed in tests/e2e
// (cd tests/e2e && npm ci && npx playwright install chromium).
//
// const P = require('<repo>/tests/usability/probe.cjs');   // or a relative path from your script
// const { page, close } = await P.open('tablet', { port: 3011 });
// const r = await P.track(page, async () => { await page.click('.index-recipe-item >> nth=0'); }, { ms: 1800 });
// console.log(P.summarise(r)); await P.shot(page, P.SHOTS, 'after-open'); await close();
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'e2e', 'node_modules', 'playwright'));

// Default screenshot directory (gitignored): tests/usability/runs/shots
const SHOTS = path.join(__dirname, 'runs', 'shots');

const VIEWPORTS = {
  // iPhone 14-ish
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  // iPad gen 7 portrait — same as the e2e `ipad` project. Most likely real cooking device.
  tablet: { viewport: { width: 810, height: 1080 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  // iPad landscape — a tablet propped up on the counter
  'tablet-landscape': { viewport: { width: 1080, height: 810 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 } },
};

// Elements whose position the cook relies on. Missing ones are simply skipped.
const ANCHORS = [
  '.recipe-book', '.pages-container', '#page-left', '#page-right',
  '#page-left-content', '#page-right-content', '#page-margin',
  '.contents-tabs', '.edge-tabs', '.page-tabs',
  '#page-prev', '#page-next', '#mobile-edge-prev', '#mobile-edge-next',
  '#note-input', '#message-input', '#send-button', '#timer-widget',
  '#recipe-book-header', '.recipe-title', 'h1', '.recipe-meta',
];

const INIT = () => {
  window.__shifts = [];
  const sel = (n) => {
    if (!n || n.nodeType !== 1) return n && n.nodeName;
    let s = n.tagName.toLowerCase();
    if (n.id) s += '#' + n.id;
    else if (n.classList && n.classList.length) s += '.' + [...n.classList].slice(0, 3).join('.');
    return s;
  };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__shifts.push({
          t: Math.round(e.startTime), value: +e.value.toFixed(4), hadRecentInput: e.hadRecentInput,
          sources: (e.sources || []).map((s) => ({
            node: sel(s.node),
            from: [Math.round(s.previousRect.x), Math.round(s.previousRect.y), Math.round(s.previousRect.width), Math.round(s.previousRect.height)],
            to: [Math.round(s.currentRect.x), Math.round(s.currentRect.y), Math.round(s.currentRect.width), Math.round(s.currentRect.height)],
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) { /* unsupported */ }
};

async function open(vp = 'tablet', { port = 3011, path: urlPath = '/chat', reducedMotion = 'no-preference' } = {}) {
  if (+port === 3001) throw new Error('port 3001 is reserved for make test-e2e');
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...VIEWPORTS[vp], baseURL: `http://127.0.0.1:${port}`, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(INIT);
  await page.goto(urlPath);
  await page.waitForSelector('.app-container', { timeout: 10000 });
  await page.waitForTimeout(800);
  return { browser, context, page, errors, close: () => browser.close() };
}

// Samples the rects of `anchors` every animation frame while `action` runs and for `ms` after.
// Returns per-anchor movement (max deviation from start, and net start->end), layout shifts in the window,
// and the visible/hidden flips. Transforms count (getBoundingClientRect includes them).
async function track(page, action, { ms = 1500, anchors = ANCHORS } = {}) {
  await page.evaluate(({ anchors }) => {
    const read = () => {
      const o = {};
      for (const s of anchors) {
        const el = document.querySelector(s);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const vis = r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05;
        o[s] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), vis ? 1 : 0];
      }
      return o;
    };
    window.__trk = { frames: [read()], shiftStart: window.__shifts.length, t0: performance.now(), on: true };
    const loop = () => { if (!window.__trk.on) return; window.__trk.frames.push(read()); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }, { anchors });
  const t0 = Date.now();
  await action();
  const left = ms - (Date.now() - t0);
  if (left > 0) await page.waitForTimeout(left);
  return page.evaluate(() => {
    window.__trk.on = false;
    const f = window.__trk.frames;
    const first = f[0], last = f[f.length - 1];
    const keys = new Set([...Object.keys(first), ...Object.keys(last)]);
    const moves = {};
    for (const k of keys) {
      let maxDev = 0, flips = 0, prevVis = null;
      for (const fr of f) {
        const a = fr[k]; if (!a) continue;
        const b = first[k] || a;
        maxDev = Math.max(maxDev, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]), Math.abs(a[3] - b[3]));
        if (prevVis !== null && prevVis !== a[4]) flips++;
        prevVis = a[4];
      }
      moves[k] = { start: first[k] || null, end: last[k] || null, maxDev, visFlips: flips };
    }
    return { frames: f.length, moves, shifts: window.__shifts.slice(window.__trk.shiftStart) };
  });
}

// Compact human-readable summary: only anchors that moved or flipped, plus layout-shift sources.
function summarise(r, { minPx = 2 } = {}) {
  const lines = [];
  for (const [k, m] of Object.entries(r.moves)) {
    const net = m.start && m.end ? m.start.slice(0, 4).map((v, i) => m.end[i] - v) : null;
    const appeared = !m.start && m.end, vanished = m.start && !m.end;
    if (m.maxDev >= minPx || m.visFlips || appeared || vanished || (m.start && m.end && m.start[4] !== m.end[4])) {
      lines.push(`${k}: maxDev=${m.maxDev}px net[dx,dy,dw,dh]=${net ? net.join(',') : (appeared ? 'appeared' : 'vanished')} vis ${m.start ? m.start[4] : '-'}→${m.end ? m.end[4] : '-'} flips=${m.visFlips}`);
    }
  }
  const cls = r.shifts.reduce((a, s) => a + s.value, 0);
  lines.push(`layout-shift total=${cls.toFixed(3)} entries=${r.shifts.length}`);
  for (const s of r.shifts.filter((x) => x.value >= 0.01).slice(0, 8)) {
    lines.push(`  shift ${s.value}${s.hadRecentInput ? ' (after input)' : ''}: ` + s.sources.map((x) => `${x.node} ${x.from}→${x.to}`).join(' | '));
  }
  return lines.join('\n');
}

// Saves <dir>/<name>.png (dir defaults to tests/usability/runs/shots) and returns the path.
async function shot(page, dir = SHOTS, name = 'shot', opts = {}) {
  require('fs').mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${name}.png`);
  await page.screenshot({ path: p, ...opts });
  return p;
}

// Sends a chat note through the real UI and waits for the reply to settle.
async function sendNote(page, text, { waitMs = 2500 } = {}) {
  await page.fill('#message-input', text);
  await page.click('#send-button');
  await page.waitForTimeout(waitMs);
}

// Opens the n-th recipe from the contents (0-based), returns its title.
async function openFromContents(page, n = 0) {
  const item = page.locator('.index-recipe-item').nth(n);
  const title = (await item.innerText()).split('\n')[0];
  await item.click();
  await page.waitForTimeout(900);
  return title;
}

module.exports = { VIEWPORTS, ANCHORS, SHOTS, chromium, open, track, summarise, shot, sendNote, openFromContents };
