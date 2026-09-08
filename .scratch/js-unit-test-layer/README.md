# No unit-test layer for the frontend JavaScript — everything is asserted through Playwright

Status: needs-triage
Reported: 2026-09-08
Reporter: Claude (fell out of implementing `openspec/changes/book-spread-modes`)
Severity: low — nothing is broken; this is about where the cheap tests should live

## What prompted it

Task 1.5 of the `book-spread-modes` change asks for "unit-level checks that the
attribute is the single source of truth and that an unknown mode is rejected".
There is nowhere to put them. `tests/e2e/package.json` carries exactly two dev
dependencies — `eslint` and `@playwright/test` — and `Makefile:3` defines
`test-unit` as `cargo test`, i.e. Rust only. So the checks were written as
`page.evaluate()` assertions inside `tests/e2e/tests/spread-modes.spec.ts`.

That means asserting `setSpreadMode('nonsense') === false` costs a
`cargo build --release` (`Makefile:13`), a booted server on port 3001, a real
Chromium, and a seeded recipe — to exercise one line,
`static/spread-modes.js:82`:

```js
if (!VALID_MODES.includes(mode)) return false;
```

The assertion is correct and worth keeping somewhere. It just has no business
needing a browser.

## Where a unit layer would actually pay

Only for logic that is pure, or pure-ish with an injectable seam. Concretely,
today:

| Function | File | Why it wants a unit test |
| --- | --- | --- |
| `escapeHtml` | `static/utils.js:18` | Security-critical, five substitutions, entirely pure. The XSS rule that "only AI replies are markdown, everything else is escaped" is currently defended only by `tests/e2e/tests/xss-protection.spec.ts`. |
| `renderMarkdown` | `static/utils.js:36` | Has a fallback branch that only runs when the `marked` global is absent — a case the browser suite never sees, because `chat.html:11` always loads marked from a CDN. That branch is effectively untested today. |
| `formatDuration` | `static/recipe-display.js:104` | `45 min` / `1h 15` / `2h` / zero / non-finite. Five table rows, no DOM. |
| `getMinutesField` | `static/recipe-display.js:97` | Two field-name spellings, coercion, the `> 0` guard. |
| `getTotalTimeMinutes` | `static/recipe-display.js:133` | prep+cook, fall back to summing step durations, `null` when there is nothing. Real branching, all of it pure. |
| `pageNumberFor` | `static/recipe-display.js:117` | One line, but the contents/filters work leans on page numbers coming from position in the *unfiltered* list. |
| `VALID_MODES` rejection, phone no-op, animation-lock rejection | `static/spread-modes.js:81` | The three reasons `setSpreadMode` returns `false`. Two of them (`matchMedia`, `isAnimating`) are seams, not DOM. |
| thread scoping | `static/margin-notes.js` — `normalizeRecipeId:35`, `displayedRecipeId:112`, `threadForDisplayedRecipe:118`, `visibleNotes:123` | The whole point of the notes-scoping work: which entries belong to the displayed recipe, the last-three rule, the index-view sticky rule. The store is a plain array; only `render()` needs the DOM. |
| `findIndexById` | `static/navigation.js:16` | Trivial, but it decides prev/next behaviour at the ends of the list. |

## Where it would NOT pay — leave these in Playwright

Say this explicitly in whatever convention note comes out of this, or the layer
will grow to cover things it tests badly:

- Anything about layout, breakpoints or CSS. The spread modes' *visible*
  behaviour (which page holds the ingredients, where `.note-input` sits) is a
  real-browser question and `tests/e2e/tests/viewport-contract.spec.ts` exists
  precisely because guessing at it goes wrong.
- The DOM relocation of the ingredients panel, `applyStepHighlight`, the
  fade-in / `aria-live` preservation logic in `margin-notes.js:154` — these are
  about how a real DOM behaves under mutation.
- Anything involving SSE, the server, or navigation.

The test that would have caught the last three bugs in `.scratch/` was an e2e
test, not a unit test. This is an addition at the cheap end, not a
rebalancing away from Playwright.

## Open decisions (why this is `needs-triage` and not `ready-for-agent`)

1. **Runner.** `node:test` + `node:assert` needs no new dependency and runs
   `.js` ES modules directly, which suits a project with no build step. Vitest
   gives a better watch mode and a `jsdom` environment, at the cost of a real
   dependency tree. Leaning `node:test` — but it is the maintainer's call, and
   it partly depends on (2).
2. **How much DOM.** With `node:test` and no jsdom, the layer is limited to
   genuinely pure functions, and `margin-notes.js` would need its
   store/filtering split from its rendering before its scoping logic could be
   tested. That split is desirable anyway, but it is a refactor of a file the
   `book-spread-modes` change just rewrote, so it should not be bundled in.
   With jsdom the layer covers more and drifts further from what the browser
   actually does.
3. **Where the tests live and what runs them.** `tests/e2e/` is the wrong
   directory for tests that are not end-to-end. Probably `tests/js/` with its
   own `package.json`, or a `tests/unit-js/` sibling. `make test-unit` currently
   means `cargo test`; either it grows to mean both, or a `test-js` target joins
   `test-all` (`Makefile:27`).
4. **CI.** `.github/workflows/test.yml` has a `lint` job that already sets up
   Node and runs `npm ci` in `tests/e2e` (lines 13-32). A JS unit job is nearly
   free if it hangs off that setup; it should not be attached to the
   `playwright` job, which is the slow one.
5. **Whether `import`ing the modules under test is actually clean.** Several
   `static/*.js` modules touch `document` or `window` at import time or in
   module-scope initialisation. Worth a five-minute spike — try
   `node --test` importing `utils.js` and `recipe-display.js` — before
   committing to a shape. If they import cleanly under plain Node, decision (1)
   settles itself.

## Suggested first slice, if it is promoted

Smallest thing that proves the shape: `static/utils.js` and the four pure
duration/page-number helpers in `recipe-display.js`, under `node:test`, wired
into `make test-all` and the CI `lint` job. No jsdom, no refactors, no
`margin-notes.js`. Then decide from evidence whether the layer earns the
`margin-notes.js` split and the `spread-modes.js` seams.

## Related

- `openspec/changes/book-spread-modes/tasks.md` task 1.5 — the specific check
  that has no home.
- `.scratch/e2e-breakpoint-guard-conventions/` — the other half of the testing
  story: the e2e suite's own conventions and the idioms that silently
  un-assert a test.
