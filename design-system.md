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
5. **Recipe first** — On all screen sizes the recipe book is the only column. Chat is a note written on the page, not a panel beside it.

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
| `--color-paper-aged-light` | `#f5edd8` | Hover fills (send, clipboard, meal-plan actions), empty polaroid |
| `--color-paper-aged` | `#f0e6cc` | Step duration chips, badges, loading skeleton |
| `--color-paper-aged-medium` | `#ebe0c4` | The current recipe's contents entry |
| `--color-paper-aged-dark` | `#e0d3b5` | Inactive paper tabs, contents hover, skeleton |

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
| `--color-biro` | `#1f3d8a` | Margin note handwriting (AI replies) |
| `--color-sticky` | `#fbe9a0` | Sticky note background on the contents page |

---

## Typography

Two families (Journal 2.0, 2026-09): **Kalam** is the handwriting — titles, section headers, letter headers, tabs, labels, step numbers, metadata, notes and the note input. **Libre Baskerville** is the reading text — ingredients, method steps, contents entries.

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
| Meal Plan Title | Kalam | 28px | 400 | 1.4 | ink-dark |
| Step Number | Kalam | 18px | 700 | 1.4 | leather |
| Contents Entry | Libre Baskerville | 15px | 400 | 1.35 | ink-dark |
| Notes Thread | Kalam | 15px | 400 | 1.5 | ink-dark |
| Note Input | Kalam | 16px | 400 | 1.4 | ink-dark |
| Meta Line | Kalam | 15px | 400 | 1.4 | ink-medium |
| Ingredients | Libre Baskerville | 14px | 400 | 1.7 | ink-dark |
| Method Steps | Libre Baskerville | 14px | 400 | 1.65 | ink-dark |
| Contents Page Number / Footer | Kalam | 13–14px | 400 | 1.4 | ink-light |
| Section Tab | Kalam | 14px (edge) / 16px (paper) | 400 | 1 | ink-dark |
| Contents Filter Tab | Kalam | 14px (edge) / 15px (chip) | 400 | 1 | per tab (see Index View) |
| Recipe Tag Chip | Kalam | 12px | 400 | 1 | ink-light |
| Timer Display | Kalam | 18px | 400 | 1 | ink-dark |

**Contrast rule:** on paper, nothing under 16px may be lighter than `--color-ink-light` (`#6b5a4a`). `--color-ink-muted` (`#8a7a60`) is decorative only (separators, disabled letters).

### Mobile Type Adjustments

On mobile (≤ 600px) the reading text goes up and the chrome comes down:

| Element | Desktop | Mobile |
|---------|---------|--------|
| Ingredients | 14px | 16px |
| Method Steps | 14px | 16px |
| Contents Entry | 15px | 16px |
| Note Input | 16px | 16px (16px keeps iOS from zooming on focus) |
| Notes Thread | 15px | 15px |
| Meta Line | 15px | 14px |
| Book Label (`#recipe-book-header`) | 22px | 16px |
| Timer Display | 18px | 14px |
| Note Page Number | 13px | 12px |
| User Email / Logout | 14px / 13px | 12px |

Recipe Title (27px), Contents Title (30px) and Contents Letter Header (22px) keep their desktop sizes — the phone page is full width, so they still fit.

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
| `--shadow-medium` | `4px 4px 15px rgba(0,0,0,0.4)` | Defined but currently unused |
| `--shadow-soft` | `3px 3px 10px rgba(0,0,0,0.3)` | Timer, floating elements |
| `--shadow-inset-left` | `inset -4px 0 12px rgba(0,0,0,0.08)` | Left page |
| `--shadow-inset-right` | `inset 4px 0 12px rgba(0,0,0,0.05)` | Right page |

---

## Responsive Layout Strategy

There is one column: the recipe book. Chat is not a second panel — it is a single note input that belongs to the book, pinned to the foot of the right page on desktop and tablet and dropped to a bar beneath the book on the phone. Nothing switches between a "book view" and a "chat view" at any width.

### Breakpoints

| Name | Range | Layout Mode |
|------|-------|-------------|
| **Desktop** | > 1024px | Two-page spread; margin notes in a 150px column beside the recipe; section tabs on the book's outer edge |
| **Tablet Portrait** | 601px – 1024px | Same spread, full width; margin notes collapse beneath the recipe body |
| **Mobile** | ≤ 600px | One page at a time; paper tabs on the page's top edge; note input becomes a bar |

CSS follows the same three bands: `@media (max-width: 1024px)` is tablet-and-below, `@media (max-width: 600px)` is the phone (it comes later in `styles.css` and therefore wins), and everything outside a media query is the desktop base. JS uses one predicate everywhere — `window.matchMedia('(max-width: 600px)').matches`. No module reads `window.innerWidth` or invents a second breakpoint.

### View Modes

`body[data-view-mode]` mirrors the app's `viewMode` state and is what the layout keys off:

