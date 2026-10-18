## MODIFIED Requirements

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
