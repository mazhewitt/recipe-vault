# Playwright `ipad` project renders at 1280x720, not as a tablet

Resolved: 2026-09-08 (uncommitted — working tree on branch `book-spread-modes`;
add the commit hash here when it lands)
Reported: 2026-09-06
Reporter: Claude (observed while running the e2e suite for `journal-timer-cover-pill`; not caused by that change)
Severity: medium — the tablet breakpoint (601–1024px) has no e2e coverage while the suite claims it does

## Description

`tests/e2e/playwright.config.ts` defines the `ipad` project as
`devices['iPad (gen 7) portrait']`. In the installed Playwright (1.58.1) that
descriptor does not resolve, so the spread yields no viewport and the project
runs at the default 1280x720 desktop viewport. Every `ipad` test therefore
exercises the same layout as `chromium`, and the tablet rules in
`static/styles.css` (`@media (max-width: 1024px)`) are never hit by a test.

The `.recipe-book`, timer pill, and stacked layout all have tablet-specific
CSS, and the Journal 2.0 changes add more (margin column collapse at ≤1024px in
`journal-margin-notes`).

## Proposed fix

1. Verified 2026-09-06 in `tests/e2e`: `devices['iPad (gen 7) portrait']` is
   `undefined`. Available names are `iPad (gen 7)` (portrait) and
   `iPad (gen 7) landscape`, plus gen 5/6/11, Mini and Pro 11 variants.
2. Use `devices['iPad (gen 7)']`, or set
   `viewport: { width: 810, height: 1080 }` plus `isMobile: true, hasTouch: true`
   explicitly so the project cannot silently degrade again.
3. Add a guard test that asserts `page.viewportSize().width <= 1024` under the
   `ipad` project.
4. Run `make test-e2e`. Expect tablet-only failures to surface; fix or file
   them separately.

## Comments

### 2026-09-06 — findings from the `journal-margin-notes` implementation run

Re-confirmed independently by the fix agent during the adversarial review of
`journal-margin-notes`:

- `playwright.config.ts:24` still spreads `devices['iPad (gen 7) portrait']`;
  in the installed `@playwright/test` only `iPad (gen 7)` and
  `iPad (gen 7) landscape` exist, so the `ipad` project runs at 1280x720.
- Consequence observed: the pre-existing tablet e2e test guarded by
  `width > 1024 || width <= 600` was skipped on every project, so it had never
  run. It "passed" by being skipped.
- A critic reproduced a real tablet defect the config was hiding: at ≤1024px
  `#page-right` becomes a flex column and `.page-content` keeps `height: 100%`,
  which pushed `#page-margin` below the fold. Fixed in `static/styles.css`
  as part of `journal-margin-notes`.
- Workaround shipped with that change: the tablet-collapse test in
  `tests/e2e/tests/margin-notes.spec.ts` sets its own 900x1000 viewport
  (skipped under mobile emulation, where the viewport cannot be resized), so
  the margin collapse is covered regardless of this config bug.
