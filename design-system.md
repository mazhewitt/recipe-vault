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
| `--color-biro` | `#1f3d8a` | Reply handwriting on the sticky (AI replies) |
| `--color-sticky` | `#fbe9a0` | The reply sticky, above the note input in every view |

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
| Notes Thread | Kalam | 15px (16px on the notes spread) | 400 | 1.5 | ink-dark |
| Note Input | Kalam | 16px | 400 | 1.4 | ink-dark |
| Meta Line | Kalam | 15px | 400 | 1.4 | ink-medium |
| Ingredients | Libre Baskerville | 18px in cook mode (the left page); 14px in the packed list nowhere else on screen | 400 | 1.7 | ink-dark |
| Method Steps | Libre Baskerville | 18px, in every spread mode | 400 | 1.65 | ink-dark |
| Step Duration | Libre Baskerville | 15px | 400 | inherit | ink-medium |
| Reply Sticky | Kalam | 15px | 400 | 1.45 | biro |
| Contents Page Number / Footer | Kalam | 13–14px | 400 | 1.4 | ink-light |
| Section Tab | Kalam | 14px (edge) / 16px (paper) | 400 | 1 | ink-dark |
| Contents Filter Tab | Kalam | 14px (edge) / 15px (chip) | 400 | 1 | per tab (see Index View) |
| Recipe Tag Chip | Kalam | 12px | 400 | 1 | ink-light |
| Timer Display | Kalam | 18px, tabular numerals | 400 | 1 | ink-dark (leather when done) |

**Contrast rule:** on paper, nothing under 16px may be lighter than `--color-ink-light` (`#6b5a4a`). `--color-ink-muted` (`#8a7a60`) is decorative only (separators, disabled letters).

### Mobile Type Adjustments

The recipe is read from the counter, at arm's length, so the ingredients and the method are 18px above 600px (17px on the phone) and the durations 15px. The method is 18px in **every** spread mode, not just cook: a mode switch must not reflow the step being read. The contents page and the Notes thread keep their sizes.

On mobile (≤ 600px) the reading text stays large and the chrome comes down:

| Element | Desktop | Mobile |
|---------|---------|--------|
| Ingredients | 18px (cook mode) | 17px |
| Method Steps | 18px | 17px |
| Step Duration | 15px | 15px |
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

There is one column: the recipe book. Chat is not a second panel — it is a single note input that belongs to the book, pinned to the foot of the left page on desktop and tablet in every view, and dropped to a bar beneath the book on the phone. Nothing switches between a "book view" and a "chat view" at any width.

### Breakpoints

| Name | Range | Layout Mode |
|------|-------|-------------|
| **Desktop** | > 1024px | Two-page spread; the note slip and its reply sticky at the foot of the left page; bookmark ribbons on the book's outer edge |
| **Tablet Portrait** | 601px – 1024px | Same spread, full width; nothing collapses — the right page has no margin column to collapse |
| **Mobile** | ≤ 600px | One page at a time; paper tabs on the page's top edge; note input becomes a bar |

CSS follows the same three bands: `@media (max-width: 1024px)` is tablet-and-below, `@media (max-width: 600px)` is the phone (it comes later in `styles.css` and therefore wins), and everything outside a media query is the desktop base. JS uses one predicate everywhere — `window.matchMedia('(max-width: 600px)').matches`. No module reads `window.innerWidth` or invents a second breakpoint.

### View Modes

`body[data-view-mode]` mirrors the app's `viewMode` state and is what the layout keys off:

| Value | What is on the pages |
|-------|----------------------|
| `index` | The contents. Desktop/tablet: split across both pages. Phone: the left page only. |
| `recipe` | A recipe on the right page; what the left page holds is the spread mode's business (below). Section tabs are visible in this mode only. |
| `meal` | A meal plan on the right page. Laid out exactly like `recipe`, but with no section tabs, and it never enters cook mode. |

### Spread Modes

Above 600px the book is a spread, and `body[data-spread-mode]` says what the **left** page is holding. `spread-modes.js` is its only writer; CSS decides what each mode means, so anything that needs the mode — a stylesheet, another module, a test — reads the attribute rather than importing anything.

| Value | Left page | Right page | Left-edge strip |
|-------|-----------|------------|-----------------|
| `contents` | The contents — split across both pages in `index` view, one column while a recipe is open — with the note slip and the reply sticky at its foot | With a recipe open: title, meta and method. Otherwise the meal plan, or the second half of the contents | The filters plus Notes in `index` view, the spread tabs otherwise |
| `cook` | The open recipe's `ingredients:` panel, **moved** off the right page, with the slip and the sticky at its foot | Title, meta and method | Spread tabs, Cook pressed |
| `notes` | The thread for the open recipe (`.notes-page > .notes-thread`), with the slip at its foot; the in-flight line is the thread's last, unstored entry and the sticky stands down | Title, meta and method, exactly as in cook mode; in `index` view the contents move here as one column | Spread tabs, Notes pressed |

