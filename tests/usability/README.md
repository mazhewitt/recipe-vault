# Browser usability audit harness

Drives the real Recipe Vault UI in headless Chromium (Playwright) against a mock-LLM server with a
seeded family recipe book, and measures what moves on screen. Two ways to use it:

- **Quick re-measure loop**: `run-all.sh`. Five scripts re-take the numbers behind every
  finding of the 2026-10-17 audit and diff them against the baseline. No agents, no tokens, about 3 minutes.
- **Full explorer audit**: the `usability-audit` Claude Code workflow. Five agents explore every
  UI path at four viewports and return structured findings. Use it to find new problems, not just re-check
  the known ones.

Nothing here is part of `make test` / `make test-e2e`. These are measurements, not pass/fail tests.

## Prerequisites

- Release binary: `cargo build --release` (`server.sh` tells you if `target/release/recipe-vault` is missing).
  Rebuild after backend changes. Frontend changes need no rebuild, because `/static` is served live from this checkout.
- Playwright from the e2e suite: `cd tests/e2e && npm ci && npx playwright install chromium`.
- Free ports 3011-3015. **Never use 3001**: it belongs to `make test-e2e`, and every script here refuses it.

## Files

| File | What it does |
|---|---|
| `server.sh <port> [mock_recipe_id]` | Starts the release binary with `MOCK_LLM=true` on `127.0.0.1:<port>`. Run state goes in `runs/<port>/` (`recipes.db`, `photos/`, `server.log`, `server.pid`). |
| `fresh.sh <port>` | Wipes `runs/<port>/`, starts the server, seeds the book, and restarts it with `MOCK_RECIPE_ID` set to the lasagne. Prints the recipe ids, which are also saved in `runs/<port>/ids.json`. |
| `seed.cjs <base-url>` | Creates 10 recipes: Granny's Beef Lasagne (19 ingredients, 10 steps), Lemon Drizzle Cake, Thai Green Curry, a long-titled Sunday Roast Chicken (these four have photos), Pancakes (no description), Mushroom Risotto, Brownies, Shakshuka, Banana Bread and Weeknight Bolognese. Oven steps use `Celsius`. |
| `probe.cjs` | The measuring library (see below). |
| `remeasure/<journey>.cjs [port] [ids]` | Re-measures one journey's findings and prints one line per finding id. |
| `run-all.sh <label> [journey ...]` | Runs the whole quick loop (see below). |
| `baseline-2026-10-17/<journey>.txt` | Output of the five remeasure scripts on the unfixed code (commit `9f28329`, branch `cooking-ux-loop`). |
| `runs/` | Gitignored. Server state, run outputs (`runs/<label>/`), audit outputs (`runs/audit-<label>/`) and screenshots (`runs/shots/`). |
| `../../.claude/workflows/usability-audit.js` | The full explorer audit workflow. |

The journeys and their default ports are `find` 3011, `cook` 3012, `ask` 3013, `manage` 3014 and `counter` 3015.

- `find`: contents, A-Z, filter tabs, prev/next, swipes, history.
- `cook`: following a recipe, timers, edge tabs, touch targets, text size.
- `ask`: note input, replies, notes mode, halve, meal plan, keyboard.
- `manage`: share, photos, long titles, late difficulty, resize, fonts.
- `counter`: a cook-at-the-counter persona walkthrough.

The mock LLM reacts to keywords in a note:

- "show" or "display" opens the lasagne.
- "list" replies with the recipe list.
- "timer" starts a 6-second timer on step 2.
- "halve" or "update" sets servings to 2 on the open recipe and refreshes it.
- "meal plan" shows a two-recipe plan.
- Anything else gets a canned reply.

## Quick loop: `run-all.sh`

```sh
tests/usability/run-all.sh after-fix-1            # all five journeys
tests/usability/run-all.sh after-fix-1 cook ask   # a subset
PORT_BASE=3031 tests/usability/run-all.sh x       # use 3031-3035 if 3011-3015 are busy
```

For each journey, `run-all.sh` starts its own fresh seeded server and runs the remeasure scripts in parallel. Each journey's output goes to `runs/<label>/<journey>.txt` and its stderr to `<journey>.err`. The script then stops every server it started and prints a diff against `baseline-2026-10-17` (set `BASELINE=<dir>` to compare with something else). Lines starting with `-` are the baseline and lines starting with `+` are this run. Server ports and share tokens are masked before diffing. A full run takes about 165 s.

To run one journey by hand:

```sh
tests/usability/fresh.sh 3012
node tests/usability/remeasure/cook.cjs 3012                                   # every check
node tests/usability/remeasure/cook.cjs 3012 timer-highlight-reflows-method   # just one check
lsof -tiTCP:3012 -sTCP:LISTEN | xargs kill
```

Selecting checks works differently per script. `cook` takes ids as separate arguments. `find` and `manage` take a comma-separated list. `ask` and `counter` always run every check.

Run `fresh.sh` again before each run. The ask, manage and counter scripts change the book: they halve the lasagne, replace its photo and create throwaway recipes.

### Reading a line

Each line is `<finding-id>: <measurements>`, usually broken down by viewport (`phone`, `tablet` 810x1080,
`tablet-landscape` 1080x810, `desktop` 1280x800). The id matches the `id` of the finding in the audit
output. The numbers are raw measurements, not verdicts, so decide what "fixed" means from the finding. For example:

