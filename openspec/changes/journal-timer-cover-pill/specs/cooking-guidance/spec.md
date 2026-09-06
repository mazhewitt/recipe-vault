## MODIFIED Requirements

### Requirement: Timer tool
The system SHALL provide a start_timer MCP tool that accepts duration, label and an optional 1-based method step number, returning timer metadata for frontend execution.

#### Scenario: Start timer tool invocation
- **WHEN** AI calls start_timer with duration_minutes and label
- **THEN** tool returns timer_id and confirmation message

#### Scenario: Start timer with a step number
- **WHEN** AI calls start_timer with duration_minutes, label and step_number
- **THEN** tool returns timer_id, confirmation message and the same step_number

#### Scenario: Invalid step number is rejected
- **WHEN** AI calls start_timer with a step_number of 0 or a non-integer value
- **THEN** tool returns an invalid params error and no timer is started

#### Scenario: Timer event emission
- **WHEN** start_timer tool is called successfully
- **THEN** system emits timer_start SSE event with duration_minutes and label
- **AND** the event includes step_number when the tool was called with one, and omits the field otherwise

#### Scenario: Prompt guidance for step numbers
- **WHEN** the guided-cooking system prompt is built
- **THEN** it instructs the model to pass step_number when the waiting period belongs to a specific numbered step of the recipe

### Requirement: Frontend timer execution
The system SHALL display a countdown timer in the UI when timer_start event is received, showing remaining time and completing with a notification, and SHALL highlight the method step the timer belongs to while it is running on the recipe it was started from.

#### Scenario: Timer countdown display
- **WHEN** frontend receives timer_start SSE event
- **THEN** timer widget becomes visible and displays countdown (MM:SS format)

#### Scenario: Timer completion notification
- **WHEN** timer countdown reaches zero
- **THEN** system shows browser notification with timer label and plays completion alert
- **AND** any step highlight for that timer is removed

#### Scenario: Single active timer
- **WHEN** a new timer is started while one is already running
- **THEN** system replaces the previous timer with the new one
- **AND** the previous timer's step highlight is replaced by the new timer's highlight (or removed if the new timer has no step)

#### Scenario: Timer manual cancellation
- **WHEN** user clicks cancel/dismiss button on timer widget
- **THEN** timer stops counting and widget is hidden
- **AND** any step highlight for that timer is removed

#### Scenario: Step is highlighted while the timer runs
- **WHEN** a timer_start event with step_number N is received while recipe R is displayed
- **THEN** the method step with data-step N on the displayed recipe gets a pale highlight band and a small "timer running" label
- **AND** the frontend records that the timer belongs to recipe R

#### Scenario: Highlight is re-applied on re-render
- **WHEN** a timer with a step is running for recipe R and recipe R is rendered again (navigating away and back, or a page refresh of the same recipe)
- **THEN** the same step is highlighted again after rendering

#### Scenario: No highlight without a step or on another recipe
- **WHEN** a timer is running with no step_number, or a recipe other than the one the timer was started from is displayed
- **THEN** no method step carries the timer highlight
