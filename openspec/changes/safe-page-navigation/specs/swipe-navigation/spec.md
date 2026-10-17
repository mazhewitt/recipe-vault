## MODIFIED Requirements

### Requirement: Swipe gesture triggers recipe navigation on mobile

The system SHALL detect horizontal swipe gestures on the book on mobile and trigger recipe navigation. Swiping left SHALL navigate forward (next recipe). Swiping right SHALL navigate backward (previous recipe). A gesture SHALL navigate only if it was locked horizontal (see "Swipe does not conflict with vertical scrolling") **and**, measured from `touchstart` to `touchend`, its horizontal distance is at least 30% of the `.pages-container` width and its vertical distance is less than half its horizontal distance. The visual animation is handled by the View Transitions API (or crossfade fallback) — the swipe handler only detects direction and triggers navigation.

#### Scenario: Swipe left navigates forward

- **WHEN** the user swipes left (finger moves right-to-left) on the recipe page on mobile
- **AND** the horizontal distance is at least 30% of the `.pages-container` width
- **AND** the overall vertical distance is less than half the horizontal distance
- **THEN** the next recipe is loaded with a forward slide animation via View Transitions (`html[data-nav-direction="forward"]` is set during the turn)

#### Scenario: Swipe right navigates backward

- **WHEN** the user swipes right (finger moves left-to-right) on the recipe page on mobile
- **AND** the horizontal distance is at least 30% of the `.pages-container` width
- **AND** the overall vertical distance is less than half the horizontal distance
- **THEN** the previous recipe is loaded with a backward slide animation via View Transitions (`html[data-nav-direction="backward"]` is set during the turn)

#### Scenario: A short swipe does nothing

- **WHEN** the user swipes left horizontally by 25% of the `.pages-container` width and lifts the finger
- **THEN** no navigation occurs and `#page-right-content .recipe-title` still shows the same recipe 1200ms later

#### Scenario: Vertical drift by the end of the gesture cancels the swipe

- **WHEN** a gesture is locked horizontal (its first 30px of movement is dx = -30px, dy = -5px)
- **AND** it ends at dx = -160px, dy = -90px from where it started, so the overall |dy| is not less than |dx| / 2
- **THEN** no navigation occurs

#### Scenario: Swipe respects navigation boundaries

- **WHEN** the user swipes left on the last recipe in the list
- **THEN** no navigation occurs
- **AND** when the user swipes right on the first recipe, navigation goes to the index view

#### Scenario: Swipe left on the contents page opens the first recipe

- **WHEN** the contents page is displayed on a viewport 600px wide or narrower
- **AND** the user swipes left past the threshold
- **THEN** the first recipe of the full alphabetical list opens, whatever contents filter is active, because the contents are page zero of the book

### Requirement: Swipe does not conflict with vertical scrolling

The system SHALL distinguish between horizontal swipe gestures (navigation) and vertical scroll gestures (reading long recipes). The direction of a gesture SHALL stay undecided until the touch has moved 30px from where it started (`max(|dx|, |dy|) ≥ 30px`). At that moment the gesture SHALL be locked horizontal only if `|dx| > 2·|dy|`; otherwise it SHALL be a scroll for the rest of its life and SHALL NOT navigate whatever it does afterwards. A touch that starts less than 300ms after the last `scroll` event on `#page-left` or `#page-right` SHALL never be a swipe, because the page under the thumb is still coasting.

#### Scenario: Vertical scroll is not intercepted

- **WHEN** the user's touch first reaches 30px of movement with |dx| ≤ 2·|dy|
- **THEN** the gesture is treated as a vertical scroll
- **AND** the swipe handler calls `preventDefault()` on none of its `touchmove` events, so normal scrolling continues unimpeded
- **AND** no navigation occurs even if the finger later moves far sideways

#### Scenario: A diagonal thumb arc does not turn the page

- **WHEN** a recipe's method is shown on a viewport 600px wide or narrower
- **AND** the user drags from (255, 600) to (125, 380) in 12 even steps (a scroll with 31° of sideways drift)
- **THEN** `#page-right-content .recipe-title` still shows the same recipe 1200ms after the finger lifts
- **AND** a drag that wobbles 15px sideways first and then scrolls 300px upward also leaves the same recipe on the page

#### Scenario: Movement under 30px decides nothing

- **WHEN** a touch moves less than 30px on both axes and lifts
- **THEN** no navigation occurs and the gesture is neither a swipe nor a scroll, so a tap remains a tap

#### Scenario: Horizontal swipe is not treated as scroll

- **WHEN** the user's touch first reaches 30px of movement with |dx| > 2·|dy|
- **THEN** the gesture is treated as a navigation swipe
- **AND** `preventDefault()` is called on each later cancelable `touchmove` of the gesture, so vertical scrolling is suppressed for its remainder

#### Scenario: A touch on a coasting page is not a swipe

- **WHEN** a `scroll` event fired on `#page-right` less than 300ms before the `touchstart`
- **AND** the gesture would otherwise meet every swipe threshold
- **THEN** no navigation occurs
- **AND** the same swipe started 300ms or more after the last `scroll` event navigates

## ADDED Requirements

### Requirement: Taps on the page never turn it

On viewports 600px wide or narrower, no invisible control SHALL lie over the page. A tap on the page's text, quantities, step numbers or contents rows SHALL act on what was tapped and SHALL NOT change the recipe. Recipes change only by a swipe, by the footer links ("‹ previous recipe" / "next recipe ›"), or by the visible gutter chevrons beside the page (`family-recipe-ui` "Phone gutter chevrons turn the page").

#### Scenario: The full-height edge zones are gone

- **WHEN** the chat page loads at any viewport width
- **THEN** no element matches `.mobile-edge-nav`, `#mobile-edge-prev` or `#mobile-edge-next`

#### Scenario: Nothing navigational lies over the recipe text

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **AND** `#page-right` is scrolled to its top, its middle and its bottom in turn
- **THEN** at each scroll position `document.elementFromPoint`, sampled on a 20px grid over the part of `#page-right-content` that is inside the viewport, returns `#page-right-content` or one of its descendants
- **AND** the only exception is where the reply sticky (`#page-margin`) overlays the foot of the page; no sample ever returns a `.gutter-chevron` or a `.page-nav`

#### Scenario: Tapping a quantity keeps the recipe

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **AND** the user taps the third `.ingredient-qty` 6px inside its left edge
- **THEN** 1500ms later `#page-right-content .recipe-title` still shows the same recipe

#### Scenario: Tapping a contents row's page number opens that row

- **WHEN** the contents page is displayed on a viewport 600px wide or narrower
- **AND** the user taps the `.index-page-number` of the third `.index-recipe-item`
- **THEN** the recipe that opens is the one named by that row's `data-recipe-id`, not its neighbour
