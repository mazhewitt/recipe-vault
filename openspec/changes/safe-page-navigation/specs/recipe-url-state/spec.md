## ADDED Requirements

### Requirement: The open recipe is recorded in the URL

Opening a recipe SHALL push a history entry whose URL is the chat page's path with `?recipe=<id>` and whose `history.state.recipeId` is that id. Returning to the contents SHALL push an entry with the bare path and no `recipeId`. Re-rendering the recipe already on the page SHALL replace the current entry rather than push a new one. The history entry SHALL be written once the recipe has rendered, so an open that fails leaves the URL alone.

#### Scenario: Opening a recipe from the contents

- **WHEN** the user clicks an `.index-recipe-item`
- **THEN** once the recipe has rendered, `location.search` is `?recipe=<that row's data-recipe-id>`
- **AND** `history.state.recipeId` is that id
- **AND** `history.length` has grown by one

#### Scenario: Turning the page

- **WHEN** the user opens the next or previous recipe by the arrow, the footer link, the gutter chevron or a swipe
- **THEN** a history entry for the new recipe is pushed and `location.search` names it

#### Scenario: A recipe shown from the chat

- **WHEN** a `recipe_artifact` event displays a recipe other than the one on the page
- **THEN** a history entry for it is pushed and `location.search` names it

#### Scenario: A refresh replaces rather than pushes

- **WHEN** the recipe on the page is re-rendered by a photo upload, an `update_recipe` or a difficulty refresh
- **THEN** `history.length` and `location.search` are unchanged

#### Scenario: Returning to the contents

- **WHEN** the user returns to the contents by the "Recipe Book" header, or by "previous" from the first recipe
- **THEN** `location.pathname` is `/chat` and `location.search` is empty
- **AND** `history.length` has grown by one

#### Scenario: A failed open leaves the URL alone

- **WHEN** opening a recipe fails with an error other than 404 and the page shows "Failed to load recipe"
- **THEN** `location.href` and `history.length` are unchanged

### Requirement: Reload restores the open recipe

When the chat page loads with `?recipe=<id>` naming a recipe in the book, the book SHALL open straight to that recipe in the layout for the viewport: `cook` mode above 600px, and the single page on its Ingredients tab at 600px or narrower. It SHALL NOT show the contents first. The server SHALL serve the chat page for that URL exactly as for the bare path.

#### Scenario: Reload above the phone breakpoint

- **WHEN** a recipe is open on a viewport wider than 600px and the page is reloaded
- **THEN** the same recipe is shown in `#page-right-content .recipe-title`
- **AND** `body[data-spread-mode]` is `cook`, with the ingredients in `#page-left-content`
- **AND** `history.state.recipeId` is the recipe's id

#### Scenario: Reload on a phone

- **WHEN** a recipe is open on a viewport 600px wide or narrower and the page is reloaded
- **THEN** the same recipe is shown on the single page with the Ingredients paper tab active

#### Scenario: No flash of the contents

- **WHEN** the chat page loads with `?recipe=<id>` naming a recipe in the book
- **THEN** from the start of the load until `.recipe-title` is attached, no `.index-title` is ever attached to the document and `body[data-view-mode]` is never `index`, as recorded by a `MutationObserver` installed before the page's scripts run

#### Scenario: The restored recipe is the one the contents remember

- **WHEN** the page has been reloaded onto a recipe and the user then returns to the contents
- **THEN** that recipe's `.index-recipe-item` carries the `current` class

#### Scenario: The server serves the recipe URL

- **WHEN** `GET /chat?recipe=<id>` is requested by an authenticated user
- **THEN** the response is 200 with the chat page, as for `GET /chat`

### Requirement: Back and Forward move through the pages visited

On `popstate` the book SHALL show the page that the entry names, with the page-turn animation in the direction of travel through history: Back plays a backward turn and Forward a forward turn. An entry with a `recipeId` SHALL show that recipe, opened as any recipe is (in `cook` mode above 600px, on the Ingredients tab on a phone). An entry without one, including the page's first entry, SHALL show the contents. Showing a page in response to `popstate` SHALL NOT push or replace a history entry, except as "A recipe no longer in the book shows the contents" requires. A `popstate` that arrives while a page turn holds the animation lock SHALL be applied when that turn ends, so the page always ends up matching the URL.

