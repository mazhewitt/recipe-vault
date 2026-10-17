# Usability audit, 2026-10-17: findings index

Five browser explorers (find, cook, ask, manage, and a first-time-cook persona "counter") drove the app with a mock LLM at phone 390x844, tablet 810x1080, tablet landscape 1080x810 and desktop 1280x800. For each finding, the explorer recorded probe numbers, screenshots, the file:line cause and a fix direction. Those full records are in the session scratchpad (`audit/all-findings.json`), and the reusable probe and re-measure scripts are in `tests/usability/`.

Overlapping reports from different explorers are kept: independent rediscovery is evidence of severity. The **Covered by** column maps each finding to a design decision (D = steady-cooking-spread, N = safe-page-navigation). Findings marked *scratch* are filed under `.scratch/` instead.

| sev | explorer | id | finding | covered by |
|---|---|---|---|---|
| blocker | counter | `cook-reply-covers-title` | Cook mode: assistant replies and status lines are printed over the recipe title, clipped, and block the share/photo buttons | D3 |
| major | ask | `cook-reply-offscreen` | In cook mode a reply to a mid-cook question lands where the cook can't see it | D3 |
| major | ask | `cook-reply-covers-recipe` | Cook-mode replies print over the title, photo and first step with no background, and block taps on the share and photo buttons | D3 |
| major | ask | `input-jumps-across-spine` | The note input jumps across the spine whenever the spread changes context | D1 |
| major | ask | `input-hidden-contents-and-meal` | The input disappears in contents mode while a recipe is open and on every meal plan | D1 |
| major | ask | `halve-scroll-reset` | 'Halve it' (update_recipe) blanks the recipe to a skeleton and throws the method back to the top | D5 |
| major | ask | `debug-status-lines` | Tool names and raw timer values are shown to the cook ('Using tool: start_timer', 'Timer set: Mock timer, 0.1 min') | D4 |
| major | ask | `focus-lost-after-send` | Every send drops focus from the input and locks it while Thinking, so follow-ups need another tap | D4 |
| major | cook | `phone-edge-nav-covers-content` | Phone: invisible 60px prev/next strips cover a third of the recipe; tapping an ingredient turns the page and drags there do not scroll | N1 |
| major | cook | `touch-photo-preview-closes-instantly` | Tapping the polaroid on a touch device never shows the preview: it opens on touchend and the synthesised click closes it 1ms later | N7 |
| major | cook | `cook-margin-notes-cover-header` | In cook mode, replies and status lines are drawn over the recipe title, share and photo buttons and the polaroid, and at tablet portrait run off the page | D3 |
| major | cook | `timer-pill-over-next-arrow` | The timer pill covers the next-recipe arrow, and its ✕ overlaps it | D6 |
| major | cook | `timer-highlight-reflows-method` | Starting a timer grows the highlighted step and pushes the rest of the method down ~23-27px; expiry or cancel pulls it back up | D8 |
| major | cook | `timer-expiry-silent-and-fleeting` | Timer expiry plays no sound, and the only signal ('Done! ✓') disappears after 3 seconds | D7 |
| major | cook | `phone-diagonal-scroll-swallowed` | Phone: a natural thumb-arc scroll is treated as a swipe, is cancelled, and the page does not move | N2 |
| major | cook | `phone-tab-switch-loses-place` | Phone: checking an ingredient and returning to Method loses your place in the method (step 7 drops 386px) | N3 |
| major | cook | `phone-reply-offscreen` | Phone: the reply to a cook's question appears below the recipe, off-screen | D3 |
| major | cook | `note-input-crosses-spine-on-open` | Opening a recipe moves the note slip across the spine (385-590px) and blinks it twice | D1 |
| major | cook | `small-text-at-arms-length` | Ingredients and method are 14px on tablet and desktop while half of each page is empty | D9 |
| major | cook | `small-touch-targets` | Most cook-facing controls are under 44px: spread and edge tabs 26px wide, arrows 29-36px, timer ✕ and share/photo 28px, phone way-back label 81x16 | D9; N8 (phone "Recipe Book" label); tablet swipe: `scratch:tablet-swipe` |
| major | cook | `no-place-keeping-or-wake-lock` | No way to keep your place (tick ingredients, mark the current step) and nothing keeps the screen awake | D10 |
| major | counter | `phone-edge-strips-steal-taps` | Phone: invisible 60px prev/next strips cover the ingredient quantities; tapping '225 g' turns the page | N1 |
| major | counter | `refresh-loses-place` | update_recipe (halve, photo, any refresh) flashes a skeleton and scrolls the method back to the top | D5 |
| major | counter | `mode-switch-reflows-recipe` | Contents/Notes tabs re-flow the open recipe: ingredients jump across the spine, method drops 195–488px, note slip vanishes | D1, D2; contents auto-scroll: `scratch:contents-page-rough-edges` |
| major | counter | `recipe-text-small` | Recipe body text is 14px (durations 12px) on tablet, too small to read from the counter while half the page is empty | D9 |
| major | counter | `timer-done-vanishes` | Timer completion shows 'Done!' for 3 seconds then disappears, with no sound | D7 |
| major | counter | `phone-diagonal-scroll-turns-page` | Phone: a mostly-vertical scroll (62°) is taken as a swipe; it turns the page or swallows the scroll | N2 |
| major | counter | `small-touch-targets` | Most cook-mode controls on tablet are under 44px: 26px-wide edge tabs, 29–36px arrows, 28px share/photo/cancel | D9; N8 (phone "Recipe Book" label) |
| major | counter | `no-wake-lock` | Nothing keeps the screen awake while a recipe is open | D10 |
| major | find | `phone-edge-zone-steals-contents-taps` | Phone: tapping the right side of a contents row opens the first recipe instead of the one tapped | N1 |
| major | find | `phone-edge-zones-cover-recipe-text` | Phone: invisible prev/next zones cover 31% of the recipe page, including every step number | N1 |
| major | find | `phone-diagonal-scroll-turns-page` | Phone: scrolling with a slight sideways drift turns to another recipe | N2 |
| major | find | `timer-pill-covers-next-arrow` | A running timer covers the '>' next arrow, and its ✕ sits where the arrow was | D6 |
| major | find | `next-waits-for-list-and-ignores-prefetch` | Every page turn waits for a forced list refetch, which also empties the prefetch cache, so a skeleton shows on each turn | N4 |
| major | find | `header-return-intermediate-frame` | 'Recipe Book' header back to the contents shows a half-state: blank left page, recipe re-flowed on the right, note input jumping | N8 (the input jump: D1) |
| major | find | `open-recipe-moves-note-input` | Opening a recipe from the contents moves the note input across the spine, blinking out and back | D1 |
| major | find | `no-history-reload-loses-recipe` | Reload, and browser Back, throw the cook out of the recipe (no URL or history state) | N5 |
| major | find | `touch-targets-under-44px` | Find-a-recipe controls are well under 44px on touch devices | D9, N8; A-Z letters: `scratch:contents-page-rough-edges` |
| major | manage | `phone-book-narrows-during-reload` | On a phone the whole book shrinks about 75px and re-centres whenever a recipe reloads (photo upload, 'show', update_recipe) | D5 |
| major | manage | `phone-edge-strip-over-content` | Phone: invisible 60px prev/next strips cover the ingredient quantities and the title, so a tap on '750 g' turns the page | N1 |
| major | manage | `timer-pill-covers-next` | A running timer pill sits on top of the '>' next-recipe button; tapping next hits the pill or cancels the timer | D6 |
| major | manage | `phone-rotate-landscape-loses-input` | Rotating a phone to landscape with a recipe open shows the contents and no note input, and the Method tab shows ingredients | N6 (with D1) |
| major | manage | `failed-load-hides-note-input` | A failed recipe load (network blip, 404 in an empty book) drops to contents mode and hides the note input: a dead end | D1 |
| minor | ask | `reply-filed-out-of-sight` | Replies to 'show me…' and 'plan a meal…' vanish when the page they ask for opens, and a stale old reply is shown instead | `scratch:notes-thread-gaps` (design.md open question 3) |
| minor | ask | `slip-grows-over-page` | A multi-line note grows the input slip about 100px upward over the page, and on phone squeezes the book | D4; image chip growth: `scratch:note-input-rough-edges` |
| minor | ask | `thinking-row-jump` | The 'Thinking…' row is inserted into the slip, growing and shrinking it on every send | D4 |
| minor | ask | `cook-to-notes-reflow` | Switching Cook → Notes moves the step being read by 420-600px | D2, D3 |
| minor | ask | `notes-tab-on-contents` | Notes on the contents page moves the whole contents across the spine and shows two active tabs | D1, D3; contents crossing the spine and two active tabs: `scratch:contents-page-rough-edges` |
| minor | ask | `sticky-covers-contents` | The contents-page sticky reply covers an entry, can't be dismissed and reappears on every visit | D3 |
| minor | ask | `image-chip` | Image attach: tiny remove ✕, slip grows 55px, the same photo can't be re-attached after removing it | `scratch:note-input-rough-edges` |
| minor | ask | `small-targets-and-text` | Send and attach are 40x40 on tablet and desktop, and replies are 14px handwriting | D9; reply text size: `scratch:cook-page-polish` |
| minor | ask | `phone-book-thread-unreachable` | On phone there is no way to read earlier book-level notes | `scratch:notes-thread-gaps` |
| minor | ask | `keyboard-resets-contents-scroll` | Any viewport resize (keyboard on a resizing browser, rotation) re-renders the contents and loses the scroll position | N6 |
| minor | ask | `meal-plan-dead-end` | Meal plan: three buttons that do nothing, and no way back to the plan after opening a dish | `scratch:meal-plan-dead-end` |
| minor | ask | `thread-lost-on-reload` | All notes vanish on reload or when the tablet discards the tab | `scratch:notes-thread-gaps` |
| minor | cook | `notes-tab-moves-method` | Tapping Notes (or Contents) to ask a question pushes the method you were reading 421px down the right page | D2 |
| minor | cook | `edge-tabs-noop-in-cook` | Right-edge Ingredients/Method tabs do nothing in cook mode, and the book shows five tabs for two pages | D11 |
| minor | cook | `debug-status-lines` | Tool and debug status lines ('Using tool: start_timer', 'Timer set: Mock timer, 0.1 min') are shown to the cook | D4 |
| minor | cook | `title-word-per-line` | Recipe title squeezed to one word per line beside the share/photo icons and polaroid (tablet portrait and phone) | D9 |
| minor | cook | `note-input-grows-while-thinking` | The note slip grows 28px upward while the reply is loading, then shrinks | D4 |
| minor | cook | `timer-pill-not-linked` | The timer pill gives no way back to its recipe or step, and the step highlight disappears on other recipes | `scratch:timer-pill-and-duration-chips` |
| minor | counter | `note-slip-crosses-spine` | Opening a recipe moves the note slip 385–590px from the right page to the left | D1 |
| minor | counter | `timer-pill-covers-next` | Timer pill sits on top of the '>' next-recipe arrow; its cancel target is 28x28 | D6 |
| minor | counter | `timer-highlight-pushes-steps` | Starting a timer grows the highlighted step and pushes every later step down 23px (and back when it ends) | D8 |
| minor | counter | `debug-status-lines` | Developer status lines ('Using tool: start_timer', 'Timer set: Mock timer, 0.1 min') shown to the cook | D4 |
| minor | counter | `edge-tabs-noop-in-cook` | Ingredients/Method edge tabs and the active Cook tab do nothing in cook mode | D11 |
| minor | counter | `phone-reply-offscreen` | Phone: the assistant's reply lands below the fold with no cue | D3 |
| minor | counter | `sending-shifts-layout` | Sending a note grows the slip by 28px and, on phone, squeezes the whole book by 26px; the textarea is disabled meanwhile | D4 |
| minor | counter | `duration-chip-looks-tappable` | Step duration chips ('4 min') look like buttons but do nothing | `scratch:timer-pill-and-duration-chips` |
| minor | find | `contents-tab-reflows-method` | Tapping the Contents spread tab while cooking pushes the method down 250-420px | D2 (the input vanishing: D1) |
| minor | find | `contents-return-scrolls-title-away` | Returning to the contents scrolls the title and A-Z strip out of view even when the last-viewed row was already visible | `scratch:contents-page-rough-edges` |
| minor | find | `alphabet-strip-scrolls-away` | The A-Z strip scrolls away after a jump, so a second letter needs a scroll back to the top | `scratch:contents-page-rough-edges` |
| minor | find | `phone-footer-next-moves` | Phone: the 'next recipe ›' footer link moves between taps, and the tab resets to Ingredients | `scratch:phone-paging-rough-edges` |
| minor | find | `header-tap-ignored-mid-turn-phone` | Phone: tapping 'Recipe Book' just after next/swipe is silently lost | `scratch:phone-paging-rough-edges` |
| minor | find | `tablet-has-no-swipe` | Tablet (the likely cooking device) has no swipe, only small arrows at the top corners | `scratch:tablet-swipe` |
| minor | manage | `photo-upload-resets-scroll` | Uploading or replacing a photo blanks the page to a skeleton and throws the reader back to the top | D5; photo URL cache-buster: `scratch:photo-upload-feedback` |
| minor | manage | `late-difficulty-reflow` | Difficulty dots arriving from the background re-render the recipe and push the method down 27px on a phone | D5 |
| minor | manage | `difficulty-backfill-lock-race` | Backend: auto-difficulty fails with 'database is locked' whenever auto-tagging runs at the same time, so the dots never arrive | `scratch:recipe-create-spawns-two-racing-writers` (comment added) |
| minor | manage | `long-title-wraps` | Long titles wrap to 3-4 lines because the share and photo buttons and the polaroid share the title row | D9 |
| minor | manage | `header-full-width-hit-zone` | The 'Recipe Book' label is an invisible 770-1180px-wide button above the book; tapping blank wood leaves the recipe | N8 |
| minor | manage | `logout-above-timer-cancel` | The Logout link sits 16-23px directly above the timer's cancel ✕; both are tiny | D6, D9 |
| minor | manage | `first-paint-placeholder-jump` | On load the book first says 'Ask me to find or create a recipe…', then the phone filter tabs drop 66px when the contents arrive | `scratch:first-paint-stability` |
| minor | manage | `share-clunky` | Share mints a new public link on every tap, falls back to a blocking prompt(), and confirms far from the button | `scratch:share-flow` |
| minor | manage | `share-page-issues` | Public share page: relative og:image (no link-preview photo), un-sized photo, 30px copy button, doubled step numbers | `scratch:share-flow` |
| minor | manage | `photo-error-far-or-hidden` | Photo upload errors appear at the foot of the left page, 600-1000px from the camera button, or not at all in contents mode | D1 (the hidden case); `scratch:photo-upload-feedback` |
| minor | manage | `small-manage-targets` | Share and photo buttons are 28x28; the phone's way back to the contents is 81x16 | D9, N8 |
| minor | manage | `breakpoint-resets-scroll` | Crossing 600px (resize or rotate) with a recipe open resets the page to the top | N6 |
| minor | manage | `cdn-script-blocks-paint` | Unpinned marked.js from jsdelivr is render-blocking: a slow CDN means a blank page | `scratch:first-paint-stability` |
| minor | manage | `deleted-recipe-opens-another` | Opening a recipe that was deleted elsewhere silently opens the first recipe in the book instead | N5 |
| polish | ask | `empty-send-silent` | Sending an empty or whitespace note does nothing and leaves the whitespace | `scratch:note-input-rough-edges` |
| polish | ask | `send-sticky-hover` | After a tap, the send button stays in its hover colour and looks disabled on touch screens | `scratch:note-input-rough-edges` |
| polish | cook | `timer-pill-width-jitter` | Timer pill resizes every tick and again at 'Done' (left edge wobbles) | D6 |
| polish | cook | `cook-ingredient-uneven-spacing` | Cook-mode ingredient list has irregular line spacing (packed groups of 3 kept as blocks) | `scratch:cook-page-polish` |
| polish | counter | `title-wraps` | Recipe title wraps one or two words per line beside the share/photo icons and polaroid | D9 |
| polish | counter | `packed-ingredients-split` | Outside cook mode, packed ingredient runs split a quantity from its unit across lines ('60 / g plain flour') | D2 (the packed right-page list is no longer shown above 600px) |
| polish | find | `filter-splits-few-results-across-pages` | Filtered contents with only a few entries still split across both pages ('continued overleaf' for 4 sweets) | `scratch:contents-page-rough-edges` |
| polish | manage | `resize-refetch-storm` | Each resize event on the contents page re-fetches the recipe list and re-renders the contents | N6 |
| polish | manage | `font-swap-reflow` | When Kalam and Libre Baskerville arrive late, the open recipe reflows (method moves 18-29px; account chip widens) | `scratch:first-paint-stability` |