**With a recipe open, the right page is the same in every mode** — title, meta, method — so a mode switch changes the left page only and the step being read never moves. In `contents` and `notes` the ingredients are not on screen; the Cook tab is one tap away. The slip has one home, the foot of the left page, in every state above 600px (the contents page, all three modes, a meal plan, the fallback after a failed load) and is never hidden.

- **Cook mode is the default every time a recipe opens** — from the contents, from `display_recipe`, from the nav arrows or a swipe. It is not sticky and not remembered; the tab back to Contents is one click.
- **Focusing the note input selects nothing.** The slip holds one position — the foot of the left page — in every mode and view, so a click can never shift it out from under the cursor. The Notes tab is the only way into `notes` mode. (It used to switch on focus, which is exactly the jump that removed it.)
- **Notes is on the strip in every view**, beside the filters while browsing and beside Contents and Cook while a recipe is open — otherwise the book-level thread would have no entry point at all.
- **Returning to the contents selects `contents`** and the strip reverts to the filters, restoring the one remembered in `sessionStorage['rv-contents-filter']`.
- **A meal plan never cooks.** `setSpreadMode('cook')` is refused in `meal` view, not merely left off the strip.
- **A mode change is refused while the animation lock is held**, exactly as a tab change is. The programmatic transitions that happen *inside* a page turn (opening a recipe, going back to the contents) pass `{ force: true }`; a reader's tab click never does.
- **The ingredients are moved, not re-rendered.** Cook mode relocates the one `.tab-panel[data-tab="ingredients"]` node into `#page-left-content`; on leaving it is held off the page (not put back on the right page, which stays title, meta and method), so there is only ever one copy and `applyStepHighlight`, the section headers and every refresh path keep their single `querySelector` target. A recipe refresh (photo upload, `update_recipe`, difficulty backfill) re-asserts the mode.
- **A whole page buys the phone's ingredient list.** In cook mode `#page-left-content .ingredient-item` goes back to `display: block` with `.ingredient-sep` hidden — one ingredient per line, as on the phone. A column half a spread wide wraps the packed `·`-separated run badly, and a cook with their hands busy scans a list, not a paragraph.
- **Below 600px there is no spread, so there is no mode.** Every rule keyed off the attribute lives inside `@media (min-width: 601px)`, and `setSpreadMode` refuses to write at all on the phone — the attribute keeps its last desktop value, so the reader's mode comes back when the viewport grows again. Render decisions therefore ask for the *effective* mode (`contents` on a phone, whatever the body says above it).

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
│  │ < ┌──────────────────────[⏱ 12:00]─────────────┐ > │  │
│  │   │ C  Ingredients        │  Recipe title          │▐I▌│  │
│  │   │ C  (cook) / thread    │  meta line   ⇪ 📷      │▐M▌│  │
│  │   │ N  (notes) / contents │  method                │   │  │
│  │   │ ┌───────────────────┐ │   1. …                 │   │  │
│  │   │ │ reply sticky   ✕  │ │   2. …                 │   │  │
│  │   │ ├───────────────────┤ │                        │   │  │
│  │   │ │ ✎ Write a note… ➤ │ │                        │   │  │
│  │   └─┴───────────────────┴─┴────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

A recipe open in `cook` mode, the arrangement every recipe opens in. The left page holds the ingredients (`cook`), the conversation (`notes`) or the contents (`contents`), with the slip and the reply sticky at its foot; the right page holds title, meta and method in every mode. The timer pill sits over the spine, the ribbons (I, M) on the right edge are furniture, and the spread tabs (C, C, N) are on the left edge. See **Spread Modes** above.

### Dimensions

| Element | Value |
|---------|-------|
| `.app-container` | `display: flex`, max-width 1400px, `margin: 0 auto`, height `calc(100vh - 60px)`, `align-items: flex-start`, `gap: var(--space-xl)` |
| `.book-container` | `flex: 1`, `height: 100%`, flex column, `position: relative` — the containing block for the absolute `.note-input` |
| `.recipe-book` | `flex: 1`, `position: relative` — the containing block for the timer pill, the nav arrows and `.edge-tabs` |
| `.pages-container` | `flex: 1`, `margin: 6px`, `perspective: 800px` |
| `.page` | `flex: 1`, `padding: 20px 28px`, `overflow-y: auto` — each page scrolls independently |
| `.page-left` | `padding-bottom: var(--slip-clearance)` (slip height + offset + 10px), and its `.page-content` grows with its content, so the left page's last line scrolls clear of the slip |
| Body padding | 30px 50px |

`.book-container` has no `min-width`: with a single column, `flex: 1` inside the 1400px `.app-container` does the centring on its own. The bounded `calc(100vh - 60px)` height is load-bearing — the independent page-scroll model depends on it.

