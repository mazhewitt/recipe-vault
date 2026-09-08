# At tablet widths the page-turn overlay hid the margin notes (fix applied, needs review)

Status: needs-triage
Reported: 2026-09-08
Reporter: Claude (surfaced by the newly-real `ipad` project; see `.scratch/archive/e2e-ipad-project-not-tablet/`)
Severity: low-medium — cosmetic, but it is exactly the failure mode the page-turn
overlay was designed to avoid, and it was invisible while the `ipad` project ran
at 1280x720

## Symptom

At 601–1024px, turning a page hid the margin notes for the duration of the
animation and jolted them ~235px up and back down.

Failing test (first real execution of this assertion at a tablet viewport):
`tests/e2e/tests/margin-notes.spec.ts:385`,
`[ipad] › Margin notes › a forward page turn does not cover the margin notes`

```
Expected: <= 238        (marginTop + 1)
Received:    471.890625 (overlayBottom)
```

## Reproduction

`make test-e2e`, or narrowly:

```sh
cd tests/e2e && npx playwright test margin-notes --project=ipad \
  -g "a forward page turn does not cover the margin notes"
```

Manually: open the book at ~810px wide, open a recipe, send a note so a margin
note renders, then click the forward arrow and watch the note.

## Cause

Measured in the browser at the instant the overlay is inserted (810x1080):

| | before the turn | at overlay insert (before fix) | at overlay insert (after fix) |
|---|---|---|---|
| `#page-right-content` bottom | 471.89 | **237** | 471.89 |
| `#page-margin` top | 471.89 | **237** | 471.89 |
| overlay | — | 93 → 471.89, x 433 → 756 | same |

The margin's x-span (433–756) is identical to the overlay's, so once the margin
top moves above the overlay bottom the note is completely covered.

Chain:

1. `static/styles.css:1874-1878` (`@media (max-width: 1024px)`) makes
   `#page-right-content` `height: auto; flex: 0 0 auto` and puts `#page-margin`
   in normal flow beneath it. Note the whole block (`:1866-1884`) is scoped
   `body[data-view-mode="recipe"], body[data-view-mode="meal"]` — that scoping
   matters to the fix, see below. Above 1024px `#page-right` is a grid with a fixed
   150px margin column (`static/styles.css:1747-1753`), so nothing the content
   does can move the margin — which is why this never showed on `chromium`.
2. `static/page-transitions.js` locks `.pages-container`'s height before a turn
   (`recipe-page-transitions` spec, "Container dimensions are stable during
   transitions") but nothing pinned the *content box*.
3. `renderFn()` empties `#page-right-content` synchronously and refills it after
   an async fetch, so mid-turn the content collapses, the margin slides up, and
   the overlay — sized to the **outgoing** content (`page-transitions.js:210-226`)
   — covers it.

The same thing happens without the transient whenever a tall recipe is followed
by a short one: the margin's resting place is then permanently above the
overlay's bottom edge for the whole animation.

## Fix applied (e3b0e2c)

`static/page-transitions.js` — new `marginIsCollapsed()`, `lockContentHeight()`
and `unlockContentHeight()`. The turn now pins `#page-right-content`'s
`min-height` to its measured height alongside the existing
`.pages-container` height lock, and releases it at all three points that
release the container height (crossfade path, the `!sourcePage` early return,
and the main `Promise.all`).

The lock is gated twice, not once. Width alone was not enough: every collapse
rule in `static/styles.css:1866-1882` is scoped
`body[data-view-mode="recipe"], body[data-view-mode="meal"]`, so in `index`
(contents) mode `#page-right-content` keeps `.page-content { height: 100% }` and
pinning a min-height would hold the margin at the bottom of a full-height box
for the whole turn — the same bug in the opposite direction, on the
contents-to-recipe turn. `marginIsCollapsed()` therefore tests
`matchMedia('(max-width: 1024px)')` **and** `document.body.dataset.viewMode`
against `COLLAPSED_MARGIN_MODES = ['recipe', 'meal']`. Desktop and phone
behaviour is byte-for-byte unchanged.

Coverage, both directions:

- `margin-notes.spec.ts:385` — recipe-to-recipe forward turn; the overlay must
  not cover the margin. This is the assertion that first went red.
- `margin-notes.spec.ts:433` — contents-to-recipe turn; samples
  `#page-right-content.style.minHeight` on every animation frame for the full
  1.2s of the turn and asserts it was never pinned. Sampling rather than a
  single read, because lock and unlock both happen inside the turn.

Both were red-checked: reverting the product change fails the first; reverting
the view-mode half of the gate fails the second with `["869px"]`, the full page
height at 810x1080.

Verified on the tree as it stands: last full `make test-e2e` is 268 passed /
50 skipped / 0 failed. (Earlier in the run, before the view-mode gate and the
second test were added, three consecutive full runs were 270 / 45 / 0 — the
totals moved because two `index.spec.ts` tests stopped reporting a false `✓`
and started reporting an honest skip.)

## What still needs a decision

`openspec/specs/recipe-page-transitions/spec.md:55-68` states the height-lock
requirement in terms of `.pages-container` only. The fix extends that stability
guarantee to `#page-right-content` in the tablet band. Someone should decide
whether that warrants a spec delta (an OpenSpec change) or whether it reads as
already covered by the existing "no layout shift" requirement. Promotion out of
`.scratch/` is a human call, so it was not made here.
