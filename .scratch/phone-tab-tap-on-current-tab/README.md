# Phone: tapping the tab already showing crossfades, and can swallow the next tap

Status: ready-for-agent
Reported: 2026-10-19
Reporter: Claude (found writing `tests/e2e/tests/address-bar.spec.ts`)

On the phone, `setActiveTab` (static/page-tabs.js) runs a 200ms crossfade for
every tab tap, including a tap on the tab already showing. The crossfade holds
the one animation lock, so a tap on another tab within those 200ms is ignored:
tap Ingredients (already showing), then Method straight after, and the page
stays on Ingredients. The fade itself is pointless (same content out and in).

Found when a test tapped the open Ingredients tab and then Method: the Method
tab took focus but the panel did not change.

## Suggested fix

In `setActiveTab`, on the phone, when `pageRight.dataset.tab === tab` and not
`force`, do not crossfade: there is nothing to switch. Test first: tap the
current tab, then another tab at once; the second tab shows.
