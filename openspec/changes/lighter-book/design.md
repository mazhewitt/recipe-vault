## Context

Three items of owner feedback from the 2026-10-18 UI trial on a Mac (see proposal). `steady-cooking-spread` fixed the counter sizes (18px method and ingredients above 600px, 17px on the phone, 15px durations) for a tablet propped on the counter. `cook-from-the-page` (in progress) makes ingredient rows at least 38px tall.

## Decisions

### L1. A desk type scale, not CSS `zoom`

The literal reading of "zoom out one level" is `zoom: 0.9` on the page. Measured in Chrome 145, that breaks the book:
- `getBoundingClientRect()` returns zoomed values while `offset*`, `scrollTop` and inline style lengths stay unzoomed;
- `margin-notes.js` (sticky placement), `page-tabs.js` (scroll to section) and `page-transitions.js` (height lock and turn overlay) mix the two, so each would be about 10% off;
- viewport units are zoomed too, which left an 80px empty band under the book.

Safari's zoom semantics differ again. Instead, a media block `(min-width: 601px) and (hover: hover) and (pointer: fine)` sets smaller font sizes, so the JS geometry stays in one coordinate space.

The desk is identified by its pointer, not its width. A propped iPad in landscape (1080px wide, coarse pointer) keeps the counter sizes. A Mac window of any width gets the desk sizes.

Sizes (counter → desk):
- method 18 → 16;
- cook-mode ingredients 18 → 15 (16 at first; the owner asked for "a point smaller", 2026-10-18);
- durations 15 → 14;
- title 27 → 24;
- section headers 19 → 17;
- meta line 15 → 14;
- book label 22 → 20;
- notes, sticky and note box 15/16 → 14;
- Notes-mode thread 16 → 15;
- contents title 30 → 27;
- letter headers 22 → 20;
- entries 15 → 14;
- tabs, page numbers, A–Z and email 14 → 13;
- logout 13 → 12;
- recipe note 13 → 12.

Boxes, hit areas and the timer pill's type are unchanged. The 44px rule is about fingers, and the timer is read across the room.

The one box that changes is the ingredient row. On the Mac the owner found the list "a little" loose at 38px. A row that tall is for a fingertip, and a pointer lands where it is aimed, so at the desk `--ingredient-row` is 34px (set on the cook-mode `.ingredients-list`). The tablet keeps 38px and the phone 36px. lighter-book carries a MODIFIED copy of cook-from-the-page's "Ingredient rows are tall enough to tick" for this.

### L2. Rows by padding around a tight line-height

`padding: calc((var(--ingredient-row) - 1.45em) / 2) 0` with `line-height: 1.45`.
- `--ingredient-row` is 38px (34px at the desk, 36px on the phone), so a one-line row has the same height at any type size.
- A wrapped row grows by one 1.45 line.
- `.ingredient-line` has no margin, so rows touch: the whole row is the tap target and the pitch is even.

This meets `cook-from-the-page`'s "Ingredient rows are tall enough to tick" (38px above 600px, 36px on the phone, from padding, no gap), and the merge of that change keeps one of the two rules.

The packing in `renderIngredients` stays for now. It no longer shows (every layout is one per row), and removing it is a JS edit in the region `cook-from-the-page` is changing.

The method keeps its 1.65 line-height: a step is prose, read as a paragraph. The old "at least 1.6 times" clause now covers the method only. Ingredient rows are covered by the row pitch instead.

### L3. A light linen desk

Tokens:
- `--color-desk` `#ece4d4`;
- `--color-desk-light` `#f5f0e6`, the radial centre where the book lies;
- `--color-desk-shade` `#ddd2bd`, the edges and the phone's user bar.

The weave is two 1px repeating gradients at 3–3.5% alpha, drawn by `body::before` as before.

On the desk:
- the book label is `--color-accent-brown` with a 1px white emboss (6.7:1 on `--color-desk`);
- the user chip is a translucent cream card with ink text.

`--shadow-deep` becomes a warm two-layer shadow, because a 50% black shadow on beige looks like a hole. The phone's label sits on the leather strip and keeps `--color-label-cream`.

### L4. A page scrolls like paper (no scrollbar, a fade where text runs on)

The review's choice was to paginate properly, or to drop the page numbers and arrows and let the spread scroll as one page. Both lose something:
- The arrows turn to the previous or next recipe, and the page numbers are the contents' references, so the book stays a book.
- A page holds a whole recipe section, so it still has to scroll on a tablet.

So the scrolling is made quiet instead:
- **No scrollbar.** `scrollbar-width: none` plus `::-webkit-scrollbar { display: none }`. On a Mac with a trackpad and on an iPad the bars were overlay bars or 6px slivers, but on a Mac they sat against the spine.
- **A fade where text runs on.** It is `.page-content::after`, a sticky strip at the end of the content, so it takes no layout:
  - `margin-bottom` equals minus its height, so nothing moves;
  - `bottom: calc(-1 * var(--page-foot))` lets it reach the page's edge, because a sticky box is held inside the scroller's padding;
  - its top 28px fade from transparent to `#f0ebd8`, the paper colour at the foot;
  - below that it is solid paper, so nothing shows between the slip and the page's edge.