| Value | What is on the pages |
|-------|----------------------|
| `index` | The contents. Desktop/tablet: split across both pages. Phone: the left page only. |
| `recipe` | A recipe on the right page; the contents stay on the left page on desktop/tablet. Section tabs are visible in this mode only. |
| `meal` | A meal plan on the right page. Laid out exactly like `recipe`, but with no section tabs. |

### Viewport Meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

## Layout: Desktop (> 1024px)

The book is the only child of `.app-container`, centred up to 1400px.

```
┌──────────────────────────────────────────────────────────────┐
│                                        [user@email  Logout]  │
│                       "Recipe Book"                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ < ┌─────────────────┬──────────────────────────────┐ > │  │
│  │   │                 │                    │         │▐I▌│  │
│  │   │   Contents      │   Recipe           │ margin  │▐M▌│  │
│  │   │   (left page)   │   (right page)     │ notes   │▐N▌│  │
│  │   │                 │                    │  150px  │   │  │
│  │   │                 │ ┌────────────────────────┐   │   │  │
│  │   │                 │ │ ✎ Write a note…  ➤ p. 7│   │   │  │
│  │   └─────────────────┴─┴────────────────────────┴───┘   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Dimensions

| Element | Value |
|---------|-------|
| `.app-container` | `display: flex`, max-width 1400px, `margin: 0 auto`, height `calc(100vh - 60px)`, `align-items: flex-start`, `gap: var(--space-xl)` |
| `.book-container` | `flex: 1`, `height: 100%`, flex column, `position: relative` — the containing block for the absolute `.note-input` |
| `.recipe-book` | `flex: 1`, `position: relative` — the containing block for the timer pill, the nav arrows and `.edge-tabs` |
| `.pages-container` | `flex: 1`, `margin: 6px`, `perspective: 800px` |
| `.page` | `flex: 1`, `padding: 20px 28px`, `overflow-y: auto` — each page scrolls independently |
| `.page-right` | adds `padding-bottom: 72px` so recipe content never runs under the note slip |
| Body padding | 30px 50px |

`.book-container` has no `min-width`: with a single column, `flex: 1` inside the 1400px `.app-container` does the centring on its own. The bounded `calc(100vh - 60px)` height is load-bearing — the independent page-scroll model depends on it.

### Right Page in Recipe / Meal View

`body[data-view-mode="recipe"] #page-right` (and its `"meal"` sibling) turns the right page into a grid — `grid-template-columns: minmax(0, 1fr) 150px`, `align-items: start`, `column-gap: 12px` — with `#page-right-content` in the first column and `#page-margin` in the second. In contents view there is no grid: `#page-margin` is pinned at `top: 24px; right: 24px`, 150px wide.

### Stacking Order

| Layer | z-index |
|-------|---------|
| `.book-cover` | 0 |
| `.pages-container` | 1 |
| `#page-margin` (contents view) | 2 |
| `.contents-tabs` | 4 |
| `.page-tabs` (phone) | 5 |
| `.note-input` | 6 |
| `.edge-tabs` | 9 |
| `.page-nav`, `.mobile-edge-nav`, `.page-turn-overlay` (set in JS) | 10 |
| `.timer-widget`, `#recipe-book-header` (phone) | 11 |
| `.user-info` | 100 |
| `.photo-preview-overlay` | 2000 |

---

## Layout: Tablet Portrait (601px – 1024px)

Same book, same two-page spread, no stacking and no reflow of the columns — the book simply fills the width. The `@media (max-width: 1024px)` block changes only these things:

| Property | Value | Notes |
|----------|-------|-------|
| Body padding | 20px | From 30px 50px |
| `.user-info` | `top: 10px; right: 20px` | Follows the reduced padding |
| `.page-nav` | 36 × 36px | Larger tap target, from 29px |
| Margin column | Collapses | `#page-right` becomes `display: flex; flex-direction: column`; `#page-right-content` goes `height: auto; flex: 0 0 auto`; `#page-margin` becomes `width: 100%; padding-top: 12px` directly beneath the content |
| `.index-recipe-item` | `padding: 6px 10px` | Tighter contents entries |
| `.index-alphabet-nav` | `gap: 1px` | — |
| `.index-alpha-letter` | 13px, `min-width: 20px`, `padding: 3px` | — |
| Two-page spread | **Preserved** | iPad portrait (768px) still gives each page ~350px |
| `.edge-tabs` | As desktop | Shown in recipe view, on the book's right outer edge |
| `.note-input` | As desktop | Still absolutely positioned over the foot of the right page |

There is no `flex-direction: column` on `.app-container` at this breakpoint, no `order` juggling and no height split between components. The margin collapse is the only structural change.

---

## Layout: Mobile (≤ 600px)

The book fills the screen and shows one page at a time; the note input becomes a bar under it. `body` is a flex column at `100dvh` with `overflow: hidden`, so the page is the only thing that scrolls.

```
┌────────────────────────┐
│ user@email     Logout  │ ← static header strip
│┌──────────────────────┐│
││ Recipe Book   ⏱ 12:00││ ← 40px leather strip
│├──────────────────────┤│
││[Ingred][Method][Notes]│ ← paper tabs (sticky)
││                      ││
││  Chicken Biryani  ▣  ││
││  4 servings · 45 min ││
││  2 tbsp oil          ││
││  1 onion, sliced     ││
││                      ││
││ ‹ previous  p. 7  next ›│ ← phone footer
│└──────────────────────┘│
│ Write a note to the… ➤ │ ← note bar
└────────────────────────┘
```

