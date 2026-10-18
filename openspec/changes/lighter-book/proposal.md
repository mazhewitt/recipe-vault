## Why

The owner tried the release line (`cooking-ux-loop` at `e924ecc`) on their Mac on 2026-10-18 and reported three things:

- "the recipe book on the mac looks better when I zoom out one level - so everything is too big". The type was sized for reading from the counter on a tablet (18px method and ingredients), and the Mac used the same sizes at desk distance.
- "the lists of ingredients need to look more like lists I don't think it needs bullets - but the spacing is wrong somehow". `renderIngredients` still packs up to three short items into one `.ingredient-line`. Every layout now shows one item per row, so the packing's only visible effect is uneven gaps: rows inside a packed line sit 31px apart, rows across lines 34px (29px and 32px on the phone). The 1.7 line-height also spaces a wrapped line as far from its first line as the next ingredient is.
- "the background is too muddy, I think a light beige tone would be better - use your taste". The dark wood gradient under a noise overlay reads as brown-grey mud around the cream pages.

Later the same morning the owner passed on a design review of the page, written from a single screenshot. Its "food for thought" (the owner's words) that this change takes up:

- Section headers carry both an underline and a rule.
- Times read "3h 10" next to "(prep 40 · cook 150)".
- The duration chips don't look tappable, although tapping one starts a timer.
- Two scrollbars sit by the spine and under the right-edge ribbons.
- Lines are cut in half by the slip and by the page's foot.
- The blank ribbons look like tabs that do nothing.
- The meta line is data set in handwriting.
- The photo floats with nothing holding it.

The owner decided the rest of the review on 2026-10-18:
- the header stays on the right page (decision 2);
- ingredient groups by stage come next, after the release (`.scratch/ingredient-groups`);
- the meta line moves to the serif;
- the photo is a thumbnail held on with tape.

## What Changes

- **At the desk, the type is about 90%.** A viewport wider than 600px whose primary pointer is fine and can hover (a mouse or trackpad) gets the counter sizes at about 90%: method and ingredients 16px, durations 14px, title 24px, and the rest of the book's type in proportion. Boxes keep their sizes, so every 44px hit area stays 44px and the timer pill, read across the kitchen, keeps its type. Tablets and phones are unchanged.
- **Ingredient rows are a list.** One ingredient per row with equal row pitch: the row height comes from padding around a 1.45 line-height (38px rows, 36px on the phone, at any type size), and `.ingredient-line` loses its 3px margin. A wrapped ingredient's lines stay close together, and its rows sit further apart. There are still no bullets.
- **A light linen desk.** The wood gradient, noise and grain lines go. In their place is a light beige linen (`--color-desk*` tokens), a little lighter where the book lies, with a weave too fine to read as a pattern. The book label and user chip on the desk are drawn in ink, not cream, and the book casts a softer, warmer shadow. On the phone the book label stays cream on its leather strip.

- **One rule under a header.** "Ingredients" and "Method", capitalised, over a single rule, with no underline.
- **One time format.** "3h 10m", "(40m prep · 2h 30m cook)", "30m".
- **Duration chips say they start a timer**, with a small clock before the time.
- **Pages scroll like paper.**
  - No scrollbars.
  - Where text runs on, it fades out above the slip, the reply sticky and the page's foot, so no line is cut in half.
  - The spine's binding shadow stays put while a page scrolls; it used to scroll away.
- **No right-edge ribbons.**
- **The meta line is set in the serif with tabular figures.** It is data. Handwriting stays for titles, headings, step numbers, tabs and notes.
- **The photo is taped to the page**, clear of the next arrow.

## Capabilities

### Modified Capabilities
- `family-recipe-ui`: the desk background replaces the wood, the desk type size, ingredient row spacing, desk tokens, typography (headers, meta line), the page scrolls like paper, one time format, the taped photo, the ribbons removed.
- `book-spread-modes`: the right edge is plain in every mode.
- `cooking-guidance`: the duration button shows a clock.

## Impact

- `static/styles.css`: tokens, body background, `.section-label`, `.user-info`, ingredient rows, the phone block, a new "At the desk" block; section headers, meta line, duration chip, page scrollbars, the run-on fade, binding shadows, polaroid tape; the ribbon rules removed.
- `static/recipe-display.js`: `formatDuration`, the breakdown, the section header text. `static/chat.html`: the ribbon markup removed. `static/page-tabs.js`: the ribbon references removed.
- `design-system.md`: tokens, background, desk sizes, ingredient rows.
- e2e: size assertions on the `chromium` project (a desk) move to the desk sizes; new cases for the desk sizes, the row pitch and the background.
- It overlaps `cook-from-the-page` P4 (ingredient rows at least 38px), which is being built in parallel. Both define rows by padding with no margin; the two are reconciled when that change is merged.