### Scratch issues filed from this audit

Each `scratch:<slug>` above is `.scratch/<slug>/README.md` (or, for `recipe-create-spawns-two-racing-writers`, a dated comment on the existing issue):

| slug | findings |
|---|---|
| `share-flow` | share-clunky, share-page-issues |
| `meal-plan-dead-end` | meal-plan-dead-end |
| `contents-page-rough-edges` | alphabet-strip-scrolls-away, contents-return-scrolls-title-away, filter-splits-few-results-across-pages, the A-Z letter targets of touch-targets-under-44px, the contents half of notes-tab-on-contents, the contents auto-scroll of mode-switch-reflows-recipe |
| `tablet-swipe` | tablet-has-no-swipe, and the swipe half of cook's small-touch-targets |
| `notes-thread-gaps` | thread-lost-on-reload, phone-book-thread-unreachable, reply-filed-out-of-sight |
| `first-paint-stability` | font-swap-reflow, cdn-script-blocks-paint, first-paint-placeholder-jump |
| `timer-pill-and-duration-chips` | timer-pill-not-linked, duration-chip-looks-tappable |
| `note-input-rough-edges` | image-chip, empty-send-silent, send-sticky-hover, the image-chip growth in slip-grows-over-page |
| `phone-paging-rough-edges` | phone-footer-next-moves, header-tap-ignored-mid-turn-phone |
| `photo-upload-feedback` | photo-error-far-or-hidden (except the hidden-input case, D1), the photo URL cache-buster in photo-upload-resets-scroll |
| `cook-page-polish` | cook-ingredient-uneven-spacing, the reply text size in small-targets-and-text |
| `recipe-create-spawns-two-racing-writers` | difficulty-backfill-lock-race (comment on the existing issue) |

