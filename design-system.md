# Recipe Vault Design System

A comprehensive design guide for the Recipe Vault AI-first recipe application. Covers the visual language, component specifications, and responsive layout strategy across desktop, tablet, and mobile.

---

## Design Philosophy

Recipe Vault embraces a **handwritten journal aesthetic** that evokes the warmth and personality of a family recipe book. The interface should feel like a cherished kitchen companion — personal, inviting, and tactile — while remaining functional and accessible.

### Core Principles

1. **Warmth over sterility** — Avoid clinical, app-like aesthetics. Favor textures, organic shapes, and warm tones.
2. **Handcrafted feel** — Typography and elements should feel hand-drawn, not machine-generated.
3. **Tactile depth** — Use shadows and layering to create the illusion of physical objects (paper, leather, wood).
4. **Focused simplicity** — Despite rich textures, keep the layout clean and content-focused.
5. **Recipe first** — On all screen sizes, the recipe book is the primary content. Chat supports it.

---

## Color Palette

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-wood-dark` | `#2a1f17` | Background base, deep shadows |
| `--color-wood-medium` | `#3d2c20` | Background gradients |
| `--color-wood-light` | `#4a3628` | Background highlights |
| `--color-leather` | `#8B2D1A` | Book cover, accents, filled indicators |
| `--color-leather-light` | `#a33520` | Book cover gradients |
| `--color-leather-bright` | `#b83d28` | Book cover highlights, hover states |

### Paper Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-paper-cream` | `#f8f4e8` | Book pages, clean paper |
| `--color-paper-aged-light` | `#f5edd8` | Notepad top gradient |
| `--color-paper-aged` | `#f0e6cc` | Notepad mid gradient, nav buttons |
| `--color-paper-aged-medium` | `#ebe0c4` | Notepad lower gradient |
| `--color-paper-aged-dark` | `#e0d3b5` | Notepad bottom, aged effect, hover bg |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-ink-dark` | `#2d2418` | Primary text, headings |
| `--color-ink-medium` | `#5a4a3a` | Secondary text, icons |
| `--color-ink-light` | `#6b5a4a` | Tertiary text, notes, hints |
| `--color-ink-muted` | `#8a7a60` | Labels, page numbers |
| `--color-placeholder` | `#a0937a` | Input placeholders |

### UI Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-border` | `#c9a86c` | Dividers, input borders |
| `--color-border-light` | `#d4c4a8` | Subtle dividers |
| `--color-label-cream` | `#d4c4a8` | Section labels on dark bg |
| `--color-accent-brown` | `#6b4423` | Section headers |

---

## Typography

Two families (Journal 2.0, 2026-09): **Kalam** is the handwriting — titles, section headers, letter headers, labels, step numbers, metadata, chat/notes. **Libre Baskerville** is the reading text — ingredients, method steps, contents entries.

### Font Stack

```css
--font-handwritten: 'Kalam', 'Caveat', cursive;
--font-serif: 'Libre Baskerville', Georgia, 'Times New Roman', serif;
```

Load via Google Fonts: `Kalam:wght@300;400;700` and `Libre+Baskerville:ital,wght@0,400;0,700;1,400` (with `preconnect` to `fonts.gstatic.com`).

### Type Scale

| Element | Font | Size | Weight | Line Height | Color |
|---------|------|------|--------|-------------|-------|
| Section Label | Kalam | 22px | 400 | 1.2 | label-cream |
| Recipe Title | Kalam | 27px | 400 | 1.3 | ink-dark |
| Contents Title | Kalam | 30px | 700 | 1.3 | ink-dark |
| Contents Letter Header | Kalam | 22px | 700 | 1.4 | leather |
| Section Header | Kalam | 19px | 400 | 1.4 | accent-brown |
| Component Header | Kalam | 18px | 400 | 1.4 | ink-dark |
| Step Number | Kalam | 18px | 700 | 1.4 | leather |
| Contents Entry | Libre Baskerville | 15px | 400 | 1.35 | ink-dark |
| Body / Chat | Kalam | 15px | 400 | 1.6 | ink-dark |
| Meta Line | Kalam | 15px | 400 | 1.4 | ink-medium |
| Ingredients | Libre Baskerville | 14px | 400 | 1.7 | ink-dark |
| Method Steps | Libre Baskerville | 14px | 400 | 1.65 | ink-dark |
| Contents Page Number / Footer | Kalam | 13–14px | 400 | 1.4 | ink-light |
| Labels | Kalam | 11px | 400 | 1.4 | ink-muted |
| Timer Display | Kalam | 20px | 400 | 1.2 | ink-dark |

