## ADDED Requirements

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