## Before / after

Every `jump` and `clunky` finding, with its "before" taken from the finding's evidence (the remeasure line, viewport in brackets). The verifier fills "after" from `tests/usability/run-all.sh` (tasks.md 9.4), which diffs against `tests/usability/baseline-2026-10-17/`:
- Rows covered by D1-D11 get a measured number.
- Rows covered by N1-N8 or `scratch:` get `n/a (…)` until that work lands.

| finding id | before | after |
|---|---|---|
| `timer-highlight-reflows-method` (cook) | step 3 dy +23 on start, -23 on expiry (tablet); +27/-27 (phone); +23/-23 (landscape); 0 (desktop) | |
| `note-input-crosses-spine-on-open` (cook) | slip dx -385 (tablet), -490 (landscape), -590 (desktop); 2 visibility flips each | |
| `notes-tab-moves-method` (cook) | method header y 317 → 738 (+421px) on Notes and on Contents (tablet) | |
| `edge-tabs-noop-in-cook` (cook) | 2 tab taps: page scroll and text unchanged; only the tab moved 3px | |
| `debug-status-lines` (cook) | 2 of the visible notes are "Using tool: start_timer", "Timer set: Mock timer, 0.1 min" (tablet, phone) | |
| `note-input-grows-while-thinking` (cook) | #note-input maxDev 28px (tablet); 26px, 757→783 (phone) | |
| `timer-pill-width-jitter` (cook) | pill widths 149–189px over 16s (phone); maxDev 5px per tick (landscape) | |
| `timer-pill-not-linked` (cook) | pill has no click handler; highlight 0 on another recipe | |
| `refresh-loses-place` (counter) | scrollTop 191→0, 2 skeleton frames (tablet); 300→0, .app-container 390→315→390 (phone); step 7 maxDev 191px | |
| `mode-switch-reflows-recipe` (counter) | step 1 ±421px, ingredients ±379px, CLS 0.103 per switch (tablet); ±488 / ±484px (landscape); slip vis 1→0 on Contents | |
| `note-slip-crosses-spine` (counter) | slip dx -385 / -490 / -590px, 2 visibility flips | |
| `timer-highlight-pushes-steps` (counter) | step 2 height 47→70, step 3 dy +23 (tablet); 24→47, +23 (desktop); 53→77, +23 (phone) | |
| `debug-status-lines` (counter) | 2 status notes visible at every viewport | |
| `edge-tabs-noop-in-cook` (counter) | Method, Ingredients, Cook taps: no visible change | |
| `sending-shifts-layout` (counter) | slip maxDev 28px (tablet); slip 26px, .recipe-book 26px, #page-right 26px (phone) | |
| `duration-chip-looks-tappable` (counter) | span, cursor auto, no handler | |
| `input-jumps-across-spine` (ask) | dx -385 / -490 / -590px on open, 2 flips; Notes on the contents -385 / -590px | |
| `input-hidden-contents-and-meal` (ask) | input shown = false in contents mode with a recipe open and after a meal plan (all wide viewports) | |
| `halve-scroll-reset` (ask) | scrollTop 214→0, step 5 y 493→707 (tablet); 250→0 (landscape); 189→0 (desktop); 300→0, step 5 469→769 (phone) | |
| `debug-status-lines` (ask) | 2 of 3 margin notes technical (wide); phone margin holds both status lines | |
| `focus-lost-after-send` (ask) | textarea disabled while thinking = true; focus after reply = BODY (phone, tablet) | |
| `reply-filed-out-of-sight` (ask) | 0 notes on the recipe "show me the lasagne" opened; meal-plan margin empty | |
| `slip-grows-over-page` (ask) | 7 lines: slip 57→157px (tablet, desktop); 61→157px with pages-container 703→607 (phone) | |
| `thinking-row-jump` (ask) | slip maxDev 28px (tablet, desktop); 26px, pages-container 26px (phone) | |
| `cook-to-notes-reflow` (ask) | step 4 dy 421 (tablet), 603 (landscape), 453px (desktop) | |
| `notes-tab-on-contents` (ask) | input dx -385, contents title dx +379 (tablet); 2 active tabs; sticky still rendered | |
| `phone-book-thread-unreachable` (ask) | 4 book entries, 1 shown, Notes tab visible = false | |
| `keyboard-resets-contents-scroll` (ask) | #page-left scrollTop 200→0 (phone), 157→0 (landscape) | |
| `meal-plan-dead-end` (ask) | 3 disabled actions, 0 routes back to the plan; CLS 0.726 (phone) | |
| `empty-send-silent` (ask) | thread 2→2, whitespace left in the textarea, no feedback | |
| `phone-diagonal-scroll-turns-page` (find) | 31° drift turned the page; 15px sideways wobble then a scroll turned the page | |
| `next-waits-for-list-and-ignores-prefetch` (find) | at 300ms latency: first response 341ms, new recipe 643ms; list refetched and prefetch discarded on every tap | |
| `header-return-intermediate-frame` (find) | CLS 0.123 (tablet), 0.137 (landscape), 0.145 (desktop); left page empty 150ms after the tap | |
| `open-recipe-moves-note-input` (find) | dx -385 / -490 / -590px, 2 flips; Contents tab vis 1→0 | |
| `contents-tab-reflows-method` (find) | step 1 dy 421px (tablet); title width -162px and input vis 1→0 (desktop) | |
| `contents-return-scrolls-title-away` (find) | scrollTop 157/157 (landscape), 167/167 (desktop), 271/839 (phone); A-Z strip hidden | |
| `alphabet-strip-scrolls-away` (find) | A-Z bottom -462 vs page top 76 after jumping to M (phone) | |
| `phone-footer-next-moves` (find) | footer-next y 719→573 (-146px); tab reset to Ingredients | |
| `header-tap-ignored-mid-turn-phone` (find) | header tap 30 / 120 / 250ms after next: stays on the recipe (phone) | |
| `phone-book-narrows-during-reload` (manage) | .recipe-book width maxDev 75px; CLS 0.213 ("show"), 0.927 ("halve") (phone) | |
| `phone-rotate-landscape-loses-input` (manage) | 844x390: spread contents, note input display none, left page "~ Contents ~" | |
| `failed-load-hides-note-input` (manage) | after a failed load: spread contents, note input display none (tablet) | |
| `photo-upload-resets-scroll` (manage) | scrollTop 200→0 (phone), 191→0 (tablet), 189→0 (desktop) | |
| `late-difficulty-reflow` (manage) | step 3 maxDev 27px, meta line +27px, tags 125px (phone); tags 129px (tablet) | |
| `header-full-width-hit-zone` (manage) | hit area 770x35 (tablet), 1180x35 (desktop) for a 122px label; 81x16 (phone) | |
| `first-paint-placeholder-jump` (manage) | phone All tab y 92→158 (66px); first-load CLS 0.14 | |
| `share-clunky` (manage) | 2 taps → 2 distinct tokens; prompt() without clipboard grant; button 28x28 | |
| `photo-error-far-or-hidden` (manage) | error 1011px from the button (tablet, cook); not shown (contents mode); 620px and book maxDev 44px (phone) | |
| `breakpoint-resets-scroll` (manage) | scrollTop 189 → 0 → 0 across 1280 → 500 → 1280px | |
| `resize-refetch-storm` (manage) | 20 resize events → 18 GET /api/recipes | |
| `font-swap-reflow` (manage) | step 6 +29px (phone), +18px (tablet); user chip 180→198px | |
| `deleted-recipe-opens-another` (manage) | tapping a deleted entry opened "Banana Bread", no message | |
