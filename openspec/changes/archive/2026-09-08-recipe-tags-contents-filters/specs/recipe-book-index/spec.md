## MODIFIED Requirements

### Requirement: Index displays on page load

The recipe book SHALL display an alphabetical contents page of all recipes as the default view when the page loads, replacing the placeholder, honouring the contents filter remembered for the session.

#### Scenario: Page load with existing recipes

- **WHEN** the chat page loads and the recipe vault contains recipes
- **THEN** the recipe book displays a contents page titled "~ Contents ~" with recipe entries grouped under letter headers
- **AND** the left page shows the first half of recipes (by count) and the right page shows the second half
- **AND** the All tab is active unless a filter is remembered for the session

#### Scenario: Page load with no recipes

- **WHEN** the chat page loads and the recipe vault contains zero recipes
- **THEN** the recipe book displays a friendly empty message (e.g., "Your recipe book is empty. Ask me to create a recipe!")

#### Scenario: Index fetches fresh data

- **WHEN** the index view is rendered (on page load or navigation back to index)
- **THEN** the frontend fetches `/api/recipes` with force refresh (no cached data)
- **AND** renders the index from the fresh response
- **AND** applies the active contents filter to the fresh list

#### Scenario: Footer shows the recipe count

- **WHEN** the contents page is rendered with N recipes under the All tab
- **THEN** each populated page ends with a footer reading "N recipes" (or "1 recipe")
- **AND** on the desktop layout the left page footer also reads "continued overleaf" when the right page has entries

#### Scenario: Footer wording follows the filter

- **WHEN** the contents page is rendered with the Mains tab active and N matching recipes
- **THEN** the footer reads "N mains" (or "1 main")
- **AND** with the Sweets tab active it reads "N sweets" (or "1 sweet")

## ADDED Requirements

### Requirement: Contents edge tabs filter recipes

The contents page SHALL offer edge tabs All, Mains and Sweets on the outer edge of the left page that filter the displayed entries by the fixed tags `main` and `dessert`, and the choice SHALL persist for the browser session.

#### Scenario: Tabs render on the left page

- **WHEN** the contents page is displayed on the desktop layout
- **THEN** a tab strip with All, Mains and Sweets renders on the outer edge of the left page as a sibling of the page content
- **AND** All uses the leather red, Mains the tan `--color-border` with dark ink text, Sweets the accent brown
- **AND** the active tab carries `is-active` and `aria-pressed="true"`

#### Scenario: Mains shows only main-course recipes

- **WHEN** the user selects the Mains tab
- **THEN** only recipes whose `tags` include `main` are listed
- **AND** letter headers and the A–Z strip reflect only the filtered recipes
- **AND** the footer reads "N mains"

#### Scenario: Sweets shows only desserts

- **WHEN** the user selects the Sweets tab
- **THEN** only recipes whose `tags` include `dessert` are listed
- **AND** letter headers and the A–Z strip reflect only the filtered recipes
- **AND** the footer reads "N sweets"

#### Scenario: All shows every recipe

- **WHEN** the user selects the All tab
- **THEN** every recipe is listed regardless of tags

#### Scenario: Empty filter shows a message

- **WHEN** the active filter matches no recipes
- **THEN** the left page shows a message such as "No mains yet. Ask me to tag a recipe as a main course."
- **AND** every letter in the A–Z strip is disabled
- **AND** the footer reads "0 mains" (or "0 sweets")

#### Scenario: Page numbers are stable across filters

- **WHEN** a recipe is shown under a filter
- **THEN** its page number is the same as under All (derived from its position in the full alphabetical list)

#### Scenario: Navigation ignores the filter

- **WHEN** a filter is active and the user uses the next or previous arrows or swipes
- **THEN** navigation moves through the full alphabetical list of recipes, not the filtered subset

#### Scenario: Filter persists for the session

- **WHEN** the user selects a tab and reloads the page in the same browser session
- **THEN** the same tab is active and the contents are filtered accordingly
- **AND** the value is stored under `sessionStorage['rv-contents-filter']`

#### Scenario: Unknown stored filter falls back to All

- **WHEN** `sessionStorage['rv-contents-filter']` holds a value that is not a known filter
- **THEN** the All tab is active

#### Scenario: Filter applies while a recipe is open

- **WHEN** a recipe is open and the contents are shown on the left page
- **THEN** the tab strip remains available and filters that contents column
- **AND** the current recipe's row is highlighted only if it matches the filter

#### Scenario: Phone shows chips instead of edge tabs

- **WHEN** the viewport is 600px wide or narrower
- **THEN** the same filters render as a horizontal row of chips directly under the "~ Contents ~" title
- **AND** each chip is at least 44px tall

### Requirement: Meals edge tab is gated

The contents page SHALL include a Meals edge tab that is hidden unless the `data-feature-meals` attribute is present on `body`, because it depends on meal-plan persistence.

#### Scenario: Meals tab hidden by default

- **WHEN** the contents page is displayed and `body` has no `data-feature-meals` attribute
- **THEN** the Meals tab is not visible and cannot be focused

#### Scenario: Meals tab shown when the feature is enabled

- **WHEN** `body[data-feature-meals]` is present
- **THEN** the Meals tab is visible after Sweets in the ink medium colour

#### Scenario: Meals tab selected before meal plans persist

- **WHEN** the Meals tab is visible and selected but no meal-plan listing exists
- **THEN** the left page shows "No meal plans yet"
- **AND** the footer reads "0 meal plans"
