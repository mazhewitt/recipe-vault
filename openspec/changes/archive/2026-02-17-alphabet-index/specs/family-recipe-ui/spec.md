## ADDED Requirements

### Requirement: Alphabet index navigation works across responsive layouts
The recipe book index alphabet navigation SHALL be usable in both wide side-by-side and narrow stacked layouts.

#### Scenario: Wide layout alphabet navigation
- **WHEN** the viewport is wider than the responsive stack breakpoint
- **THEN** the alphabet navigation is visible at the top of the index
- **AND** selecting a letter jumps to the matching index section

#### Scenario: Narrow layout alphabet navigation
- **WHEN** the viewport is at or below the responsive stack breakpoint
- **THEN** the alphabet navigation remains visible and clickable without overlapping index content
- **AND** selecting a letter jumps to the matching index section

### Requirement: Alphabet controls retain readability and affordance
Alphabet controls SHALL preserve readable typography and clear interactive affordance while remaining compact.

#### Scenario: Active and inactive letters are distinguishable
- **WHEN** the alphabet navigation is displayed
- **THEN** active letters are visually distinguishable from inactive letters
- **AND** inactive letters are non-interactive

#### Scenario: Compact styling remains operable
- **WHEN** the alphabet controls use minimal extra padding
- **THEN** users can still reliably select letters in desktop and touch-oriented layouts