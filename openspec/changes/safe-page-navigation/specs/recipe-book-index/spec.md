## MODIFIED Requirements

### Requirement: Index displays on page load

The recipe book SHALL display an alphabetical contents page of all recipes as the default view when the page loads **without a `?recipe=` parameter**, replacing the placeholder, honouring the contents filter remembered for the session. When the page loads with `?recipe=<id>` the book SHALL open on that recipe instead (`recipe-url-state`).

#### Scenario: Page load with existing recipes

- **WHEN** the chat page loads without a `?recipe=` parameter and the recipe vault contains recipes
- **THEN** the recipe book displays a contents page titled "~ Contents ~" with recipe entries grouped under letter headers
- **AND** the left page shows the first half of recipes (by count) and the right page shows the second half
- **AND** the All tab is active unless a filter is remembered for the session

#### Scenario: Page load with no recipes

- **WHEN** the chat page loads and the recipe vault contains zero recipes
- **THEN** the recipe book displays a friendly empty message (e.g., "Your recipe book is empty. Ask me to create a recipe!")

#### Scenario: Page load with a recipe in the URL

- **WHEN** the chat page loads with `?recipe=<id>` naming a recipe in the book
- **THEN** the contents page is not displayed and that recipe opens, as `recipe-url-state` "Reload restores the open recipe" describes

#### Scenario: Index fetches fresh data

- **WHEN** the contents are shown (on page load, on a return to the contents, or by the Contents spread tab)
- **THEN** the frontend makes one request to `GET /api/recipes`
- **AND** the contents reflect the response, with the active contents filter applied
- **AND** on a return to the contents the incoming pages are first drawn from the list already held, and are re-rendered in place only if the response differs from it

#### Scenario: Footer shows the recipe count

- **WHEN** the contents page is rendered with N recipes under the All tab
- **THEN** each populated page ends with a footer reading "N recipes" (or "1 recipe")
- **AND** on the desktop layout the left page footer also reads "continued overleaf" when the right page has entries

#### Scenario: Footer wording follows the filter

- **WHEN** the contents page is rendered with the Mains tab active and N matching recipes
- **THEN** the footer reads "N mains" (or "1 main")
- **AND** with the Sweets tab active it reads "N sweets" (or "1 sweet")

### Requirement: Recipe Book header navigates to index

The "Recipe Book" header SHALL navigate to the recipe index when clicked, returning the spread to contents mode in a single backward page turn whose incoming pages are drawn before the turn starts, as the previous and next controls draw theirs. The header's hit area SHALL be the label itself: at most 44px wider than the label's text and at least 44px tall, so a tap on the bare wood beside it does nothing.

#### Scenario: Header click from recipe view
- **WHEN** a recipe is displayed
- **AND** the user clicks the "Recipe Book" header
- **THEN** a backward page turn plays: `.page-turn-overlay.turn-backward` above 600px, `html[data-nav-direction="backward"]` at 600px or narrower
- **AND** the recipe index view is rendered across both pages
- **AND** the current recipe context is cleared
- **AND** the list is refreshed once after the turn, and the contents are re-rendered in place only if it changed
- **AND** the spread mode becomes `contents` and the left-edge tab strip reverts to the contents filters
- **AND** the URL becomes the bare chat path (`recipe-url-state`)

#### Scenario: Return to the contents shows no half-drawn frame
- **WHEN** a recipe is displayed in `cook` mode above 600px
- **AND** every response from `GET /api/recipes` is delayed by 400ms
- **AND** the user clicks the "Recipe Book" header
- **THEN** in every animation frame from the click until the turn has finished, `#page-left-content` has non-empty text
- **AND** in none of those frames does `#page-right-content` hold a `.tab-panel[data-tab="ingredients"]`
- **AND** `#page-left-content .index-title` is present 150ms after the click

#### Scenario: Header click from index view
- **WHEN** the index view is already displayed
- **AND** the user clicks the "Recipe Book" header
- **THEN** the index view remains displayed
- **AND** no page turn plays and no history entry is added

#### Scenario: The hit area is the label
- **WHEN** the "Recipe Book" header is displayed at any viewport width
- **THEN** `#recipe-book-header` passes the hit-area test of `family-recipe-ui` "Every control the cook taps has a 44px hit area" (added by `steady-cooking-spread`), and its bounding box is at least 44px tall
- **AND** its bounding box is no more than 44px wider than the bounding box of its text (a `Range` over its contents)
- **AND** at 600px or narrower it does not intersect `.page-tabs` or `#page-right-content`

#### Scenario: A click on the wood beside the label does nothing
- **WHEN** a recipe is displayed
- **AND** the user clicks the point 60px to the right of the header text's right edge, at the text's vertical centre
- **THEN** `body[data-view-mode]` is still `recipe` and the same recipe is on the page
