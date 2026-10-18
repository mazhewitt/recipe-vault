# Cook mode: the recipe header takes a third of the screen, and the ingredient rows are too tight to tick

Status: promoted 2026-10-18 to `openspec/changes/cook-from-the-page` (item 1: P3; item 2: P4). Archive this directory when that change is archived.
Reported: 2026-10-18
Reporter: Claude (fresh-eyes re-check of the post-steady build `e35a58c`, `tests/usability/runs/audit-post-steady/`)
Severity: major for the header (it decides how much of the method fits on screen while cooking), minor for the rows.

Both items were left out of `openspec/changes/glanceable-cooking` on purpose (see its proposal's Non-goals). Each changes the look of the recipe page, and the header item reverses part of steady-cooking-spread D9. They need the owner's call.

## Description

### 1. Header block before the method (`header-block-before-method`, counter explorer)

Above "method:" the right page stacks:
- the title, with the polaroid floated beside it (about 150px of height even for a one-line title);
- a meta line wrapped over 3-4 rows: "1h · serves 8 · difficulty ●●○○○ ·", then the tag chips, "(prep 15 · cook 45)" and share, then add-photo alone on its own row;
- the method heading.

On the phone the same header repeats above the Ingredients, Method and Notes tabs.

Evidence (`counter/remeasure.cjs header-block-before-method`, Lemon Drizzle Cake):

| viewport | step 1 top | header height | share of screen | meta line |
|---|---|---|---|---|
| phone 390×844 | 391px | 351px | 42% | 122px, about 4 rows, share and photo split over two rows |
| tablet 810×1080 | 390px | 317px | 29% | 124px, 4 rows, split |
| tablet landscape 1080×810 | | 267px | 33% | 3 rows |

- On the lasagne, 4-5 of 10 steps are visible without scrolling.
- At tablet portrait `.share-btn` is at y=233 and `.add-photo-btn` at y=283 (walk1).
- Shots: `counter/shots/tablet-02-lemon-open.png`, `tablet-12-halved.png`, `phone-03-ticked.png`, `phone-20-lasagne-method.png`.

Cause:
- `static/recipe-display.js` (≈651-696 at `e35a58c`) builds one `flex-wrap` `.recipe-meta-line` holding total, serves, difficulty, the tag chips, the prep/cook breakdown, then share and add-photo. D9 moved share and add-photo there from the title row.
- At 313-350px that line breaks into 3-4 rows (`static/styles.css` ≈990-1030).
- The polaroid float (about 98×78 plus rotation) sets the title row's height.

### 2. Ingredient rows are tight for a fingertip (`ingredient-rows-tight-for-ticking`, cook explorer)

Ticking works and moves nothing. But rows are 31px tall (29px on the phone) and touch each other, so a 44px fingertip centred on a row overlaps its neighbours. A wrong tick is struck through and faded, which makes the mistake easy to miss.

Evidence:
- `cook/remeasure.cjs ingredient-rows-tight-for-ticking`: at tablet, row h=31, a 44px vertical sweep hits the neighbour 2/5 times, row pitch 30-34px. On the phone, row h=29, 2/5, pitch 28-32px.
- `explore1.cjs`: the `.ingredient-item` 44px hit test misses 10/25 at every viewport.
- Cause: `static/styles.css` ≈850 (`.ingredient-line` packing): rows have no vertical padding, so the height comes from the line height alone.

## The trade-off

- Every pixel the header gives back is a step the cook can read without touching the screen with floury hands. But the header carries things the owner asked for: the photo, the difficulty, the tags, share and add-photo next to the title (D9).
- 44px rows make every tick land true. But a 19-ingredient list then runs to about 840px: off a tablet-portrait page, and further off on a phone. Tablet portrait has 28% of the page free below the list today, landscape about 1%, and desktop none.

## Options for the owner

1. **Compact cook header (largest win).** In cook mode, one line under the title: "serves N · total time". Tags, the prep/cook breakdown, difficulty, share and add-photo move behind one "⋯" control, or to the Notes/contents side. The polaroid shrinks to a thumbnail beside a one-line title. On the phone only the title (one line, ellipsised) sits above the tabs. Expected: step 1 at about 150-180px on every viewport. Needs a family-recipe-ui change to D9's "Share and photo end the meta line".
2. **Keep the header, stop the wrapping.** Keep D9's layout but stop the meta line breaking into 3-4 rows: move share and add-photo to the polaroid's corner, and the tags under the method or into the contents. Expected: meta line 1-2 rows, header around 200-230px. Smaller change, no D9 reversal for the photo.
3. **Rows: padding where there is room.** Give `.ingredient-item` a `min-height: 44px` with vertical padding, not margin, only where the list fits (tablet portrait and desktop, or when the list has 12 items or fewer). Elsewhere keep the tight rows and add a 300ms "tap again to undo" on a fresh tick. Or accept the tight rows and make a wrong tick easier to spot: fade less, keep the strike-through.

Either header option combines with either row option. Option 1 also frees the height that 44px rows would need.

## Decision (owner, 2026-10-18)

- **Header: option 1, the compact cook header** (design P3). Title, a ~44px tilted thumbnail and a "⋯" button on one line; "serves − N + · total time" on the next; difficulty, tags, the prep/cook split, share and add-photo in a "⋯" popover. The same in every spread mode. This replaces steady-cooking-spread D9's "Share and photo end the meta line". Targets: step 1 at most 180px below the right page's top at 810×1080, 1080×810 and 1280×800; on the phone the first ingredient at most 200px from the top.
- **Rows: option 3, padding where it fits, readable ticks** (P4), settled as `.ingredient-item` `min-height: 38px` (36px on the phone) from padding, and a ticked row kept at opacity ≥ 0.6 with a strike-through and a gutter check mark. Target: a 44px sweep hits the neighbour at most 1 time in 5, and the lasagne's 19 ingredients still fit at 810×1080.

Promoted to `openspec/changes/cook-from-the-page`.

## Comments