### The Frame

| Property | Value |
|----------|-------|
| Body | `padding: 0`; `display: flex; flex-direction: column; height: 100dvh; overflow: hidden` |
| Background | Flat wood gradient — the noise texture and the `body::before` grain lines are dropped |
| `.book-cover` | Flush (`top/left/right/bottom: 0`), `border-radius: 0`, no shadow; the leather texture (`::before`) and spine shadow (`::after`) are hidden |
| `.pages-container` | `margin: 40px 4px 4px` — the 40px is a leather strip above the paper |
| `#recipe-book-header` | Re-shown while generic `.section-label` stays hidden: `position: absolute; top: 12px; left: 14px`, Kalam 16px, z-index 11. Tapping it is the way back to the contents. |
| `.timer-widget` | `top: 6px; right: 8px`, 30px tall, z-index 11 — the opposite end of the same strip |
| `.page-left`, `.page-right` | `width: 100% !important`, `padding: 16px`, no radius, no shadow; the binding shadows `.page-left::after` / `.page-right::before` are hidden |
| `.page-content` | `padding-top: 10px` |
| `.page-nav` | Hidden — the 60px-wide `.mobile-edge-nav` zones take over |
| `.mobile-edge-nav` | `padding-top: 48px`; in recipe view `top: 108px` (40 strip + 4 margin + 16 padding + 48 tabs) so it cannot swallow taps on the paper tabs |
| `.pages-container` | Carries `view-transition-name: page-content` — phone only |

### Which Page Shows

| `data-view-mode` | Left page | Right page |
|------------------|-----------|------------|
| `index` | The contents, `flex: 1 1 auto` | Collapsed: `flex: 0 0 auto`, `padding: 0`, with `.page-content` and `.page-tabs` hidden. It survives only to host `#page-margin` (`position: static; width: 100%; padding: 8px 16px`) beneath the contents, so the sticky reply still has somewhere to sit; `.page-margin:empty { display: none }` means nothing shows when there is no note. |
| `recipe` / `meal` | `display: none` | The page: `display: flex; flex-direction: column` |

In `index` mode `.pages-container` becomes `flex-direction: column`, so the collapsed right page sits *under* the contents rather than beside them.

### One Panel at a Time

`#page-right .tab-panel { display: none }`, and only the panel matching `#page-right[data-tab]` is shown. `body[data-view-mode="recipe"] #page-right[data-tab="notes"] #page-margin { display: none }` so the margin's last-three notes do not double up with the full thread on the Notes tab — scoped to the recipe page, because `#page-right[data-tab]` keeps its value when the reader goes back to the contents, where `#page-margin` is where the sticky reply lives. The title row, the meta line and the phone footer sit outside the panels, so they stay on screen on all three tabs.

### Reading Adjustments

| Property | Value |
|----------|-------|
| `.ingredient-item` | `display: block` — one ingredient per line |
| `.ingredient-sep` | Hidden |
| `.ingredients-list`, `.prep-step .step-text` | 16px |
| `.recipe-meta-line` | 14px |
| `.recipe-polaroid` | 84 × 66px, from 96 × 76px |
| `.recipe-title-row` | `padding-right: 40px` to clear the edge-nav overlay |
| `.index-recipe-item` | `grid-template-columns: 48px 1fr auto`, 16px, `min-height: 44px` |
| `.index-polaroid` | 48 × 40px |

### Phone Footer

`.phone-footer` is emitted by `renderRecipe` on every viewport as the last child of `#page-right-content` — emitting it unconditionally means a resize across the breakpoint needs no re-render — and only the phone shows it (`display: none` in the base sheet, `display: flex` inside the 600px block).

| Property | Value |
|----------|-------|
| Layout | Flex row, `justify-content: space-between`, 8px gap, `margin-top: var(--space-lg)`, `padding-top: var(--space-sm)`, 1px `--color-border-light` top rule |
| `.footer-prev` / `.footer-next` | `‹ previous recipe` / `next recipe ›`, Kalam 15px, `--color-accent-brown`, `min-height: 44px`, no border or background |
| `.footer-page` | `p. N`, Kalam 14px, `--color-ink-muted` |
| Disabled | `opacity: 0.4`, `cursor: default` — `navigation.updateNavigationState()` sets `disabled` on the same schedule as the desktop arrows |

### Mobile Navigation Behavior

The edge zones and the footer links drive the same recipe sequence as the desktop arrows.

| State | Left (`.mobile-edge-prev` / `.footer-prev`) | Right (`.mobile-edge-next` / `.footer-next`) |
|-------|------------|-------------|
| Contents | Disabled | → First recipe |
| First recipe | → Contents | → Next recipe |
| Middle recipe | → Prev recipe | → Next recipe |
| Last recipe | → Prev recipe | Disabled |

