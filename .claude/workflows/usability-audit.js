export const meta = {
  name: 'usability-audit',
  description: 'Drive every Recipe Vault UI path in a real browser at 4 viewports with 5 parallel explorers, measure layout jumps, and report cooking-usability findings',
  whenToUse: 'When the owner wants the full browser usability audit of the book UI re-run (e.g. after a UI change, or to check which findings from a previous audit are fixed). Args: { label: string, focus?: string, journeys?: string[], portBase?: number }. Costs about 1.1M subagent tokens and ~30 minutes; for a cheap numbers-only check run tests/usability/run-all.sh instead.',
  phases: [
    { title: 'Explore', detail: '5 journey explorers (find, cook, ask, manage, counter persona), each with its own mock server' },
  ],
}

// ---- args ---------------------------------------------------------------------------------
// args = { label: 'after-steady-spread', focus?: 'extra brief appended to every explorer',
//          journeys?: ['cook', 'counter'] (default all five), portBase?: 3011 }
const A = typeof args === 'string' ? { label: args } : (args || {})
const label = A.label
if (!label || !/^[A-Za-z0-9._-]+$/.test(label) || label === '.' || label === '..') {
  throw new Error('usability-audit needs args.label (letters, digits, . _ -), e.g. { label: "after-steady-spread" }')
}
const focus = typeof A.focus === 'string' ? A.focus.trim() : ''
const portBase = Number(A.portBase || 3011)
const ALL = ['find', 'cook', 'ask', 'manage', 'counter']
const wanted = Array.isArray(A.journeys) && A.journeys.length ? A.journeys : ALL
for (const j of wanted) if (!ALL.includes(j)) throw new Error(`unknown journey "${j}"; expected one of ${ALL.join(', ')}`)
const portOf = (key) => portBase + ALL.indexOf(key)   // same mapping as tests/usability/run-all.sh
for (const j of wanted) if (portOf(j) === 3001) throw new Error('portBase would use port 3001, which is reserved for make test-e2e')

// All paths are relative to the repository root (the agents' working directory).
const H = 'tests/usability'
const OUT = `${H}/runs/audit-${label}`
const BASELINE = `${H}/baseline-2026-10-17`

