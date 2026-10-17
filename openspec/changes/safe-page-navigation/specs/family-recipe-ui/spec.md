## ADDED Requirements

### Requirement: Phone gutter chevrons turn the page

On viewports 600px wide or narrower, while a recipe is displayed, the book SHALL show two visible chevron buttons at the right-hand end of the phone page-tab row (`.page-tabs`): `button#gutter-prev.gutter-chevron` (aria-label "Previous recipe") followed by `button#gutter-next.gutter-chevron` (aria-label "Next recipe"). Each SHALL have a hit area of at least 44×44px that covers none of the page content and none of the Ingredients / Method / Notes tabs. They SHALL behave exactly like the footer links: previous opens the previous recipe, or the contents from the first recipe; next opens the next recipe. (Lead decision 2026-10-17, open question 3: the phone's leather frame is 4px, and widening it to hold a 44px target beside the paper would cost about 14% of the paper's width, so the chevrons share the tab row instead.)

#### Scenario: Chevrons render beside a recipe

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** `#gutter-prev` and `#gutter-next` are visible `<button>` elements
- **AND** each passes the hit-area test of "Every control the cook taps has a 44px hit area" (added by `steady-cooking-spread`): `document.elementFromPoint` returns the chevron at every point of a 5×5 grid spread over the 44×44px square centred on it
- **AND** the vertical centre of each is within 22px of the vertical centre of the `.page-tabs` row
- **AND** `#gutter-prev` lies left of `#gutter-next`, and both lie right of the last `.page-tab`

#### Scenario: Chevrons cover no page content

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **AND** `#page-right` is scrolled to its top, its middle and its bottom in turn
- **THEN** at each scroll position neither chevron's 44×44px hit area overlaps the bounding box of any element inside `#page-right-content`, nor any `.page-tab`

#### Scenario: Chevrons turn the page

- **WHEN** a recipe that is neither first nor last is displayed on a viewport 600px wide or narrower
- **AND** the user taps `#gutter-next`
- **THEN** the next recipe opens with the forward slide (`html[data-nav-direction="forward"]` during the turn)
- **AND** tapping `#gutter-prev` opens the previous recipe with the backward slide

#### Scenario: Chevrons follow the book's boundaries

- **WHEN** the first recipe of the alphabetical list is displayed on a viewport 600px wide or narrower
- **THEN** `#gutter-prev` is enabled and tapping it returns to the contents
- **AND** when the last recipe is displayed, `#gutter-next` is visible, carries the `disabled` attribute, and tapping it changes nothing

#### Scenario: Chevrons are hidden off the recipe page

- **WHEN** the contents page or a meal plan is displayed on a viewport 600px wide or narrower
- **THEN** neither chevron is visible and neither can receive focus

#### Scenario: Chevrons are absent above the phone breakpoint

- **WHEN** the viewport is wider than 600px
- **THEN** neither chevron is visible, and the page arrows `#page-prev` and `#page-next` are the turn controls

### Requirement: Phone tabs keep their own scroll position

On viewports 600px wide or narrower, each of the Ingredients, Method and Notes tabs of the open recipe SHALL remember its own scroll position of `#page-right`, the element that scrolls the phone page. Leaving a tab SHALL record its position, and returning to it SHALL restore that position. A newly opened recipe SHALL start every tab at the top.

#### Scenario: A round trip keeps the place in the method

- **WHEN** the Method tab is active and `#page-right` is scrolled so that step 7 (`.prep-step[data-step="7"]`) is at viewport y = Y
- **AND** the user taps Ingredients and then Method
- **THEN** step 7's `getBoundingClientRect().top` is within 1px of Y
- **AND** `#page-right.scrollTop` is within 1px of its value before Ingredients was tapped

#### Scenario: Each tab has its own position

- **WHEN** the Ingredients tab has been scrolled to 120px and the Method tab to 400px
- **THEN** switching to Ingredients shows `#page-right.scrollTop` of 120 (±1px) and switching back to Method shows 400 (±1px)
- **AND** a position larger than the tab's content allows is clamped by the browser, not treated as an error

#### Scenario: A newly opened recipe starts at the top

- **WHEN** the method of one recipe was scrolled and the user opens a different recipe (by the footer links, the gutter chevrons, a swipe or the contents)
- **THEN** the new recipe shows its Ingredients tab with `#page-right.scrollTop` of 0
- **AND** tapping its Method tab shows the method with `#page-right.scrollTop` of 0

### Requirement: Crossing the phone breakpoint keeps the view

