## MODIFIED Requirements

### Requirement: Page turn animation on recipe navigation

The system SHALL animate recipe-to-recipe navigation with a 3D page-turn effect on desktop and a View Transitions API slide animation on mobile. On desktop, a temporary overlay containing the outgoing content SHALL rotate around the book spine using CSS `rotateY` transforms. On mobile, the system SHALL use `document.startViewTransition()` to capture the old state and animate a directional slide to the new state.

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

#### Scenario: Forward navigation on mobile with View Transitions

- **WHEN** the user navigates to the next recipe on mobile and the browser supports `document.startViewTransition`
- **THEN** the system sets `data-nav-direction="forward"` on the document element
- **AND** calls `document.startViewTransition()` with a callback that renders the new recipe content
- **AND** the old content slides out to the left while the new content slides in from the right over ~250ms

#### Scenario: Backward navigation on mobile with View Transitions

- **WHEN** the user navigates to the previous recipe on mobile and the browser supports `document.startViewTransition`
- **THEN** the system sets `data-nav-direction="backward"` on the document element
- **AND** calls `document.startViewTransition()` with a callback that renders the new recipe content
- **AND** the old content slides out to the right while the new content slides in from the left over ~250ms

#### Scenario: Mobile navigation without View Transitions support

- **WHEN** the user navigates on mobile and the browser does not support `document.startViewTransition`
- **THEN** the system falls back to a crossfade transition (opacity fade ~150ms)

### Requirement: Reduced motion fallback

When the user has `prefers-reduced-motion: reduce` enabled, or the browser does not support CSS 3D transforms, the system SHALL replace the page-turn animation with an instant crossfade (opacity transition ~150ms). On mobile, reduced motion SHALL also disable the View Transitions slide animation and use a crossfade instead.

#### Scenario: Reduced motion preference on desktop

- **WHEN** `prefers-reduced-motion: reduce` is active and the user navigates on desktop
- **THEN** the outgoing content fades out and the incoming content fades in over ~150ms
- **AND** no rotateY transform is applied

#### Scenario: Reduced motion preference on mobile

- **WHEN** `prefers-reduced-motion: reduce` is active and the user navigates on mobile
- **THEN** the crossfade transition is used instead of the View Transitions slide animation

#### Scenario: No 3D transform support on desktop

- **WHEN** the browser does not support `transform: rotateY(1deg)` and the user navigates on desktop
- **THEN** the crossfade fallback is used instead of the page-turn animation

### Requirement: Container dimensions are stable during transitions

The system SHALL lock the `.pages-container` height to its current computed value before starting a desktop page-turn animation, and release it after the transition completes. On mobile, the View Transitions API handles layout stability natively (the old screenshot remains visible until the new state is painted), so no explicit height locking is needed.

#### Scenario: No layout shift during desktop navigation

- **WHEN** a page-turn animation plays on desktop
- **THEN** the `.pages-container` height does not change from its value at animation start
- **AND** the book cover, spine shadow, and navigation controls remain in their original positions throughout

#### Scenario: Height released after desktop transition

- **WHEN** the page-turn animation completes on desktop
- **THEN** the explicit height lock is removed from `.pages-container`
- **AND** flexbox layout resumes normally for the new content

#### Scenario: No layout collapse on mobile

- **WHEN** navigation occurs on mobile using View Transitions
- **THEN** the old content remains visually stable on screen until the slide animation begins
- **AND** no intermediate empty/skeleton state is visible to the user

## ADDED Requirements

### Requirement: View transition name assigned on mobile

The `#page-left-content` element SHALL have `view-transition-name: page-content` applied on mobile viewports (max-width: 600px) so the View Transitions API can track it as the animating element. This SHALL NOT be applied on desktop to avoid interfering with the overlay-based page turn.

#### Scenario: View transition name present on mobile

- **WHEN** the viewport width is 600px or less
- **THEN** `#page-left-content` has `view-transition-name: page-content` applied via CSS

#### Scenario: View transition name absent on desktop

- **WHEN** the viewport width exceeds 600px
- **THEN** `#page-left-content` does not have a `view-transition-name` set
