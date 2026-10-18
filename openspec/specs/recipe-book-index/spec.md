# recipe-book-index Specification

## Purpose
Gives the book a contents page: every recipe grouped by letter across the spread, as page zero of the book, reachable from the book's label.

## Requirements

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

### Requirement: Recipes are grouped under letter headers

The contents page SHALL group recipes alphabetically with letter headers for each starting letter present in the collection, and each entry SHALL show a thumbnail, the recipe name and a page number.

#### Scenario: Letter headers shown for populated letters

- **WHEN** the contents page contains recipes starting with "A", "B", and "K"
- **THEN** letter headers "A", "B", and "K" are displayed
- **AND** each header is followed by the entries for recipes starting with that letter

#### Scenario: Letters with no recipes are not shown

- **WHEN** no recipes start with a given letter
- **THEN** that letter header is not displayed in the contents page

#### Scenario: Entry with a photo shows a polaroid thumbnail

- **WHEN** a recipe in the contents page has a photo
- **THEN** its entry shows a small polaroid-framed thumbnail of the photo, loaded lazily, before the recipe name

#### Scenario: Entry without a photo shows an empty polaroid

- **WHEN** a recipe in the contents page has no photo
- **THEN** its entry shows an empty polaroid frame with a dashed inner border before the recipe name

#### Scenario: Entry shows a page number

- **WHEN** a recipe is at position i (zero-based) in the full alphabetical list
- **THEN** its entry shows the page number `2 * i + 3` formatted as "p. N" on the right, and the entry carries that number in `data-page`

### Requirement: Index splits across two pages

The index SHALL distribute recipes across the left and right book pages for balanced readability **while the spread mode is `contents` and no recipe is open**. When a recipe is open the contents occupy a single page.

#### Scenario: Even distribution

- **WHEN** there are 10 recipes in the vault and no recipe is open
- **THEN** the left page displays the first 5 recipes (alphabetically) and the right page displays the last 5

#### Scenario: Odd number distribution

- **WHEN** there are 11 recipes in the vault and no recipe is open
- **THEN** the left page displays the first 6 recipes and the right page displays the last 5

#### Scenario: Single recipe

- **WHEN** there is 1 recipe in the vault and no recipe is open
- **THEN** the left page displays that recipe and the right page is empty or shows minimal content

#### Scenario: Contents alongside an open recipe

- **WHEN** a recipe is open and the spread mode is `contents`
- **THEN** the whole contents render as one scrolling column on the left page
- **AND** the right page shows the open recipe rather than a second half of the contents

### Requirement: Index pages scroll independently

Each page of the index SHALL scroll independently when recipe names exceed the visible area, consistent with existing recipe page scroll behavior.

#### Scenario: Left page scrolls

- **WHEN** the left page index content exceeds the visible height
- **THEN** the left page becomes scrollable while the right page scrolls independently

### Requirement: Clicking a recipe name displays that recipe

Each recipe name in the index SHALL be clickable and navigate directly to that recipe's full display, opening it in cook mode.

#### Scenario: Click recipe in index

- **WHEN** the user clicks a recipe name in the index
- **THEN** the recipe book fetches and displays that recipe's full details (ingredients, steps)
- **AND** the view mode changes from index to recipe
- **AND** the spread mode becomes `cook`, so the ingredients take the left page and the method the right

#### Scenario: Clicked recipe loads with loading state

- **WHEN** the user clicks a recipe name in the index
- **THEN** the recipe book shows the loading skeleton while fetching the recipe data

### Requirement: Index is page zero in navigation sequence

The index SHALL be treated as the first page in the book's navigation sequence, before all recipes.

#### Scenario: Arrow right from index

- **WHEN** the index is displayed and the user clicks the ">" arrow
- **THEN** the first recipe in alphabetical order is loaded and displayed

#### Scenario: Arrow left from index

- **WHEN** the index is displayed and the user clicks the "<" arrow
- **THEN** nothing happens (arrow is disabled)

#### Scenario: Arrow right from index with no recipes

- **WHEN** the index is displayed with zero recipes and the user clicks the ">" arrow
- **THEN** nothing happens (arrow is disabled)

### Requirement: Index has cookbook table-of-contents styling

The contents page SHALL be styled to match the cookbook aesthetic of the recipe book.

#### Scenario: Index uses book typography

- **WHEN** the contents page is displayed
- **THEN** the "~ Contents ~" title and letter headers render in the Kalam handwritten font, letter headers in the leather red
- **AND** recipe names render in the serif body font at 15px or larger
- **AND** page numbers render in Kalam using the `--color-ink-light` colour

#### Scenario: Recipe names have hover state

- **WHEN** the user hovers over an entry in the contents page
- **THEN** the entry shows a visual hover effect (background tint or colour change) indicating it is clickable, without moving the entry horizontally

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

### Requirement: Index provides clickable alphabet navigation

The contents page SHALL display a compact clickable A–Z alphabet row directly beneath the "~ Contents ~" title, above the grouped entries.

#### Scenario: Alphabet row renders at top of index

- **WHEN** the contents page is displayed
- **THEN** the "~ Contents ~" title renders first, followed by the A–Z navigation row, followed by the grouped recipe entries

#### Scenario: Inactive letters are visibly disabled

- **WHEN** a letter has no recipes in the current index data
- **THEN** that letter is displayed in a disabled visual state
- **AND** selecting it does not trigger scrolling

#### Scenario: Active letters are distinguishable

- **WHEN** a letter has recipes in the current index data
- **THEN** that letter renders bold in the leather red

#### Scenario: Alphabet controls remain compact

- **WHEN** the alphabet row is displayed
- **THEN** each letter control uses minimal extra padding while remaining clickable

### Requirement: Letter selection jumps to matching section

Selecting an active letter in the alphabet navigation SHALL move the index viewport to the corresponding letter section.

#### Scenario: Jump to existing letter section

- **WHEN** the user selects an active letter in the alphabet row
- **THEN** the index scroll position moves to the section header for that letter

#### Scenario: Repeated selection remains stable

- **WHEN** the user selects the same active letter multiple times
- **THEN** the index remains positioned at that letter section without errors

#### Scenario: Letter jump preserves recipe click behavior

- **WHEN** the user jumps to a letter section and selects a recipe name
- **THEN** the selected recipe opens in recipe view using existing index click navigation

### Requirement: Contents highlights the last-viewed recipe

The contents page SHALL mark the entry for the recipe most recently displayed in this session so the reader can see where they were.

#### Scenario: Returning from a recipe

- **WHEN** the user has viewed a recipe and then navigates back to the contents page
- **THEN** that recipe's entry carries the `current` class and `aria-current="page"`
- **AND** the page containing the entry is scrolled so the entry is visible

#### Scenario: Fresh page load

- **WHEN** the chat page loads and no recipe has been viewed in this session
- **THEN** no entry is highlighted and both pages are scrolled to the top

#### Scenario: Highlighted recipe was deleted

- **WHEN** the last-viewed recipe no longer appears in the fetched list
- **THEN** no entry is highlighted and rendering proceeds normally

### Requirement: Contents edge tabs filter recipes

The contents page SHALL offer edge tabs All, Mains and Sweets on the outer edge of the left page that filter the displayed entries by the fixed tags `main` and `dessert`, and the choice SHALL persist for the browser session.

#### Scenario: Tabs render on the left page

- **WHEN** the contents page is displayed on the desktop layout
- **THEN** a tab strip with All, Mains and Sweets renders on the outer edge of the left page as a sibling of the page content
- **AND** the Notes spread tab shares that strip, Contents and Cook joining it only while a recipe is open (see `book-spread-modes`)
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
