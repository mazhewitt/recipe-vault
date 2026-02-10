## MODIFIED Requirements

### Requirement: Recipe metadata displays with icons

The recipe metadata section SHALL display difficulty (as dots), servings, prep time, cook time, and total time with hand-drawn style icons.

#### Scenario: Difficulty renders as filled dots
- **WHEN** a recipe with difficulty level 2 is displayed
- **THEN** the difficulty indicator shows 2 filled dots and 3 empty dots

#### Scenario: Time values display with clock icons
- **WHEN** a recipe with prep time and cook time is displayed
- **THEN** prep time and cook time appear with clock/pot icons and formatted duration

#### Scenario: Total time displays when available
- **WHEN** a total time value is derived for a recipe
- **THEN** the total time appears in the metadata area with a clock-style icon and formatted duration

#### Scenario: Total time is omitted when unavailable
- **WHEN** a total time value is not available for a recipe
- **THEN** the total time metadata element is not rendered
