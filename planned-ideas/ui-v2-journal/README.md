# Recipe Vault UI 2.0 — "Journal 2.0" design handoff

**Status:** Direction chosen, not yet specified or built
**Decided:** 2026-09-05
**Design canvas:** https://claude.ai/code/artifact/81c7246f-37f9-42a1-8b60-634c476a4f9d
**Design sources:** `artboards/` in this folder (see "Rebuilding the canvas" at the end)

---

## Summary

The v2.0 UI keeps the existing "recipe book on a wooden table" metaphor and makes it work harder, rather than replacing it with a conventional app layout. The three big moves:

1. **The AI moves into the book.** Its replies become margin notes and sticky notes on the page. The separate Notepad panel disappears; what remains is a single "Write a note to the cook…" input at the foot of the page.
2. **The index becomes a real contents page.** Photo thumbnails, page numbers, an active A–Z strip, and coloured edge tabs for filtering (All / Mains / Sweets / Meals).
3. **Body text becomes readable.** Ingredients and method steps switch to a serif (Libre Baskerville). Kalam handwriting is kept for titles, section headers, labels, notes and anything the AI "writes".

Everything else about the brand stays: wood table, leather cover, cream pages, the leather red accent, the spine shadow.

---

## Why this direction

Two directions were mocked up at desktop (1440×900) and phone (390×844):

| | A · Counter (not chosen) | B · Journal 2.0 (chosen) |
|---|---|---|
| Aesthetic | Flat, warm editorial. No table or book. | Deepened skeuomorphism. Book stays. |
| Navigation | Persistent recipe list sidebar with search and filter chips | Contents page + edge tabs on the book |
| AI surface | Dark "Ask the cook" command bar that expands when used | Margin notes and stickies inside the book; small note input |
| Type | DM Serif Display + Source Sans 3 | Kalam + Libre Baskerville |
| Strength | Scales cleanly as features grow; more screen for content | Keeps the family-heirloom charm that makes the app distinctive |
| Weakness | Loses what makes Recipe Vault feel like *ours* | Two-page spread caps content per screen; skeuomorphism needs discipline to stay consistent |

The family preferred B. The charm is the product; v2 should protect it while fixing the real usability problems (legibility of small handwriting, a chat panel that competes with the book for space, an index that is just a list of names).

The Counter sketches are kept on page 2 of the canvas and in `artboards/Counter*.dc.html` for reference only.

---

## The design in detail

### Overall frame (desktop)

- Wood background, leather-bound book centred, exactly as today. Book is roughly 1240×760 inside a 1440×900 viewport.
- **User pill** top right (email + Logout) on a translucent dark pill, as today.
- **Timer** is a cream pill "clipped" to the top edge of the book cover (top right), showing an icon, label and remaining time, with a proper 28px close target. Replaces the floating speech bubble.
- **No Notepad panel.** The book takes the full width. This is the single largest layout change and the one most likely to need a spec change (see "Impact on existing specs").

### Left page: Contents

Replaces the current "~ Index ~".

- Title `~ Contents ~` in Kalam 30px bold, centred.
- **A–Z strip** below the title. Letters with recipes are bold in leather red; the rest are muted. Clicking jumps to the letter group (existing behaviour, see `recipe-book-index` spec).
- **Letter groups** with a Kalam 22px bold red header, then one row per recipe:
  - a small "polaroid" photo thumbnail (56×48, white border, slight rotation). Recipes with no photo get a dashed empty polaroid, which doubles as an invitation to add one.
  - recipe name in Libre Baskerville 15px
  - a page number on the right in Kalam, muted. Page numbers are cosmetic but give the book a sense of place and can drive "p. 15" in the phone footer.
- The current recipe's row is highlighted with an aged-paper background.
- Footer line: recipe and meal-plan count, "continued overleaf" when the index spans pages.
- **Edge tabs** on the outer edge of the left page: All, Mains, Sweets, Meals. Coloured (leather red, tan, dark brown, ink). These are filters on the contents. "Meals" shows meal plans (see `meal-planning` spec / `planned-ideas/meal-planning-epic.md`). Categories are not in the recipe model today; see open questions.

