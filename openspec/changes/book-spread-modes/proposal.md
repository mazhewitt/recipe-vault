## Why

Manual testing of the Journal 2.0 book on 2026-09-08 surfaced three usability problems that share one root cause: **the spread is laid out identically no matter what the reader is doing.** The book is actually used in three distinct modes.

1. **Browsing** — finding a recipe. The contents across both pages, the A–Z strip and the new filter tabs work well. Nothing to change.
2. **Cooking** — one recipe, hands busy, no interest in anything else. Today the contents index keeps the whole left page (`recipe-display.js:749` re-renders it on every recipe open) while the recipe is squeezed into the right page *minus* a 150px margin column (`styles.css:1747`) — roughly a third of the spread for the only thing being read.
3. **Researching / conversing** — asking about the open recipe, or hunting for a new one. The contents index on the left is redundant, and the chat is a slip pinned over the bottom-right eighth of the book (`.note-input`, `styles.css:246`), awkward for anything longer than a sentence.

Separately, the Notes tab shows **every** note in the session rather than the notes belonging to the recipe on the page. `static/margin-notes.js:19` holds one module-scoped `thread` array that is never scoped or cleared, and `renderThread()` (`:180`) renders all of it. That contradicts the original design: "let the Notes tab show the full thread *for the current recipe*. The Notes tab is where the chat history lives" (`planned-ideas/ui-v2-journal/README.md:118`). Cook a curry, ask two questions, open a crumble — the crumble's Notes tab shows the curry conversation.

## What Changes

**The left page becomes contextual.** The left-edge tab strip introduced by `recipe-tags-contents-filters` keeps its role as the sole control for the left page, but what it offers depends on whether a recipe is open:

| State | Left-edge tabs | Left page | Right page |
|---|---|---|---|
| No recipe open | All / Mains / Sweets / Meals | Contents, first half | Contents, second half |
| Recipe open, **Cook** *(default)* | Contents / Cook / Notes | Ingredients | Method |
| Recipe open, **Notes** | Contents / Cook / Notes | Conversation for this recipe, plus the input | Whole recipe |
| Recipe open, **Contents** | Contents / Cook / Notes | Contents | Whole recipe |

- **Cook mode** is what you get when you open a recipe. Ingredients on the left, method on the right, contents out of the way — the true cookbook spread, and no tab-switching needed on desktop because both halves are on the page at once.
- **Notes mode** gives the conversation a full page of the book at a readable measure, and moves the note input to the foot of that page. The redundant index and the cramped slip are solved by the same move.
- **Contents mode** preserves today's layout as the escape hatch for jumping to another recipe without leaving the one you are on.
- Switching is mostly implicit: opening a recipe selects Cook, focusing the note input selects Notes, choosing a recipe from the contents selects Cook again. The tabs remain for explicit control.
- The right-edge Ingredients / Method / Notes tabs apply only to the right page, so on desktop they are shown only in Contents and Notes mode (where the right page holds the whole recipe) and the Notes entry is dropped from that strip — Notes is now a left-page mode.

**Notes are scoped to a recipe.** Every thread entry records the recipe that was open when the turn started. The Notes page and the margin show only the current recipe's entries; notes written while browsing form a book-level thread shown in Notes mode when no recipe is open. The server-side conversation history (`src/chat/sessions.rs`) is untouched, so the AI still remembers everything — this is a display concern only.

**The phone is unchanged.** At ≤600px there is no spread, so there are no spread modes; the existing single page with Ingredients / Method / Notes top tabs already gives one recipe at a time and a full-width input. Notes scoping does apply.

## Non-goals

- Meal-plan spreads. `viewMode: 'meal'` keeps today's behaviour (the plan on the right, contents on the left); "building a meal" is the one case where seeing several recipes at once is correct. Notes mode is available there; Cook mode is not.
- Persisting notes across sessions. The thread stays in memory.
- Any change to the contents page itself, the A–Z strip, the filter tabs, or the tag model.

## Capabilities

### New Capabilities

- `book-spread-modes`: the contextual left page — the three spread modes, the tab strip that selects them, the implicit transitions between them, and the right page's response

### Modified Capabilities

- `web-chat`: notes carry the recipe they were written under; the Notes view and the margin filter by it; the note input relocates in Notes mode
- `recipe-book-index`: the contents page becomes one of three left-page modes rather than a permanent fixture, and the filter tabs yield the tab strip while a recipe is open
- `frontend-modules`: a new `spread-modes.js` module owns the mode state; `margin-notes.js` gains per-recipe scoping

## Impact

- `static/spread-modes.js` (new) — mode state, the left-edge tab strip, implicit transitions
- `static/margin-notes.js` — `recipeId` on thread entries, filtered `render()` and `renderThread()`
- `static/chat.js` — capture the recipe id at turn start and bind the reply to it
- `static/recipe-display.js` — render ingredients and method into separate pages in Cook mode
- `static/page-tabs.js` — right-edge tabs scoped to the right page; Notes removed from that strip on desktop
- `static/app.js`, `static/chat.html`, `static/navigation.js` — wiring, markup, back-to-contents
- `static/styles.css` — the spread-mode layouts, the note input in its Notes-mode position
- `tests/e2e/tests/spread-modes.spec.ts` (new), `tests/e2e/tests/notes-scoping.spec.ts` (new)
- No Rust, no database, no migration. `design-system.md` gains the tab strip's recipe-mode variant.

## Dependencies

Builds on `recipe-tags-contents-filters` (branch `recipe-tags-contents-filters`, commit `b536148`), which introduces the `.contents-tabs` strip this change repurposes. That change should land first.
