# recipe-page-transitions Specification

## Purpose
TBD - created by archiving change buttery-navigation. Update Purpose after archive.
## Requirements
### Requirement: Page turn animation on recipe navigation

The system SHALL animate recipe-to-recipe navigation with a 3D page-turn effect using CSS `rotateY` transforms. A temporary overlay containing the outgoing content SHALL rotate around the book spine (center edge), revealing the incoming recipe content beneath it. The overlay SHALL use `backface-visibility: hidden` so it disappears at 90deg, naturally revealing the new content.

#### Scenario: Forward page turn on desktop

- **WHEN** the user navigates to the next recipe on desktop
- **THEN** an overlay matching the right page appears over the current right-page content
- **AND** the overlay rotates from `rotateY(0)` to `rotateY(-180deg)` with `transform-origin: left center` over ~400ms ease-in-out
- **AND** the new recipe content is visible once the overlay passes 90deg

#### Scenario: Backward page turn on desktop

- **WHEN** the user navigates to the previous recipe on desktop
- **THEN** an overlay matching the left page appears over the current left-page content
- **AND** the overlay rotates from `rotateY(0)` to `rotateY(180deg)` with `transform-origin: right center` over ~400ms ease-in-out
- **AND** the new recipe content is visible once the overlay passes 90deg

#### Scenario: Forward page turn on mobile

- **WHEN** the user navigates to the next recipe on mobile (single page layout)
- **THEN** an overlay covering the full page appears over the current content
- **AND** the overlay rotates from `rotateY(0)` to `rotateY(-180deg)` with `transform-origin: left center`
- **AND** the new recipe content is visible once the overlay passes 90deg

#### Scenario: Backward page turn on mobile

- **WHEN** the user navigates to the previous recipe on mobile
- **THEN** an overlay covering the full page rotates from `rotateY(0)` to `rotateY(180deg)` with `transform-origin: right center`
- **AND** the new recipe content is visible once the overlay passes 90deg

### Requirement: Page turn edge shadow

The page-turn overlay SHALL display a gradient shadow along its turning edge to simulate depth and page thickness during the animation.

#### Scenario: Shadow follows turning edge

- **WHEN** the page-turn animation is in progress
- **THEN** a gradient shadow is visible along the leading edge of the turning overlay
- **AND** the shadow intensity varies with the rotation angle (strongest near 90deg)

### Requirement: Container dimensions are stable during transitions

The system SHALL lock the `.pages-container` height to its current computed value before starting a page-turn animation, and release it after the transition completes. This prevents layout reflow ("shrinking") during content swaps.

#### Scenario: No layout shift during navigation

- **WHEN** a page-turn animation plays
- **THEN** the `.pages-container` height does not change from its value at animation start
- **AND** the book cover, spine shadow, and navigation controls remain in their original positions throughout

#### Scenario: Height released after transition

- **WHEN** the page-turn animation completes
- **THEN** the explicit height lock is removed from `.pages-container`
- **AND** flexbox layout resumes normally for the new content

### Requirement: Reduced motion fallback

When the user has `prefers-reduced-motion: reduce` enabled, or the browser does not support CSS 3D transforms, the system SHALL replace the page-turn animation with an instant crossfade (opacity transition ~150ms).

#### Scenario: Reduced motion preference

- **WHEN** `prefers-reduced-motion: reduce` is active and the user navigates
- **THEN** the outgoing content fades out and the incoming content fades in over ~150ms
- **AND** no rotateY transform is applied

#### Scenario: No 3D transform support

- **WHEN** the browser does not support `transform: rotateY(1deg)` and the user navigates
- **THEN** the crossfade fallback is used instead of the page-turn animation

### Requirement: Navigation is blocked during animation

The system SHALL ignore navigation inputs (button clicks, edge taps, swipe gestures) while a page-turn animation is in progress, preventing double-navigation or animation corruption.

#### Scenario: Rapid clicking during animation

- **WHEN** a page-turn animation is playing and the user clicks a navigation arrow again
- **THEN** the click is ignored and no second animation begins
- **AND** the current animation completes normally

