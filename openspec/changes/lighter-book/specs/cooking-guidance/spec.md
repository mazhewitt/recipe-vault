## MODIFIED Requirements

### Requirement: A step's duration starts its timer
Each method step with a duration SHALL render that duration as a button which starts a timer for that step locally, without a request to the assistant, and which shows it does so with a small clock before the time. It SHALL never replace a running timer by accident.

#### Scenario: The duration is a button
- **WHEN** a recipe is displayed whose step n has `duration_minutes` N
- **THEN** that step contains `button.step-duration[type="button"]` reading "N min", with `aria-label="Start a N minute timer for step n"`
- **AND** it keeps its chip look, with a clock drawn as its background image before the time, at a 15px font-size (14px at the desk: family-recipe-ui "Recipe text is sized for reading from the counter"), and passes family-recipe-ui's 44×44 hit-area test at every breakpoint
- **AND** the step's bounding box is the one a `span.step-duration` with the same text and class gives it (tolerance 1px)

#### Scenario: Tapping it starts a local timer
- **WHEN** no timer is running or waiting to be acknowledged and the cook taps step n's `.step-duration`
- **THEN** a timer for N minutes starts through the same `startTimer` path a `timer_start` event uses: the pill shows "Step n" and the time, step n gets the `timer-active` highlight, and the chime and wake lock behave as for any timer
- **AND** no request to `/api/chat` is made
- **AND** step n's `aria-current` does not change

#### Scenario: A running timer is not replaced by one tap
- **WHEN** a timer is running and the cook taps a `.step-duration`
- **THEN** the running timer keeps counting and its highlight stays
- **AND** the pill reads "Tap again to replace" for 4 seconds, with the same bounding box as before (tolerance 1px), and the tapped button gets `data-confirm`
- **AND** a second tap on the same button within those 4 seconds replaces the timer with the tapped step's timer and removes `data-confirm`
- **AND** after 4 seconds without a second tap the pill shows the running timer again and `data-confirm` is removed

#### Scenario: A finished timer is replaced at once
- **WHEN** the pill is in its finished state and the cook taps a `.step-duration`
- **THEN** the finished timer is acknowledged (its chime repeats stop) and the tapped step's timer starts, with no confirmation

#### Scenario: Duration buttons are inert during a page turn
- **WHEN** the cook taps a `.step-duration` while a page-turn or crossfade animation holds the lock
- **THEN** no timer starts
