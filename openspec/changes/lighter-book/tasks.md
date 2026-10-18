## 1. Styles

- [x] 1.1 Desk tokens replace the wood tokens; body background, weave, `--shadow-deep` (L3)
- [x] 1.2 Book label and user chip in ink on the desk; the phone label cream on the leather; phone user bar (L3)
- [x] 1.3 Ingredient rows: `--ingredient-row`, 1.45 line-height, padding, no `.ingredient-line` margin (L2)
- [x] 1.4 "At the desk" type block (L1)

- [x] 1.5 Section headers, `formatDuration` and the breakdown, the duration chip's clock (L6)
- [x] 1.6 No page scrollbars, the run-on fade, binding shadows as background layers (L4)
- [x] 1.7 Ribbons removed: markup, CSS, `page-tabs.js` (L5)
- [x] 1.8 Meta line in the serif; polaroid tape (L6)

## 2. Tests

- [x] 2.1 Full e2e on the restyle; move pinned counter sizes on `chromium` to the desk sizes, keep them on `ipad`
- [x] 2.2 New cases: desk sizes on `chromium` and counter sizes on `ipad`; equal ingredient row pitch with no gap (cook mode, phone Ingredients tab); desk background colour and label colour; phone label cream
- [x] 2.3 Ribbon tests become "no strip on the right edge" (`spread-modes`, `page-tabs`, `responsive`, `contents-filters`); `helpers.tabSelector` is the phone's only; time format in `contents-page`
- [x] 2.4 New cases: no scrollbar; fade strip present and last line clear at the end; spine shadow; headers one rule; time format; duration clock; tape
- [x] 2.5 Red-checks (chromium, `lighter-book.spec.ts`), each reverted then restored byte-identical; exactly the named test goes red, the other six pass: `.ingredient-line` margin back → evenly spaced; row line-height 1.7 → evenly spaced; desk block off → at the desk; wood background → linen desk; fade `position: static` → scrolls like paper; `scrollbar-width: auto` → scrolls like paper; header underline → one rule; old `formatDuration` → one rule (times); no clock → shows a clock; no tape → taped
- [x] 2.6 Full e2e green: 736 passed, 173 skipped, 0 failed (before the 2.4 cases were added; they pass on all three projects: 19 passed, 2 phone skips)

## 3. Docs

- [x] 3.1 `design-system.md`: tokens, background, desk sizes, ingredient rows, pages that scroll like paper, tape, headers, meta line, duration clock, ribbons removed
- [x] 3.2 `openspec validate lighter-book --strict`
- [ ] 3.3 At the merge of `cook-from-the-page`: re-base the meta line and header requirements (design "Deferred")
- [x] 3.4 `.scratch/ingredient-groups` filed for after the release