### Right Page in Recipe / Meal View

`body[data-view-mode="recipe"] #page-right` is a flex column with `#page-right-content` sized to its content (`height: auto; flex: 0 0 auto`), in every spread mode. There is no grid and no margin column: `#page-margin` is the reply sticky, a sibling of the slip that lives at the foot of the left page (see **Reply Sticky** below). Whatever `#page-right[data-tab]` says, the method panel is what the right page shows above 600px.

### Stacking Order

| Layer | z-index |
|-------|---------|
| `.book-cover` | 0 |
| `.pages-container` | 1 |
| `.contents-tabs` | 4 |
| `.page-tabs` (phone) | 5 |
| `.note-input`, `#page-margin` (the reply sticky) | 6 |
| `.edge-tabs` | 9 |
| `.page-nav`, `.mobile-edge-nav`, `.page-turn-overlay` (set in JS) | 10 |
| `.timer-widget`, `#recipe-book-header` (phone), `#page-margin` (phone, above the edge strips) | 11 |
| `.user-info` | 100 |
| `.photo-preview-overlay` | 2000 |

---

## Layout: Tablet Portrait (601px – 1024px)

Same book, same two-page spread, no stacking and no reflow of the columns — the book simply fills the width. The `@media (max-width: 1024px)` block changes only these things:

| Property | Value | Notes |
|----------|-------|-------|
| Body padding | 20px | From 30px 50px |
| `.user-info` | `top: 10px; right: 20px` | Follows the reduced padding |
| `.page-nav` | 36 × 36px visual | From 29px; its `::before` hit area is 46px at every width |
| Right page | Flex column | `#page-right` (recipe and meal view) is `display: flex; flex-direction: column` and `#page-right-content` `height: auto; flex: 0 0 auto`, as it already is in recipe view above 600px |
| `.index-recipe-item` | `padding: 6px 10px` | Tighter contents entries |
| `.index-alphabet-nav` | `gap: 1px` | — |
| `.index-alpha-letter` | 13px, `min-width: 20px`, `padding: 3px` | — |
| Two-page spread | **Preserved** | iPad portrait (768px) still gives each page ~350px |
| `.edge-tabs` | As desktop | Bookmark ribbons in recipe view, on the book's right outer edge |
| `.note-input`, `#page-margin` | As desktop | The slip and the reply sticky absolutely positioned over the foot of the left page |

There is no `flex-direction: column` on `.app-container` at this breakpoint, no `order` juggling and no height split between components. There is no structural change at all.

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
| `.timer-widget` | `top: 8px; right: 8px`, 30px tall, `width: min(200px, calc(100% - 130px))`, z-index 11 — the opposite end of the same strip, which has no arrow |
| `.app-container` | `width: 100%`, so a skeleton or a refresh can never change the book's width |
| `.user-info` | Shown on the contents page only (`body:not([data-view-mode="index"]) .user-info { display: none }`) |
| `.page-left`, `.page-right` | `width: 100% !important`, `padding: 16px`, no radius, no shadow; the binding shadows `.page-left::after` / `.page-right::before` are hidden |
| `.page-content` | `padding-top: 10px` |
| `.page-nav` | Hidden — the 60px-wide `.mobile-edge-nav` zones take over |
| `.mobile-edge-nav` | `padding-top: 48px`; in recipe view `top: 108px` (40 strip + 4 margin + 16 padding + 48 tabs) so it cannot swallow taps on the paper tabs |
| `.pages-container` | Carries `view-transition-name: page-content` — phone only |

### Which Page Shows

| `data-view-mode` | Left page | Right page |
|------------------|-----------|------------|
| `index` | The contents, `flex: 1 1 auto` | `display: none`. The reply sticky does not need it: `#page-margin` is a sibling of the slip and overlays the foot of the page directly above the input bar |
| `recipe` / `meal` | `display: none` | The page: `display: flex; flex-direction: column` |

In `index` mode `.pages-container` is still `flex-direction: column` (a leftover of the old collapsed-right-page layout); with the right page hidden it has no visible effect.

### One Panel at a Time

`#page-right .tab-panel { display: none }`, and only the panel matching `#page-right[data-tab]` is shown. `body[data-view-mode="recipe"]:has(#page-right[data-tab="notes"]) #page-margin { display: none }` so the reply sticky does not double up with the full thread on the Notes tab — scoped to the recipe page, because `#page-right[data-tab]` keeps its value when the reader goes back to the contents, where the sticky still shows. The title row, the meta line and the phone footer sit outside the panels, so they stay on screen on all three tabs.

### Reading Adjustments