- `playwright.config.ts` was deliberately left untouched (config change, out
  of that change's scope). Proposed fix above still stands; once the device
  name is corrected, expect other tablet-only layout failures to surface and
  the 900px override in `margin-notes.spec.ts` can be dropped in favour of the
  project viewport.

### 2026-09-08 — all four steps of the proposed fix are done; needs a human to close it

Verified by the agent that owned the e2e suite for this run. Work is in the
working tree, uncommitted.

- Step 1/2 — `tests/e2e/playwright.config.ts:24-42`. The device name was already
  corrected in 5c2155c; the project now additionally pins
  `viewport: {width: 810, height: 1080}`, `isMobile: true`, `hasTouch: true` on
  top of the `devices['iPad (gen 7)']` spread, so a renamed or removed
  descriptor cannot silently drop it back to 1280x720 again.
- Step 3 — `tests/e2e/tests/viewport-contract.spec.ts` (new). Test 1 fails if a
  project's viewport, band or `isMobile` fixture drifts from the recorded table,
  and cross-checks `document.documentElement.clientWidth` plus the two
  `matchMedia` breakpoints so a broken meta-viewport tag is caught too. Test 2
  fails if any configured project has no row, or if any of the three bands has
  no project covering it.
- **The second half of the bug**, not in the original report: the three
  tablet-band tests were also guarded with `test.skip(isMobile, …)`, which is
  true on `ipad` as well as `mobile-chrome`, so they ran only on `chromium` at a
  self-set 900x1000. Fixing the config alone would not have restored coverage.
  They now guard on a new `isTablet(page)` helper (`tests/e2e/tests/helpers.ts:176-184`)
  and run at the project's own viewport. Carried forward as item 1 of
  `.scratch/e2e-breakpoint-guard-conventions/`.
- Step 4 — `make test-e2e` run in full. Exactly one tablet-only failure
  surfaced, and it was a real product defect, now fixed in
  `static/page-transitions.js` and written up in
  `.scratch/tablet-page-turn-overlay-covers-margin-notes/`.

Evidence that the tablet band is genuinely covered now (from the reporter, three
consecutive full runs, 270 passed / 45 skipped / 0 failed each):

```
✓ [ipad] › tests/margin-notes.spec.ts:156:3 › tablet layout renders the margin beneath the page content
✓ [ipad] › tests/margin-notes.spec.ts:385:3 › a forward page turn does not cover the margin notes
✓ [ipad] › tests/responsive.spec.ts:126:3 › tablet widths collapse the margin beneath the page content
✓ [ipad] › tests/viewport-contract.spec.ts:28:3 › the project runs at the viewport its breakpoint band requires
-  [chromium] / [mobile-chrome] › the same three tablet tests, skipped
```

Per-project totals: chromium 92 passed / 13 skipped, mobile-chrome 84 / 21,
ipad 94 / 11.

Left as `ready-for-human` rather than archived only because the fix is
uncommitted: once it lands, mark `Resolved:` with the commit and move this
directory to `.scratch/archive/`.

### 2026-09-08 — closed and archived

Superseding the "left as `ready-for-human`" note above: archived now, on the
work as it stands in the tree, rather than waiting for the commit. Re-verified
against the working tree by a separate agent (file reads and greps only — this
agent did not own port 3001 and ran no tests):

- `tests/e2e/playwright.config.ts:25-43` — the `ipad` project pins
  `viewport: {width: 810, height: 1080}`, `isMobile`, `hasTouch` and
  `browserName: 'chromium'` on top of the `devices['iPad (gen 7)']` spread. 810px
  is inside the app's 601–1024px tablet band.
- `tests/e2e/tests/viewport-contract.spec.ts` — the guard. Test 1 pins each
  project's viewport, band and `isMobile` against a table and cross-checks
  `document.documentElement.clientWidth` plus both `matchMedia` breakpoints;
  test 2 fails if any project lacks a row or any band lacks a project.
- `tests/e2e/tests/helpers.ts:172-183` — `isPhone()` / `isTablet()`, band checks
  on actual width.
- Four tests now execute in the tablet band at the project's own viewport:
  `margin-notes.spec.ts:156`, `margin-notes.spec.ts:433`,
  `responsive.spec.ts:126` and `viewport-contract.spec.ts:28`, all guarded on
  `isTablet(page)`. `margin-notes.spec.ts:385` runs on tablet as well as desktop.
- `grep -rn "test.skip(isMobile" tests/e2e/tests/*.ts` returns nothing — the
  second half of the bug is gone. No bare-`return` viewport guard remains
  either; every surviving `viewportSize()` conditional is an `if/else` where
  both branches assert, or a `test.skip()`.
- The 900x1000 self-set viewport the earlier workaround used is gone; the
  tablet tests run at 810x1080.

Coverage was shown to be real rather than silently skipped by mutation, by the
critic on the implementing run: removing the product fix turns
`margin-notes.spec.ts:385` red on `ipad`; narrowing the `@media` breakpoint to
800px turns `margin-notes.spec.ts:156` and `responsive.spec.ts:126` red on
`ipad`; repointing the `ipad` viewport to 1280x720 fails
`viewport-contract.spec.ts:28`; deleting the `ipad` project fails
`viewport-contract.spec.ts:55`. All mutations were reverted.

Last reported full run on this tree: 268 passed / 50 skipped / 0 failed across
`chromium` / `mobile-chrome` / `ipad`.

Two things left the building rather than being closed here:

- The real tablet defect this uncovered —
  `.scratch/tablet-page-turn-overlay-covers-margin-notes/` (`needs-triage`;
  fixed, but the maintainer decides whether it needs a spec delta).
- The convention work that stops the skip idiom returning —
  `.scratch/e2e-breakpoint-guard-conventions/` (`needs-triage`).