- `note-input-crosses-spine-on-open: tablet dx=-385px flips=2`: opening a recipe moved the note input 385px left, and it hid and reappeared once. Fixed means `dx=0px flips=0`.
- `timer-highlight-reflows-method: tablet start: step2 dh=23 step3 dy=23`: starting a timer made step 2 23px taller and pushed step 3 down 23px. Fixed means 0 and 0.
- `phone-edge-nav-covers-content: ... tap qty -> "Granny's Beef Lasagne" became "Chocolate Brownies"`: tapping an ingredient turned the page. Fixed means the title stays the same.
- `small-touch-targets: tablet: #page-prev=36x36 ...`: lists only the targets under 44x44 CSS px. Fixed means the list is empty.
- `X: ERROR <message>`: the check itself broke, usually because a selector it relies on was renamed or removed. Read the check before believing either the old number or the new one.

For the narrative, cause (file:line) and fix direction of each id, look in the `findings.json` files of a full audit run.

### Known noise

Two runs of the same code differ only in these places. Treat a change here as noise unless it is large:

- `find`/`next-waits-for-list-and-ignores-prefetch`: millisecond timings, ±30 ms.
- `ask`/`halve-scroll-reset`: skeleton frame count, ±1.
- `manage`/`photo-upload-resets-scroll`: the phone "content height maxDev" depends on whether a frame lands on the skeleton. It was 200 in one run and 1126 in another. The `scrollTop` part of the line is stable.
- `manage`/`resize-refetch-storm`: request count. It was 2, 4 and 5 in three runs.
- `manage`/`cdn-script-blocks-paint`: FCP in ms, ±20 ms.
- `counter`/`timer-done-vanishes`: ms the "Done!" pill stays visible, ±5 ms.

No check was flaky in the sense of failing or erroring.

The baseline was captured with all five scripts running in parallel through `run-all.sh`, so compare against runs made the same way. One difference from the original explorers' runs is that the seed now gives the Sunday Roast a photo. The original seed used the 8MB `large-photo.jpg`, which is over the 5MB upload limit and was rejected. This only changes the `roast` numbers in `manage`/`long-title-wraps`.

## Full audit: the `usability-audit` workflow

In Claude Code, ask for it by name, for example:

> run the usability-audit workflow with label `after-steady-spread`

> run the usability-audit workflow with label `recheck-1` and focus "re-check the findings in openspec/changes/steady-cooking-spread/audit-summary.md and report what is fixed vs still present"

The workflow takes these args:

- `label` (required): names the output directory, `tests/usability/runs/audit-<label>/`.
- `focus` (optional): appended to every explorer's brief.
- `journeys` (optional): a subset such as `["cook", "counter"]`.
- `portBase` (optional): the first port, default 3011.

The workflow starts five explorer agents in parallel, one per journey, each on its own port. Each explorer:

- starts its server with `fresh.sh`;
- runs its `remeasure/<journey>.cjs` and diffs the result against the baseline;
- explores the UI with `probe.cjs`;
- writes its scripts, screenshots and `findings.json` to `runs/audit-<label>/<journey>/`.

Each finding records severity, category, status (`new`, `still-present`, `partly-fixed` or `fixed`), viewports, what happens, evidence, likely cause (file:line), any spec conflict, and a fix direction. Each explorer also writes `remeasure.cjs`, an extended copy of its remeasure script with checks for new findings. To add those checks to the quick loop, copy them into `remeasure/` by hand and refresh the baseline.

**Cost:** a full run is 5 agents at high effort, about 1.1M subagent tokens and about 30 minutes of wall-clock time. Narrow it with `journeys` and `focus`. To check numbers only, use `run-all.sh`, which costs nothing.

The workflow and `run-all.sh` use the same ports. Don't run both at the same time, and don't run two audits at once, unless you give one of them a different `portBase`/`PORT_BASE`.

## What the probe measures

`probe.cjs` opens Chromium at one of four viewports. Phone and tablet use touch and `isMobile`.

- **`P.track(page, action, { ms, anchors })`**
  - On every `requestAnimationFrame` during the action and for `ms` afterwards, it records `getBoundingClientRect()` (which includes CSS transforms) and a visibility flag (size, `display`, `visibility`, `opacity > 0.05`) for each anchor.
  - The default anchors are the book, pages, page contents, margin, tab strips, prev/next buttons, phone edge zones, note input, send button, timer pill, header and title. Pass `anchors: [...]` to use your own.
  - For each anchor it reports:
    - `maxDev`: the largest deviation in x, y, width or height from the first frame at any frame. This catches animations that end where they started.
    - `net`: the change from the first frame to the last.
    - `visFlips`: how many times the element was hidden or shown.
- **Layout shift**: the `PerformanceObserver` `layout-shift` entries recorded in the same window, with the source nodes and their before and after rects.
- **`P.summarise(r)`**: prints only the anchors that moved at least 2px, flipped, appeared or vanished, plus the total layout shift.

Other helpers:

- `P.shot(page, dir?, name)` saves a screenshot. The directory defaults to `runs/shots/`.
- `P.sendNote(page, text)` types a note and sends it.
- `P.openFromContents(page, n)` opens the n-th recipe on the contents page.
- `P.chromium` is the Playwright `chromium` object, for checks that need their own browser.