Going back past the first recipe returns to the contents; that and tapping `#recipe-book-header` are the only two ways back. Swipes on `.pages-container` change the recipe, never the tab: a recipe change runs the View Transitions slide, a tab change runs a 200ms crossfade.

---

## Component: Background

The background simulates a dark wooden table surface.

- **Desktop/Tablet**: The noise-filter SVG blended over a nine-stop wood gradient, plus fixed grain lines drawn by `body::before`
- **Mobile**: Both are dropped — the gradient alone, with `body::before { display: none }` — to keep the rendering cost off the phone

---

## Component: Note Input

`form.note-input#note-input` is the only chat surface in the app. It is the last child of `.book-container`, outside `.recipe-book`, so it survives every page turn and every re-render.

```
┌──────────────────────────────────────────────┐
│ 🖼️ Image attached                         ✕ │ ← .image-attachment, [hidden] by default
│ ◌ Thinking...                                │ ← .loading, .active while a reply streams
│ ✎  Write a note to the cook…      📎   ➤ p. 7│ ← .note-input-row
└──────────────────────────────────────────────┘
```

### Desktop / Tablet: a Slip on the Page

| Property | Value |
|----------|-------|
| Position | `absolute` inside `.book-container`: `left: calc(50% + 10px)` (just right of the spine), `right: 10px`, `bottom: 10px` |
| z-index | 6 — above `.pages-container` (1), below the page-turn overlay (10) |
| Surface | `--color-paper-cream`, 1px `--color-border-light` top rule, `--radius-sm`, `box-shadow: 0 -2px 8px rgba(0,0,0,0.06)` |
| Structure | Flex column, 6px gap, `padding: 8px 10px`; `.note-input-row` is a flex row, `align-items: flex-end`, 8px gap |
| Clearance | `.page-right { padding-bottom: 72px }` keeps recipe content off the slip |

It is absolutely positioned precisely so that it does **not** scroll away with the recipe.

### Mobile: a Bar Beneath the Book

| Property | Value |
|----------|-------|
| Position | `static`, `width: 100%`, `flex: 0 0 auto` — the last flex child of `.book-container` |
| Surface | Same cream, `border-radius: 0`, 1px `--color-border` top rule, no shadow |
| Padding | `8px 12px`, with `padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px))` |
| `.note-pencil` | Hidden — the bar needs the width for 44px targets |
| `.note-textarea` | `min-height: 44px`, 16px (stops iOS zooming on focus) |
| `.note-send` | 44 × 44px, filled `--color-leather` with a `--color-paper-cream` glyph |
| `.clipboard-button` | Raised to 44 × 44px |
| `.note-page-number` | 12px |

### Controls

| Element | Style |
|---------|-------|
| `.note-pencil` | 16px SVG, `--color-ink-muted`, decorative (`aria-hidden`) |
| `.note-textarea` | Kalam 16px / 1.4, `--color-ink-dark`, transparent, borderless except a 1px `--color-border-light` bottom rule that darkens to `--color-ink-medium` on focus; `resize: none`, `min-height: 34px`, `max-height: 140px` — `rows="1"` plus the auto-resize handler in `app.js` |
| `.clipboard-button`, `.note-send` | 40 × 40px, white face, 2px `--color-border`, `--radius-sm`; hover fills `--color-paper-aged-light`; `:active` scales to 0.95 |
| `.note-page-number` | Kalam 13px, `--color-ink-muted`, `p. N` — cosmetic; `recipe-display.setNotePageNumber()` is its only writer |
| `.image-attachment` | Aged-paper chip. It is toggled with the `hidden` attribute, so `.image-attachment[hidden] { display: none !important }` is required to beat the author `display: flex` |
| `.loading` | `display: none` until `.active`; a 14px spinner plus `#loading-text` |
| `.paste-error` | Inserted as the form's first child by `app.js showError()` and removed after 3s |

---

## Component: Recipe Book

An open book showing two pages with a leather cover frame.

### Desktop / Tablet: Two-Page Spread

```
┌─────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Leather cover
│ ▓ ┌─────────────────┬─────────────────┐ ▓ │
│ ▓ │    Left Page    │   Right Page    │ ▓ │
│ ▓ │    Contents     │  Recipe / meal  │ ▓ │
│ ▓ │                 │   + margin      │ ▓ │
│ ▓ └─────────────────┴─────────────────┘ ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└─────────────────────────────────────────────┘
```

### Mobile: Single Page

```
┌───────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓ label            timer ▓ │ ← 40px leather strip
│ ▓ ┌─────────────────────┐ ▓ │
│ ▓ │    Single Page      │ ▓ │
│ ▓ │  (contents, or a    │ ▓ │
│ ▓ │   whole recipe)     │ ▓ │
│ ▓ └─────────────────────┘ ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← 4px on the other three sides
└───────────────────────────┘
```