- **`--page-foot` is the page's bottom padding**: the slip plus the sticky clearance on the left page, 20px on the right.
- **At the end of a page** the strip sits below the last line. The foot padding is at least as deep as the strip, so the last line is never faded.
- **A mask would be simpler but cannot be used**: it fades the page's paper background as well.
- **The binding shadows move into the page's background layers.** Pseudo-elements 100% of the page tall scrolled away with the content and left a light patch by the spine; a background layer is fixed to the page's box.

### L5. The ribbons go

Steady-cooking-spread made the right-edge tabs inert ribbons ("an empty edge reads as a missing page"). In use, and in two reviews, they read as broken tabs. With both sections on the spread at once there is nothing for them to do. The markup, CSS and the `:not(.edge-tab)` filter in `page-tabs.js` are removed.

OpenSpec keeps a MODIFIED requirement's scenario headings, so book-spread-modes' "Right-edge tabs stay on the edge in cook mode" keeps its heading and now says the edge is plain.

### L6. Headers, times, the duration chip, the meta line, the tape

- **Headers.** `text-decoration` is dropped and the text is "Ingredients" / "Method". The rule is the header's existing `border-bottom`.
- **Times.** `formatDuration` gives "45m", "2h", "2h 30m", and the breakdown uses it ("40m prep · 2h 30m cook"). The duration chips keep "8 min": they are buttons, and their aria-labels say "minute".
- **The duration chip** gets a clock as a background image, `0.8em` square, with `padding-left` making room. It is a background, not a pseudo-element, because `::before` is the chip's 44px hit area.
- **The meta line** is Libre Baskerville 13px (12px at the desk) with `tabular-nums`; the breakdown is 12px. Tags stay Kalam chips: they read as labels.
- **Tape.** `.recipe-polaroid::before` is a translucent strip 46% of the photo's width, so it scales to `cook-from-the-page`'s ~44px thumbnail. The photo gets a 6px top margin, clear of the next arrow.

### Done at the merge with cook-from-the-page (2026-10-18)

That change rewrites the meta line and the header: share and photo go into a "⋯" popover, and the polaroid becomes a thumbnail. It archives first, so this change re-bases on its text:
- "Recipe metadata displays with icons": the serif meta line ("serves − 8 + · 1h 5m") and the time format, the breakdown in the popover.
- "Recipe book displays as open two-page spread with leather cover": the "Method" header.
- "Every control the cook taps has a 44px hit area": its ribbon scenario now says the edge holds no strip.
- "Times on the meta line read one way" and "The photo is taped to the page" follow the times into the popover and the photo onto the title line.

The CSS keeps one rule for each overlap:
- **Rows:** `--ingredient-row` padding, plus a `min-height` because the padding rounds to 37.97px.
- **Meta line:** the serif, at 15px (14px at the desk). It now holds the stepper, a control read from the counter, not the old 13px line of data.
- **Thumbnail:** `position: relative` for the tape, and `flex: none` in the title row.
- **Popover times:** the times in the popover are serif too.
- **Tick:** on the left page the pencil ✓ moves into the margin, left of the rule. At cook-from-the-page's −16px it sat on the rule.

### The difficulty on the Ingredients line (owner, 2026-10-18)

The owner asked for the difficulty "on the right on the same line as ingredients". cook-from-the-page had put it in the "⋯" popover.
- **One node, moved.** The slot ends the Ingredients heading above 600px. On the phone there is no Ingredients heading (the owner's choice at the merge), so the slot goes back into the popover's row. `placeMetaLine` moves it, as it moves "clear ticks", so a resize across 600px needs no re-render.
- **Absolutely placed.** Like "clear ticks", the slot cannot grow the heading, and it keeps its fixed width (`--difficulty-slot`, 116px) whether or not the difficulty is known. "clear ticks" stands left of it.
- **One baseline.** Kalam's baseline is about 0.53em above the line's foot, so the label sits 6px up and "clear ticks" 11px (10px at the desk). Measured: all three within 0.2px at the desk and the tablet. Before, "clear ticks" sat 6px below "Ingredients".
- **Set as in the popover:** Kalam, 15px (14px at the desk), ink-medium.
- **Not shown in Contents or Notes mode above 600px.** The ingredients are not on the page there, and the slot goes with them; one tap on Cook shows it.

## Risks

- **Merge with `cook-from-the-page`.** Both edit `.ingredient-item` in the cook-mode and phone blocks. Keep one rule that meets both specs.
- **Pinned sizes.** e2e cases that pinned 18px or 15px on the `chromium` project now see the desk sizes. They move to the desk numbers, with the counter numbers kept on `ipad`.
