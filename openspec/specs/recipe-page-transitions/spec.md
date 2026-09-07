# recipe-page-transitions Specification

## Purpose
Handles visual transitions when navigating between recipes. Desktop uses a 3D page-turn overlay effect; mobile uses the View Transitions API for directional slide animations.

## Requirements

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

### Requirement: Page turn edge shadow

The page-turn overlay SHALL display a gradient shadow along its turning edge to simulate depth and page thickness during the animation.

#### Scenario: Shadow follows turning edge

- **WHEN** the page-turn animation is in progress
- **THEN** a gradient shadow is visible along the leading edge of the turning overlay
- **AND** the shadow intensity varies with the rotation angle (strongest near 90deg)

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