*Built (`book-spread-modes`, 2026-09-08): the left page is contextual, not permanently the contents.* Above 600px `body[data-spread-mode]` decides what it holds — the contents, the open recipe's ingredients (**Cook**, the default when a recipe opens: ingredients left, method right, the true cookbook spread) or the conversation (**Notes**, which also takes the note input to the foot of that page). The same edge strip carries both button sets: the four filters while no recipe is open, Contents / Cook / Notes while one is. See the `book-spread-modes` capability spec and the Spread Modes section of `design-system.md`.

### Right page: Recipe

- Title in Kalam 28px, with a larger polaroid photo (96×76) top right. Click opens the existing full-window photo preview.
- Meta line in Kalam 13px muted: total time, serves, difficulty as the existing five-dot scale.
- `ingredients:` and `method:` section headers exactly as today (Kalam 19px, brown, underlined).
- **Ingredient lines** in Libre Baskerville 14px, quantities bold. Desktop packs related items on one line with `·` separators to fit the spread; the phone lists one per line.
- **Steps** numbered in red Kalam, body in Libre Baskerville 14px. The step with a running timer is highlighted with a pale yellow band and a small "timer running" label.
- **Margin column** (150px) to the right of the recipe body holds the AI's output:
  - *Margin notes*: blue "biro" Kalam text, slightly rotated. Used for conversational replies and for explaining what the AI changed ("Halved the chilli — say undo to put it back").
  - *Sticky notes*: yellow Kalam notes with a drop shadow. Used for persistent artefacts like a shopping list or a reminder.
  - Status lines ("Step 3 timer set, I'll nudge you at 1:30") in muted ink.
- **Note input** at the foot of the page: pencil icon, "Write a note to the cook…", page number on the right. This is the chat input. Image attachment stays (paperclip) but is secondary.
- **Edge tabs** on the outer edge of the right page: Ingredients, Method, Notes. On desktop these scroll or switch the page content; on the phone they are the three views of a single page. *(Built: the desktop strip is Ingredients / Method only — Notes became a left-page mode — and it steps aside entirely in Cook mode, where both sections are already on the spread. The phone keeps all three.)*

### Phone (≤600px)

- Dark wood background, edge to edge. "Recipe Book" label top left, compact timer pill top right.
- Three **paper tabs on the top edge** of the page: Ingredients / Method / Notes. Active tab is cream and joined to the page; inactive tabs are tan and brown. Swiping between them should feel like turning to a tab (existing `swipe-navigation` spec covers recipe-to-recipe swipe; tab swipe is new).
- A thin leather frame around a single cream page. Title, polaroid, meta line, then the active tab's content one item per line at 16px.
- The AI's margin notes render inline below the content in the same blue Kalam.
- Footer of the page: `‹ previous recipe`, page number, `next recipe ›` in Kalam.
- The **note input** sits below the book as a cream bar with a red send button, 44px targets throughout. No separate Chat tab is needed because the AI writes into the page; the existing Book/Chat tab bar goes away.

### Type system

| Role | Face | Size / weight |
|---|---|---|
| Book title, contents title | Kalam | 28–30px 700 |
| Letter headers, step numbers | Kalam | 18–22px 700, leather red |
| Section headers (`ingredients:`) | Kalam | 19px, accent brown, underlined |
| Meta, labels, page numbers, tabs | Kalam | 13–14px, ink medium/muted |
| AI margin notes | Kalam | 14px, biro blue `#1f3d8a` |
| Sticky notes | Kalam | 13px on `#fbe9a0` |
| Ingredients, steps, contents entries | Libre Baskerville | 14–16px, ink dark |

Load `Kalam:wght@400;700` and `Libre+Baskerville:ital,wght@0,400;0,700;1,400` from Google Fonts. Fallbacks: Georgia for the serif, Comic Sans MS / cursive for Kalam.

### Colour

All existing tokens in `design-system.md` are reused unchanged. Two additions:

| Token (proposed) | Hex | Use |
|---|---|---|
| `--color-biro` | `#1f3d8a` | AI margin notes |
| `--color-sticky` | `#fbe9a0` | Sticky notes |

Tab colours reuse `--color-leather`, `--color-border` (`#c9a86c`, needs dark text), `--color-accent-brown`, `--color-ink-medium`.

Contrast lessons from the review pass: muted `#a0937a` and `#8a7a60` fail on cream at small sizes. Use `#6b5a4a` or darker for any placeholder or label under 16px on paper.