const COMMON = `
You are auditing the Recipe Vault web app (frontend in static/*.js + static/styles.css + static/chat.html) for usability, by DRIVING IT IN A REAL BROWSER. The owner said the "Journal 2.0" UI (a skeuomorphic two-page recipe book on a wooden table) "feels clunky, and the UI elements jump about. It needs to be simple when cooking with." Your job is to find exactly what is clunky or jumpy, with hard evidence, on the paths assigned to you below.

Paths in this brief are relative to the repository root. Your shell's cwd may reset between commands, so get the absolute root once (\`git rev-parse --show-toplevel\`) and use absolute paths in every command.

DO NOT edit any tracked file in the repo (static/, src/, openspec/, tests/usability/*.cjs, etc.). Write every script, screenshot and note under ${OUT}/{JOURNEY}/ (create it; tests/usability/runs/ is gitignored).

## Harness (already built — use it; see ${H}/README.md)
- Start your OWN server: \`${H}/fresh.sh {PORT}\` — mock LLM, its own SQLite file under ${H}/runs/{PORT}/, serves /static live from the repo, seeds a 10-recipe family book (Granny's Beef Lasagne [19 ingredients, 10 steps, photo], Lemon Drizzle Cake [photo], Thai Green Curry [photo], a very long-titled Sunday Roast Chicken [photo], Pancakes [no description], Mushroom Risotto, Brownies, Shakshuka, Banana Bread, Weeknight Bolognese; tags main/dessert/etc). Prints recipe ids. Re-run it any time to reset. It needs target/release/recipe-vault; if fresh.sh says the binary is missing, run \`cargo build --release\` once. ONLY use port {PORT}. Never touch port 3001 (reserved for the e2e suite) or other agents' ports. Kill your server when done: \`lsof -tiTCP:{PORT} -sTCP:LISTEN | xargs kill\`.
- Mock LLM (chat "notes" typed into the "Write a note to the cook…" box): text containing "show"/"display" → opens Granny's Beef Lasagne via display_recipe; "list" → list_recipes text reply; "timer" → start_timer for step 2, 0.1 min (6 seconds) — the pill appears and step 2 is highlighted, then it expires; "halve"/"update" → update_recipe sets servings 2 on the open recipe and the page refreshes; "meal plan" → display_meal_plan with two recipes; anything else → a canned text reply. Replies render as margin notes / sticky notes.
- Probe library: ${H}/probe.cjs (CommonJS; read it first, it is short). From a script in ${OUT}/{JOURNEY}/ use \`const P = require('../../../probe.cjs')\`; run scripts with \`node <absolute path>.cjs\`. Key API:
  - \`const { page, close, errors } = await P.open(vp, { port: {PORT} })\` — vp ∈ 'phone' (390x844 touch), 'tablet' (810x1080 touch, the most likely cooking device), 'tablet-landscape' (1080x810 touch), 'desktop' (1280x800). Optional \`reducedMotion: 'reduce'\`.
  - \`const r = await P.track(page, async () => { ...action... }, { ms: 1500 })\` samples bounding rects of key anchors (note input, tabs, nav buttons, timer pill, page contents, title…) every animation frame during and after the action, plus PerformanceObserver layout-shift entries. \`P.summarise(r)\` prints only what moved: maxDev (largest deviation from the start position at any frame, includes transforms/animations), net change, visibility flips. Pass \`anchors: [...]\` to track your own selectors (e.g. '.prep-step:nth-child(3)', '.ingredient-item', '.margin-note', '.sticky-note').
  - \`P.shot(page, dir, name)\` (save screenshots to ${OUT}/{JOURNEY}/shots), \`P.sendNote(page, text)\`, \`P.openFromContents(page, n)\`.
  - The page is a normal Playwright Page: use page.click, page.touchscreen.tap, page.mouse, page.keyboard, locators, page.evaluate, page.setViewportSize, etc. For swipes on touch viewports, dispatch touch events via CDP (\`Input.dispatchTouchEvent\`) or page.evaluate with TouchEvent; check static/navigation.js / page-transitions.js for how swipes are detected.
- Re-measure script for your journey: ${H}/remeasure/{JOURNEY}.cjs re-runs the measurements behind the findings of the 2026-10-17 audit and prints one line per finding id. Its numbers on the code as it was that day are in ${BASELINE}/{JOURNEY}.txt. START by running \`${H}/fresh.sh {PORT}\` then \`node ${H}/remeasure/{JOURNEY}.cjs {PORT} > ${OUT}/{JOURNEY}/remeasure-now.txt\`, and diff it against the baseline: that tells you which recorded findings are still present, changed or gone. Then re-run fresh.sh before exploring (the script mutates the book). Verify, don't just repeat: a line that did not change is still a finding only if you confirm it in the browser.

## What counts as a finding
1. JUMP: anything the cook is looking at or about to tap that moves, resizes, flickers, or disappears/reappears without the cook asking for it — or moves MORE than the action warrants (e.g. the input changing pages, content reflowing when a reply/timer/difficulty/photo arrives, scroll position lost, a tap target moving between two taps). Quantify with the probe (px, frames) and name the element.
2. CLUNKY: more taps than needed, controls that do the same thing in two places, controls that do nothing in the current state, confusing modes, state that resets unexpectedly (tab, scroll, mode), dead ends, slow or blocking animations, things that look tappable but aren't (or vice versa), debug/technical text shown to the user.
3. COOKING USABILITY: can a person with floury hands, the tablet propped 60cm away, follow the recipe? Text size at arm's length, touch target size (< 44x44 CSS px is a finding; measure with boundingBox), can ingredients and the current step be seen together, does the screen keep the place when you look away and come back, is anything easy to hit by accident (prev/next, swipes while scrolling), does the timer stay visible and readable, are numbers/quantities legible.
4. BUG: console errors (\`errors\` array), broken states, overlapping elements, text clipped, content unreachable.
Do NOT report pure taste preferences about the book/leather/wood aesthetic — the owner chose that direction ("Journal 2.0") deliberately; work within it.

For every finding, look in static/*.js / styles.css for the likely cause and cite file:line. Read the relevant spec under openspec/specs/ (family-recipe-ui, book-spread-modes, recipe-page-transitions, swipe-navigation, recipe-book-index, web-chat, cooking-guidance, frontend-modules) when deciding whether behaviour is intended; if a spec REQUIRES the clunky behaviour, still report it and say which requirement would need to change. Also check openspec/changes/ for an in-flight change that already plans to fix it, and mention it in fix_direction.

Take screenshots at the key moments and LOOK at them (Read the PNG) — some problems are only visible, not measurable. Be thorough: try each path at all four viewports unless it genuinely does not exist there, try it twice in a row, try it with a timer running, and after scrolling the page.

Return structured output, and before returning also write the same object as JSON to ${OUT}/{JOURNEY}/findings.json. Severity guide: blocker = cook cannot proceed / content unreachable; major = a jump or clunk hit on every cooking session or a cooking-usability failure; minor = noticeable but occasional; polish = cosmetic. Set status on each finding: still-present / partly-fixed / fixed relative to the 2026-10-17 baseline, or new.
`

