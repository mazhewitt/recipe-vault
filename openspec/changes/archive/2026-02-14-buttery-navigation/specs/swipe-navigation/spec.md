## ADDED Requirements

### Requirement: Swipe gesture triggers recipe navigation on mobile

The system SHALL detect horizontal swipe gestures on the recipe page on mobile and trigger recipe navigation with the page-turn animation. Swiping left SHALL navigate forward (next recipe). Swiping right SHALL navigate backward (previous recipe).

#### Scenario: Swipe left navigates forward

- **WHEN** the user swipes left (finger moves right-to-left) on the recipe page on mobile
- **AND** the horizontal distance exceeds 30% of the page width
- **THEN** the next recipe is loaded with a forward page-turn animation

#### Scenario: Swipe right navigates backward

- **WHEN** the user swipes right (finger moves left-to-right) on the recipe page on mobile
- **AND** the horizontal distance exceeds 30% of the page width
- **THEN** the previous recipe is loaded with a backward page-turn animation

#### Scenario: Swipe respects navigation boundaries

- **WHEN** the user swipes left on the last recipe in the list
- **THEN** the swipe snaps back and no navigation occurs
- **AND** when the user swipes right on the first recipe, navigation goes to the index view

### Requirement: Interactive swipe tracking follows finger

The page-turn overlay SHALL track the user's finger position in real-time during a swipe, mapping horizontal displacement to the overlay's `rotateY` angle. This creates a physical, interactive feel rather than a simple flick gesture.

#### Scenario: Page follows finger during swipe

- **WHEN** the user begins a horizontal swipe on mobile
- **THEN** a page-turn overlay appears and its rotation angle updates continuously to match the finger's horizontal position
- **AND** the rotation maps proportionally from 0deg (start position) to 180deg (opposite edge of page)

#### Scenario: Swipe commits past threshold

- **WHEN** the user lifts their finger after swiping past 30% of the page width
- **THEN** the overlay animates from its current angle to the full 180deg to complete the page turn
- **AND** the new recipe is loaded

#### Scenario: Swipe cancels below threshold

- **WHEN** the user lifts their finger before reaching 30% of the page width
- **THEN** the overlay animates back to 0deg (snap-back)
- **AND** no navigation occurs and the current recipe remains displayed

### Requirement: Swipe does not conflict with vertical scrolling

The system SHALL distinguish between horizontal swipe gestures (navigation) and vertical scroll gestures (reading long recipes). Vertical scrolling SHALL take priority when detected early in the gesture.

#### Scenario: Vertical scroll is not intercepted

- **WHEN** the user's initial touch movement is predominantly vertical (vertical distance exceeds horizontal by 2x within the first 30px of movement)
- **THEN** the gesture is treated as a vertical scroll
- **AND** no page-turn overlay is created and normal scrolling continues

#### Scenario: Horizontal swipe is not treated as scroll

- **WHEN** the user's initial touch movement is predominantly horizontal
- **THEN** the gesture is treated as a navigation swipe
- **AND** vertical scrolling is suppressed for the duration of this gesture

### Requirement: Swipe is only active on mobile

Swipe gesture handling SHALL only be active on mobile viewports (max-width: 600px). Desktop users navigate with the arrow buttons.

#### Scenario: Swipe on desktop has no effect

- **WHEN** the viewport width exceeds 600px
- **THEN** touch/swipe gesture handlers for navigation are not active

#### Scenario: Swipe activates on mobile

- **WHEN** the viewport width is 600px or less
- **THEN** swipe gesture handlers for navigation are active on the recipe page
