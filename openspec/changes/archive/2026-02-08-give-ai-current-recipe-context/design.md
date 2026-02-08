## Context

Recipe browsing is separate from chat, so the LLM only receives conversation history and tool results. This means follow-up questions (e.g., scaling “this recipe”) require the user to restate which recipe is on screen. We need a lightweight, explicit “current recipe context” signal from the UI to the chat backend and into the LLM prompt/tooling.

Constraints:
- Web chat already streams messages and tool calls via MCP; adding context should not break existing chat history or tool flow.
- Frontend already tracks current recipe ID for navigation; we can reuse that state.
- The LLM should prefer explicit current context when available, while still handling cases where no recipe is selected.

## Goals / Non-Goals

**Goals:**
- Ensure chat requests include the currently displayed recipe context (ID and title when available).
- Provide clear LLM guidance on how to use current context, including calling `get_recipe` if details are needed.
- Keep behavior deterministic when no recipe is selected (index view), or when a recipe was deleted.

**Non-Goals:**
- Adding persistent cross-session memory beyond the current browser session.
- Changing recipe data model or storage.
- Implementing new UI beyond context wiring (unless a minimal indicator is required).

## Decisions

1. **Expose current recipe context in chat API payload**
   - **Decision:** Extend the chat request payload with an optional `current_recipe` object (e.g., `{ recipe_id, title }`).
   - **Rationale:** The LLM needs a reliable, explicit signal separate from free-form chat history. This avoids brittle inference from recent messages.
   - **Alternatives:**
     - Encode current recipe in the system prompt only (no API field). Rejected: prompt must be derived from UI state; API needs a structured field anyway.
     - Insert a synthetic assistant message into chat history. Rejected: pollutes the conversation and complicates truncation logic.

2. **Derive LLM instruction from server-side system prompt + tool descriptions**
   - **Decision:** Add a short rule in the system prompt/reminders that says: “If `current_recipe` is present, treat it as the user’s active recipe; call `get_recipe` when you need details.” Also add a matching hint to the `get_recipe` tool description.
   - **Rationale:** Prompt guidance should be centralized and consistent. Tool descriptions are a secondary reinforcement when the LLM is deciding whether to call `get_recipe`.
   - **Alternatives:**
     - Only hint in the tool description. Rejected: the LLM might never consider the tool unless the system prompt establishes the context.
     - Only hint in the system prompt. Rejected: tool hints are useful reinforcement and lower the chance of hallucinated details.

3. **UI context source of truth**
   - **Decision:** Use the existing “current recipe ID” that is updated on navigation and on recipe display events as the authoritative context. When the index view is active, set context to `null`.
   - **Rationale:** Avoid duplicate state. The browsing logic already knows which recipe is shown.
   - **Alternatives:**
     - Track a separate “chat-selected recipe” independent of the UI. Rejected: creates divergence between visible recipe and chat context.

## Risks / Trade-offs

- **Risk:** LLM uses stale recipe context if UI state and chat payload drift. → **Mitigation:** Always derive `current_recipe` at send time from the same state used to render the recipe.
- **Risk:** Recipe deleted after context captured, causing `get_recipe` to 404. → **Mitigation:** LLM handles not-found by asking the user or offering to show the index list.
- **Trade-off:** Slightly larger chat payload. → Acceptable; payload remains small.

## Migration Plan

- Add `current_recipe` field to the chat request payload (frontend) and server-side request model.
- Update system prompt/reminders to reference `current_recipe` and the `get_recipe` tool when details are required.
- Update `get_recipe` tool description to mention current context usage.
- Validate with manual flows: browse recipe → ask scaling question → LLM fetches recipe via `get_recipe` using current context.

## Open Questions

- Should `current_recipe` include a lightweight hash/version to detect if the visible recipe changed between render and send? - NO