const JOURNEYS = [
  {
    key: 'find',
    paths: `JOURNEY "find a recipe": landing on /chat (contents page), the alphabet index (tap letters, including letters with no recipes), the contents filter tabs (All / Mains / Sweets / Meals if present / Notes), scrolling the contents, tapping a recipe polaroid/title to open it, the "Recipe Book" header returning to contents, the previous/next arrows and phone edge chevrons and phone "previous recipe / next recipe" footer links, page 0 ↔ page 1 transitions, swipe left/right on phone and tablet (and swiping while vertically scrolling — accidental page turns?), the last-viewed recipe highlight when returning to contents, rapid double-taps on next, reduced-motion mode, browser back button behaviour, reload while a recipe is open (does it come back?). Measure every transition with P.track.`,
  },
  {
    key: 'cook',
    paths: `JOURNEY "cook a recipe" (the most important one): open Granny's Beef Lasagne and Lemon Drizzle Cake and follow them as a cook would, at tablet (portrait and landscape) and phone first, then desktop. Cook mode spread (ingredients left, method right), the Contents/Cook/Notes left strip, the Ingredients/Method right-edge tabs and phone page tabs (do they do anything useful in cook mode?), scrolling a long method and a long ingredient list, coming back after "looking away" (switching tab/mode and back — is scroll position and place kept?), starting a timer by note ("start a timer for step 2"), watching it count down and expire (6s) — what moves when it starts, ticks, expires, cancelling it via ✕, a timer running while navigating to another recipe and back, the step highlight. Text size and line length at arm's length, touch target sizes of everything the cook taps, whether quantities are scannable, whether there is any way to keep your place (tick ingredients, mark current step) and whether the screen would stay awake (check for navigator.wakeLock usage in static/). Photo polaroid tap → full-window preview and closing it. Measure with P.track; record touch target sizes in a table.`,
  },
  {
    key: 'ask',
    paths: `JOURNEY "ask the assistant / notes": the note input ("Write a note to the cook…") at every viewport and in every mode (contents, cook, notes): typing a multi-line note (does the textarea grow and push things?), sending, the "Thinking…" loading state (what moves?), replies rendered as margin notes and sticky notes (where do they appear, do they cover content, do they push content, can they be dismissed, do they persist across recipes — see the notes-scoping requirement in openspec/specs/web-chat/spec.md), the Notes spread mode on tablet/desktop and the Notes page tab on phone, "show me the lasagne" (display_recipe from contents), "halve it" (update_recipe refresh of the open recipe — does the page jump/scroll reset?), "list my recipes", "plan a meal plan for a dinner party" (meal plan display and getting back out of it), sending while a previous reply is still streaming, sending an empty note, the on-screen keyboard situation on phone/tablet (simulate by shrinking viewport height e.g. 390x500 / 810x700 after focusing the input — does the input stay visible, does the book jump?), attaching an image via the paperclip (use tests/e2e/fixtures/test-photo.jpg with page.setInputFiles('#image-upload', <absolute path>)) and removing it. Look for technical/debug text leaking into the page ("Using tool: …", "Timer set: …", raw JSON, tool names).`,
  },
  {
    key: 'manage',
    paths: `JOURNEY "manage recipes + edge states": the share button on a recipe (what happens, where does the link go, can you copy it, then open /share/<token> in a new page at phone and desktop and audit that public page too), the photo/camera button (upload tests/e2e/fixtures/test-photo.jpg, replace, delete if offered — does the page jump while the image loads? does the polaroid size change? tests/e2e/fixtures/large-photo.jpg is 8MB, over the 5MB limit — use it to see the error), recipes without a photo / description / times (Pancakes), the very long title (Sunday Roast Chicken with Lemon, Garlic and Thyme Potatoes) at every viewport — wrapping, overlap with share/photo icons and polaroid, the difficulty dots appearing late (create a recipe via API WITHOUT difficulty: POST http://127.0.0.1:{PORT}/api/recipes with header X-API-Key: test-api-key-for-playwright, then open it and watch the dots/tags arrive from the background mock — does the page reflow?), an empty book (delete all recipes via the API then load /chat), a single-recipe book, the user-info / Logout chip (does it overlap the book or the timer pill on any viewport?), window resize across the 600px and 1024px breakpoints with a recipe open (does state survive?), font loading (first paint with Google Fonts delayed — use page.route to delay fonts.gstatic.com/fonts.googleapis.com by 1500ms and measure the layout shift when Kalam/Libre Baskerville arrive).`,
  },
  {
    key: 'counter',
    paths: `PERSONA WALKTHROUGH "at the counter" — holistic, not path-by-path. You are a home cook who has never seen this app, with an iPad propped on the counter (use 'tablet' and 'tablet-landscape', then repeat the key moments on 'phone'). Task: make the Lemon Drizzle Cake from start to finish, then ask the assistant to halve the Thai Green Curry and cook that. At each moment write down (1) what you wanted to do, (2) what you had to tap, (3) what surprised you or moved, (4) what you couldn't find. Take a screenshot at each moment and LOOK at it. Also judge, with screenshots as evidence: how much of the screen is spent on chrome (wood, leather, tabs, header, email chip) vs recipe content; how many distinct controls are visible in cook mode and which are redundant; whether the eye knows where to go next. Finish with a short "if I could change only five things to make this simple to cook from" list, ranked, each tied to evidence. Use P.track whenever something seems to move.`,
  },
]