**Contrast rule:** on paper, nothing under 16px may be lighter than `--color-ink-light` (`#6b5a4a`). `--color-ink-muted` (`#8a7a60`) is decorative only (separators, disabled letters).

### Mobile Type Adjustments

On mobile (≤ 600px), increase base sizes for readability on small screens:

| Element | Desktop | Mobile |
|---------|---------|--------|
| Recipe Title | 27px | 24px |
| Contents Title | 30px | 24px |
| Contents Letter Header | 22px | 20px |
| Contents Entry | 15px | 16px |
| Body / Chat | 15px | 16px (system minimum) |
| Ingredients | 14px | 15px |
| Method Steps | 14px | 15px |
| Meta Line | 15px | 14px |

---

## Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight gaps |
| `--space-sm` | 8px | Small gaps, item margins |
| `--space-md` | 16px | Standard section spacing |
| `--space-lg` | 24px | Section spacing |
| `--space-xl` | 40px | Component gap (desktop) |

---

## Shadows & Depth

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-deep` | `6px 6px 20px rgba(0,0,0,0.5)` | Book cover |
| `--shadow-medium` | `4px 4px 15px rgba(0,0,0,0.4)` | Notepad |
| `--shadow-soft` | `3px 3px 10px rgba(0,0,0,0.3)` | Timer, floating elements |
| `--shadow-inset-left` | `inset -4px 0 12px rgba(0,0,0,0.08)` | Left page |
| `--shadow-inset-right` | `inset 4px 0 12px rgba(0,0,0,0.05)` | Right page |

---

## Responsive Layout Strategy

### Breakpoints

| Name | Range | Layout Mode |
|------|-------|-------------|
| **Desktop** | > 1024px | Side-by-side: notepad + recipe book |
| **Tablet Portrait** | 601px – 1024px | Stacked: recipe book on top, chat below |
| **Mobile** | ≤ 600px | Tab switching: recipe book OR chat (full screen) |

### Viewport Meta

```html
<!-- Current (desktop-only) -->
<meta name="viewport" content="width=1200, initial-scale=1.0">

<!-- Required for responsive -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

## Layout: Desktop (> 1024px)

The current production layout. Notepad and recipe book side by side.

```
┌──────────────────────────────────────────────────────────┐
│                                    [user@email  Logout]  │
│                                                          │
│  ┌───────────┐              ┌──────────────────────────┐ │
│  │ "Notepad" │              │     "Recipe Book"        │ │
│  ├───────────┤   40px gap   ├──────────────────────────┤ │
│  │           │              │ < ┌──────────┬─────────┐>│ │
│  │  Chat     │              │   │ Left Pg  │Right Pg │ │ │
│  │  Messages │◄────────────►│   │          │         │ │ │
│  │           │              │   │          │         │ │ │
│  │  [input]  │              │   └──────────┴─────────┘ │ │
│  └───────────┘              └──────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Dimensions

| Element | Width | Height |
|---------|-------|--------|
| `.app-container` | max-width 1400px | calc(100vh - 60px) |
| `.notepad-container` | 380px fixed | 100% of container |
| `.book-container` | flex: 1, min-width 700px | 100% of container |
| Body padding | 30px 50px | — |
| Component gap | 40px | — |

---

## Layout: Tablet Portrait (601px – 1024px)

Stacked layout with recipe book on top (primary content) and chat below.

```
┌──────────────────────────────────┐
│             [user@email Logout]  │
│                                  │
│  ┌────────────────────────────┐  │
│  │       "Recipe Book"        │  │
│  ├────────────────────────────┤  │
│  │ < ┌───────────┬──────────┐>│  │
│  │   │ Left Page │Right Page│ │  │
│  │   │           │          │ │  │
│  │   └───────────┴──────────┘ │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │         "Notepad"          │  │
│  ├────────────────────────────┤  │
│  │  Chat messages             │  │
│  │  [input]                   │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### Tablet Specifications

| Property | Value | Notes |
|----------|-------|-------|
| Layout direction | `flex-direction: column` | — |
| Visual order | Recipe book first, chat second | Use `order` or DOM order |
| Body padding | 20px | Reduced from 50px |
| Component gap | 24px | Reduced from 40px |
| Book min-width | 100% (remove 700px min) | Full width of container |
| Book height | ~55% of viewport | Recipe is primary |
| Notepad width | 100% | Full width of container |
| Notepad height | ~40% of viewport | Secondary, scrollable |
| Two-page spread | **Preserved** | iPad portrait ≥ 601px has enough width |

