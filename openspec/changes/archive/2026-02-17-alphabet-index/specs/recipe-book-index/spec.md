## ADDED Requirements

### Requirement: Index provides clickable alphabet navigation
The recipe index SHALL display a compact clickable A–Z alphabet row at the top of the index view.

#### Scenario: Alphabet row renders at top of index
- **WHEN** the index view is displayed
- **THEN** an A–Z navigation row is rendered above the grouped recipe entries

#### Scenario: Inactive letters are visibly disabled
- **WHEN** a letter has no recipes in the current index data
- **THEN** that letter is displayed in a disabled visual state
- **AND** selecting it does not trigger scrolling

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