| Property | Value |
|----------|-------|
| `.ingredient-item` | `display: block` — one ingredient per line |
| `.ingredient-sep` | Hidden |
| `.ingredients-list`, `.prep-list` | 17px |
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
│ ✎  Write a note to the cook…      📎   ➤ p. 7│ ← .note-input-row
└──────────────────────────────────────────────┘
```

### Desktop / Tablet: a Slip on the Page

| Property | Value |
|----------|-------|
| Position | `absolute` inside `.book-container`: `left: 10px`, `right: calc(50% + 10px)` (just left of the spine), `bottom: var(--slip-bottom)` (10px) — the foot of the **left** page, in every view and every mode |
| z-index | 6 — above `.pages-container` (1), below the page-turn overlay (10) |
| Surface | `--color-paper-cream`, 1px `--color-border-light` top rule, `--radius-sm`, `box-shadow: 0 -2px 8px rgba(0,0,0,0.06)` |
| Structure | Flex column, 6px gap, `padding: 8px 10px`; `.note-input-row` is a flex row, `align-items: flex-end`, 8px gap |
| Clearance | `.page-left { padding-bottom: var(--slip-clearance) }` (slip height + offset + 10px) keeps the left page's last line off the slip; `.page-right` keeps `.page`'s own 20px |
| Never hidden | The contents page, all three modes, a meal plan and the fallback after a failed load all show it in the same place, so opening a recipe or switching mode cannot move it or blink it |
| `.note-page-number` | Fixed `width: 3.5em`, so "p. 1" becoming "p. 13" cannot narrow the textarea |
| During a turn | The slip does not change height: the in-flight line ("Thinking…", a tool label) is on the reply sticky above it, the textarea stays enabled and focused, and Send/Enter are inert until the turn ends. The textarea grows to three lines, then scrolls |

It is absolutely positioned precisely so that it does **not** scroll away with the recipe.

There is exactly one `<form class="note-input">` in the document in every mode, at every width. The spread modes move it with CSS alone — no JS relocation, no second form — so the image attachment, the auto-resize and the SSE wiring are untouched by the move.

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
│ ▓ │                 │  (title, meta,  │ ▓ │
│ ▓ │                 │   method)       │ ▓ │
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
| Page padding | 20px 28px (+ `--slip-clearance` bottom on the left page) | Same | 16px |
| Spine shadow | Visible | Visible | Hidden |
| Nav arrows | `.page-nav` 29px, 46px hit area | `.page-nav` 36px, 46px hit area | `.page-nav` hidden; 60px `.mobile-edge-nav` zones |
| Section tabs | `.edge-tabs`, right outer edge: inert bookmark ribbons (Ingredients / Method) | Same | `.page-tabs`, page top edge (all three) |
| Left-edge strip | `.contents-tabs`, left page's outer edge: the contents filters while no recipe is open, Contents / Cook / Notes while one is | Same | Chip row under the contents title; filters only |

---

## Component: Section Tabs

The right page carries three panels — Ingredients, Method, Notes — emitted by `recipe-display.renderRecipe` as `.tab-panel[data-tab]`. The active one is recorded on `#page-right[data-tab]`, and `page-tabs.setActiveTab()` is its only writer. Both tab surfaces are shown under `body[data-view-mode="recipe"]` only, so the contents page and the meal plan show neither; nothing in JS hides them.

The desktop strip shows only the first two, and only as ribbons (below). Notes is a left-page spread mode there, so `.edge-tab[data-tab="notes"]` is `display: none` above 600px; the phone's paper tabs keep all three, having no left page to promote anything to. `notes` stays a legal `#page-right[data-tab]` value in both layouts — only the desktop affordance is gone.

### Desktop / Tablet: Edge Tabs

`.edge-tabs` is a child of `.recipe-book`, not of `#page-right` — the page is a scroll container, so tabs inside it would scroll away with the recipe.

| Property | Value |
|----------|-------|
| Position | `absolute`, `top: 76px`, `right: -8px` — out on the leather, past the paper's outer edge |
| z-index | 9 — below `.page-nav` (10) and the timer pill (11) |
| Stack | Flex column, 6px gap |
| `.edge-tab` | `writing-mode: vertical-rl`, 26px wide, `min-height: 92px`, `padding: 10px 4px`, Kalam 14px, `border-radius: 0 var(--radius-sm) var(--radius-sm) 0`, `box-shadow: 2px 2px 5px rgba(0,0,0,0.25)` |
| Colors | Ingredients: `--color-border` face, `--color-ink-dark` text; Method: `--color-accent-brown` face, cream text; Notes (phone `.page-tab` only): `--color-leather` face, cream text |
| Inert | `aria-hidden="true"` and `tabindex="-1"` in `chat.html`; `pointer-events: none`; no hover, focus or pressed styling, and none is drawn as active |
| Visibility | `display: none` in the base sheet; `display: flex` only inside `@media (min-width: 601px)` under `body[data-view-mode="recipe"]`, in every spread mode |

Above 600px a spread mode always applies and the right page is fixed (title, meta, method), so there is nothing for the strip to switch: it is the book's furniture — an empty edge reads as a missing page — and reads as bookmark ribbons, not controls. They are exempt from the 44px rule because they are not controls. The phone's `.page-tabs` are unaffected.

