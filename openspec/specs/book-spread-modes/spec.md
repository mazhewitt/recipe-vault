# book-spread-modes Specification

## Purpose
The book is read in three ways — finding a recipe, cooking one, and asking
about one — and the spread is laid out for whichever is happening. The left page
is contextual: it holds the contents, the open recipe's ingredients, or the
conversation, selected by `body[data-spread-mode]` and the tab strip on the
book's left outer edge.

This capability owns the three modes, the strip that selects them, the implicit
transitions between them, and how the right page and the note slip respond. It
applies only above 600px: the phone has no spread, so it has no modes.

## Requirements

### Requirement: Left page is contextual

On viewports wider than 600px the left page SHALL show one of three things — the contents, the open recipe's ingredients, or the conversation — selected by the spread mode recorded in `body[data-spread-mode]` (`contents` | `cook` | `notes`).

#### Scenario: No recipe open
- **WHEN** no recipe or meal plan is displayed
- **THEN** the spread mode is `contents`
- **AND** the left page shows the first half of the contents and the right page the second half
- **AND** the left-edge tab strip offers the contents filters (All / Mains / Sweets, and Meals when enabled), plus Notes
- **AND** the note input is at the foot of the left page, the position it holds in every other state above 600px

#### Scenario: Recipe opened
- **WHEN** a recipe is opened from the contents, by `display_recipe`, by the previous/next controls or by a swipe
- **THEN** the spread mode becomes `cook`
- **AND** the left-edge tab strip offers Contents / Cook / Notes with Cook active
- **AND** `#note-input` keeps the bounding box it had on the contents page (tolerance 1px) and is displayed (not `display: none`, not `visibility: hidden`, non-zero size) on every animation frame of the page turn

#### Scenario: Phone is unaffected
- **WHEN** the viewport is 600px or narrower
- **THEN** no spread mode applies and the single page keeps its Ingredients / Method / Notes tabs
- **AND** `body[data-spread-mode]` has no effect on the layout

### Requirement: Cook mode splits the recipe across the spread

In `cook` mode the open recipe SHALL occupy the whole book, with its ingredients on the left page and its title, meta line and method on the right.

#### Scenario: Ingredients and method are both visible
- **WHEN** the spread mode is `cook` and a recipe is displayed
- **THEN** the left page shows the recipe's "Ingredients" section (`#page-left-content .tab-panel[data-tab="ingredients"]`)
- **AND** the right page shows the recipe's title, its meta line and its "Method" section, and no ingredients section
- **AND** the contents are not shown on either page

#### Scenario: Each half scrolls independently
- **WHEN** the ingredient list is longer than the left page
- **THEN** the left page scrolls without moving the method on the right

#### Scenario: A running timer keeps its step highlight
- **WHEN** a timer is running for a step of the open recipe and the spread mode changes to `cook`
- **THEN** the highlighted step remains highlighted in the method on the right page

#### Scenario: Recipe refresh preserves the mode
- **WHEN** the open recipe is re-rendered after a photo upload, an `update_recipe` or a difficulty refresh
- **THEN** the spread mode is unchanged and the ingredients remain on the left page
- **AND** no loading skeleton is shown, and `#page-left` and `#page-right` keep the `scrollTop` they had before the refresh (tolerance 1px), as family-recipe-ui "Refreshing the open recipe keeps the reader's place" requires

#### Scenario: Right-edge tabs stay on the edge in cook mode
(The heading is kept so the archive can match it; there are no right-edge tabs any more.)
- **WHEN** the spread mode is `cook` on a viewport wider than 600px
- **THEN** the right page's outer edge is plain: there is no `.edge-tabs` strip and no `.edge-tab` in the document
- **AND** `document.elementFromPoint` 6px inside the right page's outer edge, 116px and 214px below its top (where the ribbons hung), returns an element inside `#page-right`

### Requirement: Contents mode is reachable while a recipe is open

The left-edge tab strip SHALL offer a Contents tab while a recipe is open, restoring the contents to the left page without closing the recipe or changing the right page.

