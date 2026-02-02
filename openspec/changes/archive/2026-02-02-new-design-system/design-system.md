# Recipe Vault Design System

A comprehensive design guide for building the Recipe Vault AI-first recipe application. This document provides all visual specifications, component guidelines, and styling rules needed to implement a consistent, warm, journal-like user interface.

---

## Design Philosophy

Recipe Vault embraces a **handwritten journal aesthetic** that evokes the warmth and personality of a family recipe book. The interface should feel like a cherished kitchen companion—personal, inviting, and tactile—while remaining functional and accessible.

### Core Principles

1. **Warmth over sterility** — Avoid clinical, app-like aesthetics. Favor textures, organic shapes, and warm tones.
2. **Handcrafted feel** — Typography and elements should feel hand-drawn, not machine-generated.
3. **Tactile depth** — Use shadows and layering to create the illusion of physical objects (paper, leather, wood).
4. **Focused simplicity** — Despite rich textures, keep the layout clean and content-focused.

---

## Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Wood Dark | `#2a1f17` | 42, 31, 23 | Background base, deep shadows |
| Wood Medium | `#3d2c20` | 61, 44, 32 | Background gradients |
| Wood Light | `#4a3628` | 74, 54, 40 | Background highlights |
| Leather Red | `#8B2D1A` | 139, 45, 26 | Book cover, accents, filled indicators |
| Leather Red Light | `#a33520` | 163, 53, 32 | Book cover gradients |
| Leather Red Bright | `#b83d28` | 184, 61, 40 | Book cover highlights |

### Paper Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Paper Cream | `#f8f4e8` | 248, 244, 232 | Book pages, clean paper |
| Paper Aged Light | `#f5edd8` | 245, 237, 216 | Notepad top gradient |
| Paper Aged | `#f0e6cc` | 240, 230, 204 | Notepad mid gradient |
| Paper Aged Medium | `#ebe0c4` | 235, 224, 196 | Notepad lower gradient |
| Paper Aged Dark | `#e0d3b5` | 224, 211, 181 | Notepad bottom, aged effect |

### Text Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Ink Dark | `#2d2418` | 45, 36, 24 | Primary text, headings |
| Ink Medium | `#5a4a3a` | 90, 74, 58 | Secondary text, icons |
| Ink Light | `#6b5a4a` | 107, 90, 74 | Tertiary text, notes, hints |
| Ink Muted | `#8a7a60` | 138, 122, 96 | Labels, page numbers |
| Placeholder | `#a0937a` | 160, 147, 122 | Input placeholders |

### UI Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Border Tan | `#c9a86c` | 201, 168, 108 | Dividers, input borders |
| Border Light | `#d4c4a8` | 212, 196, 168 | Subtle dividers |
| Label Cream | `#d4c4a8` | 212, 196, 168 | Section labels on dark bg |
| Accent Brown | `#6b4423` | 107, 68, 35 | Section headers |

---

## Typography

### Font Stack

```css
/* Primary - Handwritten */
font-family: 'Kalam', cursive;

/* Fallback stack */
font-family: 'Kalam', 'Caveat', 'Comic Sans MS', cursive;
```

### Font Import

```html
<link href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap" rel="stylesheet">
```

### Type Scale

| Element | Size | Weight | Line Height | Color |
|---------|------|--------|-------------|-------|
| Section Label | 22px | 400 | 1.2 | `#d4c4a8` |
| Recipe Title | 26px | 400 | 1.3 | `#2d2418` |
| Section Header | 18px | 400 | 1.4 | `#6b4423` |
| Component Header | 18px | 400 | 1.4 | `#2d2418` |
| Body Text | 14px | 400 | 1.6 | `#2d2418` |
| Ingredients | 13px | 400 | 1.7 | `#2d2418` |
| Preparation Steps | 12px | 400 | 1.65 | `#2d2418` |
| Labels | 10-11px | 400 | 1.4 | `#8a7a60` |
| Page Numbers | 14px | 400 | 1.2 | `#8a7a60` |
| Timer Display | 20px | 400 | 1.2 | `#2d2418` |