### Book Responsive Adjustments

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Min width | None — `flex: 1` inside the 1400px container | Same | 100% |
| Page layout | Two-page flex | Two-page flex | Single page, picked by `body[data-view-mode]` |
| Cover | Overhangs by 12px at the sides, 8px top/bottom; leather texture + spine shadow | Same | Flush with the frame, no texture, no spine; a 40px leather strip above the paper |
| Page padding | 20px 28px (+ 72px bottom on the right page) | Same | 16px |
| Spine shadow | Visible | Visible | Hidden |
| Nav arrows | `.page-nav` 29px | `.page-nav` 36px (larger tap target) | `.page-nav` hidden; 60px `.mobile-edge-nav` zones |
| Section tabs | `.edge-tabs`, right outer edge | Same | `.page-tabs`, page top edge |
| Contents filters | `.contents-tabs`, left page's outer edge | Same | Chip row under the contents title |

---

## Component: Section Tabs

The right page carries three panels — Ingredients, Method, Notes — emitted by `recipe-display.renderRecipe` as `.tab-panel[data-tab]`. The active one is recorded on `#page-right[data-tab]`, and `page-tabs.setActiveTab()` is its only writer. Both tab surfaces are shown under `body[data-view-mode="recipe"]` only, so the contents page and the meal plan show neither; nothing in JS hides them.

### Desktop / Tablet: Edge Tabs

`.edge-tabs` is a child of `.recipe-book`, not of `#page-right` — the page is a scroll container and a grid, so tabs inside it would scroll away with the recipe and claim a grid cell.

| Property | Value |
|----------|-------|
| Position | `absolute`, `top: 76px`, `right: -8px` — out on the leather, past the paper's outer edge |
| z-index | 9 — below `.page-nav` (10) and the timer pill (11) |
| Stack | Flex column, 6px gap |
| `.edge-tab` | `writing-mode: vertical-rl`, 26px wide, `min-height: 92px`, `padding: 10px 4px`, Kalam 14px, `border-radius: 0 var(--radius-sm) var(--radius-sm) 0`, `box-shadow: 2px 2px 5px rgba(0,0,0,0.25)` |
| Colors | Ingredients: `--color-border` face, `--color-ink-dark` text; Method: `--color-accent-brown` face, cream text; Notes: `--color-leather` face, cream text |
| `.edge-tab.active` | Cream face, `--color-ink-dark`, weight 700, `padding-right: 8px` so it reads as pulled out of the page |
| Visibility | `display: none` in the base sheet; `display: flex` only inside `@media (min-width: 601px)` under `body[data-view-mode="recipe"]` |

Above 600px, Ingredients and Method are both on the page: tapping either **scrolls** `#page-right` to that panel's `.section-header` rather than swapping panels. Notes is the exception — `#page-right[data-tab="notes"]` hides the other two panels and shows the thread in their place.

### Mobile: Paper Tabs

`.page-tabs` is a static first child of `#page-right`, before `.page-content`.

| Property | Value |
|----------|-------|
| Visibility | `display: none` in the base sheet, so it never becomes a grid item in the desktop `#page-right` grid; `display: flex` inside `@media (max-width: 600px)` under `body[data-view-mode="recipe"]` |
| Position | `sticky`, `top: 0`, z-index 5, `flex: 0 0 auto` — the tabs hold the page's top edge while the content scrolls under them, on a cream ground so nothing shows through |
| Spacing | 4px gap, `padding-top: 4px`, `margin-bottom: 10px` |
| `.page-tab` | `flex: 1`, `min-height: 44px`, Kalam 16px, 1px `--color-border`, `border-radius: var(--radius-sm) var(--radius-sm) 0 0`, `--color-paper-aged-dark` face with `--color-accent-brown` text |
| `.page-tab.active` | Cream face, `--color-ink-dark`, weight 700, transparent bottom border and `margin-bottom: -1px` so the tab joins the page |
| Focus | `outline: 2px solid var(--color-ink-dark)` — `outline-offset: -2px` on the paper tabs, `2px` on the edge tabs |

A phone tab tap crossfades `#page-right-content` over 200ms. It is ignored while a page turn is in flight (both share one animation lock), and under `prefers-reduced-motion: reduce` the swap is instant.

### Notes Panel

`.notes-thread` holds the full session thread — every entry, oldest first, including the cook's own notes, which `#page-margin` filters out. `margin-notes.renderThread()` is its only writer: `page-tabs.setActiveTab()` calls it when the tab is opened, and `margin-notes.render()` calls it again on every new note while `#page-right[data-tab="notes"]`, so a note written with the Notes tab open appears there as it arrives (on a phone that panel is the only surface on screen — the margin is hidden).

| Element | Style |
|---------|-------|
| `.notes-thread` | Flex column, 10px gap, Kalam 15px / 1.5 |
| `.thread-note[data-kind="user"]` | `--color-ink-medium`, indented by `var(--space-md)` |
| `.thread-note[data-kind="reply"]` | `--color-biro`; markdown rendered |
| `.thread-note[data-kind="status"]` | 13px italic, `--color-ink-muted` |
| `.thread-note[data-kind="error"]` | `--color-leather` |
| `.notes-thread-empty` | Italic `--color-ink-muted` — "No notes yet." |

There are no speaker prefixes anywhere in the thread; the ink is the speaker.

---

## Component: Index View

