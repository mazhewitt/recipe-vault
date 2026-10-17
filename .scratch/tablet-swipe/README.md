# The tablet has no swipe: the only page turn is a small arrow in a top corner

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (usability audit, openspec/changes/steady-cooking-spread/audit-summary.md)
Severity: medium. The tablet is the likely cooking device. safe-page-navigation deferred this deliberately.

## Description

Finding `tablet-has-no-swipe` (find), plus the swipe half of `small-touch-targets` (cook).

- **No swipe.** On an iPad propped on the counter, swiping does nothing. A 300px swipe left on the tablet does not navigate, and every tablet case in the explorer's swipe run did nothing.
- **Only small arrows.** The only page turn is the 36x36 (portrait) or 29x29 (landscape) arrow in the top corners. In landscape a running timer pill half-covers the "›" arrow; steady-cooking-spread D6 moves the pill away from it.
- **Cause.** `static/page-transitions.js:370` and `:389` (`if (!isMobile()) return`) limit swipes to 600px and narrower.
- **Spec.** swipe-navigation "Swipe is only active on mobile (max-width: 600px)" requires this.

safe-page-navigation lists this as a non-goal: the tablet's two pages scroll independently, so a swipe across the spread needs its own design.

Meanwhile steady-cooking-spread D9 gives the arrows a 44x44 hit area.

## What a fix needs

- A design for which surface takes the swipe: both pages, or only the method page. It must work with two independent scrollers, and must not fight the left-edge tab strip, the note slip or the reply sticky.
- The strict direction test from safe-page-navigation N2:
  - the direction locks only at 30px of travel;
  - the gesture is horizontal only if |dx| > 2·|dy|;
  - a turn needs 30% of the width;
  - no swipe starts on a page still coasting.
- A swipe-navigation spec change, since "only active on mobile" has to go.