### Text Styling

- **Underlines**: Use `text-decoration: underline` with `text-underline-offset: 4px` for section headers
- **Emphasis**: Use `font-weight: 700` sparingly for speaker names in chat
- **Italic**: Use for notes, hints, and serving suggestions

---

## Layout

### Overall Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  [Timer Widget - Fixed Top Right]                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐              ┌───────────────────────────────┐ │
│  │  "Notepad"  │              │       "Recipe Book"           │ │
│  ├─────────────┤   40px gap   ├───────────────────────────────┤ │
│  │             │              │┌─────────────┬───────────────┐│ │
│  │   Notepad   │              ││  Left Page  │  Right Page   ││ │
│  │  Component  │◄────────────►││ Ingredients │  Preparation  ││ │
│  │             │              ││             │               ││ │
│  │             │              │└─────────────┴───────────────┘│ │
│  └─────────────┘              └───────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Spacing

| Element | Value |
|---------|-------|
| Page padding | 30px 50px |
| Component gap | 40px |
| Internal padding (notepad) | 16-20px |
| Internal padding (book pages) | 20px 28px |
| Section spacing | 16-20px |
| Line spacing in lists | 2-6px between items |

### Dimensions

| Element | Width | Height |
|---------|-------|--------|
| Notepad | 380px fixed | Flexible, max 580px |
| Recipe Book | Flexible (min 700px) | Flexible, max 580px |
| Book cover border | 12px sides, 8px top/bottom | — |
| Page minimum | 350px each | — |

---

## Components

### 1. Background

The background simulates a dark wooden table surface.

```css
background: 
  url("data:image/svg+xml,..."), /* Noise texture overlay */
  linear-gradient(90deg, 
    #2a1f17 0%, 
    #3d2c20 15%,
    #4a3628 30%,
    #3d2c20 45%,
    #2a1f17 50%,
    #3d2c20 55%,
    #4a3628 70%,
    #3d2c20 85%,
    #2a1f17 100%
  );
background-blend-mode: overlay, normal;
background-color: #2a1f17;
```

Optional wood grain lines using repeating gradients:

```css
background: repeating-linear-gradient(
  90deg,
  transparent 0px,
  transparent 80px,
  rgba(0,0,0,0.15) 80px,
  rgba(0,0,0,0.15) 82px,
  transparent 82px,
  transparent 160px,
  rgba(0,0,0,0.1) 160px,
  rgba(0,0,0,0.1) 161px
);
```

---

### 2. Section Labels

Labels that appear above components ("Notepad", "Recipe Book").

```css
.section-label {
  font-family: 'Kalam', cursive;
  font-size: 22px;
  color: #d4c4a8;
  text-align: center;
  margin-bottom: 12px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  letter-spacing: 1px;
}
```

---

### 3. Notepad Component

A simple aged paper pad for AI chat and recipe development.

#### Container Structure

```
┌──────────────────────────┐
│ Header: "Recipe Dev..."  │ ← Border bottom
├──────────────────────────┤
│                          │
│  Chat messages area      │ ← Scrollable
│  (User: ... / AI: ...)   │
│                          │
├──────────────────────────┤
│ Text input area          │ ← Fixed bottom
└──────────────────────────┘
```

#### Paper Styling

```css
.notepad-paper {
  background: linear-gradient(180deg, 
    #f5edd8 0%, 
    #f0e6cc 20%,
    #ebe0c4 50%,
    #e5d9bc 80%,
    #e0d3b5 100%
  );
  border-radius: 6px;
  box-shadow: 
    4px 4px 15px rgba(0,0,0,0.4),
    0 0 30px rgba(0,0,0,0.2);
}
```

#### Paper Texture (Optional)

```css
.notepad-paper::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
}
```

#### Header

```css
.notepad-header {
  padding: 16px 20px 12px 28px;
  border-bottom: 2px solid #c9a86c;
}

.notepad-header h2 {
  font-family: 'Kalam', cursive;
  font-size: 18px;
  color: #2d2418;
  font-weight: 400;
}
```

#### Chat Messages