### Tablet Behavior

- The two-page book spread still works on iPad portrait (768px) — each page gets ~350px which is adequate
- Both sections scroll independently within their allocated heights
- The wood background extends full height
- Section labels remain visible above each component
- Navigation arrows function identically to desktop

---

## Layout: Mobile (≤ 600px)

Full-screen tab switching between recipe book and chat. The two-page book metaphor is replaced by a single-page view.

```
┌────────────────────────┐     ┌────────────────────────┐
│ [user@email]   Logout  │     │ [user@email]   Logout  │
│                        │     │                        │
│ ┌────────────────────┐ │     │ ┌────────────────────┐ │
│ │    Recipe Book     │ │     │ │     Notepad        │ │
│ ├────────────────────┤ │     │ ├────────────────────┤ │
│ │  < Single Page  >  │ │     │ │                    │ │
│ │                    │ │     │ │  Chat messages     │ │
│ │  (Ingredients OR   │ │     │ │                    │ │
│ │   Preparation OR   │ │     │ │                    │ │
│ │   Index)           │ │     │ │                    │ │
│ │                    │ │     │ │  [input]           │ │
│ └────────────────────┘ │     │ └────────────────────┘ │
│                        │     │                        │
│ ┌──────────┬─────────┐ │     │ ┌──────────┬─────────┐ │
│ │ 📖 Book  │ 💬 Chat │ │     │ │ 📖 Book  │ 💬 Chat │ │
│ └──────────┴─────────┘ │     │ └──────────┴─────────┘ │
└────────────────────────┘     └────────────────────────┘
     (Book tab active)              (Chat tab active)
```

### Mobile Book View: Single Page

On mobile, the recipe book shows a **single page** at a time instead of a two-page spread.

```
Recipe View - Page Sequence:
┌────────────┐   swipe/   ┌────────────┐
│ Ingredients │ ───────►  │ Preparation │
│ + Title     │  arrows   │ + Steps     │
│ + Metadata  │           │ + Notes     │
└────────────┘  ◄──────── └────────────┘
```

**Why single page?** Two 150px pages are unreadable. A single page at ~340px (with padding) gives comfortable reading.

### Mobile Specifications

| Property | Value | Notes |
|----------|-------|-------|
| Body padding | 0 | Edge-to-edge on mobile |
| Background | Simplified or hidden | Wood texture optional (perf) |
| Book cover | Reduced or hidden | Border thickness: 4px instead of 12px |
| Book spine shadow | Hidden | No center divider with single page |
| Page padding | 16px | Reduced from 28px |
| Minimum tap target | 44px x 44px | All interactive elements |
| Tab bar height | 52px | Fixed bottom |
| Tab bar background | Paper aged color or leather | Match aesthetic |

### Mobile Tab Bar

A bottom tab bar for switching between Recipe Book and Chat views.

```css
/* Conceptual - not production CSS */
.mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 52px;
    display: flex;
    background: var(--color-paper-aged);
    border-top: 2px solid var(--color-border);
    z-index: 100;
}

.mobile-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: var(--font-handwritten);
    font-size: 14px;
    color: var(--color-ink-medium);
    cursor: pointer;
}

.mobile-tab.active {
    color: var(--color-leather);
    font-weight: 700;
    border-bottom: 3px solid var(--color-leather);
}
```

### Mobile Recipe Page Flip

Within the recipe view, users switch between ingredients and preparation:

| Mechanism | Details |
|-----------|---------|
| **Swipe** | Horizontal swipe to flip between pages |
| **Page indicator** | Dots or "1 / 2" at bottom of book area |
| **Arrow buttons** | Keep `<` and `>` at top, but now they cycle: Index → Page 1 (Ingredients) → Page 2 (Preparation) → Next recipe Page 1 → ... |

**Alternative (simpler):** Single scrollable page with ingredients on top, preparation below, separated by a divider. No page flipping needed.

### Mobile Index View

The alphabetical index renders as a single scrollable column instead of split across two pages:

```
┌────────────────────────┐
│     ~ Index ~          │
│                        │
│  C                     │
│    Cauliflower Soup    │
│    Chicken Biryani     │
│                        │
│  K                     │
│    Kung Pao Chicken    │
│                        │
│  L                     │
│    Lamb Rogan Josh     │
│  ...                   │
└────────────────────────┘
```

