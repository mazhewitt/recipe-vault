# Phone paging: the "next recipe" link moves between taps, paging resets the tab, and a header tap during a page turn is lost

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: low. Re-check both items after safe-page-navigation lands; both may shrink.

## Description

Two findings from the audit's "find" explorer.

### 1. The "next recipe ›" link moves, and paging resets the tab (`phone-footer-next-moves`)

The footer links sit at the end of the content, so after a tap the next recipe's "next recipe ›" is somewhere else. Paging through recipes means hunting for the link each time. Each new recipe also opens on Ingredients, even when the cook was reading Method.

- Evidence: `.footer-next` moves from y=719 to y=573 (-146px), and the tab after "next" is `ingredients` where it was `method`.
- Cause:
  - `static/recipe-display.js:695-699` renders `.phone-footer` at the end of `#page-right-content` (`static/styles.css:1236-1246`, `:2252-2254`);
  - `recipe-display.js:781-784` forces `setActiveTab('ingredients')` on every new recipe.

### 2. A header tap just after a page turn is lost on the phone (`header-tap-ignored-mid-turn-phone`)

Tapping "Recipe Book" within about 250ms of "next" leaves the phone on the new recipe. The same sequence on tablet and desktop ends on the contents.

- Evidence: "next" then the header after 30, 120 and 250ms all left the phone on the recipe.
- Cause:
  - the phone uses `document.startViewTransition` (`static/page-transitions.js:198-213`), and while it runs, hit-testing goes to the view-transition pseudo-tree, so the tap never reaches `#recipe-book-header`;
  - when it does get through, `showIndex` (`static/navigation.js:123`) is not serialised with the render already in flight.

Related: safe-page-navigation N1 adds fixed gutter chevrons, which are a page-turn control that does not move. N8 routes the header return through `animatePageTurn`.

## What a fix needs

- Item 1: pin the footer to the bottom of the page frame (`position: sticky; bottom: 0` inside `#page-right`), or accept N1's chevrons as the fixed control.
- Item 1: decide whether next and previous keep the cook's tab. recipe-book-index "Click recipe in index" resets to Ingredients on open, and paging inherits that.
- Item 2: queue a header request made during a transition and run it when `transition.finished` resolves, or call `skipTransition()` and then `showIndex`.
- Item 2: recipe-page-transitions "Navigation is blocked during animation" covers the arrows and tabs only. It should say whether a header tap is queued or dropped.
