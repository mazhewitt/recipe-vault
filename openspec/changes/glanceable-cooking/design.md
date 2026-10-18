## Context

Evidence: the 2026-10-18 fresh-eyes re-check of the post-steady build (commit `e35a58c`), written by three explorers to `tests/usability/runs/audit-post-steady/{cook,ask,counter}/` in the worktree `/Users/mazhewitt/projects/recipe-vault-audit` (gitignored output; each folder has `findings.json`, `remeasure.cjs` and screenshots under `shots/`). Each `remeasure.cjs` re-runs its explorer's measurements and is the before/after tool for this change. Copy the three folders into this worktree's `tests/usability/runs/audit-post-steady/` before starting (the runs folder is gitignored).

This change builds on `steady-cooking-spread` (implemented, not archived; its decisions D1–D11 and spec deltas describe the current behaviour) and runs alongside `safe-page-navigation` on another branch. It must keep every steady-cooking-spread guarantee: nothing moves unless the cook acted on it (`tests/e2e/tests/layout-stability.spec.ts`), the slip's one home, 44px hit areas, the reply sticky never moves layout.

Decisions are the lead's (2026-10-18), made with the owner's standing instruction to use best judgement; no open questions are pending.

## Decisions

### G1. The sticky shares space instead of covering

While a reply sticky is shown, `placeSticky` (`margin-notes.js`) sets `--sticky-clearance` (the sticky's rendered height plus its gap above the slip, in px; `0px` when no sticky is shown) on the book. The scroll container whose foot the sticky lies over adds it to its bottom padding: `.page-left` above 600px, `#page-right` at 600px and narrower; on the contents page the same. Padding is added at the foot only, so nothing above it moves; the visible box of every anchor in `layout-stability.spec.ts` is unchanged by showing, growing, replacing or dismissing a sticky. With the page scrolled to its end, the last ingredient, the last contents row and the phone's footer links lie wholly above the sticky's top edge.

### G2. The phone book stays put when the user chip hides

steady-cooking-spread's rule stays: on the phone the email · Logout chip shows only on the contents page. Hiding it must not shift anything: at 600px and narrower the chip is taken out of flow (absolutely positioned in the strip above the book, where it is today on the contents page), so `.book-container`'s box is identical on the contents and on a recipe. If the out-of-flow chip would overlap a control on the contents page, keep its slot with `visibility: hidden` instead; either way, opening and closing a recipe moves the book 0px. A layout-stability case on the phone tracks `.book-container` through opening a recipe and returning to the contents.

### G3. The left page keeps a scroll position per mode

`setSpreadMode` saves `#page-left.scrollTop` under the outgoing mode (contents, cook, notes) before swapping the left page and restores the incoming mode's saved value after it. A newly opened recipe starts its cook (ingredients) scroll at 0; the contents keep their own position (the scroll-the-current-row-into-view behaviour of `renderIndex` applies only when the contents are drawn fresh, not on a mode round trip). Phone tabs are `safe-page-navigation` N3's, not this.

### G4. The tablet slip has room to write

At 601–1024px the slip's page number (`.note-page-number`) is not displayed (the contents and the footer already say where you are); its slot goes to the textarea. Above 1024px and on the phone it stays. The placeholder "Write a note to the cook…" is shown in full at 810×1080, and a 40-character note does not wrap.

### G5. A timer you can read across the kitchen

- The pill is at least 44px tall. The time is the largest thing in it: tabular digits (`font-variant-numeric: tabular-nums`), 26px above 600px and 22px on the phone, never smaller than the step text. The label is smaller (16px, 14px on the phone) and separated from the time by a margin, not a text node: it reads "Step 2 · 7:42", never "Step 2:7:42".
- The pill has one fixed width in every state on every viewport (running, the last minute, Done), so its centre and edges never move; a long label ends in an ellipsis. The steady-cooking-spread placement rules stay (centre over the spine, clear of `#page-next`, a 44px ✕).
- **Done:** the pill fills with the leather red (`--leather` family token) with cream text and reads "Done · <label>". It pulses gently (opacity or box-shadow only, never size or position) until tapped; no pulse under `prefers-reduced-motion: reduce`. The chime plays at zero and again every 15 seconds until the pill or its ✕ is tapped, and stops by itself 5 minutes after zero. The vibration repeats with the chime where supported.

### G6. Tap a duration to start its timer

- Each step's duration (`.step-duration`) becomes `<button type="button" class="step-duration">` with a 44px hit area (the steady-cooking-spread `::before` technique) and an aria-label "Start a <N> minute timer for step <n>". It keeps its look as a chip.
- Tapping it starts that step's timer locally, through the same `startTimer` path the assistant's `start_timer` uses (label "Step <n>", the step highlight, the chime, the wake lock), with no request to the server. It never toggles the step mark.
- **One timer at a time, never replaced by accident.** If a timer is already running, the first tap does not replace it: the pill shows "Tap again to replace" for 4 seconds (same fixed width) and the chip is marked `data-confirm`; a second tap on the same chip within those 4 seconds replaces the timer. A timer started by the assistant replaces the running one as today.
- A duration that is not a whole number of minutes, or that the recipe gives as a range ("10–12 min"), starts a timer for the first number.

### G7. The running pill leads to its step

The running pill shows the step its timer belongs to (the label above). Tapping the running pill (not the ✕) scrolls that step into view when the timer's recipe is open, without moving anything else; when another recipe is open, it opens the timer's recipe the way a contents row does, then scrolls to the step. Tapping the Done pill still dismisses it (D7).

### G8. The Notes thread follows the conversation

In Notes mode above 600px and on the phone Notes tab, when the cook sends a note, when the in-flight line appears and as each reply chunk arrives, the thread's scroll container scrolls so the newest entry sits just above the slip — if the cook was within 48px of the bottom before the update, or the update is the cook's own send. If the cook has scrolled up to read earlier notes, a reply leaves the scroll alone. Opening Notes shows the newest entry.

### G9. Place marks you can see and cannot lose by accident

- The "you are here" mark is a 4px leather-red bar in the step's left gutter plus a faint warm tint behind the step, with no change to the step's box (D8's rule).
- "Clear ticks" is shown only while at least one ingredient is ticked, has a 44px hit area, and clears the ticks only; the step mark is cleared by tapping the marked step, as today. After clearing, the same control reads "Undo" for 6 seconds (same width) and restores the cleared ticks if tapped.

### G10. The send button shows when it cannot send

While a turn is in flight, `.note-send[aria-disabled="true"]` is visibly dimmed and shows a not-allowed cursor; the follow-up stays in the textarea untouched. When the turn ends the button returns to normal; the follow-up is not sent automatically.

### G11. The ribbons are plain ribbons

The right-edge ribbons (steady-cooking-spread D11) are drawn alike — same colour, no `active` look — and carry no text labels. They stay `aria-hidden`, `pointer-events: none`, in the same place, so the book still looks as if it has its page edges.

## Risks

- **The bigger pill** might now reach `#page-next` or the header at some viewport. steady-cooking-spread's pill tests (`timer.spec.ts`, layout-stability timer case) must stay green; if the 26px digits cannot fit at tablet landscape without touching the arrow, reduce to 24px there and say so.
- **Repeated chimes in e2e.** Tests stub or count `AudioContext` notes (as `timer.spec.ts` already does); use the page clock (`page.clock`) to step through the 15-second repeats and the 5-minute stop instead of waiting.
- **Merge with safe-page-navigation.** Both branches edit `styles.css`, `chat.html`, `app.js`, `helpers.ts`. Keep edits to the regions named here; the lead merges and re-runs the full suite.

## Archive order

steady-cooking-spread, then safe-page-navigation, then this change. Requirements this change MODIFIES that were ADDED or MODIFIED by those two must reproduce the full requirement text as it will read after they are archived.