#### Scenario: Returning the contents to the left page
- **WHEN** the user selects the Contents tab while a recipe is open
- **THEN** the spread mode becomes `contents`
- **AND** the left page shows the contents honouring the remembered filter
- **AND** the right page keeps the recipe's title, meta line and method with the same content and the same `scrollTop` as before the switch
- **AND** the note input stays at the foot of the left page

#### Scenario: Opening another recipe from contents mode
- **WHEN** the user clicks a recipe in the contents while a recipe is already open
- **THEN** that recipe is displayed and the spread mode becomes `cook`

#### Scenario: Leaving the recipe restores the filter tabs
- **WHEN** the user navigates back to the contents view (the Recipe Book header or the index entry in the navigation sequence)
- **THEN** the left-edge tab strip reverts to the contents filters
- **AND** the filter active before the recipe was opened is restored

### Requirement: Mode changes respect the animation lock

A spread mode change SHALL be ignored while a page-turn or crossfade animation holds the lock, in the same way a tab change is.

#### Scenario: Mode change during a page turn
- **WHEN** the user selects a left-edge tab while a page-turn animation is running
- **THEN** the spread mode does not change

### Requirement: Meal plans keep the contents spread

A displayed meal plan SHALL NOT enter `cook` mode, because a meal is the one case where several recipes are wanted at once.

#### Scenario: Meal plan displayed
- **WHEN** a meal plan is displayed
- **THEN** the spread mode is `contents` or `notes` only
- **AND** the left-edge tab strip offers Contents / Notes without Cook
- **AND** the note input is displayed at the foot of the left page, so a follow-up such as "swap the side" can be written straight away

### Requirement: Mode changes leave the right page alone

While a recipe is open on a viewport wider than 600px, a spread mode change SHALL change the left page only. The right page SHALL keep the same content, the same scroll position and the same layout in `contents`, `cook` and `notes`.

#### Scenario: Switching modes does not touch the right page
- **WHEN** a recipe is open, `#page-right` is scrolled so that a mid-method step is in view, and the user switches Cook → Notes → Contents → Cook with the left-edge tabs
- **THEN** after each switch `#page-right-content .recipe-title`, `.recipe-meta-line` and every `.prep-step` have the bounding box they had before it (tolerance 1px)
- **AND** `#page-right.scrollTop` is unchanged
- **AND** `#page-right-content` never contains `.tab-panel[data-tab="ingredients"]`
- **AND** no margin column appears on the right page, so the method's width does not change

#### Scenario: The ingredients are relocated, never duplicated
- **WHEN** a recipe is open and the spread mode is any of `contents`, `cook` or `notes`
- **THEN** the document contains at most one `.ingredients-list`
- **AND** in `contents` and `notes` modes no `.ingredients-list` is displayed on either page
- **AND** returning to `cook` puts the same panel back on the left page, so `applyStepHighlight` and any ticked ingredients keep their single target

#### Scenario: The ribbons stay inert in every mode
- **WHEN** a recipe is open in `notes` or `contents` mode on a viewport wider than 600px
- **THEN** there are no ribbons to stay inert: the right page's edge holds no strip, there is no `.edge-tab` in the document, and a click 6px inside the right page's outer edge changes neither page's content nor `#page-right`'s `scrollTop`

### Requirement: Notes mode gives the conversation the left page

In `notes` mode the left page SHALL show the conversation for the open recipe, and the right page SHALL keep the recipe's title, meta line and method exactly as cook mode shows them.

#### Scenario: Conversation occupies the left page
- **WHEN** the spread mode is `notes`
- **THEN** the left page shows the thread for the open recipe, oldest first
- **AND** the right page shows the recipe's title, meta line and method as in cook mode, with no ingredients section
- **AND** the reply sticky (`#page-margin`) is not shown, because the whole thread is on the same page directly above the input

#### Scenario: Focusing the input selects no mode
- **WHEN** the user focuses or clicks the note input in any spread mode
- **THEN** the spread mode does not change and the input does not move
- **AND** the left-edge Notes tab is the only way into `notes` mode

#### Scenario: Notes mode with no recipe open
- **WHEN** the spread mode is `notes` and no recipe is displayed
- **THEN** the left page shows the book-level thread and the right page shows the contents

### Requirement: The note input has one home