### Mobile Navigation Behavior

Navigation arrows (`<` / `>`) work the same as desktop in terms of recipe sequence. Within a recipe, the concept of "left page" and "right page" may be flattened to a single scrollable view.

| State | Left arrow | Right arrow |
|-------|------------|-------------|
| Index | Disabled | → First recipe |
| First recipe | → Index | → Next recipe |
| Middle recipe | → Prev recipe | → Next recipe |
| Last recipe | → Prev recipe | Disabled |

---

## Component: Background

The background simulates a dark wooden table surface.

- **Desktop/Tablet**: Full wood texture with grain lines (using `::before` pseudo-element)
- **Mobile**: Consider a simplified solid dark background or a single gradient to reduce rendering cost

---

## Component: Notepad

A simple aged paper pad for AI chat and recipe development.

```
┌──────────────────────────┐
│ Header: "Recipe Dev..."  │ ← border-bottom
├──────────────────────────┤
│                          │
│  Chat messages area      │ ← scrollable
│  (User: ... / AI: ...)   │
│                          │
├──────────────────────────┤
│ Loading indicator        │ ← when active
├──────────────────────────┤
│ Text input area          │ ← fixed bottom
└──────────────────────────┘
```

### Notepad Responsive Adjustments

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Width | 380px fixed | 100% | 100% |
| Header padding | 16px 20px 12px 28px | Same | 12px 16px 10px 16px |
| Content padding | 16px 20px 16px 28px | Same | 12px 16px |
| Input height | 60px | 60px | 48px |
| Paper shadow | Full | Reduced | None or subtle |
| Border radius | 6px | 6px | 0 (edge-to-edge) |

---

## Component: Recipe Book

An open book showing two pages with a leather cover frame.

### Desktop / Tablet: Two-Page Spread

```
┌─────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Leather cover
│ ▓ ┌─────────────────┬─────────────────┐ ▓ │
│ ▓ │    Left Page    │   Right Page    │ ▓ │
│ ▓ │   Ingredients   │   Preparation   │ ▓ │
│ ▓ │   [Metadata]    │                 │ ▓ │
│ ▓ └─────────────────┴─────────────────┘ ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└─────────────────────────────────────────────┘
```

### Mobile: Single Page

```
┌───────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Thinner leather border
│ ▓ ┌─────────────────────┐ ▓ │
│ ▓ │    Single Page      │ ▓ │
│ ▓ │    (full recipe)    │ ▓ │
│ ▓ │                     │ ▓ │
│ ▓ └─────────────────────┘ ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└───────────────────────────┘
```

### Book Responsive Adjustments

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Min width | 700px | 100% | 100% |
| Page layout | Two-page flex | Two-page flex | Single page |
| Cover border | 12px sides, 8px top/bottom | Same | 4px all sides |
| Page padding | 20px 28px | 16px 20px | 16px |
| Spine shadow | Visible | Visible | Hidden |
| Nav arrow size | 29px | 36px (larger tap target) | 44px |

---

## Component: Index View

The alphabetical recipe index, displayed as the default state of the recipe book.

### Desktop / Tablet

Recipes split across two pages, grouped by first letter:

```
Left Page                    Right Page
┌──────────────────┐        ┌──────────────────┐
│   ~ Index ~      │        │  L               │
│                  │        │    Lamb Rogan     │
│  C               │        │                  │
│    Cauliflower   │        │  O               │
│    Chicken...    │        │    Oat Cakes     │
│                  │        │                  │
│  K               │        │  P               │
│    Kung Pao      │        │    Potato Gratin │
└──────────────────┘        └──────────────────┘
```

### Mobile

Single scrollable column:

```
┌──────────────────────────┐
│       ~ Index ~          │
│                          │
│  C                       │
│    Cauliflower Soup      │
│    Chicken Biryani       │
│    Chicken Pepper Soup   │
│    Chilli (Meat)         │
│    Chilli (Vegetarian)   │
│                          │
│  K                       │
│    Kung Pao Chicken      │
│                          │
│  L                       │
│    Lamb Rogan Josh       │
│  ...                     │
└──────────────────────────┘
```

---

## Component: Timer Widget

A floating speech-bubble style timer.

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Position | Fixed top-right (25px, 50px) | Fixed top-right (10px, 20px) | Fixed top-right (10px, 12px) |
| Size | Standard | Standard | Compact (smaller padding) |
| Bubble tail | Visible | Visible | Hidden (simpler pill shape) |

