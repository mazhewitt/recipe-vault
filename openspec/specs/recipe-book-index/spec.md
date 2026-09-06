# recipe-book-index Specification

## Purpose
TBD - created by syncing change add-recipe-book-index. Update Purpose after sync.

## Requirements

### Requirement: Index displays on page load

The recipe book SHALL display an alphabetical contents page of all recipes as the default view when the page loads, replacing the placeholder.

#### Scenario: Page load with existing recipes

- **WHEN** the chat page loads and the recipe vault contains recipes
- **THEN** the recipe book displays a contents page titled "~ Contents ~" with recipe entries grouped under letter headers
- **AND** the left page shows the first half of recipes (by count) and the right page shows the second half

#### Scenario: Page load with no recipes

- **WHEN** the chat page loads and the recipe vault contains zero recipes
- **THEN** the recipe book displays a friendly empty message (e.g., "Your recipe book is empty. Ask me to create a recipe!")

#### Scenario: Index fetches fresh data

- **WHEN** the index view is rendered (on page load or navigation back to index)
- **THEN** the frontend fetches `/api/recipes` with force refresh (no cached data)
- **AND** renders the index from the fresh response

#### Scenario: Footer shows the recipe count

- **WHEN** the contents page is rendered with N recipes
- **THEN** each populated page ends with a footer reading "N recipes" (or "1 recipe")
- **AND** on the desktop layout the left page footer also reads "continued overleaf" when the right page has entries

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

The index SHALL distribute recipes across the left and right book pages for balanced readability.

#### Scenario: Even distribution

- **WHEN** there are 10 recipes in the vault
- **THEN** the left page displays the first 5 recipes (alphabetically) and the right page displays the last 5

#### Scenario: Odd number distribution

- **WHEN** there are 11 recipes in the vault
- **THEN** the left page displays the first 6 recipes and the right page displays the last 5

#### Scenario: Single recipe

- **WHEN** there is 1 recipe in the vault
- **THEN** the left page displays that recipe and the right page is empty or shows minimal content

### Requirement: Index pages scroll independently

Each page of the index SHALL scroll independently when recipe names exceed the visible area, consistent with existing recipe page scroll behavior.

#### Scenario: Left page scrolls

- **WHEN** the left page index content exceeds the visible height
- **THEN** the left page becomes scrollable while the right page scrolls independently

### Requirement: Clicking a recipe name displays that recipe

Each recipe name in the index SHALL be clickable and navigate directly to that recipe's full display.

#### Scenario: Click recipe in index

- **WHEN** the user clicks a recipe name in the index
- **THEN** the recipe book fetches and displays that recipe's full details (ingredients, steps)
- **AND** the view mode changes from index to recipe

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

The "Recipe Book" header SHALL navigate to the recipe index when clicked.

#### Scenario: Header click from recipe view
- **WHEN** a recipe is displayed
- **AND** the user clicks the "Recipe Book" header
- **THEN** the recipe index view is rendered
- **AND** the current recipe context is cleared
- **AND** the index data is fetched fresh

#### Scenario: Header click from index view
- **WHEN** the index view is already displayed
- **AND** the user clicks the "Recipe Book" header
- **THEN** the index view remains displayed

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
