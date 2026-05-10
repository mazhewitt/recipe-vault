## Context

Recipe Vault's right-hand panel today displays a single recipe artifact triggered by Claude calling `display_recipe`. Chat sessions are ephemeral in-memory stores (12h TTL, 200 session LRU). The AI has access to `list_recipes`, `get_recipe`, `display_recipe`, `create_recipe`, `update_recipe`, `delete_recipe`, and `start_timer` tools.

Phase 1 of meal planning introduces a new document type — the meal plan — that the AI assembles conversationally and renders in the same panel. No persistence is introduced; the meal plan is ephemeral chat state.

## Goals / Non-Goals

**Goals:**
- AI can assemble a meal plan via natural language chat, using vault recipes as building blocks
- User explicitly confirms before the panel renders (propose → confirm → display)
- Meal plan panel shows: title, guest count, recipes with roles (centrepiece/side/vegetarian alternative)
- Clicking a recipe in the plan opens that recipe in the panel
- No new database tables, no persistence; meal plan lives in the session conversation

**Non-Goals:**
- Persisting meal plans (Phase 5 / RV-107)
- Shopping list generation (Phase 2 / RV-104)
- Cooking timeline (Phase 3 / RV-105)
- Dietary labelling beyond the AI's conversational reasoning (Phase 4 / RV-106)
- Multi-course meal structure (out of scope v1)
- Web-search–sourced recipes included as panel-clickable items

## Decisions

### Decision: Propose-in-chat, confirm, then display (Option A1)

The AI proposes the meal plan entirely in chat text. The panel only renders after the user explicitly confirms. The AI reconstructs final meal state from conversation history when calling `display_meal_plan` — no new "pending state" struct is added to `SessionEntry` in Phase 1.

**Alternatives considered:**
- _Live-preview panel (Option B)_: Panel renders as proposal with pending state, user confirms there. Rejected — requires new panel states and complicates the rendering model for limited UX gain in Phase 1.
- _Pending state in SessionEntry (A2)_: Store structured partial meal plan on the backend between turns. More reliable under many edit rounds but adds backend complexity that's only necessary once we reach RV-107 persistence. Revisit when saving is built.

**Implication**: In rare cases with many adjustment rounds, the AI might mis-reconstruct the final meal from history. Acceptable for Phase 1; prompt instructions will reinforce re-summarising the agreed plan immediately before calling `display_meal_plan`.

### Decision: `display_meal_plan` as a new native AI tool

`display_meal_plan` follows the same pattern as `display_recipe` — it is handled in-process in `src/ai/client.rs` (not via MCP subprocess). It receives a structured payload and emits a new `SseEvent::MealArtifact`.

Tool schema:
```json
{
  "name": "display_meal_plan",
  "parameters": {
    "title": "string",
    "guest_count": "integer | null",
    "recipes": [
      { "recipe_id": "string (UUID)", "role": "centrepiece | side | vegetarian alternative" }
    ]
  }
}
```

**Validation**: The backend SHALL validate all `recipe_id` values exist in the family vault before emitting the SSE event. Unknown IDs are dropped with a warning; if the centrepiece ID is invalid, the tool returns an error to Claude.

### Decision: Single `#page-right-content` container for both document types

The existing panel container is reused. Each artifact event (recipe or meal plan) fully replaces the panel content. No persistent state tracking which type is shown — the DOM is the source of truth.

**Alternatives considered:**
- _Separate panel containers_: Adds layout complexity and requires hiding/showing logic. Not worth it for two document types.

### Decision: No "back to meal plan" navigation in Phase 1

Clicking a recipe in the meal plan panel replaces the panel with that recipe. There is no back button. The user can re-trigger the meal plan via chat (e.g., "show the meal plan again"). This is acceptable for Phase 1; when persistence lands (RV-107), the "Meals" index provides re-entry.

## Risks / Trade-offs

- **AI reconstructs from history** → Prompt must instruct the AI to explicitly re-list the full agreed meal before calling `display_meal_plan`. If it misses an adjustment, the panel shows a stale state. Low probability under normal use; acceptable for Phase 1.
- **AI calls `display_meal_plan` prematurely** → Prompt discipline is the only guard. No structural enforcement prevents an eager call before confirmation. Working mitigation: instruct the AI that calling the tool is equivalent to the user pressing "confirm", and it must not call it unless the user has explicitly agreed.
- **Ephemeral loss on refresh** → Meal plan disappears if the user refreshes. Expected and documented; Phase 5 solves this.
- **Vault-thin scenario** → If the vault has few complementary recipes, the AI will propose fewer than 2-4. This is correct behaviour — the epic says "from the vault or alternatively from recipe search". Phase 1 scopes to vault-only; web suggestions may be mentioned in chat text but will not be panel items.

## Migration Plan

No migrations. No database changes.

Deploy: add tool definition + SSE event + frontend renderer. Backend is additive-only. Rollback is trivial — remove the new tool from the tool list.

## Open Questions

- Should `role` be a fixed enum (`centrepiece`, `side`, `vegetarian alternative`) or freeform AI text? Fixed enum is cleaner for the panel renderer. Might constrain AI creativity but predictability wins here.
- When Phase 5 (persistence) ships, should saving use a new `save_meal_plan` AI tool, or a "Save Meal" button on the panel that POSTs the current panel state? The panel button approach is simpler but requires the frontend to hold structured meal data in JS state, not just rendered HTML.
