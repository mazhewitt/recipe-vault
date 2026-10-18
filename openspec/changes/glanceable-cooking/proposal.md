## Why

`steady-cooking-spread` made the spread still: in the 2026-10-18 fresh-eyes browser re-check (`tests/usability/runs/audit-post-steady/` in the audit worktree, three explorers: cook, ask, counter persona), opening a recipe, switching modes, sending a note, a reply arriving, halving, a timer starting, ticking and expiring, ticking an ingredient and marking a step all measured 0px movement and CLS 0.000. The same re-check found what the new pieces now cover, miss or fail to say. Every item below was reported by at least one explorer with probe numbers; most by two or three.

**Things that cover or move**
- The reply sticky hides the last 1–4 ingredients at tablet landscape and desktop, and the last two ingredients and the "previous / next recipe" footer links on the phone, until it is dismissed. Scrolling the page to its end does not help: the foot padding clears the slip, not the sticky (`sticky-hides-last-ingredients`, reported by all three explorers).
- On the phone the whole book jumps 36px up when a recipe opens and 36px down on return to the contents (CLS 0.128), because the user chip is hidden with `display: none` (`phone-book-jumps-on-open`, introduced by steady-cooking-spread D9).
- The left page's scroll leaks between modes: Contents → Cook brings the ingredient list back scrolled to the bottom (`left-scroll-leaks-across-modes`).
- On tablet portrait the note box is 148–164px of a 365px slip, so the placeholder is cut and a 35-character question wraps and grows the slip (`slip-textarea-narrow`).

**The timer is hard to read and easy to miss**
- The countdown is 18px handwriting on tablet and 14px on the phone, smaller than the step text, and reads "Simmer:5:00" with no space. A finished timer chimes once for about a second and differs from a running one only in ink colour; the pill also widens and re-centres at Done (`timer-small-at-distance`, `timer-done-easy-to-miss`).
- Starting a timer still means typing a sentence to the assistant. The shaded "8 min" chips look like timer buttons; tapping one toggles the step mark instead (`duration-chip-looks-tappable`, reported by two explorers; `.scratch/timer-pill-and-duration-chips`). The running pill does not say which step it is for and tapping it does nothing (`timer-pill-not-linked`).

**Notes and place-keeping**
- In Notes mode (and the phone Notes tab) new replies land below the slip and the thread never scrolls to them (`notes-thread-no-autoscroll`).
- The "you are here" step mark is a faint 2px pencil bracket. "clear ticks" is a 60×14 link that shows when nothing is ticked and also erases the step mark, with no undo (`step-mark-hard-to-see`, `clear-ticks-small-and-destructive`).
- A follow-up typed while a reply is coming is silently ignored; the send button looks the same as when it works (`inflight-send-silent`).
- The inert right-edge ribbons still look like tabs, and one is drawn as the selected tab (`ribbons-look-like-tabs`).

## What Changes

- **The sticky shares space instead of covering.** While a reply sticky is shown, the page under it gets foot padding equal to the sticky's height, so the last ingredient, the last contents row and the phone footer links can always be scrolled clear of it.
- **The phone book stays put.** Showing or hiding the user chip moves nothing.
- **Each mode keeps its own left-page scroll.**
- **The tablet note box has room**: the slip's page number goes on tablet widths.
- **A timer you can read across the kitchen and cannot miss.** Large tabular digits, label and time separated, fixed width in every state; Done is a filled leather-red pill that pulses gently and chimes every 15 seconds until tapped (for at most 5 minutes).
- **Tap a duration to start its timer.** Each step's duration becomes a 44px button that starts that step's timer locally, without the assistant. Replacing a running timer takes a second tap. A running pill shows its step and tapping it goes to that step.
- **The Notes thread follows the conversation**, unless the cook has scrolled up to read.
- **Place marks you can see and cannot lose by accident.** A bold step mark; "clear ticks" only when something is ticked, 44px, clears ticks only, with a short undo.
- **The send button shows when it cannot send.**
- **The ribbons are plain ribbons**: drawn alike, no labels.

## Non-goals

- A compact cook-mode header. The counter explorer measured 27–42% of the screen above step 1 (title, polaroid, a 3–4 row meta line, share, add-photo). Fixing that changes the look of the recipe page and reverses part of steady-cooking-spread D9, so it is left for the owner: `.scratch/cook-header-takes-a-third-of-the-screen` (ready-for-human).
- Taller ingredient rows for fingertip ticking (`ingredient-rows-tight-for-ticking`): 44px rows push the end of a 19-ingredient list off a tablet-portrait screen. Left for the owner in the same issue.
- Anything owned by `safe-page-navigation` (phone edge zones, swipe, per-tab scroll on the phone, URL state, rotation, the photo tap, the Recipe Book header).
- Meal-plan and notes-scoping leftovers (`meal-plan-stale-sticky`, `reply-filed-out-of-sight`): appended to the existing `.scratch/meal-plan-dead-end` and `.scratch/notes-thread-gaps`.

## Capabilities

### Modified Capabilities
- `web-chat`: the sticky's foot clearance; the Notes thread scrolls to the newest entry; the in-flight send state is visible; the phone user chip moves nothing.
- `cooking-guidance`: the timer pill's size, separation, fixed width and insistent Done state; duration chips start a local timer; the running pill shows and leads to its step; place marks and "clear ticks".
- `book-spread-modes`: the left page keeps a scroll position per mode.
- `family-recipe-ui`: the right-edge ribbons are drawn alike without labels; the tablet slip has no page number.

## Impact

Frontend only: `static/margin-notes.js`, `timer.js`, `place-keeping.js`, `spread-modes.js`, `recipe-display.js` (duration chip markup), `chat.js` (send state), `styles.css`, `chat.html`. New and amended e2e specs. Implemented on branch `glanceable-cooking` from `e35a58c` (after steady-cooking-spread), in parallel with `safe-page-navigation`, then merged into `cooking-ux-loop`. Archive order: steady-cooking-spread, safe-page-navigation, then this change.