```css
.message {
  margin-bottom: 16px;
}

.message-content {
  font-family: 'Kalam', cursive;
  font-size: 14px;
  line-height: 1.6;
  color: #2d2418;
}

.message-content strong {
  font-weight: 700;
}
```

Format: `**User:** message text` and `**AI:** response text`

#### Text Input

```css
.text-input {
  width: 100%;
  height: 60px;
  padding: 12px;
  border: 2px solid #c9a86c;
  border-radius: 4px;
  background: #fff;
  font-family: 'Kalam', cursive;
  font-size: 14px;
  resize: none;
  outline: none;
}

.text-input::placeholder {
  color: #a0937a;
}
```

---

### 4. Recipe Book Component

An open book showing two pages with a leather cover frame.

#### Structure

```
┌─────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Red leather cover
│ ▓ ┌─────────────────┬─────────────────┐ ▓ │
│ ▓ │    Left Page    │   Right Page    │ ▓ │
│ ▓ │                 │                 │ ▓ │
│ ▓ │   Ingredients   │   Preparation   │ ▓ │
│ ▓ │                 │                 │ ▓ │
│ ▓ │   [Metadata]    │                 │ ▓ │
│ ▓ └─────────────────┴─────────────────┘ ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└─────────────────────────────────────────────┘
```

#### Book Cover

```css
.book-cover {
  position: absolute;
  top: -8px;
  left: -12px;
  right: -12px;
  bottom: -8px;
  background: linear-gradient(180deg, 
    #8B2D1A 0%, 
    #a33520 10%,
    #b83d28 50%,
    #a33520 90%,
    #8B2D1A 100%
  );
  border-radius: 8px;
  box-shadow: 
    6px 6px 20px rgba(0,0,0,0.5),
    inset 0 0 20px rgba(0,0,0,0.2);
}
```

#### Leather Texture

```css
.book-cover::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='leather'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.5' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23leather)' opacity='0.08'/%3E%3C/svg%3E");
  border-radius: 8px;
}
```

#### Spine Shadow

```css
.book-cover::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  background: linear-gradient(90deg,
    rgba(0,0,0,0.3) 0%,
    rgba(0,0,0,0.1) 30%,
    rgba(255,255,255,0.05) 50%,
    rgba(0,0,0,0.1) 70%,
    rgba(0,0,0,0.3) 100%
  );
}
```

#### Page Styling

```css
.page {
  flex: 1;
  background: linear-gradient(180deg, 
    #f8f4e8 0%, 
    #f5f0e0 50%,
    #f0ebd8 100%
  );
  padding: 20px 28px;
  position: relative;
}

.page-left {
  border-radius: 4px 0 0 4px;
  box-shadow: inset -4px 0 12px rgba(0,0,0,0.08);
}

.page-right {
  border-radius: 0 4px 4px 0;
  box-shadow: inset 4px 0 12px rgba(0,0,0,0.05);
}
```

#### Center Binding Shadows

```css
/* Left page - shadow on right edge */
.page-left::after {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 15px; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0,0,0,0.08));
}

/* Right page - shadow on left edge */
.page-right::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 15px; height: 100%;
  background: linear-gradient(90deg, rgba(0,0,0,0.08), transparent);
  z-index: 1;
}
```

#### Page Numbers

Position at top of pages, left-aligned on left page, right-aligned on right page.

```css
.page-number {
  font-family: 'Kalam', cursive;
  font-size: 14px;
  color: #8a7a60;
  margin-bottom: 8px;
}
```

#### Recipe Title (Left Page)

```css
.recipe-label {
  font-family: 'Kalam', cursive;
  font-size: 14px;
  color: #8a7a60;
  margin-bottom: 4px;
}

.recipe-title {
  font-family: 'Kalam', cursive;
  font-size: 26px;
  color: #2d2418;
  margin-bottom: 16px;
}
```

#### Section Headers

```css
.section-header {
  font-family: 'Kalam', cursive;
  font-size: 18px;
  color: #6b4423;
  margin-bottom: 12px;
  padding-bottom: 4px;
  border-bottom: 1px solid #c9a86c;
  text-decoration: underline;
  text-underline-offset: 4px;
}
```

