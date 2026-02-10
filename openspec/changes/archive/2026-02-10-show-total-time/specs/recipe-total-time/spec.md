## ADDED Requirements

### Requirement: Total time is derived from available timing data
The system SHALL derive a total time value from recipe timing fields for display in the UI.

#### Scenario: Prep and cook times present
- **WHEN** a recipe includes prep time and cook time values
- **THEN** the total time is the sum of prep time and cook time

#### Scenario: Only prep time present
- **WHEN** a recipe includes prep time but no cook time
- **THEN** the total time equals the prep time

#### Scenario: Only cook time present
- **WHEN** a recipe includes cook time but no prep time
- **THEN** the total time equals the cook time

#### Scenario: No prep/cook times but step durations present
- **WHEN** a recipe has no prep or cook time values
- **AND** one or more steps include durations
- **THEN** the total time equals the sum of the step durations

#### Scenario: No timing data available
- **WHEN** a recipe has no prep time, no cook time, and no step durations
- **THEN** no total time is produced
