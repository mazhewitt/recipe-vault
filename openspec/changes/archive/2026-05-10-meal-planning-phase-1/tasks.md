## 1. Backend — display_meal_plan Tool

- [x] 1.1 Add `DisplayMealPlan` tool definition to the tools array in `src/ai/client.rs` (schema: title, guest_count?, recipes[{recipe_id, role}])
- [x] 1.2 Add `SseEvent::MealArtifact` variant to the SSE event enum in `src/handlers/chat.rs`, carrying title, guest_count, and resolved recipe list (id + title + role)
- [x] 1.3 Implement `handle_display_meal_plan()` in `src/ai/client.rs`: validate all recipe_ids against the family vault, resolve recipe titles, drop invalid non-centrepiece entries, error on invalid centrepiece
- [x] 1.4 Emit `SseEvent::MealArtifact` from the `display_meal_plan` tool handler before returning the tool result to Claude
- [x] 1.5 Serialize `MealArtifact` SSE event to JSON and wire it into the SSE stream in `src/handlers/chat.rs`

## 2. Backend — System Prompt

- [x] 2.1 Add meal assembly instructions to `src/ai/prompts.rs`: propose in chat text → wait for explicit user confirmation → call `display_meal_plan` with all agreed recipe IDs and roles
- [x] 2.2 Add instruction: re-state the full agreed meal composition immediately before calling `display_meal_plan` to ensure state reconstruction accuracy
- [x] 2.3 Add instruction: `display_meal_plan` MUST NOT be called until the user has explicitly confirmed (treat call as equivalent to user pressing "confirm")

## 3. Frontend — Meal Plan Renderer

- [x] 3.1 Create `static/meal-plan-display.js` exporting a `MealPlanDisplay.renderMealPlan(mealPlan)` function that populates `#page-right-content`
- [x] 3.2 Render: meal title, optional guest count badge ("For N people"), recipe list with each recipe's role label and clickable title
- [x] 3.3 Render: disabled action button row ("Shopping List", "Cooking Timeline", "Save Meal") in Phase 1 state
- [x] 3.4 Clicking a recipe title in the meal plan calls `state.fetchAndDisplayRecipe(recipe_id)` to swap to the recipe view
- [x] 3.5 Ensure `escapeHtml()` is applied to all user-derived content (title, recipe titles) in the renderer

## 4. Frontend — SSE Event Handling

- [x] 4.1 Import `MealPlanDisplay` in `static/chat.js` (or `static/app.js`)
- [x] 4.2 Add `case 'meal_artifact':` branch to the SSE event handler in `static/chat.js`; call `MealPlanDisplay.renderMealPlan(parsed)` and make the panel visible
- [x] 4.3 Ensure the panel visibility and layout CSS applies correctly to meal plan content (same show/hide logic as `recipe_artifact`)
- [x] 4.4 Add `meal-plan-display.js` to the `<script>` includes in `static/chat.html`

## 5. Rust Tests

- [x] 5.1 Unit test: `handle_display_meal_plan` drops unknown non-centrepiece IDs and returns error for invalid centrepiece
- [x] 5.2 Unit test: `SseEvent::MealArtifact` serialises correctly to the expected JSON shape
- [x] 5.3 Integration test (chat): send a mock `display_meal_plan` tool call through the chat handler and assert `meal_artifact` SSE event is emitted with resolved recipe titles

## 6. Playwright E2E Tests

- [x] 6.1 Add a `meal-plan-display.spec.ts` test file with a `test.describe('Meal Plan Panel')` block following the pattern of `recipe-display.spec.ts`
- [x] 6.2 Test: `meal_artifact` SSE event renders the meal plan panel — seed 2 recipes, fire a `meal_artifact` event via `page.evaluate`, assert the panel is visible and shows the meal title
- [x] 6.3 Test: meal plan panel shows recipe titles with role labels — assert each recipe entry displays its title and role (`centrepiece` / `side` / `vegetarian alternative`)
- [x] 6.4 Test: guest count badge renders when guest_count is present — assert "For N people" text is visible in the panel
- [x] 6.5 Test: guest count badge absent when guest_count is null — assert no guest count text appears
- [x] 6.6 Test: clicking a recipe title in the meal plan opens the recipe view — click the recipe link, assert `.recipe-title` appears with the correct recipe title
- [x] 6.7 Test: action buttons present in Phase 1 disabled state — assert "Shopping List", "Cooking Timeline", and "Save Meal" buttons are present in the panel
- [x] 6.8 Test: `recipe_artifact` event replaces an open meal plan — render a meal plan, then fire a `recipe_artifact` event, assert the meal plan is gone and the recipe panel is visible
- [x] 6.9 Test: `meal_artifact` event replaces an open recipe — display a recipe, then fire a `meal_artifact` event, assert the recipe panel is replaced by the meal plan
- [x] 6.10 Add mock LLM fixture response for `display_meal_plan` tool call to `tests/e2e/` mock infrastructure (if the mock LLM supports tool-call fixtures)
