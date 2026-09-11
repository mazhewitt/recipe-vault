# Five open decisions left by book-spread-modes

Status: needs-triage
Reported: 2026-09-09
Reporter: Claude (flagged during implementation and manual testing; none is a defect)

Nothing here is broken and no test is failing. These are five judgement calls
that were made in order to finish, each cheap to reverse, and each worth a
maintainer's yes or no. Kept in one file because they all come out of the same
change.

## 1. Cook mode renders ingredients one per line

`static/styles.css`, in the `min-width: 601px` spread-mode block:

```css
body[data-spread-mode="cook"] #page-left-content .ingredient-item { display: block; }
body[data-spread-mode="cook"] #page-left-content .ingredient-sep  { display: none; }
```

Added beyond the brief by the agent that wrote the CSS. Its reasoning: the
desktop default packs ingredients inline with `·` separators, which wraps badly
in a column half a spread wide, and it is the concrete form of the 768px-portrait
risk `design.md` raised. It borrows the rule pair the phone already uses.

Nothing in the repo asserts the packed form — `grep -rn "ingredient-item|ingredient-sep" tests/`
returns nothing — so deleting the two rules is a clean revert. **Decide by
looking at it** on a real recipe at your window width.

## 2. The right-edge strip is inert in cook mode

The Ingredients / Method strip stays on the edge in cook mode (design.md R3),
but both sections are already on the spread, so clicking either tab does
nothing except move the `active` class. A CSS guard keeps the method panel
visible for any `data-tab` value so a tap cannot blank the right page.

Options: leave it inert (it reads as furniture); make each tab scroll its own
page to the top; or hide the strip again and accept the empty edge. Inert was
chosen because it is the smallest thing that cannot break, not because it is
obviously right.

## 3. A deleted test rather than an adapted one

`tests/e2e/tests/page-tabs.spec.ts`'s "desktop: Notes swaps in the thread" was
deleted, not rewritten. The desktop Notes edge tab is gone by design (task 7.1)
and the behaviour it covered moved to `spread-modes.spec.ts`. A comment in the
file records why. Confirm the test should stay dead rather than be re-pointed at
the new affordance.

## 4. Should cook mode be sticky per session?

Straight from `design.md`'s own open questions. Cook is the default every time a
recipe opens; a reader who prefers Contents-on-the-left has to click the tab
each time. Proposed: no, leave it non-sticky, the tab is cheap. Revisit if
using it says otherwise — which is now possible, since it is built.

## 5. Meal plans in notes mode: which thread?

Also from `design.md`. A displayed meal plan currently files its notes on the
book-level thread (`recipeId: null`), the same bucket as the contents page.
The alternative is a bucket keyed by plan id. Proposed: leave it on the book
thread until meal plans are persisted (RV-107 in
`planned-ideas/meal-planning-epic.md`), at which point a plan has an id worth
keying on.

## Not open, recorded here so they are not re-raised

Tasks 5.2, 5.3 and 7.3 are struck through in the archived change, not pending:
the focus-selects-notes transition and its running-timer exception were removed
deliberately, and the cook-mode hiding of the right-edge strip was reversed.
See `design.md` R1-R4 in `openspec/changes/archive/2026-09-09-book-spread-modes/`.
