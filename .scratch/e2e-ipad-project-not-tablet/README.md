# Playwright `ipad` project renders at 1280x720, not as a tablet

Status: ready-for-agent
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