---

## Component: User Info / Logout

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Position | Fixed top-right | Fixed top-right | Inline in header or in menu |
| Style | Pill with dark bg | Same | Simplified, smaller font |

---

## Animation Guidelines

Keep animations subtle and purposeful.

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Chat messages | Fade in + slide up | 250ms | ease-out |
| Tab switching (mobile) | Crossfade | 200ms | ease |
| Page content change | Fade | 200ms | ease-out |
| Button hover | Subtle lift | 150ms | ease |
| Index item hover | Slide right 4px | 150ms | ease |

### Avoid

- Bouncy or playful animations
- Page flip 3D effects
- Rapid or flashy transitions
- Heavy animations on mobile (prefer `opacity` and `transform` only)

---

## Touch & Interaction

### Tap Targets

All interactive elements must be at least **44px x 44px** on touch devices.

| Element | Desktop Size | Mobile Minimum |
|---------|-------------|----------------|
| Nav arrows | 29px | 44px |
| Tab bar items | n/a | 52px height |
| Index recipe items | padding: 8px 16px | padding: 12px 16px (min 44px height) |
| Chat input | 60px height | 48px height |

### Gestures (Mobile)

| Gesture | Action |
|---------|--------|
| Tap recipe in index | Navigate to recipe |
| Tap nav arrow | Previous/next recipe |
| Swipe left on book | Next recipe (optional enhancement) |
| Swipe right on book | Previous recipe (optional enhancement) |

---

## Accessibility

### Color Contrast (WCAG AA)

| Combination | Ratio | Status |
|-------------|-------|--------|
| ink-dark on paper-cream | ~10:1 | Pass |
| ink-medium on paper-cream | ~5.5:1 | Pass |
| ink-muted on paper-cream | ~3.5:1 | Decorative only |
| leather on paper-cream | ~5.8:1 | Pass |
| label-cream on wood-dark | ~8.2:1 | Pass |

### Focus States

```css
:focus-visible {
    outline: 2px solid var(--color-leather);
    outline-offset: 2px;
}
```

### Screen Reader

- Semantic HTML (`<main>`, `<nav>`, `<article>`)
- `aria-label` on navigation arrows
- `aria-live` on timer and chat messages
- Tab bar buttons use `role="tab"` and `aria-selected`
- Announce view changes when switching tabs on mobile

---

## Implementation Notes

### CSS Architecture

Responsive styles should be added via media queries at the end of `styles.css`, building on the existing structure:

```css
/* Tablet Portrait */
@media (max-width: 1024px) { ... }

/* Mobile */
@media (max-width: 600px) { ... }
```

### HTML Changes Required

1. **Viewport meta**: Change from `width=1200` to `width=device-width`
2. **Mobile tab bar**: New HTML element, hidden on desktop
3. **DOM order**: Recipe book may need to come before notepad in DOM (or use CSS `order`) to appear first on tablet
4. **Single-page mobile recipe**: JS logic to render full recipe in one scrollable div instead of split across two pages

### JS Changes Required

1. **View mode detection**: Detect screen size and switch between two-page and single-page rendering
2. **Tab switching**: JS to toggle visibility of book vs chat on mobile
3. **Touch gestures**: Optional swipe handler for recipe navigation
4. **Resize handling**: Re-render layout on orientation change

### Performance Considerations

- Wood texture SVG filter is expensive — consider disabling on mobile
- Leather texture SVG filter — consider a static CSS gradient on mobile
- Reduce box-shadow complexity on mobile (fewer layers)
- Use `will-change: transform` on animated elements sparingly

---

## Summary: What Changes Per Breakpoint

| Feature | Desktop (>1024) | Tablet (601-1024) | Mobile (≤600) |
|---------|-----------------|-------------------|---------------|
| Layout | Side by side | Stacked (book top, chat bottom) | Tab switching |
| Book pages | Two-page spread | Two-page spread | Single page |
| Book cover | Full leather frame | Full leather frame | Thin border |
| Spine shadow | Yes | Yes | No |
| Nav arrows | 29px | 36px | 44px |
| Tab bar | Hidden | Hidden | Fixed bottom |
| Wood background | Full texture | Full texture | Simplified |
| Body padding | 30px 50px | 20px | 0 |
| Section labels | Visible | Visible | Hidden (in tab bar) |
| User info | Fixed top-right | Fixed top-right | Compact header |
| Index | Two-column split | Two-column split | Single column |
