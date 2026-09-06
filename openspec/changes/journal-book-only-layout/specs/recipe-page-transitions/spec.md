## MODIFIED Requirements

### Requirement: Navigation is blocked during animation

The system SHALL ignore navigation inputs (button clicks, edge taps, footer links, swipe gestures, tab taps) while a page-turn, slide or tab crossfade animation is in progress, preventing double-navigation or animation corruption. Page turns and tab crossfades share one lock.

#### Scenario: Rapid clicking during animation

- **WHEN** a page-turn animation is playing and the user clicks a navigation arrow again
- **THEN** the click is ignored and no second animation begins
- **AND** the current animation completes normally

#### Scenario: Tab tap during a page turn

- **WHEN** a recipe navigation animation is playing on a phone and the user taps a page tab
- **THEN** the tap is ignored and the active tab does not change

#### Scenario: Navigation during a tab crossfade

- **WHEN** a tab crossfade is playing and the user swipes or taps a navigation control
- **THEN** the navigation is ignored until the crossfade completes

### Requirement: View transition name assigned on mobile

The `.pages-container` element SHALL have `view-transition-name: page-content` applied on mobile viewports (max-width: 600px) so the View Transitions API animates whichever page is visible (contents on the left page, recipe on the right page). This SHALL NOT be applied on desktop to avoid interfering with the overlay-based page turn.

#### Scenario: View transition name present on mobile

- **WHEN** the viewport width is 600px or less
- **THEN** `.pages-container` has `view-transition-name: page-content` applied via CSS
- **AND** `#page-left-content` and `#page-right-content` have no `view-transition-name` of their own

#### Scenario: View transition name absent on desktop

- **WHEN** the viewport width exceeds 600px
- **THEN** `.pages-container` does not have a `view-transition-name` set

## ADDED Requirements

### Requirement: Tab switch uses a crossfade on phone

Switching between the Ingredients, Method and Notes tabs on a phone SHALL crossfade the page content over 200ms rather than using the page-turn or slide animations.

#### Scenario: Tab crossfade

- **WHEN** the user taps a different tab on a viewport 600px wide or narrower
- **THEN** the current panel fades out, the new panel is applied, and it fades in, taking about 200ms in total
- **AND** no `data-nav-direction` attribute is set and no overlay is created

#### Scenario: Reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is active and the user taps a tab
- **THEN** the new panel is shown immediately without a fade

#### Scenario: Desktop tabs do not animate

- **WHEN** the user clicks an edge tab on a viewport wider than 600px
- **THEN** the right page scrolls to the section (or swaps to the thread) without a crossfade
