## Context

`planned-ideas/ui-v2-journal/README.md` is the design handoff for UI 2.0; this change is step 3 of its build order. It is written against the result of step 1 (`journal-typography-contents`: `--font-serif`, `pageNumberFor`, `.prep-step[data-step]`, `lastRecipeId`, `photoEpoch`) and step 2 (`journal-timer-cover-pill`: the timer lives in the book cover and `timer_start` may carry `step_number`). Step 4 (`journal-book-only-layout`) is written against the result of this change; in particular it restates the `web-chat` "Web User Interface" requirement as this change leaves it and removes the classic-notepad flag added here.

Relevant current code: `static/chat.js` renders every message into `#messages` via `addMessage` / `updateStreamingMessage` / `finalizeStreamingMessage` and owns `renderMarkdown`; all page content is written as innerHTML into `#page-left-content` / `#page-right-content`; the prefetch cache lives in `static/page-transitions.js` (`getCachedRecipe`, `clearPrefetchCache`) and `fetchAndDisplayRecipe` serves a cached copy when it has a difficulty; `recipe_artifact` is only produced by the native `display_recipe` tool in `src/ai/client.rs` `execute_tool`, and `update_recipe` is an MCP tool whose result is passed straight back to the model.

Decisions already taken with the user: one global chat thread (the margin shows the last three replies; the Notes tab in step 4 shows the whole thread); undo of AI edits is deferred; the classic flag is `localStorage` `rv-ui=classic` and is removed in step 4.

## Goals / Non-Goals

**Goals**
- AI replies, tool activity and timer confirmations appear on the page the reader is looking at.
- Streaming still works: the note grows in place as chunks arrive.
- A visible, correct page after any `update_recipe`.
- A thread store that step 4's Notes tab can render without further backend work.
- A fallback (classic flag) so the change can ship before the notepad is removed.

**Non-Goals**
- Removing the notepad, the mobile tab bar or the "User:"/"AI:" transcript (step 4).
- Undo of AI edits.
- Persisting the thread across page loads (conversation state is still per browser session).
- Sticky notes as persistent artefacts (shopping lists, reminders) — only the contents-page reply uses the sticky style here.

## Decisions

### `#page-margin` is a static sibling, not rendered content
`#page-margin` is added to `static/chat.html` inside `#page-right` as a sibling of `#page-right-content`. Renderers keep rewriting `#page-right-content` with innerHTML, so the margin and its notes survive page turns, index re-renders and meal plan renders. Nothing in `recipe-display.js` or `meal-plan-display.js` needs to know about it.

### Layout keyed off `body[data-view-mode]`
The `viewMode` setter in `app.js` shared state mirrors its value to `document.body.dataset.viewMode`. When it is `recipe`, `#page-right` becomes a two-column grid: `minmax(0, 1fr) 150px` with the margin in the second column. In `index` mode `#page-margin` is absolutely positioned at the top-right of the right page and shows only the latest non-user note (reply, status or error), styled as a sticky. At `max-width: 1024px` (the existing stacking breakpoint) the grid collapses and the margin renders as a block beneath the content, which answers the README's tablet question; at `max-width: 600px` the right page is hidden today, so the margin is not shown on phones until step 4.

### `margin-notes.js` owns the thread
New module `static/margin-notes.js` exporting `initializeState`, `addNote(text, kind)` (`kind` ∈ `reply | status | error | user`), `updateStreamingNote(text)`, `finalizeStreamingNote()`, `getThread()`, `render()`. The thread is a module-scoped array of `{ id, kind, text, at }`. `render()` writes the last three non-user entries into `#page-margin`, oldest first (or the last non-user entry only in index mode). User notes are stored so step 4's Notes tab can show the full conversation, but they are not drawn in the margin. Note DOM:

```html
<div class="margin-note[ streaming]" data-kind="reply">…rendered markdown…</div>
<div class="margin-note" data-kind="status">Using tool: update_recipe</div>
```

### `renderMarkdown` moves to `utils.js`
`margin-notes.js` needs markdown rendering and `chat.js` will import `margin-notes.js`; moving `renderMarkdown` to `utils.js` avoids a cycle. `chat.js` re-exports it so nothing else changes.

