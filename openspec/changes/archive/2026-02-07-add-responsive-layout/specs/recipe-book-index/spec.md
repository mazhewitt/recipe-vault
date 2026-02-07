## MODIFIED Requirements

### Requirement: Index splits across two pages

The index SHALL distribute recipes across the left and right book pages for balanced readability. On mobile viewports (≤600px), the index SHALL render as a single scrollable column on one page.

#### Scenario: Even distribution

- **WHEN** there are 10 recipes in the vault on a viewport wider than 600px
- **THEN** the left page displays the first 5 recipes (alphabetically) and the right page displays the last 5

#### Scenario: Odd number distribution

- **WHEN** there are 11 recipes in the vault on a viewport wider than 600px
- **THEN** the left page displays the first 6 recipes and the right page displays the last 5

#### Scenario: Single recipe

- **WHEN** there is 1 recipe in the vault
- **THEN** the left page displays that recipe and the right page is empty or hidden

#### Scenario: Single column on mobile

- **WHEN** the index is displayed on a viewport of 600px or less
- **THEN** all recipes render in a single alphabetically-ordered column on one page with letter headers
- **AND** the right page is hidden