The alphabetical recipe index. It is the book's default state, and on desktop and tablet it stays on the left page once a recipe is open — `renderIndex(list, { singleColumn: true })` puts every letter group in `#page-left-content` and leaves the right page to the recipe. The alphabet nav stays usable in both arrangements, and the open recipe's entry carries `.current` plus `aria-current="page"`.

### Contents Filter Tabs

`.contents-tabs` is a static `<nav>` in `chat.html`, a **sibling** of `#page-left-content` inside `#page-left`, so a contents re-render (which rewrites `innerHTML`) never destroys it. Its buttons carry `data-filter` (`all` / `main` / `dessert` / `meals`), `aria-pressed` and `is-active`; `app.js` owns the active filter (`contentsFilter`, mirrored to `sessionStorage['rv-contents-filter']`) and `renderIndex(list, { filter })` does the filtering. These are **not** the right page's `.edge-tabs` — those are the section tabs and carry `role="tab"` / `data-tab`; the contents tabs deliberately carry neither, so `page-tabs.js` ignores them.

| Property | Desktop / Tablet | Mobile (≤ 600px) |
|----------|------------------|------------------|
| Arrangement | Vertical strip on the left page's outer edge: `position: sticky; top: 20px`, `height: 0` and `margin-left: -28px` so it takes no flow height and sits in the page's own left padding, clear of the entries | Horizontal chip row directly under the "~ Contents ~" title |
| z-index | 4 — under the phone paper tabs (5) | — |
| `.contents-tab` | `writing-mode: vertical-rl`, 26px wide, `min-height: 76px`, Kalam 14px, `border-radius: var(--radius-sm) 0 0 var(--radius-sm)`, `box-shadow: -2px 2px 5px rgba(0,0,0,0.25)` | `writing-mode: horizontal-tb`, `min-height: 44px`, `min-width: 66px`, `padding: 10px 14px`, pill radius |
| `.contents-tab.is-active` | Full opacity, weight 700, `padding-left: 8px` so it reads as pulled out past the page's edge | Same, without the pull-out |
| Inactive | `opacity: 0.72` — the colour stays, the tab recedes | Same |

Colours, one per filter:

| Tab | Face | Text | Note |
|-----|------|------|------|
| All | `--color-leather` | `--color-paper-cream` | — |
| Mains | `--color-border` (`#c9a86c`) | `--color-ink-dark` | **The tan face is the one exception to cream tab text.** Cream on `#c9a86c` falls below 3:1; dark ink keeps the label readable. Any future tab on a light face follows the same rule. |
| Sweets | `--color-accent-brown` | `--color-paper-cream` | — |
| Meals | `--color-ink-medium` | `--color-paper-cream` | Gated |

The Meals tab is styled and in the markup so the strip's shape is settled, but it depends on meal-plan persistence (RV-107): it carries the `hidden` attribute plus `.contents-tab-meals { display: none }`, and only `body[data-feature-meals] .contents-tab-meals { display: inline-flex }` reveals it (`app.js` drops the `hidden` attribute on the same condition). Selecting it renders "No meal plans yet" because there is no meal-plan listing.

On the phone, `body[data-view-mode="index"] #page-left-content` becomes `display: contents` so its children join the left page's flex column; `order` then places the title (1), the chip row (2) and everything else (3), which is the only way the static strip can sit between the title and the alphabet nav without leaving `#page-left`.

The filtered list drives the letter groups, the A–Z strip, the footer wording ("N mains" / "N sweets" / "N meal plans") and the `.index-empty` message. **Page numbers do not**: they stay derived from the recipe's position in the full alphabetical list, so "p. 7" means the same thing on every tab — and the nav arrows walk that same full list.

### Desktop / Tablet (contents view)

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

### Desktop / Tablet (a recipe is open)

The same letter groups, single column, all on the left page — the layout the "Mobile" column below describes, just narrower.

### Mobile

Single scrollable column on the left page (the only visible page in contents view):

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

A cream pill clipped to the top-right edge of the recipe book cover. It lives inside `.recipe-book` (directly after `.book-cover`) and is positioned relative to the book, so it scrolls and resizes with the book and can never overlap the fixed user identity pill. There is no speech-bubble tail.