### `chat.js` fans out, classic flag short-circuits
`chat.js` keeps the notepad path unchanged and adds the margin calls beside each `addMessage` / `updateStreamingMessage` / `finalizeStreamingMessage`. `isClassic()` reads `localStorage.getItem('rv-ui') === 'classic'` once at module load (guarded by try/catch); when true, no margin calls are made. A turn that ends without a `done` event (dropped connection) would leave both the notepad's `streaming-message` element and the margin's streaming note open, so `sendMessage` finalizes them before starting a turn and the error paths finalize them too; that pair of calls is inside the `!classicMode` guard, so with the flag set the notepad's streaming lifecycle is exactly what it was before this change. The flag exists only so a family member can fall back if margin notes misbehave; step 4 deletes it.

### Backend refresh after `update_recipe`
In `src/ai/client.rs` `execute_tool`, after an MCP call whose tool name is `update_recipe`, parse the result content as JSON; if it carries an `id`, return it as the artifact recipe id (the same slot `display_recipe` uses) and append `\n\n[UI] The recipe page has been refreshed. Reply with one short margin note (one sentence) saying what changed. Do not call display_recipe.` to the tool result text. The chat handler already emits one `recipe_artifact` per returned id, so no SSE changes are needed. Ids are collected in order and deduplicated before emission so `update_recipe` followed by `display_recipe` on the same recipe yields one event.

### Frontend refresh must bypass the prefetch cache
On `recipe_artifact`, `chat.js` calls `clearPrefetchCache()` before `fetchAndDisplayRecipe(id)`; otherwise `fetchAndDisplayRecipe` serves the pre-edit copy. `chat.js` also keeps a per-turn `Set` of ids already fetched (reset in `sendMessage`) so duplicate events in one turn do not trigger a second fetch and a second page turn.

### Mock LLM branch
`complete_mock` in `src/ai/llm.rs` gains a branch: when the user text contains "halve" or "update" and a recipe id is available (the `current_recipe` context text the handler appends, or `mock_recipe_id`), return a `ToolUse` for `update_recipe` with that id and `servings: 2`; when the following tool result is present, return the text "Halved it — serves 2 now." This lets `margin-notes.spec.ts` assert the refresh without a real provider.

### Prompt guidance
`src/ai/prompts.rs` gains a "## Replying" section: replies render as margin notes beside the recipe, so keep conversational replies to about 40 words, no headings, no tables; after `update_recipe` reply with a single sentence describing the change. Recipe lists still use the existing numbered-list format when the user asks to list recipes.

### Tokens and motion
`--color-biro: #1f3d8a` and `--color-sticky: #fbe9a0` join the root tokens. Margin notes use `--font-handwritten` 14px in `--color-biro`; status lines use `--color-ink-medium`; the sticky uses `--color-sticky` with a drop shadow. New notes fade in over 200ms with a 4px upward slide; under `prefers-reduced-motion: reduce` they appear without animation.

## Risks / Trade-offs

- 150px is tight for long replies. Mitigated by the prompt guidance; the README's idea of opening long replies as a full sticky is left for later.
- Two rendering paths (notepad + margin) exist until step 4. Accepted because it keeps this change shippable and the flag gives an escape hatch.
- The `AiAgent::chat` return tuple gains no new fields (the recipe id reuses the existing slot), but `execute_tool` grows another special case; step 2's `TimerData` struct is the pattern to extend if this keeps growing.
- Parsing `update_recipe` results depends on the MCP tool returning JSON with an `id`. If the result shape changes, the page silently stops refreshing; `tests/chat_test.rs` covers the emission.
- `localStorage` access can throw in private windows; the flag read is wrapped in try/catch.

## Migration Plan

Frontend plus a small backend change; no database changes. Deploy normally and purge the Cloudflare cache per CLAUDE.md. Rollback is a redeploy of the previous tag. Users who dislike margin notes can set `rv-ui=classic` until step 4 ships.

## Open Questions

- Should the margin also echo the user's note (as a pencil line above the reply)? Deferred to step 4, where the input moves into the page.
- Whether tool status lines should be hidden once the reply arrives (they currently count toward the three-note cap). Start with showing them; revisit after use.
