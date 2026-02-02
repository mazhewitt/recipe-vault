## 1. Foundation & Setup

- [x] 1.1 Add Google Fonts import for Kalam font (weights 300, 400, 700) to HTML head
- [x] 1.2 Define CSS custom properties in :root for all design tokens (colors, typography, spacing, shadows)
- [x] 1.3 Add global reset and base styles (box-sizing, margin/padding reset, font-family)

## 2. Background & Layout Container

- [x] 2.1 Implement wood table background with gradient and noise texture overlay
- [x] 2.2 Add wood grain lines using repeating-linear-gradient pseudo-element
- [x] 2.3 Create main app-container with flexbox layout (notepad left, book right, 40px gap)
- [x] 2.4 Style section labels ("Notepad", "Recipe Book") with text-shadow

## 3. Notepad Component

- [x] 3.1 Create notepad container structure (fixed 380px width, flex column)
- [x] 3.2 Style notepad paper with aged cream-to-tan gradient background
- [x] 3.3 Add paper texture overlay using SVG filter
- [x] 3.4 Style notepad header with border-bottom and title
- [x] 3.5 Implement notepad-content area with overflow-y: auto scrolling
- [x] 3.6 Style chat messages with speaker labels (User:/AI: bold prefix)
- [x] 3.7 Style text input area with border and placeholder
- [x] 3.8 Add custom scrollbar styling for notepad (thin, paper-colored)

## 4. Recipe Book Structure

- [x] 4.1 Create book container structure (flex: 1, min-width 700px)
- [x] 4.2 Implement leather book cover with red gradient and texture overlay
- [x] 4.3 Add spine shadow down the center using gradient pseudo-element
- [x] 4.4 Create pages-container with flexbox for two pages side-by-side
- [x] 4.5 Style base page with cream gradient background

## 5. Recipe Book Pages

- [x] 5.1 Style left page with inset shadow on right edge (binding effect)
- [x] 5.2 Style right page with inset shadow on left edge (binding effect)
- [x] 5.3 Add center binding shadow gradients via pseudo-elements
- [x] 5.4 Implement page number styling (top of each page, left/right aligned)
- [x] 5.5 Implement overflow-y: auto for each page independently
- [x] 5.6 Add custom scrollbar styling for pages

## 6. Recipe Content Styling

- [x] 6.1 Style recipe title and label on left page
- [x] 6.2 Style section headers ("ingredients:", "preparation") with underline
- [x] 6.3 Style ingredients list with line-height and margins
- [x] 6.4 Style preparation steps with numbering and step notes
- [x] 6.5 Style serving notes and recipe notes (italic)

## 7. Recipe Metadata

- [x] 7.1 Create metadata container with flexbox layout at bottom of left page
- [x] 7.2 Implement difficulty dots (filled/empty circles)
- [x] 7.3 Embed inline SVG icons for serving dish, clock, pot, and wine glass (no external files)
- [x] 7.4 Style meta-item containers with icon, label, and value
- [x] 7.5 Ensure metadata stays anchored to bottom with margin-top: auto

## 8. Timer Widget

- [x] 8.1 Create timer widget with fixed positioning (top-right)
- [x] 8.2 Style speech bubble shape with border-radius and border
- [x] 8.3 Add speech bubble tail using ::before and ::after pseudo-elements
- [x] 8.4 Add clock SVG icon and timer text styling

## 9. JavaScript Updates

- [x] 9.1 Update HTML structure in CHAT_PAGE_HTML to new layout (notepad + book)
- [x] 9.2 Modify renderRecipe() to populate left page (title, ingredients, metadata)
- [x] 9.3 Modify renderRecipe() to populate right page (preparation steps)
- [x] 9.4 Implement empty state placeholder for recipe book when no recipe selected
- [x] 9.5 Update message rendering to use new notepad structure

## 10. Animations & Transitions

- [x] 10.1 Add fade-in + slide-up animation for new chat messages
- [x] 10.2 Add hover transitions for interactive elements (input, buttons)
- [x] 10.3 Adapt skeleton loading animation colors to match paper aesthetic

## 11. Responsive Behavior

- [x] 11.1 Add media query for viewports below 1000px (stack layout vertically)
- [x] 11.2 Adjust component widths to full-width in stacked layout
- [x] 11.3 Test and adjust spacing/sizing for tablet-size viewports