#### Scenario: Back to the previous recipe

- **WHEN** the user opened recipe A and then turned to recipe B
- **AND** the user presses Back
- **THEN** recipe A is shown after a backward turn (`.page-turn-overlay.turn-backward` above 600px, `html[data-nav-direction="backward"]` at 600px or narrower)
- **AND** `location.search` is `?recipe=<A>` and `history.length` is unchanged

#### Scenario: Back to the contents

- **WHEN** the user opened recipe A from the contents and presses Back
- **THEN** the contents are shown after a backward turn, with the spread mode `contents`
- **AND** `location.search` is empty and `history.length` is unchanged

#### Scenario: Forward again

- **WHEN** the user has pressed Back from recipe B to recipe A
- **AND** presses Forward
- **THEN** recipe B is shown after a forward turn (`.page-turn-overlay.turn-forward` above 600px, `html[data-nav-direction="forward"]` at 600px or narrower)

#### Scenario: Back during a page turn

- **WHEN** the user presses Back while a page turn is still animating
- **THEN** once that turn ends the book shows the page the current history entry names (its recipe, or the contents if it has no `recipeId`)

### Requirement: A recipe no longer in the book shows the contents

When the book is asked for a recipe that the server no longer has (`GET /api/recipes/:id` answers 404), it SHALL show the contents instead of that recipe. This applies to a recipe named in the URL on load, by Back or Forward, by a contents row or by previous/next. It SHALL show a one-line sticky note `.missing-recipe-notice` (`role="status"`, sticky-note styling) reading "That recipe isn't in the book any more", SHALL leave the bare path in the URL, and SHALL NOT open any other recipe in its place. A `recipe_artifact` naming a missing recipe keeps the `web-chat` behaviour ("Recipe not found" on the right page).

#### Scenario: Unknown recipe on load

- **WHEN** the chat page loads with `?recipe=<id>` for a recipe that has been deleted
- **THEN** the contents are shown (`.index-title` visible, `body[data-view-mode]` is `index`) and no `.recipe-title` is on the page
- **AND** `.missing-recipe-notice` is visible with the text "That recipe isn't in the book any more"
- **AND** `location.search` is empty, through `history.replaceState`, so `history.length` is unchanged by it

#### Scenario: Recipe deleted before Back

- **WHEN** the user opened recipe A and then recipe B, and A is then deleted elsewhere
- **AND** the user presses Back
- **THEN** the contents are shown with `.missing-recipe-notice`
- **AND** `location.search` is empty and `history.length` is unchanged

#### Scenario: Opening a row whose recipe was deleted elsewhere

- **WHEN** the contents show a row for a recipe that has since been deleted elsewhere and is not in the prefetch cache
- **AND** the user clicks that row
- **THEN** the contents remain on the page with `.missing-recipe-notice` visible and the URL's path bare
- **AND** no other recipe opens

#### Scenario: The notice goes with the next page

- **WHEN** `.missing-recipe-notice` is shown and the user opens a recipe
- **THEN** the notice is no longer in the document

### Requirement: Meal plans and share links stay out of the URL

Showing a meal plan SHALL replace the current history entry with the bare path, because meal plans are not persisted (RV-107). Share pages (`/share/<token>`) SHALL neither read nor write the recipe URL state.

#### Scenario: A meal plan replaces the entry

- **WHEN** recipe A is open (`?recipe=<A>`) and a `meal_artifact` is displayed
- **THEN** `location.search` is empty and `history.length` is unchanged

#### Scenario: Reloading after a meal plan shows the contents

- **WHEN** a meal plan is displayed and the page is reloaded
- **THEN** the contents page is shown and no recipe or meal plan is open

#### Scenario: Share links are untouched

- **WHEN** a `/share/<token>` page is opened
- **THEN** it loads no `/static/app.js` and its `location.href` after load is the URL that was requested
