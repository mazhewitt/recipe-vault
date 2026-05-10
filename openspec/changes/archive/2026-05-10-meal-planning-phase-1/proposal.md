## Why

Users of Recipe Vault want to plan full meals around a centrepiece recipe, not just cook individual dishes in isolation. Today there is no way to group recipes into a meal, get AI-suggested complementary dishes, or see a coordinated view. Phase 1 delivers chat-first meal assembly with a dedicated meal plan panel — the foundation all later phases (shopping lists, timelines, persistence) build on.

## What Changes

- New `display_meal_plan` AI tool: the AI calls this (after user confirmation) to trigger meal plan rendering in the panel
- New `meal_artifact` SSE event type carrying structured meal plan data (title, guest count, recipes with roles)
- New meal plan panel rendered in the right-hand recipe book panel — a new document type alongside single recipes
- Meal assembly chat pattern: AI proposes meal in text → user confirms/adjusts → AI calls `display_meal_plan`
- System prompt additions teaching the AI the propose-confirm-display discipline
- Recipe roles: each recipe in a meal plan carries a role (`centrepiece`, `side`, `vegetarian alternative`)
- Guest count captured from chat and embedded in the meal plan panel

## Capabilities

### New Capabilities
- `meal-planning`: Core meal planning capability — the meal plan document type, meal plan panel rendering, AI meal assembly via chat, guest count/scaling metadata, recipe roles

### Modified Capabilities
- `web-chat`: Adding `display_meal_plan` as a new AI tool and `meal_artifact` as a new SSE event type
- `recipe-artifact`: The right-hand panel now handles two document types (single recipe and meal plan); navigation between them

## Impact

- `src/ai/client.rs` — register and handle new `display_meal_plan` tool; validate recipe IDs on receipt
- `src/handlers/chat.rs` — add `SseEvent::MealArtifact` variant; emit on `display_meal_plan` tool call
- `src/ai/prompts.rs` — extend system prompt with meal assembly behaviour instructions
- `static/chat.js` — handle `meal_artifact` SSE event; call `fetchAndDisplayMealPlan()`
- `static/app.js` — add `fetchAndDisplayMealPlan()` function
- `static/recipe-display.js` (or new `static/meal-plan-display.js`) — `renderMealPlan()` for the panel
- No database changes required for Phase 1 (meal plan is ephemeral, lives in chat state)
