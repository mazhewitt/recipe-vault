## Why

The current UI is functional but sterile. Users want a warm, personal experience that evokes the feeling of a cherished family recipe book - something inviting they'd want to spend time with in the kitchen. The AI chat should feel like jotting notes on a notepad, and recipes should feel like they're written in a treasured book passed down through generations.

## What Changes

- **Complete visual redesign** using the handwritten journal aesthetic (Kalam font, paper textures, wood background)
- **New layout structure**: Notepad (chat) on left, two-page Recipe Book on right, with timer widget
- **Recipe display transformation**: From side-panel list to open book with Ingredients (left page) and Preparation (right page)
- **Scrolling behavior**: Independent scrolling within notepad content and book pages, with subtle visual cues that maintain the physical metaphor
- **CSS architecture**: Replace inline styles with design tokens (CSS custom properties) for maintainability
- **Smooth, pleasant interactions**: Prioritize gentle transitions over snappy responses

## Capabilities

### New Capabilities

- `family-recipe-ui`: The complete family recipe book interface redesign, encompassing:
  - Design tokens (colors, typography, spacing, shadows)
  - Wood table background with texture
  - Notepad component for AI chat (aged paper aesthetic)
  - Recipe book component with leather cover and two-page spread
  - Timer widget (speech bubble style)
  - Scrolling behavior for both components
  - Responsive considerations for smaller screens

### Modified Capabilities

(none - this is a visual/structural change, not a behavior change to existing specs)

## Impact

- **Primary file**: `src/handlers/ui.rs` - complete replacement of CSS and HTML structure
- **JavaScript changes**: Update `renderRecipe()` to populate the two-page book format
- **Font dependency**: Add Google Fonts (Kalam) import
- **No backend changes**: API contracts remain unchanged
- **No database changes**: Recipe data model unchanged
- **Browser support**: Modern browsers with CSS custom properties support
