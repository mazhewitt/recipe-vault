# contents-page.spec.ts flakes in a full multi-project e2e run

Status: needs-triage

## Symptom

In a full `make test-e2e` run (chromium + mobile-chrome + ipad), `tests/e2e/tests/contents-page.spec.ts:28` failed once on the `ipad` project: `.index-recipe-item` count was 4, expected 3.

## Notes

- Did not reproduce when running `contents-page.spec.ts` in isolation, when paired with `chat.spec.ts`, or in a full ipad-only rerun.
- Order dependent: the Playwright projects share one server and one in-memory database, so recipes created by tests in another project can appear in the contents list a later project asserts an exact count on.
- Observed while reviewing `openspec/changes/journal-margin-notes`; the spec is untouched by that change.

## Likely fix

Either scope the contents-page assertions to the recipes the test created (title prefix) rather than an absolute count, or give each Playwright project its own database.
