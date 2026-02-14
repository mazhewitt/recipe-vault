## MODIFIED Requirements

### Requirement: Swipe gesture triggers recipe navigation on mobile

The system SHALL detect horizontal swipe gestures on the recipe page on mobile and trigger recipe navigation. Swiping left SHALL navigate forward (next recipe). Swiping right SHALL navigate backward (previous recipe). The visual animation is handled by the View Transitions API (or crossfade fallback) — the swipe handler only detects direction and triggers navigation.

#### Scenario: Swipe left navigates forward

- **WHEN** the user swipes left (finger moves right-to-left) on the recipe page on mobile
- **AND** the horizontal distance exceeds 30% of the page width
- **THEN** the next recipe is loaded with a forward slide animation via View Transitions

#### Scenario: Swipe right navigates backward

- **WHEN** the user swipes right (finger moves left-to-right) on the recipe page on mobile
- **AND** the horizontal distance exceeds 30% of the page width
- **THEN** the previous recipe is loaded with a backward slide animation via View Transitions

#### Scenario: Swipe respects navigation boundaries

- **WHEN** the user swipes left on the last recipe in the list
- **THEN** no navigation occurs
- **AND** when the user swipes right on the first recipe, navigation goes to the index view

### Requirement: Swipe does not conflict with vertical scrolling

The system SHALL distinguish between horizontal swipe gestures (navigation) and vertical scroll gestures (reading long recipes). Vertical scrolling SHALL take priority when detected early in the gesture.

#### Scenario: Vertical scroll is not intercepted

- **WHEN** the user's initial touch movement is predominantly vertical (vertical distance exceeds horizontal by 2x within the first 30px of movement)
- **THEN** the gesture is treated as a vertical scroll
- **AND** normal scrolling continues unimpeded

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

## REMOVED Requirements

### Requirement: Interactive swipe tracking follows finger

**Reason**: The interactive overlay-tracking swipe (mapping finger position to rotateY angle in real-time) is the source of scroll-conflict bugs and the Android layout collapse. Replaced by a simpler detect-direction-and-trigger pattern where the View Transitions API handles all visual animation.

**Migration**: Swipe gestures still work — swipe left/right past 30% threshold triggers navigation. The visual feedback now happens via View Transitions slide animation on release instead of an interactive overlay following the finger during the swipe.
