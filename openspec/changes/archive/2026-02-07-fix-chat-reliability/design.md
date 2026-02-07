## Context

The chat assistant uses an agent loop in `src/ai/client.rs` that sends messages to the LLM, executes any tool calls, and loops until the LLM produces a final text response. Conversation history is stored in `src/handlers/chat.rs` as `Vec<ChatMessage>` (role + text only). Two separate system prompts exist: one in `AiAgentConfig::default()` and one in `ChatState::get_or_create_agent()`. A reminder is injected at 5+ messages but only covers `display_recipe`.

The LLM response has three variants: `Text`, `ToolUse`, and `TextWithToolUse`. The `ToolUse` branch correctly continues the loop. The `TextWithToolUse` branch breaks immediately, so the LLM never sees tool results when it emits text alongside tool calls.

## Goals / Non-Goals

**Goals:**
- The LLM reliably calls `list_recipes` and returns the actual list when users ask to see their recipes
- After `create_recipe` succeeds, the LLM calls `display_recipe` so the side panel shows the new recipe
- Recipe IDs from prior turns are available in conversation context so the LLM can reference them
- A single, authoritative system prompt governs all tool-use behavior

**Non-Goals:**
- Streaming token-by-token responses (current architecture sends full response after agent loop completes)
- Adding search/filter parameters to `list_recipes` (that's a separate feature)
- Changing the frontend or API contract
- Context window management or conversation truncation strategies

## Decisions

### Decision 1: Continue the agent loop on TextWithToolUse instead of breaking

**Choice**: Remove the `break` from the `TextWithToolUse` match arm. After executing tools, push the assistant message (with text + tool calls) and tool results onto the message list, then continue the loop so the LLM can produce a final response that incorporates tool output.

**Alternative considered**: Keep the break but have the backend synthesize the tool results into the response text. Rejected because this would require the backend to format recipe lists, duplicating LLM work and producing inconsistent formatting.

**Risk**: The LLM may produce a second text response that partially repeats the first. Mitigation: capture only the final text from the last loop iteration as `final_text`, discarding the interim text that accompanied the tool calls.

### Decision 2: Store full message sequence in conversation sessions

**Choice**: Change `ChatMessage` to support tool-call and tool-result roles, or switch the session store from `Vec<ChatMessage>` to `Vec<Message>` (the LLM message enum that already supports User, Assistant-with-tool-calls, and Tool variants). The chat handler will persist the full message sequence from the agent loop, not just the final text.

**Alternative considered**: Summarize tool results into the assistant text before storing (e.g., append "Previously listed recipes: ..."). Rejected because it's fragile and loses structured data the LLM needs (exact recipe IDs).

**Trade-off**: Session memory usage increases since tool results (JSON payloads) are now stored. Acceptable because conversations are short-lived (in-memory, cleared on page refresh) and recipe payloads are small.

### Decision 3: Consolidate to a single system prompt in the chat handler

**Choice**: Remove the system prompt from `AiAgentConfig::default()` (set it to `None`). The chat handler in `get_or_create_agent()` remains the sole owner of the system prompt. This eliminates the confusion of two prompts and makes the prompt easy to find and edit.

**Alternative considered**: Move the prompt to a config file or constant. Deferred -- a constant in the chat handler is sufficient for now.

### Decision 4: Unified system prompt content

**Choice**: The consolidated prompt will include:
1. Role statement (cooking assistant with recipe database)
2. Tool use protocol with explicit trigger words mapped to tools:
   - "list", "show all", "what recipes" → MUST call `list_recipes`
   - "show", "view", "cook", "read" a specific recipe → MUST call `display_recipe`
   - After `create_recipe` returns successfully → MUST call `display_recipe` with the new recipe_id
3. Interaction examples that match actual tool schemas (no phantom parameters)
4. Formatting guidelines (markdown, concise, don't dump full recipes in chat)

### Decision 5: Expand the long-conversation reminder

**Choice**: The reminder injected at 5+ messages will cover all three reliability concerns:
- Use `list_recipes` when the user asks to see their recipes
- Use `display_recipe` to show recipe details in the side panel
- After creating a recipe, call `display_recipe` with the new recipe's ID

### Decision 6: Update create_recipe tool description

**Choice**: Append to the `create_recipe` tool description: "After successful creation, the assistant MUST call display_recipe with the new recipe_id to show it in the side panel." This puts the instruction where the LLM sees it at decision time.

## Risks / Trade-offs

- **[Double-response text]** Continuing the loop after TextWithToolUse means the LLM's initial text (e.g., "Let me look that up...") is discarded in favor of the final response. This is correct behavior -- the user should see the substantive response, not the preamble. → Mitigation: Use the last `final_text` from the loop, not the first.
- **[Session memory growth]** Storing tool results increases per-session memory. → Mitigation: Tool payloads are small JSON. Sessions are already ephemeral (cleared on refresh). No change needed.
- **[Prompt length]** A more detailed system prompt uses more input tokens per request. → Mitigation: The prompt is still well under 1K tokens. Cost impact is negligible.
- **[LLM non-compliance]** Even with perfect prompts, the LLM may occasionally skip tool calls. → Mitigation: The code fixes (loop continuation, history persistence) address the structural causes. Prompt improvements reduce but cannot eliminate stochastic failures.
