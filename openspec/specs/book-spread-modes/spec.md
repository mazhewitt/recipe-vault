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
- **AND** the note input keeps its position at the foot of the right page, because no Contents tab exists here to return from

#### Scenario: Recipe opened
- **WHEN** a recipe is opened from the contents, by `display_recipe`, by the previous/next controls or by a swipe
- **THEN** the spread mode becomes `cook`
- **AND** the left-edge tab strip offers Contents / Cook / Notes with Cook active

#### Scenario: Phone is unaffected
- **WHEN** the viewport is 600px or narrower
- **THEN** no spread mode applies and the single page keeps its Ingredients / Method / Notes tabs
- **AND** `body[data-spread-mode]` has no effect on the layout

### Requirement: Cook mode splits the recipe across the spread

In `cook` mode the open recipe SHALL occupy the whole book, with its ingredients on the left page and its method on the right.

#### Scenario: Ingredients and method are both visible
- **WHEN** the spread mode is `cook` and a recipe is displayed
- **THEN** the left page shows the recipe's `ingredients:` section
- **AND** the right page shows the recipe's `method:` section
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

#### Scenario: Right-edge tabs stay on the edge in cook mode
- **WHEN** the spread mode is `cook` on a viewport wider than 600px
- **THEN** the right-edge Ingredients / Method strip is still shown, because it is the book's furniture and an empty edge reads as a missing page
- **AND** selecting either tab does not change what the right page shows, since the ingredients are on the left page and the method is already on the right

### Requirement: Notes mode gives the conversation a full page

In `notes` mode the left page SHALL show the conversation for the open recipe and host the note input, and the right page SHALL show the whole recipe.

#### Scenario: Conversation occupies the left page
- **WHEN** the spread mode is `notes`
- **THEN** the left page shows the thread for the open recipe, oldest first
- **AND** the right page shows the recipe's ingredients and method as one scrolling page

#### Scenario: The note input keeps one position
- **WHEN** the spread mode is `cook` or `notes`
- **THEN** the single `.note-input` form is positioned at the foot of the left page, the same place in both
- **AND** no second input form exists in the document

#### Scenario: Contents mode carries no input
- **WHEN** the spread mode is `contents` while a recipe or meal plan is open
- **THEN** the note input is not shown, because the contents are for finding a recipe rather than writing
- **AND** the Notes tab on the same strip brings it back

#### Scenario: Focusing the input selects no mode
- **WHEN** the user focuses or clicks the note input in any spread mode
- **THEN** the spread mode does not change and the input does not move
- **AND** the left-edge Notes tab is the only way into `notes` mode

#### Scenario: Notes mode with no recipe open
- **WHEN** the spread mode is `notes` and no recipe is displayed
- **THEN** the left page shows the book-level thread and the right page shows the contents

### Requirement: Contents mode is reachable while a recipe is open

The left-edge tab strip SHALL offer a Contents tab while a recipe is open, restoring the contents to the left page without closing the recipe.

#### Scenario: Returning the contents to the left page
- **WHEN** the user selects the Contents tab while a recipe is open
- **THEN** the spread mode becomes `contents`
- **AND** the left page shows the contents honouring the remembered filter
- **AND** the right page continues to show the whole open recipe

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