#### Ingredients List

```css
.ingredients-list {
  font-family: 'Kalam', cursive;
  font-size: 13px;
  line-height: 1.7;
  color: #2d2418;
}

.ingredient-line {
  margin-bottom: 2px;
}

.serving-note {
  font-style: italic;
  margin-top: 8px;
  color: #5a4a3a;
}
```

#### Preparation Steps

```css
.prep-list {
  font-family: 'Kalam', cursive;
  font-size: 12px;
  line-height: 1.65;
  color: #2d2418;
}

.prep-step {
  margin-bottom: 6px;
  text-indent: -8px;
  padding-left: 8px;
}

.step-note {
  color: #6b5a4a;
  font-style: italic;
}

.recipe-note {
  margin-top: 16px;
  font-style: italic;
  color: #6b5a4a;
  font-size: 12px;
}
```

---

### 5. Recipe Metadata

Icons and indicators displayed at the bottom of the left page.

#### Layout

```css
.recipe-meta {
  display: flex;
  gap: 20px;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #d4c4a8;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
```

#### Metadata Items

| Item | Icon Type | Notes |
|------|-----------|-------|
| Difficulty | 5 dots (filled/empty) | Filled = `#8B2D1A`, Empty = border only |
| Serves | Serving dish icon | SVG, 28x28px |
| Prep time | Clock icon | SVG, 28x28px |
| Cooking time | Pot/timer icon | SVG, 28x28px |
| Wine pairings | Wine glass icons | Multiple small icons |

#### Difficulty Dots

```css
.difficulty-dots {
  display: flex;
  gap: 3px;
}

.difficulty-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid #5a4a3a;
}

.difficulty-dot.filled {
  background: #8B2D1A;
  border-color: #8B2D1A;
}
```

#### Icon Styling

```css
.meta-icon svg {
  width: 28px;
  height: 28px;
  stroke: #5a4a3a;
  fill: none;
  stroke-width: 1.5;
}
```

---

### 6. Timer Widget

A floating speech-bubble style timer in the top-right corner.

```css
.timer-widget {
  position: fixed;
  top: 25px;
  right: 50px;
  background: #f5f0e5;
  border: 2px solid #2d2418;
  border-radius: 20px;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 3px 3px 10px rgba(0,0,0,0.3);
  z-index: 100;
}
```

#### Speech Bubble Tail

```css
.timer-widget::before {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 30px;
  width: 20px;
  height: 20px;
  background: #f5f0e5;
  border-right: 2px solid #2d2418;
  border-bottom: 2px solid #2d2418;
  transform: rotate(45deg);
}

/* Cover the inner corner */
.timer-widget::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 32px;
  width: 16px;
  height: 16px;
  background: #f5f0e5;
  transform: rotate(45deg);
}
```

#### Timer Content

```css
.timer-icon svg {
  width: 22px;
  height: 22px;
  stroke: #2d2418;
  fill: none;
  stroke-width: 2;
}

.timer-text {
  font-family: 'Kalam', cursive;
  font-size: 20px;
  color: #2d2418;
}
```

Format: `Timer: MM:SS`

---

## Icons

Use simple, hand-drawn style SVG icons with:
- Stroke-based rendering (no fills except for indicators)
- Stroke width: 1.5-2px
- Color: `#5a4a3a` for page content, `#2d2418` for timer

### Required Icons

| Icon | Usage | Suggested Source |
|------|-------|------------------|
| Clock/Timer | Timer widget, prep time | Custom or Lucide |
| Serving dish | Serves indicator | Custom |
| Pot/Pan | Cooking time | Custom |
| Wine glass | Wine pairings | Custom |
| Send arrow | Chat input | Custom or Lucide |

---

## Shadows & Depth

### Shadow Hierarchy

| Element | Shadow |
|---------|--------|
| Background objects (notepad, book) | `4-6px 4-6px 15-20px rgba(0,0,0,0.4)` |
| Floating elements (timer) | `3px 3px 10px rgba(0,0,0,0.3)` |
| Inset page shadows | `inset 4-8px 0 12px rgba(0,0,0,0.05-0.08)` |
| Subtle depth | `0 0 30px rgba(0,0,0,0.2)` |