When the viewport crosses 600px wide in either direction (a rotation or a window resize), detected as a change of `matchMedia('(max-width: 600px)')`, the book SHALL keep showing what it showed. An open recipe SHALL stay open with its scroll positions restored. Above 600px its spread mode SHALL be the mode the reader last chose for the spread in this page session, or `cook` if they never chose one (lead decision 2026-10-17, open question 11: keep today's behaviour of remembering the reader's mode across a phone round trip). The note input SHALL be visible after the crossing. The contents SHALL be re-rendered on a breakpoint change only, never on a `resize` event that stays on one side of 600px.

#### Scenario: Rotating a phone to landscape keeps the recipe

- **WHEN** a recipe is open on its Method tab at 390×844
- **AND** the viewport changes to 844×390
- **THEN** `#page-right-content .recipe-title` shows the same recipe and `body[data-view-mode]` is `recipe`
- **AND** `body[data-spread-mode]` is `cook`, with the recipe's ingredients in `#page-left-content .tab-panel[data-tab="ingredients"]`
- **AND** `.note-input` is visible

#### Scenario: Narrowing to a phone keeps the recipe

- **WHEN** a recipe is open at 1280×800 in any spread mode
- **AND** the viewport narrows to 500×800
- **THEN** the same recipe is shown on the single page with `.page-tabs` visible
- **AND** the document holds exactly one `.tab-panel[data-tab="ingredients"]`, inside `#page-right-content`
- **AND** `.note-input` is visible

#### Scenario: Crossing back restores the scroll position

- **WHEN** a recipe is open at 1280×800 with `#page-right.scrollTop` at 200
- **AND** the viewport changes to 500×800 and back to 1280×800
- **THEN** `#page-right.scrollTop` is 200 (±1px) and `body[data-spread-mode]` is the mode it had before the round trip
- **AND** likewise a phone's Method tab scrolled to S at 390×844 shows the Method tab at S (±1px) after a round trip through 844×390

#### Scenario: Resizing within a band does not re-render the contents

- **WHEN** the contents page is displayed at 1280×800
- **AND** the viewport is resized 20 times to widths between 900 and 1090px
- **THEN** no request to `GET /api/recipes` is made
- **AND** the `.index-recipe-item` elements are the same DOM nodes as before the resizes

#### Scenario: The phone keyboard does not reset the contents

- **WHEN** the contents page is displayed at 390×844 with `#page-left.scrollTop` at 300
- **AND** the viewport height changes to 500 (the on-screen keyboard opening)
- **THEN** `#page-left.scrollTop` is still 300 (±1px)
- **AND** no request to `GET /api/recipes` is made

#### Scenario: Crossing with the contents shown redraws them for the new layout

- **WHEN** the contents page is displayed with at least two recipes and the viewport crosses 600px
- **THEN** the contents are re-rendered once for the new layout: split across both pages above 600px, and on the single left page with `#page-right-content` empty at 600px or narrower

## MODIFIED Requirements

### Requirement: Recipe photo opens full-window preview on click

The recipe photo in the recipe book SHALL open a full-window preview when clicked or tapped, with the preview image constrained to fit within the viewport. The preview SHALL open and close on `click` events only, never on `touchstart` or `touchend`. The click a browser synthesises after a tap is then the tap itself, and cannot close what the tap opened.

#### Scenario: Click recipe photo shows preview
- **WHEN** a recipe is displayed with a photo
- **AND** the user clicks the photo
- **THEN** a full-window overlay appears showing the photo
- **AND** the photo is scaled to fit within the viewport width or height (whichever is smaller)

#### Scenario: Preview can be dismissed
- **WHEN** the photo preview overlay is visible
- **THEN** the user can dismiss it by clicking or tapping the overlay, or by pressing Escape, and return to the recipe view

#### Scenario: Tapping the photo on a touch screen keeps the preview open
- **WHEN** a recipe with a photo is displayed on a touch device (the `mobile-chrome` and `ipad` projects)
- **AND** the user taps `#page-right-content .recipe-polaroid .recipe-photo`
- **THEN** `#photo-preview-overlay` has the class `visible`
- **AND** it still has the class `visible` 500ms after the tap

#### Scenario: Tapping the overlay closes it for good
- **WHEN** the photo preview is open on a touch device
- **AND** the user taps the overlay
- **THEN** `#photo-preview-overlay` loses the class `visible`
- **AND** it does not regain it within the next 500ms

#### Scenario: A drag that starts on the photo opens nothing
- **WHEN** a touch starts on `.recipe-photo` and moves 40px before lifting
- **THEN** `#photo-preview-overlay` does not gain the class `visible`
