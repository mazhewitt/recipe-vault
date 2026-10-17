## Why

The owner's verdict on the Journal 2.0 book: "it feels clunky, and the UI elements jump about. It needs to be simple when cooking with."

On 2026-10-17 a browser audit drove every path at phone (390x844), tablet portrait (810x1080), tablet landscape (1080x810) and desktop (1280x800). It recorded every anchor's position on every animation frame plus the browser's layout-shift entries. Five independent explorers, including a first-time-cook persona at the counter, returned 98 findings. These are the ones that hit every cooking session. Several were found by three or four explorers independently.

**Things move that the cook did not touch**
- Opening a recipe moves the note slip 385-590px across the spine, and it blinks out twice on the way. In contents mode with a recipe open, and on every meal plan, the slip disappears altogether (`styles.css`, book-spread-modes R1/R2).
- The Contents and Notes spread tabs re-flow the recipe being read. The ingredients jump across the spine and the method drops 195-600px, because the right page switches between "method only" and "whole recipe".
- "Halve it" (`update_recipe`), a photo upload and a late difficulty all re-render through the loading skeleton (`recipe-display.js:731`). That throws the method back to the top: step 5 moves 190-300px. On a phone the whole book also narrows about 75px and re-centres.
- Starting a timer grows the highlighted step from 24 to 47px and pushes every later step down 23-27px. Expiry pushes them back.
- Sending a note grows the slip 28px for "Thinking…", and on a phone squeezes the book 26px.

**The assistant's answer has no home**
- In cook mode the reply and status lines are printed over the recipe title, with no background. They are clipped, and they block the share and photo buttons: 5733px² of overlap with the title at tablet. The audit's only **blocker**.
- On the phone the reply lands below the recipe, off-screen, with no cue.
- The cook is shown plumbing: "Using tool: start_timer", "Timer set: Mock timer, 0.1 min".
- Every send drops focus and locks the textarea, so a follow-up question needs another tap.

**The timer is not a kitchen timer**
- The pill sits on the "›" next arrow: 37-46% of the arrow is covered, and on landscape and desktop a tap on the arrow's centre hits the pill. Its ✕ overlaps the arrow, so reaching for "next" can cancel the timer.
- When it ends: no sound (the cooking-guidance spec requires a completion alert), and "Done!" vanishes after 3 seconds.

**It is not readable or tappable from the counter**
- Ingredients and steps are 14px and durations 12px, while 30-70% of each page is empty paper.
- Most controls are under 44px: the spread and edge tabs are 26px wide, the arrows 29-36px, share, photo and timer ✕ 28px.
- The title is squeezed to one word per line beside the share and photo icons and the polaroid.
- Nothing keeps the screen awake, and there is no way to keep your place (tick an ingredient, mark the step you are on).
- In cook mode the right-edge Ingredients / Method tabs do nothing, yet look like controls.

## What Changes

The guiding rule, already stated by book-spread-modes R1 after manual testing and now applied everywhere: **nothing on the page moves unless the cook asked for that exact thing.**

- **One home for the note slip:** the foot of the left page, in every state above 600px. That covers the contents page, all three spread modes, a meal plan and a failed load. It is never hidden. On the phone it stays the bar beneath the book.
- **The right page is fixed while a recipe is open:** title, meta and method, the same in Cook, Notes and Contents. Only the left page changes with the mode (ingredients, conversation, contents).
- **The latest reply is a sticky note on the slip.** It sits directly above the input, in the note-paper style, and can be dismissed. It is an overlay, so it never pushes or covers the right page. In Notes mode the full thread is on the left page as now. On the phone the same sticky sits just above the input bar.
- **Refreshes happen in place.** Re-rendering the recipe already on the page (update, photo, difficulty) skips the skeleton and keeps both pages' scroll positions. The phone book has a fixed width.
- **The "Thinking…" line and status text appear inside the reply sticky's slot**, so the slip never changes height. Status text is cook language ("Setting a timer…", "Opening the recipe…"), never tool names or raw values. Focus stays in the textarea across a turn. The textarea grows to at most three lines.
- **The timer becomes a kitchen timer.**
  - The pill moves to the top centre of the book, clipped over the spine, where it cannot meet the page arrows or the user chip.
  - Its ✕ is a 44px target.
  - On completion it plays a chime (Web Audio, no asset), vibrates where supported, and shows "Done" until tapped.
  - The step highlight is drawn without changing the step's size.
- **Readable from the counter.**
  - Cook-mode ingredients and steps are 18px on tablet and desktop and 17px on the phone, durations 15px.
  - Every control the cook taps has a hit area of at least 44x44px; the visual size can stay smaller.
  - Share and photo move off the title row into the meta line, so the title gets the full width beside the polaroid.
- **Keeping your place.**
  - A screen wake lock is held while a recipe is open.
  - Tapping an ingredient ticks it off (struck through, nothing moves).
  - Tapping a step marks it as the step you are on (a pencil mark in the margin, nothing moves).
  - Both are remembered per recipe for the browser session.
- **The right-edge strip is a bookmark ribbon in cook mode.** It stays for the look of the book (book-spread-modes R3), but it is not presented as tabs when it cannot do anything.

## Non-goals

- Navigation accidents and speed (phone edge strips, swipe thresholds, slow page turns, reload/Back): see `safe-page-navigation`.
- The share flow, the public share page, the contents A-Z strip and the meal-plan dead end are filed as `.scratch/` issues.
- Persisting the notes thread across reloads (book-spread-modes non-goal, still).
- Any change to the wood-and-leather look (`v2-ui-direction-journal`).

## Capabilities

### Modified Capabilities
- `book-spread-modes`: the slip's single position is extended to every state; the right page is fixed while a recipe is open; the cook-mode reply moves from the page corner to the slip; the right-edge strip is a ribbon in cook mode.
- `family-recipe-ui`: note input position; timer pill position, ✕ size and completion; title row layout; touch-target and cook-mode text sizes.
- `web-chat`: tool status lines become cook-language status in the reply slot; reply placement; focus kept across a turn.
- `cooking-guidance`: timer completion is persistent and audible; the step highlight does not change layout; wake lock; ingredient ticks and the current step.

## Impact

Frontend only: `static/styles.css`, `chat.html`, `margin-notes.js`, `chat.js`, `spread-modes.js`, `recipe-display.js`, `timer.js`, plus a small new `static/place-keeping.js`. No API, schema or server change. Existing e2e specs that assert the old positions (`spread-modes.spec.ts`, `margin-notes.spec.ts`, `timer.spec.ts`, `ui-improvements.spec.ts`) are updated alongside. A layout-stability e2e spec is added that fails if any anchor moves during the measured interactions.