On viewports wider than 600px the single note input SHALL sit at the foot of the left page in every state of the book, and SHALL never be hidden. The left page's scroll area SHALL leave room beneath its last line so the input never covers it.

#### Scenario: The note input keeps one position
- **WHEN** the viewport is wider than 600px and the book shows any of: the contents page, with the contents or the book-level thread on the left; a recipe in `contents`, `cook` or `notes` mode; a meal plan in `contents` or `notes` mode; or the right page's "Recipe not found" / "Failed to load recipe" message after a failed load
- **THEN** the single `.note-input` form is displayed at the foot of the left page: its right edge is left of the spine and its bottom edge is inside `#page-left`
- **AND** its bounding box is the same in every one of those states (tolerance 1px)
- **AND** no second input form exists in the document

#### Scenario: Contents mode keeps the input
- **WHEN** the spread mode is `contents` while a recipe or meal plan is open
- **THEN** the note input is displayed at the foot of the left page, exactly where it was in `cook` or `notes` mode
- **AND** no state above 600px gives `.note-input` `display: none`, `visibility: hidden` or a zero-size box

#### Scenario: A failed load keeps the input
- **WHEN** a recipe load fails (a 404 in an empty book, or a 5xx or network error) and the right page shows "Recipe not found" or "Failed to load recipe"
- **THEN** `.note-input` is displayed at the foot of the left page and accepts a note

#### Scenario: The left page's last line clears the input
- **WHEN** the left page's content (the contents, the ingredients or the thread) is scrolled to its end
- **THEN** the bottom edge of its last line is at or above the top edge of `.note-input`
- **AND** the room comes from bottom padding on the left page's scroll area, so no line above it moves

### Requirement: Each spread mode keeps its own left-page scroll

On viewports wider than 600px, while a recipe or meal plan is open, each spread mode (`contents`, `cook`, `notes`) SHALL keep its own `#page-left.scrollTop`. Leaving a mode SHALL record its position before the left page is swapped, and returning to it SHALL restore that position after the swap. A newly opened recipe SHALL start its `cook` position at 0.

#### Scenario: Contents to Cook brings the ingredients back where they were
- **WHEN** a recipe is open in `cook` mode with `#page-left.scrollTop` at 0, the cook switches to Contents, scrolls the contents to their end, and switches back to Cook
- **THEN** `#page-left.scrollTop` is 0 (tolerance 1px) and the first `.ingredient-item` is wholly visible

#### Scenario: Each mode has its own position
- **WHEN** the ingredients have been scrolled to 50px in `cook`, the contents to 200px in `contents` and the thread to a position P in `notes`, and the cook switches Cook → Contents → Notes → Cook
- **THEN** each switch shows the incoming mode's recorded position: 200 in `contents`, P in `notes` and 50 in `cook` (tolerance 1px)
- **AND** a position larger than the content allows is clamped by the browser, not treated as an error

#### Scenario: A round trip does not re-centre the contents
- **WHEN** the contents were drawn in `contents` mode with the current recipe's row scrolled into view, the cook scrolled them elsewhere, switched to Cook and back to Contents
- **THEN** the contents show the position the cook left them at, not the current row: the scroll-the-current-row-into-view of recipe-book-index "Contents highlights the last-viewed recipe" applies only when the contents are drawn fresh

#### Scenario: A newly opened recipe starts at the top of its ingredients
- **WHEN** the ingredients of recipe A were scrolled and the cook opens recipe B (from the contents, the page arrows or `display_recipe`)
- **THEN** B is shown in `cook` mode with `#page-left.scrollTop` of 0

#### Scenario: Restoring moves nothing else
- **WHEN** any spread mode switch restores a recorded position
- **THEN** the right page and the anchors of family-recipe-ui "Nothing on the page moves unless the cook acted on it" are unchanged, as "Mode changes leave the right page alone" requires
- **AND** the restored position is in place on the first animation frame on which the incoming mode's content is displayed, so no frame shows it at another position

#### Scenario: The phone is unaffected
- **WHEN** the viewport is 600px or narrower
- **THEN** this requirement does not apply: the phone tabs' positions are family-recipe-ui "Phone tabs keep their own scroll position"
