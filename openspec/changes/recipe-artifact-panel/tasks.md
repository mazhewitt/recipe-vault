## 1. Backend: Tool Definition

- [x] 1.1 Add `display_recipe` tool definition struct in `src/ai/llm.rs` or new module
- [x] 1.2 Include `display_recipe` tool in the tools array sent to Claude API in `src/ai/client.rs`
- [x] 1.3 Update system prompt to instruct Claude when to use `display_recipe` tool

## 2. Backend: SSE Event Type

- [x] 2.1 Add `RecipeArtifact` variant to `SseEvent` enum in `src/handlers/chat.rs`
- [x] 2.2 Event carries only `recipe_id: i64` (lightweight signal)

## 3. Backend: Tool Call Handling

- [x] 3.1 Detect `display_recipe` tool calls in the chat response processing
- [x] 3.2 Emit `recipe_artifact` SSE event with the recipe ID
- [x] 3.3 Return tool result ("Recipe displayed") to continue the Claude conversation loop

## 4. Frontend: Recipe Panel Layout

- [x] 4.1 Add recipe panel HTML structure to `CHAT_PAGE_HTML` in `src/handlers/ui.rs`
- [x] 4.2 Add CSS for split-panel layout (chat left 60%, recipe right 40%)
- [x] 4.3 Add CSS for responsive behavior (slide-over on mobile < 768px)
- [x] 4.4 Add panel hidden state when no recipe displayed

## 5. Frontend: Recipe Fetching & Rendering

- [x] 5.1 Add JavaScript to parse `recipe_artifact` SSE events and extract recipe ID
- [x] 5.2 Show loading skeleton in panel immediately on SSE event (before fetch completes)
- [x] 5.3 Fetch recipe data from `GET /api/recipes/:id` (credentials: same-origin for session cookie)
- [x] 5.4 Handle fetch errors gracefully (404 → show "Recipe not found" in panel)
- [x] 5.5 Render recipe title, description, and metadata (times, servings)
- [x] 5.6 Render ingredients list with quantity, unit, name, notes
- [x] 5.7 Render numbered steps with duration indicators (static display)
- [x] 5.8 Add close button for mobile panel view

## 6. Integration Testing

- [ ] 6.1 Test: Ask Claude to show a recipe, verify panel appears with loading then content
- [ ] 6.2 Test: Panel replaces recipe when new one displayed
- [ ] 6.3 Test: Chat continues working while recipe displayed
- [ ] 6.4 Test: Mobile layout slide-over behavior
- [ ] 6.5 Test: Invalid recipe ID shows error state in panel
