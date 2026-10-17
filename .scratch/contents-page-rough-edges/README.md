# Contents page: the A-Z strip scrolls away, the return scroll overshoots, the letters are tiny, Notes moves the contents, and four results split across two pages

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: low-medium. These are on the finding path, not the cooking path, and each is small. Items 3-5 need a spec decision before any code.

## Description

Five rough edges on the contents page, mostly from the audit's "find" explorer.

### 1. The A-Z strip scrolls away (`alphabet-strip-scrolls-away`)

Tap "M" and the list jumps to M, but the A-Z row scrolls off the top with it. Trying a second letter means scrolling back to the top, which is over 700px on a phone even with 10 recipes.

- Evidence: after jumping to M on the phone, the strip's bottom is at -462 against a page top of 76. A later tap at the letter's old position hit nothing, or (tablet landscape) the "Recipe Book" header.
- Cause: the strip is rendered inside the scrolling content (`static/recipe-display.js:331-336`, `:380-385`), and `.index-alphabet-nav` (`static/styles.css:1579-1587`) is not sticky.

### 2. Returning to the contents scrolls the title away (`contents-return-scrolls-title-away`)

Back on the contents, the left page is scrolled to its very bottom, hiding "~ Contents ~" and the A-Z strip, even though the highlighted row was already visible at `scrollTop` 0. Tapping the header while already on the contents also jumps the scroll.

- Evidence:
  - return to the contents: 167/167 (desktop), 157/157 (tablet landscape), 271/839 (phone);
  - header tap on the contents: 100→271 (phone), 100→167 (desktop).
- Cause: `recipe-display.js:400-409` always sets `scrollTop = currentRow.offsetTop - clientHeight / 3`.
  - `offsetTop` is measured against `.recipe-book`, not the `.page` scroller, which is the pitfall `page-tabs.js:95-97` documents.
  - It runs even when the row is already in view.
- This is also why, in `mode-switch-reflows-recipe` (counter), the contents auto-scrolled past their own title when the Contents tab was tapped.

### 3. The A-Z letters are too small to tap (part of `touch-targets-under-44px`)

- Evidence: the letters are 20x19 (phone), 20x21 (tablet) and 22x22 (tablet landscape), with 1-2px gaps.
- Cause: `styles.css:1589-1602`, `:2023-2027` and `:2352-2360`.
- steady-cooking-spread D9 covers the filter and spread tabs and the page arrows, but not the letters.
- recipe-book-index "Alphabet controls remain compact … minimal extra padding" encourages the current size.

### 4. Notes on the contents page moves the whole contents across the spine (part of `notes-tab-on-contents`)

- Evidence: the contents title moves +379px (tablet) and +584px (desktop). Both "All" and "Notes" then show as active.
- Cause:
  - `static/app.js:573-584` and `:605-611` re-render the index single-column on the right page;
  - `static/spread-modes.js:133-149` marks Notes active while `app.js:478-484` keeps the filter active.
- book-spread-modes "Notes mode with no recipe open" requires the move.
- The input half of this finding is fixed by steady-cooking-spread D1, and the sticky half by D3.

### 5. A few results still split across both pages (`filter-splits-few-results-across-pages`)

- Evidence: under Sweets (4 recipes), two entries sit on each page, with "4 sweets · continued overleaf" and most of both pages empty.
- Cause: `recipe-display.js:339-390` always splits by count ÷ 2.
- recipe-book-index "Index splits across two pages … balanced" requires the even split.

Evidence for all five: the `find` remeasure (`tests/usability/remeasure/find.cjs`), plus screenshots in the audit session's `audit/find/shots/`.

## What a fix needs

- Item 1: `position: sticky; top: 0` with a paper background for `.index-alphabet-nav`. On the phone, the filter chips go with it.
- Item 2: scroll only when the row is outside the page's visible rect, measured with `getBoundingClientRect` deltas against the `.page` scroller (or `scrollIntoView({ block: 'nearest' })`). Do not re-scroll when the header is tapped on the contents.
- Item 3: decide on recipe-book-index's "compact" rule. Then make letters at least 44px tall on `pointer: coarse`, as two rows or a scrollable row.
- Item 4: decide whether Notes on the contents page opens the book thread in place (over the right page) instead of moving the contents. Treat the filters and Notes as one radio group.
- Item 5: decide whether "balanced" should become "fill the left page first".
- Items 1-2 need no spec change. Items 3-5 need recipe-book-index or book-spread-modes decisions first, probably as one OpenSpec change for the contents page.