const FINDINGS = {
  type: 'object',
  properties: {
    journey: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'short kebab-case slug; reuse the baseline id when it is the same finding' },
          title: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'polish'] },
          category: { type: 'string', enum: ['jump', 'clunky', 'cooking-usability', 'bug', 'visual', 'accessibility'] },
          status: { type: 'string', enum: ['new', 'still-present', 'partly-fixed', 'fixed'], description: 'relative to the 2026-10-17 baseline' },
          viewports: { type: 'array', items: { type: 'string' } },
          what_happens: { type: 'string', description: 'steps + what the user sees' },
          evidence: { type: 'string', description: 'probe numbers, measured sizes, screenshot paths, console errors' },
          likely_cause: { type: 'string', description: 'file:line references and the mechanism' },
          spec_conflict: { type: 'string', description: 'spec requirement that mandates this behaviour, or empty' },
          fix_direction: { type: 'string' },
        },
        required: ['id', 'title', 'severity', 'category', 'viewports', 'what_happens', 'evidence', 'likely_cause', 'fix_direction'],
      },
    },
    top_five: { type: 'array', items: { type: 'string' }, description: 'ranked: the five changes that would most improve this journey' },
    paths_covered: { type: 'array', items: { type: 'string' } },
    paths_not_covered: { type: 'array', items: { type: 'string' }, description: 'and why' },
    probe_scripts: { type: 'array', items: { type: 'string' }, description: 'paths of reusable scripts you wrote that re-measure your key findings' },
  },
  required: ['journey', 'findings', 'top_five', 'paths_covered', 'paths_not_covered', 'probe_scripts'],
}

const selected = JOURNEYS.filter((j) => wanted.includes(j.key))

phase('Explore')
log(`audit "${label}": ${selected.length} explorers (${selected.map((j) => `${j.key}:${portOf(j.key)}`).join(', ')}) -> ${OUT}/`)
if (focus) log(`focus: ${focus}`)
if (selected.length < ALL.length) log(`skipped journeys: ${ALL.filter((k) => !wanted.includes(k)).join(', ')}`)

const results = await parallel(selected.map((j) => () => {
  const port = String(portOf(j.key))
  const fill = (s) => s.replaceAll('{PORT}', port).replaceAll('{JOURNEY}', j.key)
  const brief = fill(COMMON) + '\n\n## Your assignment\n' + fill(j.paths) +
    `\n\nAlso write ${OUT}/${j.key}/remeasure.cjs: a copy of ${H}/remeasure/${j.key}.cjs extended with checks for any NEW findings (same conventions: require('../../../probe.cjs'), port from argv[2] defaulting to ${port}, one output line per finding id, every check starts from its own P.open and does not depend on state left by other scripts). It will be re-run after fixes; the owner promotes new checks into ${H}/remeasure/ by hand.` +
    (focus ? `\n\n## Focus for this run\n${focus}` : '')
  return agent(brief, { label: `explore:${j.key}`, phase: 'Explore', schema: FINDINGS, effort: 'high' })
}))

const ok = results.filter(Boolean)
const all = ok.flatMap((r) => r.findings)
const count = (k, v) => all.filter((f) => f[k] === v).length
log(`${ok.length}/${selected.length} explorers returned; ${all.length} findings ` +
  `(blocker ${count('severity', 'blocker')}, major ${count('severity', 'major')}, minor ${count('severity', 'minor')}, polish ${count('severity', 'polish')}; ` +
  `new ${count('status', 'new')}, still-present ${count('status', 'still-present')}, partly-fixed ${count('status', 'partly-fixed')}, fixed ${count('status', 'fixed')})`)
if (ok.length < selected.length) log('some explorers returned nothing; check their transcripts before trusting the totals')
return { label, out: OUT, focus, journeys: ok }
