## MODIFIED Requirements

### Requirement: Timer widget displays as fixed speech bubble

The timer widget SHALL render as a cream pill clipped to the top-right edge of the recipe book cover, positioned relative to the book rather than the viewport, with a clock icon, the timer label and remaining time, and a close control with a target of at least 28×28px. It SHALL never overlap the user identity pill.

#### Scenario: Timer renders correctly

- **WHEN** a timer is running
- **THEN** the timer widget appears as a cream pill overlapping the top-right edge of the book cover with a clock icon, the timer label and the remaining time
- **AND** the pill has no speech-bubble tail

#### Scenario: Timer does not overlap the user pill

- **WHEN** a timer is running at the desktop or tablet breakpoint
- **THEN** the bounding box of the timer pill does not intersect the bounding box of the user identity pill
- **AND** the pill is fully visible within the viewport

#### Scenario: Close control is large enough

- **WHEN** the timer pill is visible at any breakpoint
- **THEN** the cancel button has a clickable area of at least 28×28 pixels

#### Scenario: Compact pill on phone

- **WHEN** a timer is running at the phone breakpoint (600px or narrower)
- **THEN** the pill sits at the top-right of the book frame at a height of 30px or less with smaller text and icon
- **AND** the cancel button still has a clickable area of at least 28×28 pixels

#### Scenario: Pill is hidden when no timer runs

- **WHEN** no timer is running
- **THEN** the timer widget is not displayed
