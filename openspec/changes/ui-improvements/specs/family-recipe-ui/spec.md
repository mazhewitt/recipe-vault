## ADDED Requirements

### Requirement: Recipe photo opens full-window preview on click

The recipe photo in the recipe book SHALL open a full-window preview when clicked, with the preview image constrained to fit within the viewport.

#### Scenario: Click recipe photo shows preview
- **WHEN** a recipe is displayed with a photo
- **AND** the user clicks the photo
- **THEN** a full-window overlay appears showing the photo
- **AND** the photo is scaled to fit within the viewport width or height (whichever is smaller)

#### Scenario: Preview can be dismissed
- **WHEN** the photo preview overlay is visible
- **THEN** the user can dismiss it and return to the recipe view

### Requirement: Recipe photo view is display-only

The recipe photo display SHALL not include a replace-image control in the recipe view.

#### Scenario: Replace control is absent
- **WHEN** a recipe is displayed
- **THEN** no replace-image control is rendered alongside the recipe photo