### Layering (z-index)

| Layer | z-index | Elements |
|-------|---------|----------|
| Background | 0 | Wood texture, grain overlay |
| Content | 1 | Notepad, Recipe book |
| Floating UI | 100 | Timer widget |

---

## Responsive Considerations

### Minimum Viewport

- Minimum width: 1200px (desktop-first design)
- Recommended: 1400px+

### Breakpoint Suggestions

| Breakpoint | Behavior |
|------------|----------|
| < 1200px | Stack notepad above book, full width |
| < 900px | Simplify to single-page book view with tabs |
| < 600px | Mobile: Tab-based navigation between notepad and book |

### Touch Considerations

- Increase tap targets to minimum 44x44px on touch devices
- Consider swipe gestures for page turning on mobile

---

## Animation Guidelines

Keep animations subtle and purposeful to maintain the calm, journal-like atmosphere.

### Recommended Animations

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Page transitions | Fade or subtle slide | 200-300ms | ease-out |
| Timer updates | Number fade | 150ms | linear |
| New chat messages | Fade in + slight slide up | 250ms | ease-out |
| Button hover | Subtle scale or shadow | 150ms | ease |

### Avoid

- Bouncy or playful animations
- Page flip 3D effects (too distracting)
- Rapid or flashy transitions

---

## Accessibility

### Color Contrast

All text combinations meet WCAG AA standards:
- Primary text (`#2d2418`) on paper (`#f8f4e8`): ~10:1
- Secondary text (`#5a4a3a`) on paper: ~5.5:1
- Labels (`#8a7a60`) on paper: ~3.5:1 (decorative only)

### Focus States

```css
:focus {
  outline: 2px solid #8B2D1A;
  outline-offset: 2px;
}
```

### Screen Reader Considerations

- Use semantic HTML (`<header>`, `<main>`, `<article>`, `<section>`)
- Label all interactive elements
- Provide alt text for decorative backgrounds (or mark as decorative)
- Ensure timer announces updates via ARIA live regions

---

## File Structure Suggestion

```
/src
  /styles
    design-tokens.css    # CSS custom properties
    background.css       # Wood texture styles
    notepad.css          # Notepad component
    recipe-book.css      # Book component
    timer.css            # Timer widget
    typography.css       # Font imports and text styles
  /components
    Notepad/
    RecipeBook/
    Timer/
    ChatMessage/
```

---

## CSS Custom Properties

```css
:root {
  /* Colors - Wood */
  --color-wood-dark: #2a1f17;
  --color-wood-medium: #3d2c20;
  --color-wood-light: #4a3628;
  
  /* Colors - Leather */
  --color-leather: #8B2D1A;
  --color-leather-light: #a33520;
  --color-leather-bright: #b83d28;
  
  /* Colors - Paper */
  --color-paper-cream: #f8f4e8;
  --color-paper-aged: #f0e6cc;
  --color-paper-aged-dark: #e0d3b5;
  
  /* Colors - Text */
  --color-ink-dark: #2d2418;
  --color-ink-medium: #5a4a3a;
  --color-ink-light: #6b5a4a;
  --color-ink-muted: #8a7a60;
  
  /* Colors - UI */
  --color-border: #c9a86c;
  --color-border-light: #d4c4a8;
  
  /* Typography */
  --font-handwritten: 'Kalam', cursive;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;
  
  /* Shadows */
  --shadow-deep: 6px 6px 20px rgba(0,0,0,0.5);
  --shadow-medium: 4px 4px 15px rgba(0,0,0,0.4);
  --shadow-soft: 3px 3px 10px rgba(0,0,0,0.3);
  --shadow-inset: inset 4px 0 12px rgba(0,0,0,0.08);
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-pill: 20px;
}
```

---

## Reference Implementation

See the accompanying `recipe-app-mockup-v3.html` file for a complete static implementation of this design system.
