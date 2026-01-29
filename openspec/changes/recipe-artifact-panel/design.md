## Context

Recipe Vault has a working chat interface where users interact with an AI cooking assistant. The assistant can list recipes, get details, and manage recipes via MCP tools. Currently, when the AI shows a recipe, the content appears inline in the chat and scrolls away as the conversation continues.

The chat handler (`src/handlers/chat.rs`) already supports SSE streaming with event types: chunk, tool_use, done, error. The LLM layer (`src/ai/llm.rs`) has full tool use support via `ToolDefinition` and `ToolCall`.

The UI is embedded in `src/handlers/ui.rs` as inline HTML/CSS/JS with htmx for interactions.

## Goals / Non-Goals

**Goals:**
- Display recipes in a persistent side panel when the AI "shows" a recipe
- Use native Claude tool use to signal when a recipe should be displayed
- Keep the recipe visible while continuing to chat
- Support structured recipe display (title, image, ingredients, steps, timer)

**Non-Goals:**
- Recipe editing through the panel (read-only display)
- Multiple artifacts or artifact history
- Offline/PWA support for the panel
- Voice interaction with the timer

## Decisions

### Decision 1: Use Native Tool Use (not MCP)

**Choice:** Add `display_recipe` as a tool definition in the Claude API call, handled directly by the backend.

**Alternatives considered:**
- MCP tool: Would require adding to the MCP server, more infrastructure, and the tool result would need to flow back through MCP. Overkill for a display-only operation.
- Parsing markers from text: Fragile, can break mid-stream, mixes structured and unstructured content.

**Rationale:** The `display_recipe` tool doesn't need to actually "do" anything in the database - it's purely a display signal. Native tool use is explicit, reliable, and we already have the infrastructure in `LlmProvider`.

### Decision 2: New SSE Event Type for Artifact

**Choice:** Add `recipe_artifact` SSE event that carries only the recipe ID.

```
RecipeArtifactEvent {
    event: "recipe_artifact"
    data: {
        recipe_id: i64
    }
}
```

**Rationale:** The SSE event is a lightweight signal. Frontend receives the ID and fetches full recipe data via existing `/api/recipes/:id` endpoint. This keeps the chat handler simple and reuses existing infrastructure.

### Decision 3: Tool Flow

**Choice:** When Claude calls `display_recipe`, the backend:
1. Emits `recipe_artifact` SSE event with the recipe ID
2. Returns a brief tool result ("Recipe displayed") to Claude
3. Claude continues with its text response
4. Frontend receives SSE event, fetches recipe via `GET /api/recipes/:id`, renders panel

**Alternatives considered:**
- Silent tool (no return): Would break the tool use protocol
- Backend fetches and embeds full recipe in SSE: Requires adding DB pool to ChatState, mixes concerns

**Rationale:** The chat handler stays focused on AI conversation. Recipe data fetching is delegated to the frontend using existing API endpoints. The extra HTTP round-trip is negligible on local network.

### Decision 4: Side Panel Layout

**Choice:** Responsive split layout:
- Desktop: Chat left (60%), Recipe panel right (40%)
- Mobile: Recipe panel slides over or tabs
- Panel hidden when no recipe displayed

**Rationale:** Matches the Claude Desktop artifact pattern. Chat remains primary, recipe is supplementary.

### Decision 5: Frontend Fetches Recipe Data

**Choice:** The `display_recipe` tool takes a recipe ID. The backend passes this ID to the frontend via SSE, and the frontend fetches full recipe data from `/api/recipes/:id`.

**Alternatives considered:**
- Backend fetches from DB: Would require adding database pool to `ChatState`, mixing AI conversation concerns with data access
- Claude passes recipe data in tool call: Wastes tokens, Claude already knows the recipe from prior MCP calls

**Rationale:**
- Keeps `ChatState` focused on AI conversation state only
- Reuses existing recipe API endpoint (no new backend code for data fetching)
- Clear separation of concerns: chat handler handles AI, recipe API handles data
- Frontend already has session authentication for API calls

## Risks / Trade-offs

**Risk: Claude calls display_recipe at wrong times**
→ Mitigation: Clear system prompt guidance on when to use the tool ("when the user asks to see a recipe" or "when showing recipe details")

**Risk: Recipe ID doesn't exist**
→ Mitigation: Frontend handles 404 from `/api/recipes/:id` gracefully — shows error in panel or ignores. Tool result to Claude still says "displayed" (it's a display intent, not a data fetch).

**Risk: Panel layout breaks mobile experience**
→ Mitigation: Start with slide-over panel on mobile, iterate based on usage

**Risk: Race condition between LLM response and recipe fetch**
→ Mitigation: Frontend shows loading skeleton immediately on SSE event, then populates when fetch completes. User sees panel appear instantly with "Loading..." state.

**Trade-off: Inline HTML vs template files**
The current architecture embeds all UI in Rust strings. This change continues that pattern rather than introducing template files. Increases file size but maintains consistency.