### Mobile: Paper Tabs

`.page-tabs` is a static first child of `#page-right`, before `.page-content`.

| Property | Value |
|----------|-------|
| Visibility | `display: none` in the base sheet, so it never takes room in the desktop `#page-right` column; `display: flex` inside `@media (max-width: 600px)` under `body[data-view-mode="recipe"]` |
| Position | `sticky`, `top: 0`, z-index 5, `flex: 0 0 auto` — the tabs hold the page's top edge while the content scrolls under them, on a cream ground so nothing shows through |
| Spacing | 4px gap, `padding-top: 4px`, `margin-bottom: 10px` |
| `.page-tab` | `flex: 1`, `min-height: 44px`, Kalam 16px, 1px `--color-border`, `border-radius: var(--radius-sm) var(--radius-sm) 0 0`, `--color-paper-aged-dark` face with `--color-accent-brown` text |
| `.page-tab.active` | Cream face, `--color-ink-dark`, weight 700, transparent bottom border and `margin-bottom: -1px` so the tab joins the page |
| Focus | `outline: 2px solid var(--color-ink-dark)` — `outline-offset: -2px` on the paper tabs, `2px` on the edge tabs |

A phone tab tap crossfades `#page-right-content` over 200ms. It is ignored while a page turn is in flight (both share one animation lock), and under `prefers-reduced-motion: reduce` the swap is instant.

### Notes Panel

`.notes-thread` holds the thread **for the recipe on the page** — every entry written while that recipe was open, oldest first, including the cook's own notes, which `#page-margin` filters out. Entries belonging to another recipe are not shown, and notes written while the contents or a meal plan was open form a book-level thread of their own. `margin-notes.renderThread()` is its only writer: `page-tabs.setActiveTab()` calls it when the tab is opened, and `margin-notes.render()` calls it again on every new note while `#page-right[data-tab="notes"]`, so a note written with the Notes tab open appears there as it arrives (on a phone that panel is the only surface on screen — the margin is hidden).

Notes spread mode puts a second `.notes-thread` on the left page, inside a `.notes-page` wrapper capped at 62ch and set 16px for the reading width a full page can afford. It is the same store rendered twice, and `render()` keeps both live.

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

The alphabetical recipe index. It is the book's default state, and on desktop and tablet it is still one click away once a recipe is open: in `contents` spread mode `renderIndex(list, { singleColumn: true })` puts every letter group in `#page-left-content` and leaves the right page to the recipe. `cook` and `notes` modes take the left page for the recipe's ingredients and for the conversation instead; in `notes` mode with no recipe open the contents move across to the right page as one column (`{ singleColumn: true, page: 'right' }`) rather than being left as a severed second half. The alphabet nav stays usable in both arrangements, and the open recipe's entry carries `.current` plus `aria-current="page"`.

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

### Spread Mode Tabs

The same `<nav class="contents-tabs">` carries a second set of buttons — `.contents-tab.spread-tab` with `data-mode` (`contents` / `cook` / `notes`) — and shows exactly one set at a time. `spread-modes.syncStrip()` is the only writer, and it swaps the sets with the `hidden` attribute rather than rebuilding the `<nav>`, which is a sibling of `#page-left-content` precisely so that a contents re-render cannot take it with it.

| `body[data-view-mode]` | Buttons on the strip |
|------------------------|----------------------|
| `index` | The filters: All / Mains / Sweets (Meals when the flag is on) |
| `recipe` | Contents / Cook / Notes |
| `meal` | Contents / Notes — a meal is the one case where several recipes at once is the point, so it never cooks |

- The spread tabs deliberately carry **no** `role="tab"` and **no** `data-tab`, so `page-tabs.js`'s delegated `[role="tab"][data-tab]` handler never sees them: they control the left page, not the right. For the mirror-image reason `app.js`'s filter listener matches `.contents-tab[data-filter]`, so a spread tab never resets the filter.
- Selection is a toggle, not a tablist: it reads off `aria-pressed`, as the filter tabs do, with `.is-active` kept in step with it.
- They reuse `.contents-tab` wholesale — same paper-tab shape, same edge, same metrics (26 × 76px; 44px minimum on the phone) — and vary only the face:

| Tab | Face | Text | Note |
|-----|------|------|------|
| Contents | `--color-leather` | `--color-paper-cream` | The All tab's leather |
| Cook | `--color-border` (`#c9a86c`) | `--color-ink-dark` | The tan face keeps dark ink, exactly as Mains does |
| Notes | `--color-accent-brown` | `--color-paper-cream` | Sweets' brown |

`.spread-tab[aria-pressed="true"]` takes the same pulled-out treatment as `.contents-tab.is-active`: full opacity, weight 700, `padding-left: 8px` and a deeper shadow.

