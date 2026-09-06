## MODIFIED Requirements

### Requirement: Design tokens define consistent theming

The CSS SHALL define design tokens as custom properties for colors, typography, spacing, and shadows.

#### Scenario: Custom properties are defined

- **WHEN** the chat page loads
- **THEN** CSS custom properties for wood colors, leather colors, paper colors, ink colors, and spacing are available on the root element

#### Scenario: Font tokens are defined

- **WHEN** the chat page loads
- **THEN** `--font-handwritten` resolves to the Kalam stack
- **AND** `--font-serif` resolves to the Libre Baskerville stack

#### Scenario: Annotation colour tokens are defined

- **WHEN** the chat page loads
- **THEN** `--color-biro` resolves to `#1f3d8a` and is used for margin note text
- **AND** `--color-sticky` resolves to `#fbe9a0` and is used for sticky note backgrounds

### Requirement: Transitions provide smooth interactions

UI state changes SHALL use CSS transitions for smooth, pleasant animations, and SHALL respect the user's reduced-motion preference.

#### Scenario: New messages animate in

- **WHEN** a new chat message appears in the notepad or a new note appears in the page margin
- **THEN** it fades in with a subtle upward slide over 200-300ms

#### Scenario: Hover states transition smoothly

- **WHEN** the user hovers over interactive elements
- **THEN** hover effects (shadow, scale) transition smoothly over 150ms

#### Scenario: Reduced motion disables note animation

- **WHEN** `prefers-reduced-motion: reduce` is active and a new margin note appears
- **THEN** the note is shown immediately without a fade or slide