| Property | Desktop / Tablet | Mobile (≤ 600px) |
|----------|------------------|------------------|
| Position | `absolute; top: -10px; right: 12px` (just above the cover's top rim, clearing the fixed user pill by ~6px) | `top: 6px; right: 8px` (inside the frame, which clips overflow on phones) |
| Height | 36px | 30px |
| Padding | `4px 8px 4px 14px` | `2px 6px 2px 10px` |
| Text | Kalam 18px / 400, `"{label}: M:SS"` | Kalam 14px |
| Clock icon | 18px | 14px |
| Close target | 28 × 28px (min-width/min-height) | 28 × 28px |
| Background / border | `--color-paper-cream`, `2px solid --color-ink-dark`, `--radius-pill`, `--shadow-soft` | Same |
| z-index | 3 (above `.pages-container` and `.book-cover`) | Same |

Contents in order: clock icon, `.timer-text`, `.timer-cancel` (circular hover/focus tint). The pill is `display: none` when no timer runs.

### Step Highlight Band

When a timer carries a `step_number`, the matching `.prep-step[data-step="N"]` on the recipe the timer was started from gets `.timer-active`:

| Property | Value |
|----------|-------|
| Background | `--color-timer-band` (`#fff4c2`) |
| Radius | `--radius-sm` |
| Bleed | `margin: 0 -8px`, `padding-right: 8px`, `padding-left: 38px` (30px number gutter + 8px) |
| Label | `::after` "timer running", Kalam 13px, `--color-ink-light`, top-right of the step |
| Motion | None — the band appears without animation, so `prefers-reduced-motion` needs no override |

The highlight is re-applied whenever the same recipe is rendered again, never shown on another recipe, and cleared when the timer completes or is cancelled.

---

## Component: Margin Notes

AI replies are handwritten in the margin of the open page rather than in a separate transcript. `#page-margin` is a static `<aside class="page-margin" aria-live="polite">` inside `#page-right`, a sibling of `#page-right-content`, so it survives page turns and re-renders. Layout is keyed off `body[data-view-mode]`, mirrored from the app's `viewMode` state. While a reply is streaming the aside carries `aria-busy="true"`, so a screen reader announces the completed note once instead of re-announcing it on every chunk.

| Property | Desktop (> 1024px) | Tablet (601–1024px) | Mobile (≤ 600px) |
|----------|--------------------|---------------------|------------------|
| Layout (recipe / meal view) | `#page-right` is a grid: `minmax(0, 1fr) 150px`, 12px column gap | Grid collapses; notes render beneath the page content, full width, 12px top padding | Same as tablet — a block beneath `#page-right-content`; hidden while the Notes tab is active, where the full thread replaces it |
| Layout (contents view) | `#page-margin` absolute, `top: 24px; right: 24px`, 150px wide | Same | `position: static`, full width, `padding: 8px 16px`, in the collapsed right page beneath the contents |
| Visible notes | Last three non-user thread entries, oldest first (latest non-user entry only in contents view) | Same | Same |

### Note Styles

| Kind | Selector | Style |
|------|----------|-------|
| Reply | `.margin-note[data-kind="reply"]` | Kalam 14px / 1.45, `--color-biro`, rotated ~1° (alternating direction); markdown rendered |
| Status line | `.margin-note[data-kind="status"]` | Kalam 13px italic, `--color-ink-medium`; tool activity and timer confirmations; text escaped |
| Error | `.margin-note[data-kind="error"]` | Kalam 14px, `--color-leather`; text escaped |
| Streaming | `.margin-note.streaming` | Blinking `\|` caret via `::after` while chunks arrive |

### Sticky Note

On the contents page the latest non-user note (reply, status or error) is drawn as a single `.sticky-note` (added alongside `.margin-note`) pinned to the top-right of the right page.

| Property | Value |
|----------|-------|
| Background | `--color-sticky` (`#fbe9a0`) |
| Text | Kalam 14px, `--color-biro` |
| Padding / radius | `12px 14px`, `--radius-sm`-ish (2px) |
| Shadow | `--shadow-soft` |
| Rotation | `rotate(2deg)` |

### Motion

New notes fade in over 200ms with a 4px upward slide (`@keyframes marginNoteIn`). Under `prefers-reduced-motion: reduce` both the fade-in and the caret blink are disabled. Note elements are reused across renders and are only moved when their order actually changes, so the animation does not replay while a reply streams.

---

## Component: User Info / Logout

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Position | `fixed`, `top: 25px; right: 50px` | `fixed`, `top: 10px; right: 20px` | `static` — a full-width strip above the book |
| Style | Pill: `rgba(0,0,0,0.3)`, 1px `--color-border`, `--radius-sm`, `padding: 6px 14px`, z-index 100 | Same | `rgba(0,0,0,0.5)`, no radius or border except a `--color-border` bottom rule, `padding: 8px 16px`, `justify-content: space-between` |
| Type | Email Kalam 14px / 700 `--color-paper-cream`; logout 13px `--color-label-cream` at 0.8 opacity | Same | Both 12px |

---

## Animation Guidelines

Keep animations subtle and purposeful.

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Margin note appears | Fade in + 4px slide up | 200ms | ease-out |
| Section tab switch (mobile) | Crossfade of `#page-right-content` | 200ms | ease-out |
| Recipe change (mobile) | Horizontal slide (View Transitions on `page-content`) | 250ms | ease-out |
| Page turn (desktop / tablet) | `.page-turn-overlay` rotate | 400ms | ease-in-out |
| Page turn fallback (reduced motion, or no View Transitions) | Crossfade of both pages | 2 × 75ms | ease-out |
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

| Element | Desktop / Tablet Size | Mobile Minimum |
|---------|----------------------|----------------|
| Nav arrows | `.page-nav` 29px (36px on tablet) | Hidden; 60px-wide `.mobile-edge-nav` zones |
| Section tabs | `.edge-tab` 26 × 92px | `.page-tab` min-height 44px, `flex: 1` |
| Contents filter tabs | `.contents-tab` 26 × 76px | `.contents-tab` min-height 44px, min-width 66px |
| Index recipe items | `padding: 4px 8px` | `padding: 8px 10px`, `min-height: 44px` |
| Note textarea | min-height 34px | min-height 44px |
| Send / clipboard buttons | 40 × 40px | 44 × 44px |
| Phone footer links | n/a | min-height 44px |
| Timer close button | 28 × 28px | 28 × 28px |

### Gestures (Mobile)

| Gesture | Action |
|---------|--------|
| Tap a contents entry | Open that recipe |
| Tap a `.mobile-edge-nav` zone | Previous / next recipe |
| Tap `.footer-prev` / `.footer-next` | Previous / next recipe |
| Tap a `.page-tab` | Switch section (200ms crossfade) |
| Tap `#recipe-book-header` | Back to the contents |
| Swipe left on `.pages-container` | Next recipe |
| Swipe right on `.pages-container` | Previous recipe (from the first recipe, back to the contents) |

Gestures and taps that navigate are ignored while a page turn or a tab crossfade is running — `page-transitions.js` holds one lock and every entry point checks it.

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
- `aria-label` on the navigation arrows, the mobile edge zones, the note textarea and its buttons
- `aria-live="polite"` on `#page-margin`, with `aria-busy="true"` while a reply streams, so a screen reader announces the completed note once
- Both tab surfaces are a `role="tablist"` of `role="tab"` buttons carrying `aria-selected` and `aria-controls="page-right-content"`; `page-tabs.setActiveTab()` updates every `[role="tab"][data-tab]` in the document, so the edge tabs and paper tabs never disagree
- The open recipe's contents entry carries `aria-current="page"`

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

### DOM Contract

1. **One column**: `.app-container > .book-container > (.section-label#recipe-book-header, .recipe-book, form.note-input)`. There is no second panel and no tab bar.
2. **Tab surfaces**: `.edge-tabs` is a child of `.recipe-book` (outside the scroll container and outside the `#page-right` grid); `.page-tabs` is the first child of `#page-right`, before `.page-content`; `#page-margin` is its last child.
3. **Two attributes drive everything**: `body[data-view-mode]` (`index` / `recipe` / `meal`) and `#page-right[data-tab]` (`ingredients` / `method` / `notes`).
4. **Template tokens**: `{{user_email}}`, `/static/styles.css?v={{asset_version}}` and `/static/app.js?v={{asset_version}}` must survive verbatim in `chat.html` — a Rust unit test reads the shipped file and asserts on them.

### JS Ownership

1. **`page-tabs.js`** owns `#page-right[data-tab]` and both tab surfaces, via one delegated click listener on `document` matching `[role="tab"][data-tab]`.
2. **`app.js`** owns `body[data-view-mode]` (mirrored from `sharedState.viewMode`) and all DOM wiring, including Enter-to-send and the form `submit` handler on `#note-input`.
3. **`recipe-display.js`** is the only writer of `#page-right-content` and `#note-page-number`; **`margin-notes.js`** is the only writer of `#page-margin` and `.notes-thread`.
4. **`page-transitions.js`** holds the single animation lock. `animatePageTurn` and `crossfadeElement` share it, so a tab tap during a page turn — and a swipe during a tab crossfade — is ignored rather than queued.
5. **Resize** re-renders the contents column for the current view mode; the layout itself is CSS, so nothing else has to react to a breakpoint change.

### Performance Considerations

- Wood texture SVG filter is expensive — consider disabling on mobile
- Leather texture SVG filter — consider a static CSS gradient on mobile
- Reduce box-shadow complexity on mobile (fewer layers)
- Use `will-change: transform` on animated elements sparingly

---

## Summary: What Changes Per Breakpoint

| Feature | Desktop (>1024) | Tablet (601-1024) | Mobile (≤600) |
|---------|-----------------|-------------------|---------------|
| Columns | Book only | Book only | Book only |
| Book pages | Two-page spread | Two-page spread | One page, picked by `data-view-mode` |
| Book cover | Full leather frame | Full leather frame | Flush leather, 40px top strip |
| Spine shadow | Yes | Yes | No |
| Recipe nav | `.page-nav` 29px | `.page-nav` 36px | Edge zones + `.phone-footer` |
| Section tabs | `.edge-tabs`, right outer edge | Same | `.page-tabs`, page top edge |
| Contents filters | `.contents-tabs`, left page's outer edge | Same | Chip row under the contents title |
| Note input | Slip pinned to the foot of the right page | Same | Bar beneath the book |
| Margin notes | 150px column beside the recipe | Beneath the recipe body | Beneath the recipe body; hidden on the Notes tab |
| Wood background | Full texture | Full texture | Flat gradient |
| Body padding | 30px 50px | 20px | 0 |
| Book label | `.section-label` above the book | Same | `#recipe-book-header` on the leather strip |
| User info | Fixed top-right | Fixed top-right (10 / 20) | Static header strip |
| Contents | Two-column split | Two-column split | Single column on the left page |
