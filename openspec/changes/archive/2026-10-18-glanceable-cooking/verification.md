# glanceable-cooking: verification

Group 4 of `tasks.md`, run on branch `glanceable-cooking` at `f1769bf` (groups 1-3 and their review fixes).

## 4.1 Before → after (usability re-measure)

Each explorer script ran against its own fresh harness server (`tests/usability/fresh.sh <port>`, cook on 3031, ask on 3032, counter on 3033), output in `tests/usability/runs/audit-post-steady/{cook,ask,counter}/remeasure-after.txt` (gitignored). "Before" is `cook/remeasure-new-checks.txt`, `ask/remeasure-new.txt` and `counter/remeasure-extended.txt`.

No check printed `ERROR`, and none needed a selector fix: the re-check lines that read `#timer-text`, `span.step-duration` or the ribbons query by role or class (`.step-duration`, `.edge-tab`, the pill's `innerText`), so they still measure the new markup. One reporting quirk: the pill's " · " separator is CSS (`.timer-time::before`), so `innerText` prints "Step 2 · Mock timer0:05" with no separator before the time. The pill itself reads "Step 2 · Mock timer · 0:05".

### cook

| Check | Decision | Before | After |
|---|---|---|---|
| sticky-hides-last-ingredients | G1 | ingredients under the sticky at max scroll: tablet 0, tablet-landscape 4, desktop 4, phone 2 | 0 on all four |
| left-scroll-leaks-across-modes | G3 | cook L=50 → notes → cook L=0; cook L=0 → contents → cook L=88 / 98 (first ingredient scrolled off) | cook L=50 → notes → cook L=50; cook L=0 → contents → cook L=0, on tablet-landscape and desktop |
| tablet-note-textarea-narrow | G4 | textarea 164px of a 365px slip; a 48-char question moves the slip top 36px | 217px; the slip top moves 14px (still wraps once, see "Not fixed") |
| timer-pill-text-cramped | G5 | "Simmer:5:00", label→time gap 4px, time 18px, pill∩right page 1740px² | "Step 2 · Simmer · 5:00", gap 18px, time 26px (label 16px); pill∩right page 4160px² (the pill is wider, still centred over the spine) |
| timer-done-easy-to-miss | G5 | 3 chime notes in 20s after zero (one chime); pill 147×36 → Done 166×36, cream background | 6 notes in 20s (repeat at 15s); 280×48 → 280×48, filled leather `rgb(139, 45, 26)` |
| duration-chip-no-timer | G6 | `<SPAN>`; tap → no timer, step marked | `<BUTTON>` 57×29; tap → timer shown, step not marked |
| clear-ticks-small-and-destructive | G9 | 60×14, hit44 misses 15/25; one tap clears ticks and the step mark | 72×14, hit44 misses 0/25; ticks=0, step mark kept (1) |
| timer-pill-width-jitter | (steady) | phone 200px | 200px (still fixed) |

### ask

| Check | Decision | Before | After |
|---|---|---|---|
| sticky-covers-ingredients | G1 | 3-paragraph reply at page end blocks 4 / 8 / 6 / 7 ingredients (tablet / tablet-landscape / desktop / phone); one-line reply blocks 1 on tablet-landscape and desktop; phone footer links blocked 2/2 | 0 everywhere; phone footer links blocked 0 |
| sticky-covers-contents | G1 | phone and desktop: sticky overlaps [Lemon Drizzle Cake] | unchanged: phone and desktop overlap [Lemon Drizzle Cake]. The check measures with the contents at scroll 0; G1's contract is at scroll end (the foot padding lets the last row scroll clear, covered by `reply-sticky.spec.ts` "the last contents row clears the sticky"). At the top the sticky still lies over a row by design |
| phone-open-shifts-book | G2 | `.app-container` dy=-36 dh=36; layout-shift 0.128 | dy=0 dh=0; layout-shift 0.035 (the remaining shift is the page content swap, not the book) |
| slip-textarea-narrow | G4 | tablet text box 148px; a 35-char note grows the slip 61→75 | tablet 201px; still 61→75 (wraps). tablet-landscape / desktop / phone unchanged (253 / 353 / 196px) |
| notes-thread-no-autoscroll | G8 | latest reply after sends 1-4: tablet-landscape [seen, partly, hidden, hidden], tablet [seen, seen, hidden, hidden], phone [seen, partly, hidden, hidden] | [seen, seen, seen, seen] on all three |
| inflight-send-silent | G10 | send during a turn: op 1, same as idle | op 0.45 during the turn, 1 idle; the follow-up stays in the textarea ("and a side?"), sent 1/2 |

### counter

| Check | Decision | Before | After |
|---|---|---|---|
| sticky-hides-last-ingredients | G1 | tablet-landscape 2, tablet 0, desktop 1 | 0 / 0 / 0 |
| phone-sticky-covers-footer-nav | G1 | "‹ previous recipe" and "next recipe ›" BLOCKED by `#page-margin` | both reachable |
| phone-book-jumps-on-open | G2 | book dy -36 / +36, CLS 0.128 | dy 0 / 0, CLS 0.035 |
| narrow-note-textarea | G4 | tablet textarea 164px of 365px; 90-char note dh=36 | tablet 217px; 90-char note still dh=36 (a 90-char note wraps at any tablet width). tablet-landscape 269px, phone 212px unchanged |
| timer-small-at-distance | G5 | tablet 223×36, time 18px = step text 18px; Done: no colour change, no animation, width 223→242, x 293→284; phone 200×30, time 14px | tablet / tablet-landscape 280×48, time 26px vs 18px step text; Done: leather fill, `timer-done-pulse`, width and x unchanged; phone 200×44, time 22px vs 17px |
| duration-chip-toggles-mark | G6 | tap "4 min" → step marked, no timer; again → unmarked | tap → no mark, timer running; again → no mark, timer still running |
| clear-ticks-small-and-clears-mark | G9 | 60×14, misses 15/25; shown with only a step mark; clears the mark | 72×14, misses 0/25; hidden with only a step mark; step mark kept |
| ribbons-look-like-tabs | G11 | ingredients `edge-tab active` aria-selected=true, method a different (brown) face | both `edge-tab`, no aria-selected, the same `rgb(201, 168, 108)` face |

Every check fixed by steady-cooking-spread still prints its fixed value (cook `timer-pill-width-jitter`; ask `input-jumps-across-spine`, `cook-reply-covers-recipe`, `halve-scroll-reset`, `cook-to-notes-reflow`, `thinking-row-jump`; counter `note-slip-crosses-spine`, `mode-switch-reflows-recipe`, `timer-highlight-pushes-steps`, `timer-pill-covers-next` with the cancel hit area 0/25 misses).

### Not fixed

- **G4, the 40-character tablet note.** The spec's "a 40-character note does not wrap" at 810×1080 is not met: the textarea is 217px (201px text box), and a 35-character note still wraps (slip 61→75). Group 1 kept it as `test.fixme('the tablet slip holds a 40-character note on one line')` in `tests/e2e/tests/responsive.spec.ts` and escalated it: meeting it needs the slip column wider or the 16px no-zoom font smaller. Needs a decision from the change owner.
- **G1 at scroll 0 on the contents.** As above: by design the sticky still overlays the foot of an unscrolled contents page; the last row can be scrolled clear.
- **G2 residual CLS 0.035** when a recipe opens on the phone; the book itself moves 0px.

## 4.2 Revert-and-fail

Each line was reverted alone, the named spec run on port 3002, then restored with `git checkout -- static`; `git diff --quiet -- static` was clean after every one.

| Reverted | Red test(s) |
|---|---|
| `--sticky-clearance` term in `.page-left` padding | chromium `reply-sticky.spec.ts` "the last ingredient clears the sticky", "the last contents row clears the sticky" |
| the clearance's no-shrink rule | chromium `layout-stability.spec.ts` "a reply sticky over a page scrolled to its end". Note: removing only the `Math.max` stays green, because a dismissal hides the sticky and the hidden-sticky guard already keeps the old value; the red revert takes the clearance as the current sticky's height (0 when hidden). A shorter reply replacing a taller one at scroll end is not tested |
| phone `.user-info` `visibility: hidden` (back to `display: none`) | mobile-chrome `layout-stability.spec.ts` "opening a recipe", "returning to the contents on the phone", "ticking an ingredient and marking a step" |
| spread-mode scroll restore (`pageLeft.scrollTop = saved ?? 0` → `0`) | chromium `spread-modes.spec.ts` "each mode has its own position", "restoring moves nothing else, and no frame shows another position" |
| tablet `.note-page-number { display: none }` | ipad `responsive.spec.ts` "the tablet slip gives the page number's room to the textarea" |
| the pill's `width: 280px` | chromium `timer.spec.ts` "the pill holds its box across ten ticks…", "one width in every state" |
| the chime repeat interval | chromium `timer.spec.ts` "the chime repeats every 15s and stops by itself 5 minutes after zero" |
| the 300s stop | same test |
| the confirm check in `startStepTimer` | chromium `duration-timer.spec.ts` "a running timer is not replaced by one tap", "the confirm belongs to the recipe it was asked on" |
| place-keeping's button exclusion for `.step-duration` | chromium `duration-timer.spec.ts` "tapping it starts a local timer" |
| the pill click handler (`goToTimerStep`) | chromium `timer.spec.ts` "tapping the running pill scrolls the timer's step into view", "…from another recipe opens the timer's recipe at its step" |
| the thread pin check (`pinned \|\| ownSend` → `ownSend`) | chromium `margin-notes.spec.ts` "a reply arriving is followed while pinned, through four sends", "the cook's own note scrolls into view" |
| clear ticks keeping the step (`place.step = null` re-added) | chromium `place-keeping.spec.ts` "clearing the ticks keeps the step mark, with a 44px hit area" |
| the undo restore | chromium `place-keeping.spec.ts` "a clear can be undone for 6 seconds, then it stands" |
| `.note-send[aria-disabled]` opacity | mobile-chrome `chat.spec.ts` "the send button looks unavailable during a turn" |
| the ribbon `active` removal (`:not(.edge-tab)`) | chromium `page-tabs.spec.ts` "desktop: the edge ribbons are inert", "opening a different recipe resets the tab to Ingredients" |

## 4.3 Suite

`grep -n "test.fail\|test.fixme" tests/e2e/tests/*.spec.ts` lists one case, added by this change: `responsive.spec.ts` "the tablet slip holds a 40-character note on one line" (G4, see "Not fixed"). `make lint` clean. Full suite result: see the commit body.

## 4.5 Hand-off: regions edited (for the merge with safe-page-navigation)

Line numbers are post-change (`f1769bf`).

- `static/styles.css`: the timer pill block (≈150-262: `.timer-widget`, `.timer-text`, `.timer-label`, `.timer-time`, the Done state and `timer-done-pulse`); `.note-send[aria-disabled]` (≈437-450); the tablet `.note-page-number` hide (≈465-471); `--sticky-clearance` on the book (≈572-574); `.page-left` padding (≈679-680); `.step-duration` (≈954-968); the step mark and timer band (≈1012-1041); `.clear-ticks` width and hit area (≈1052-1076); the removed `.edge-tab[data-tab="method"]` colours (was ≈1220); `.step-duration::before` in the hit-area list (≈1478); the phone pill sizes (≈2362-2380), the phone `.user-info` rule (≈2400-2405), the phone `.page-right` padding (≈2422-2423), the phone step-mark offsets (≈2506-2514) and phone `.note-send[aria-disabled]:hover` (≈2557-2561).
- `static/chat.html`: `#timer-text` markup (37) and the two `.edge-tab` buttons (60-61).
- `static/app.js`: `sharedState` `currentRecipeId` / `viewMode` setters (72-86), `renderSpread(mode, options)` and the `renderContents` options pass-through (567, 605, 616, 635-638).
- `tests/e2e/tests/helpers.ts`: `Step` (13), `AnchorResult` (327), `ANCHORS` (347-348), `expectHitArea` (506-509), `createCookingRecipe` (543-547), and the new helpers after `paceChat` (592-625).

Archive order: steady-cooking-spread, safe-page-navigation, then this change.
