## MODIFIED Requirements

### Requirement: Index splits across two pages

The index SHALL distribute recipes across the left and right book pages for balanced readability. The logic SHALL ensure that letter headers are not duplicated and that the grouping is robust.

#### Scenario: Even distribution without header duplication

- **WHEN** there are recipes spanning multiple letters
- **THEN** the grouping ensures each letter group is cohesive
- **AND** if a group must be split, the header is not repeated if the second half of the group is empty on that page

### Requirement: Index fetches fresh data

The index view SHALL always fetch fresh data from the server, even during responsive layout transitions.

#### Scenario: Resize re-renders with fresh data

- **WHEN** the viewport crosses the 600px boundary (desktop to mobile or vice-versa)
- **THEN** the application calls `showIndex()` which performs a fresh fetch of `/api/recipes`
- **AND** re-renders the index according to the new layout mode
