## MODIFIED Requirements

### Requirement: User can navigate to next recipe

The user SHALL be able to navigate to the next recipe in alphabetical order by clicking the forward arrow. Navigation SHALL trigger a page-turn animation and attempt to use prefetched data for instant rendering.

#### Scenario: Navigate to next recipe

- **WHEN** a recipe is displayed and the user clicks the ">" arrow
- **THEN** the system checks the prefetch cache for the next recipe's data
- **AND** a forward page-turn animation plays while the next recipe content is rendered behind the overlay

#### Scenario: Forward arrow disabled at end of list

- **WHEN** the last recipe in alphabetical order is displayed
- **THEN** the ">" arrow is visually disabled and clicking it has no effect

### Requirement: User can navigate to previous recipe

The user SHALL be able to navigate to the previous recipe in alphabetical order by clicking the back arrow. When on the first recipe, the back arrow SHALL return to the index. Navigation SHALL trigger a page-turn animation.

#### Scenario: Navigate to previous recipe

- **WHEN** a recipe is displayed and the user clicks the "<" arrow
- **THEN** a backward page-turn animation plays while the previous recipe content is rendered behind the overlay

#### Scenario: Back arrow from first recipe returns to index

- **WHEN** the first recipe in alphabetical order is displayed
- **THEN** clicking the "<" arrow triggers a backward page-turn animation and returns to the index view
- **AND** the index is re-fetched fresh

### Requirement: Navigation from placeholder state loads first recipe

When the index is displayed, clicking the forward arrow SHALL load the first recipe with a page-turn animation. Clicking the back arrow SHALL be disabled.

#### Scenario: Forward arrow from index

- **WHEN** the index is displayed and the user clicks the ">" arrow
- **THEN** a forward page-turn animation plays and the first recipe in alphabetical order is displayed
- **AND** the view mode changes to recipe view

#### Scenario: Back arrow from index

- **WHEN** the index is displayed and the user clicks the "<" arrow
- **THEN** nothing happens (the arrow is disabled since the index is the first page)
