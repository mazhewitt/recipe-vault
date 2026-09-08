# e2e follow-ups left by the tablet-coverage fix: skip idiom, duplicate tests, duplicated `clearRecipes`

Status: needs-triage
Reported: 2026-09-08
Reporter: Claude (follow-ups handed over by the `ipad`/tablet-coverage and contents-flake work)
Severity: low — no test is failing; these are the traps that produced the two bugs just fixed

Three separate cleanups, kept in one directory because they all come out of the
same pass over `tests/e2e/`. Each can be actioned independently.

## 1. Guards that silently un-assert a test: `test.skip(isMobile, …)` and the bare `return`

Two idioms, same failure mode — a test that reports green on a project where it
asserted nothing.

### 1a. `test.skip(isMobile, …)` used as a proxy for "the viewport cannot be resized"

The `ipad` project had zero tablet coverage for a second reason beyond the
broken device descriptor (`.scratch/archive/e2e-ipad-project-not-tablet/`): all three
tablet-band tests were guarded with `test.skip(isMobile, 'viewport cannot be
resized under mobile emulation')` and then set their own 900x1000 viewport. The
`isMobile` fixture is true for **both** `mobile-chrome` and `ipad`, so those
tests ran only on `chromium` at a hand-set size and never at a project
viewport. Nothing signalled the loss — a skipped test reads as green.

All three occurrences are gone (they now guard on `isTablet(page)` instead), and
`tests/e2e/tests/viewport-contract.spec.ts` fails if any breakpoint band loses
its project. What is missing is something that stops the idiom coming back:
either an ESLint rule, or a short convention note under `docs/agents/` saying
that a breakpoint-conditional test guards on an explicit width band
(`isPhone` / `isTablet` from `helpers.ts`) and never on the `isMobile` fixture,
and never resizes the viewport itself.

Note `tests/e2e/tests/index.spec.ts` still calls `setViewportSize` in the
orientation-change test — that one is legitimate (it is testing the
resize/orientation-change handler itself, not a breakpoint's layout), and would
need an exemption from any such rule.

### 1b. The bare `return` as a viewport guard

Worse than 1a, because it is invisible in the reporter. `index.spec.ts` carried

```ts
test('desktop index renders two columns with correct headers', async ({ page }) => {
  if (page.viewportSize()!.width <= 600) return;   // ← reports ✓, asserts nothing
```

and the mirror-image `if (… > 600) return;` in the mobile test. A skipped test at
least prints `-`; an early `return` prints `✓` and is indistinguishable from a run
that actually asserted. Both are now `test.skip(isPhone(page), …)` /
`test.skip(!isPhone(page), …)`, and `grep -rn "viewportSize()!.width" tests/e2e/tests/*.ts`
shows no bare-`return` guards remain. Any convention note or lint rule written for
1a must cover this form too: **a breakpoint-conditional test never returns early —
it calls `test.skip()` on an explicit band helper.** An `if/else` where *both*
branches assert (as in the orientation-change test) is fine and is not this bug.

## 2. Two near-duplicate tablet-collapse tests

`tests/e2e/tests/responsive.spec.ts:126` and
`tests/e2e/tests/margin-notes.spec.ts:156` now both run on `ipad` only and
assert almost the same thing; `responsive.spec.ts`'s version is a strict
superset (it also checks `.edge-tabs` / `.page-tabs` visibility, the computed
`flex-direction` of `#page-right`, and that `.note-input` stays absolutely
positioned).

Deliberately not merged in the same pass that un-skipped them — the seeds are
not identical (`difficulty: 3` vs `servings: 4`) and `margin-notes.spec.ts` uses
its own local `send()` / `openRecipe()` helpers. Worth deduping now that both
are green.

## 3. `clearRecipes` exists as three byte-identical copies

`tests/e2e/tests/contents-page.spec.ts`, `contents-filters.spec.ts` and
`index.spec.ts` each carry the same hardened, self-verifying `clearRecipes`,
because `helpers.ts` was owned by a different agent at the time. Each copy
carries a `TODO`. Fold it into `helpers.ts` as
`export async function clearRecipes(page: Page)` and delete the three locals.
The `seeded(page, suffix, within)` locator helper in `contents-filters.spec.ts`
is the same story — `contents-page.spec.ts` and `index.spec.ts` open-code it as
`items.filter({ hasText: suffix })`.