On the phone `.spread-tab { display: none }` — there is no spread to switch, and while a recipe is open the whole left page is hidden anyway; the rule is the belt that makes the phone strip provably filters-only whatever `syncStrip` decides.

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

A cream pill clipped to the top edge of the recipe book cover, **centred over the spine**. It lives inside `.recipe-book` (directly after `.book-cover`) and is positioned relative to the book, so it scrolls and resizes with the book. Centred, it can never meet a page arrow (the top corners) or the user pill. There is no speech-bubble tail.

| Property | Desktop / Tablet | Mobile (≤ 600px) |
|----------|------------------|------------------|
| Position | `absolute; top: -10px; left: 50%; transform: translateX(-50%)` (just above the cover's top rim, over the spine) | `top: 8px; right: 8px; left: auto; transform: none` (inside the frame, which clips overflow on phones; the strip has no arrow) |
| Width | Fixed per state: `.timer-time` has `min-width: 5ch` and tabular numerals, so a tick never changes it | `width: min(200px, calc(100% - 130px))`; a long label ellipsizes |
| Height | 36px | 30px |
| Padding | `4px 8px 4px 14px` | `2px 6px 2px 10px` |
| Text | Kalam 18px / 400, `"{label}: M:SS"`; at zero `"Done — {label}"` | Kalam 14px |
| Clock icon | 18px | 14px |
| Close target | 28 × 28px visual, a 46 × 46px transparent `::before` hit area | Same |
| Background / border | `--color-paper-cream`, `2px solid --color-ink-dark`, `--radius-pill`, `--shadow-soft` | Same |
| z-index | 11 (above `.page-nav` and `.mobile-edge-nav`, 10) | Same |

Contents in order: clock icon, `.timer-text`, `.timer-cancel` (circular hover/focus tint). The pill is `display: none` when no timer runs.

**Finishing.** At zero the pill switches to `data-state="done"` — "Done — {label}" with the border, text and icon in `--color-leather` — and **stays until tapped**. A three-note chime plays through Web Audio (oscillators, no asset); the `AudioContext` is created on the first pointer or key gesture in the page, because browsers refuse audio before one. `navigator.vibrate([200,100,200])` fires where it exists, and the `Notification` is still shown when permission was granted. If audio is unavailable the visual "Done" still shows. The step highlight is removed at zero.

### Step Highlight Band

When a timer carries a `step_number`, the matching `.prep-step[data-step="N"]` on the recipe the timer was started from gets `.timer-active`:

| Property | Value |
|----------|-------|
| Background | `--color-timer-band` (`#fff4c2`) |
| Radius | `--radius-sm` |
| Box | **Unchanged** — no padding, margin or border is added, so the step's `getBoundingClientRect()` is identical with and without the highlight and nothing below it moves |
| Edge | `box-shadow: inset 3px 0 0 var(--color-border), inset 0 0 0 1px rgba(201,168,108,0.5)` |
| Clock mark | A 14px clock SVG as a `background-image` in the number gutter, under the step number |
| Label | `::before` "timer running", absolutely positioned and written up the page's left margin, so it adds no line. (`::after` is the place-keeping bracket.) |
| Motion | None — the band appears without animation, so `prefers-reduced-motion` needs no override |

The highlight is re-applied whenever the same recipe is rendered again, never shown on another recipe, and cleared when the timer completes or is cancelled.

---

## Component: Reply Sticky (`#page-margin`)

AI replies are not printed in a page margin any more. The latest reply of the thread on display is one yellow sticky note directly above the note slip. `#page-margin` keeps its id (it is the region `margin-notes.js` writes into and the e2e suite reads), but it is now a static `<aside class="page-margin" aria-live="polite">` that is a **sibling of `#note-input`** inside `.book-container`, not part of `#page-right`. It survives page turns and re-renders. While a reply streams it carries `aria-busy="true"`, so a screen reader announces the completed note once.

Every thread entry records the recipe that was open when its turn began, stamped at send time, so a reply that lands after the reader has paged on stays with the recipe it answers. The sticky and the Notes view show only the current recipe's entries; `null` is the book-level thread (the contents page and a meal plan). This is a display concern only — the conversation sent to the LLM is still the whole session.

| Property | Desktop / Tablet (> 600px) | Mobile (≤ 600px) |
|----------|----------------------------|------------------|
| Position | `absolute`, in the slip's column (`left: 10px; right: calc(50% + 10px)`), its bottom edge 4px above the slip's top | `left: 8px; right: 8px`, directly above the input bar, z-index 11 (above the edge strips) |
| Placement | `margin-notes.js` measures the slip and the page and hands CSS `--sticky-bottom` and `--sticky-max-height`; a `ResizeObserver` re-measures when the slip, the pages or the left-edge strip resize | Same |
| Height | Capped at 40% of the page (and clear of the left-edge strip), with internal scroll | Same |
| Paper | `--color-sticky`, `border-radius: 2px`, `--shadow-soft`; Kalam 15px / 1.45 in `--color-biro` | Same |
| Dismiss | `.note-dismiss` ✕, a 48 × 48px button, `position: sticky; top: 0` so it stays in reach while a long reply scrolls under it | Same |
| Hidden | `.page-margin:empty`; in `notes` mode, where the whole thread is on the same page above the slip | On the Notes tab (`:has(#page-right[data-tab="notes"])`) |
| Layout effect | None: it overlays the foot of the page, so nothing moves when it appears, grows or goes | Same |

**What it holds** — at most one note:
- While a turn runs, the **in-flight line**: "Thinking…", then a friendly label per tool (`chat.js` `statusLabelFor`: "Setting a timer…", "Opening the recipe…", "Updating the recipe…", "Writing it into the book…", "Looking through the book…", "Laying out the meal…", "Looking it up…", otherwise "Working on it…"), then the reply text as it streams. The in-flight line is never stored in the thread; in `notes` mode it is the thread's last, unstored entry instead.
- Otherwise the displayed thread's latest reply or error, unless the cook dismissed that very note. A dismissed reply stays dismissed for that recipe until a new one arrives. The contents page uses the same element.

**The slip never changes height while a turn runs.** The textarea stays enabled and keeps focus, so the cook can write the next note; Send (`aria-disabled`) and Enter are inert until the turn ends, so a turn cannot be double-sent. The textarea grows to at most three lines and then scrolls.

### Note Styles

| Kind | Selector | Style |
|------|----------|-------|
| Reply | `.margin-note[data-kind="reply"]` | Kalam 15px / 1.45, `--color-biro`; markdown rendered |
| In-flight line | `.margin-note[data-kind="status"]` | Kalam 13px italic, `--color-ink-medium`; text escaped; not dismissible |
| Error | `.margin-note[data-kind="error"]` | `--color-leather`; text escaped |
| Streaming | `.margin-note.streaming` | Blinking `\|` caret via `::after` while chunks arrive |

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
| Reply note appears on the sticky | Fade in + 4px slide up | 200ms | ease-out |
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

Every control the cook taps has a hit area of at least **44px x 44px**, at every width, with floury fingers from the counter. Where the visible control should stay small, a transparent `::before` centred on it carries the rest: `width/height: max(calc(100% + 2px), 46px)` (46px rather than 44 so the hit area's outermost pixels are the control's too). The look is unchanged. The e2e helper `expectHitArea` checks a 5 × 5 grid over the 44px square with `elementFromPoint`.

| Element | Visual (Desktop / Tablet) | Hit area | Mobile |
|---------|---------------------------|----------|--------|
| Nav arrows | `.page-nav` 29px (36px on tablet) | 46px `::before` | Hidden; 60px-wide `.mobile-edge-nav` zones |
| Spread / contents tabs | `.contents-tab` 26 × 76px | 46px `::before` | `.contents-tab` min-height 44px, min-width 66px |
| Edge tabs | `.edge-tab` 26 × 92px | None: inert ribbons, not controls | `.page-tab` min-height 44px, `flex: 1` |
| Share / photo | 44px icon buttons at the end of the meta line | 46px `::before` | Same |
| Send / clipboard | 44 × 44px | 46px `::before` | 44 × 44px |
| Timer close | 28 × 28px | 46px `::before` | Same |
| Reply sticky ✕ | `.note-dismiss` 48 × 48px | Its own box | Same |
| Phone footer links | n/a | 46px `::before` | min-height 44px |
| Index recipe items | `padding: 4px 8px` | — | `padding: 8px 10px`, `min-height: 44px` |
| Note textarea | min-height 34px | — | min-height 44px |

Known gaps, owned elsewhere: the phone's "Recipe Book" label (81 × 16) and the full-width header hit zone above 600px (safe-page-navigation N8), the A-Z letters (`scratch:contents-page-rough-edges`), and the tablet/desktop Logout link (36 × 21).

### Keeping Your Place

`place-keeping.js` lets the cook keep their place with a tap, drawn without touching any box — no margin, padding, border or size change — so nothing on the page moves.

| Mark | How | Look |
|------|-----|------|
| Ingredient tick | Tap an `.ingredient-item[data-index]`; tap again to untick | `data-ticked="true"`: struck through in `--color-pencil`, `opacity: 0.55`, and a pencil ✓ (`::before`, Kalam 15px) in the margin left of the line |
| "You are here" | Tap a `.prep-step[data-step]`; one step at a time, tap again to clear | `aria-current="step"`: a 5px pencil bracket (`::after`) down the step's left margin. With a timer on the same step it stands further out, so both show |
| Clear | "clear ticks" link (`.clear-ticks`, Kalam 14px, `--color-biro`), absolutely placed in the ingredients header, shown only when something is set | Clears the ticks and the step mark |

- Held per recipe id in `sessionStorage['rv-place:<id>']`, so they survive a reload and paging away and back.
- `click`, never `touchstart`, so a scroll that starts on a line does not tick it. Buttons and links inside a line keep their own job.
- Ignored while a page turn or tab crossfade holds the animation lock.
- **Wake lock**: `navigator.wakeLock.request('screen')` is held while a recipe or meal plan is displayed, released on the contents page, re-acquired on `visibilitychange` back to visible, and silently skipped where unsupported.

### Nothing Moves Unless the Cook Acted on It

The layout contract behind all of the above (`tests/e2e/tests/layout-stability.spec.ts`, 1px tolerance, every project): opening a recipe, switching spread mode, sending a note, a reply arriving, refreshing the recipe (`update_recipe`, a photo upload, a late difficulty), a timer starting, ticking and finishing, and ticking an ingredient or marking a step leave the slip, the textarea, the right page's content top, a mid-method step, the next arrow and the timer pill where they were. A refresh of the recipe already displayed shows no skeleton and restores both pages' scroll positions and the phone tab; the difficulty dots have a reserved, fixed-width slot (`.meta-difficulty`) in the meta line.

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

1. **One column**: `.app-container > .book-container > (.section-label#recipe-book-header, .recipe-book, aside#page-margin, form.note-input)`. There is no second panel and no tab bar.
2. **Tab surfaces**: `.edge-tabs` is a child of `.recipe-book` (outside the scroll container); `.page-tabs` is the first child of `#page-right`, before `.page-content`. `#page-margin` (the reply sticky) is a child of `.book-container`, directly before `form.note-input`.
3. **Three attributes drive everything**: `body[data-view-mode]` (`index` / `recipe` / `meal`), `body[data-spread-mode]` (`contents` / `cook` / `notes`, inert at or below 600px) and `#page-right[data-tab]` (`ingredients` / `method` / `notes`).
4. **Template tokens**: `{{user_email}}`, `/static/styles.css?v={{asset_version}}` and `/static/app.js?v={{asset_version}}` must survive verbatim in `chat.html` — a Rust unit test reads the shipped file and asserts on them.

### JS Ownership

1. **`page-tabs.js`** owns `#page-right[data-tab]` and both tab surfaces, via one delegated click listener on `document` matching `[role="tab"][data-tab]`.
2. **`app.js`** owns `body[data-view-mode]` (mirrored from `sharedState.viewMode`) and all DOM wiring, including Enter-to-send and the form `submit` handler on `#note-input`.
3. **`spread-modes.js`** owns `body[data-spread-mode]` and the left-edge strip, via one delegated listener on `document` for `.spread-tab[data-mode]` clicks. It imports nothing but the animation lock: the re-render a mode change needs is a callback `app.js` registers with `registerSpreadRenderer()`, which is what keeps `recipe-display.js` → `page-tabs.js` from closing a cycle. Anything else that needs the mode reads it off the body.
4. **`recipe-display.js`** is the only writer of `#page-right-content` and `#note-page-number`; **`margin-notes.js`** is the only writer of `#page-margin` and `.notes-thread`. `app.js`'s `renderSpread` is the only writer of `#page-left-content`, and the only mover of the ingredients panel between the pages.
5. **`page-transitions.js`** holds the single animation lock. `animatePageTurn` and `crossfadeElement` share it, so a tab tap during a page turn — and a swipe during a tab crossfade — is ignored rather than queued. A spread mode change honours the same lock.
6. **Resize** re-renders the spread for the effective mode; the layout itself is CSS, so nothing else has to react to a breakpoint change.

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
| Spread modes | `contents` / `cook` / `notes` on the left page | Same | None — the attribute is inert |
| Book cover | Full leather frame | Full leather frame | Flush leather, 40px top strip |
| Spine shadow | Yes | Yes | No |
| Recipe nav | `.page-nav` 29px (46px hit area) | `.page-nav` 36px (46px hit area) | Edge zones + `.phone-footer` |
| Section tabs | `.edge-tabs`, right outer edge (Ingredients / Method; on the edge in every mode) | Same | `.page-tabs`, page top edge (all three) |
| Left-edge strip | `.contents-tabs`, left page's outer edge: the contents filters while no recipe is open, Contents / Cook / Notes while one is | Same | Chip row under the contents title; filters only |
| Note input | Slip pinned to the foot of the left page, in every view and mode | Same | Bar beneath the book |
| Reply sticky | Above the slip at the foot of the left page; hidden in notes mode | Same | Above the input bar; hidden on the Notes tab |
| Wood background | Full texture | Full texture | Flat gradient |
| Body padding | 30px 50px | 20px | 0 |
| Book label | `.section-label` above the book | Same | `#recipe-book-header` on the leather strip |
| User info | Fixed top-right | Fixed top-right (10 / 20) | Static header strip, on the contents page only |
| Contents | Two-column split | Two-column split | Single column on the left page |
