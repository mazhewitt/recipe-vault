## Why

The Journal 2.0 direction (`planned-ideas/ui-v2-journal/README.md`) moves the AI into the book: its replies should read as handwritten margin notes beside the recipe, not as a transcript in a separate notepad that competes with the book for space. This is build step 3 of 5. It renders replies into the page while keeping the notepad temporarily as a fallback, so the layout change (step 4, `journal-book-only-layout`) can land separately.

It also closes a real gap: when the AI edits a recipe through `update_recipe` nothing tells the page to refresh, so the reader keeps looking at stale ingredients until they navigate away and back. The prefetch cache makes this worse because the stale copy is served again.

## What Changes

- AI replies render as **margin notes** in a 150px column on the right page (biro-blue Kalam, slightly rotated), streaming in place as chunks arrive. Only the last three notes are visible; the full thread is kept in memory for the Notes tab that step 4 adds.
- Tool activity and timer confirmations render as muted **status lines** in the same column; errors render as a note in the leather red.
- When the contents page is open, the reply lands as a single **sticky note** pinned to the top of the right page.
- The notepad stays for now and still hosts the input and the full transcript. A `localStorage` flag `rv-ui=classic` disables margin rendering for anyone who needs the old behaviour; the flag is removed in step 4.
- After any successful `update_recipe`, the backend emits `recipe_artifact` for the updated recipe and tells the model to reply with one short margin note explaining the change. The frontend clears the prefetch cache before re-fetching so the edit is visible, and fetches each recipe id at most once per turn.
- The system prompt asks for short replies (about 40 words, no headings) because they now live in a margin.
- New `static/margin-notes.js` module; `renderMarkdown` moves from `chat.js` to `utils.js`; the mock LLM gains an `update_recipe` branch so the refresh path is testable end to end.
- Design tokens `--color-biro` and `--color-sticky`; margin notes fade in and respect `prefers-reduced-motion`.

No layout change yet: the notepad, the mobile Book/Chat tab bar and the two-page split are untouched. Undo of AI edits is deferred to a later change.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `web-chat`: replies render as margin notes (streaming, three-note cap, sticky on the contents page); `recipe_artifact` handling clears the prefetch cache and dedupes ids per turn; classic-notepad fallback flag
- `recipe-artifact`: `update_recipe` triggers a page refresh and an explanatory margin note
- `chat-formatting`: system prompt asks for margin-note-length replies without headings
- `family-recipe-ui`: `--color-biro` and `--color-sticky` tokens; margin notes fade in with a reduced-motion fallback
- `frontend-modules`: module list gains `margin-notes.js` and the already-present `page-transitions.js`, `meal-plan-display.js`, `utils.js`; entry point is `chat.html` loading `/static/app.js`; module boundaries for margin notes and utilities
- `browser-testing`: chat tests assert the reply appears as a margin note

## Impact

- `src/ai/client.rs` — `execute_tool` returns the updated recipe id for `update_recipe` and appends a UI instruction to the tool result
- `src/ai/llm.rs` — mock branch for "halve" / "update" that calls `update_recipe`
- `src/ai/prompts.rs` — reply-length guidance and the post-edit note rule
- `tests/chat_test.rs` — `recipe_artifact` emitted after `update_recipe`
- `static/chat.html` — `#page-margin` inside `#page-right`
- `static/styles.css` — margin column grid, note / status / sticky styles, tokens, fade-in, tablet collapse
- `static/margin-notes.js` (new), `static/utils.js`, `static/chat.js`, `static/app.js`
- `tests/e2e/eslint.config.js` — `localStorage` global
- `tests/e2e/tests/margin-notes.spec.ts` (new)
- `design-system.md` — margin note, status line and sticky note components