---

## Interaction model

- **The chat becomes annotation.** A user note goes in via the input; the AI's reply lands in the margin of whatever page is open. Long conversations should not pile up in the margin: keep the last two or three notes visible and let the Notes tab show the full thread for the current recipe. The Notes tab is where the chat history lives.
  *Built (`book-spread-modes`, 2026-09-08).* "For the current recipe" is now literal: every thread entry is stamped with the recipe that was open when its turn began, and the margin and the Notes view show only that recipe's entries. Notes written while browsing form a book-level thread. The server-side conversation is untouched, so the AI still remembers the whole session.
- **AI edits are visible and reversible.** When the AI changes a recipe (scale, substitute, halve the chilli) the change is shown in the page and a margin note explains it with an undo affordance.
- **Timers** attach to a step. Setting one highlights the step and pins the timer pill to the cover.
- **Contents filters** are edge tabs, not a search box. Search stays a chat action ("find me something with lamb") which is consistent with the AI-first principle.
- **Navigation** keeps the existing model: contents is page zero, arrows and swipe move through recipes alphabetically, clicking a contents entry opens the recipe, clicking the book header returns to contents.

---

## Impact on existing specs

Specs live in `openspec/specs/`. The following would need a change proposal before implementation:

| Spec | What changes |
|---|---|
| `family-recipe-ui` | "Main layout displays notepad and recipe book side by side" is replaced: book only, chat input inside the book. Timer widget moves from speech bubble to cover pill. Typography requirement widens from Kalam-only to Kalam + serif body. |
| `web-chat` | Message rendering moves from a message list to margin notes on the page; SSE streaming unchanged. Needs a rule for where a reply renders when the user is on the contents page. |
| `recipe-book-index` | Index gains thumbnails, page numbers, a footer and edge-tab filters. Two-page split rule still holds. |
| `recipe-artifact` / `current-recipe-context` | Unchanged in substance, but the "artifact panel" is now the right page with a margin column. |
| `meal-planning` | Meal plans surface under the Meals tab on the contents page. |
| `swipe-navigation` | Add tab swipe on phone. |
| `recipe-page-transitions` | Page-turn animation stays; tab switch on phone needs its own transition (crossfade, per design-system animation guidance). |
| `frontend-modules` | Likely a new `margin-notes.js` module; `chat.js` renders into it instead of the notepad. |

Recipe model: a **category** (Mains / Sweets / …) does not exist on recipes today. Options are an explicit field with AI backfill (as was done for difficulty, see `recipe-difficulty-rating` and `difficulty-backfill`), or deriving it from tags. Decide before building the edge tabs.

---

## Open questions

1. **Categories.** Explicit field vs tags vs AI-derived. Who edits it?
2. **Chat history.** Is the Notes tab per recipe, or one global thread? Per recipe fits the book metaphor; global matches current behaviour.
3. **Contents page on desktop with many recipes.** The current two-page split scrolls each page. With thumbnails each row is ~60px, so ~11 rows per page. Do we paginate the contents ("continued overleaf") or keep independent scroll?
4. **Margin column width.** 150px is tight for longer replies. Consider letting long replies open as a full sticky that overlays the page.
5. **Tablet.** Not mocked. The two-page spread should still work at 768px portrait; the margin column probably has to collapse into inline notes as on the phone.

---

## Suggested build order

1. Typography and contents page (low risk, no layout change): serif body text, polaroids, page numbers, A–Z strip styling.
2. Timer pill on the cover.
3. Margin notes: render chat replies into the right page, keep the notepad temporarily as a fallback behind a flag.
4. Remove the notepad, add the in-book note input, phone tabs.
5. Edge-tab filters, which depend on the category decision.

Each step is small enough to be its own openspec change and can ship independently.

---

## Rebuilding the canvas

The `artboards/` folder holds the design sources: one `.dc.html` file per frame plus `canvas.json` for layout. They are self-contained HTML and can be opened directly in a browser to view a frame. To re-seed the editable canvas in a future Claude Code session, run `/design` and point it at these files; `Main.dc.html` is the Journal 2.0 desktop frame, `JournalMobile.dc.html` the phone, and the two `Counter*` files the unchosen direction.
