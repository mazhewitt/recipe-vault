## Why

The chat assistant unreliably calls tools when users ask to list recipes or view a newly created recipe. Family members report that "list all recipes" sometimes returns the actual list and sometimes just a preamble like "Let me check..." with no data. After creating a recipe, the side panel often doesn't show the new recipe. Root cause analysis reveals two code bugs and several prompt weaknesses that interact to produce these failures.

## What Changes

- **Fix agent loop early-exit on TextWithToolUse**: When the LLM returns text alongside tool calls, the agent loop currently breaks before the LLM can see tool results. The loop must continue so the LLM can incorporate tool output (e.g., the actual recipe list) into its response.
- **Persist tool calls and results in conversation history**: Currently only user/assistant text is saved between turns. Tool call arguments and tool results are discarded, so the LLM loses recipe IDs and prior tool context on subsequent messages. The conversation session must store the full message sequence including tool interactions.
- **Consolidate to a single system prompt**: Two competing system prompts exist (one in `AiAgentConfig::default()`, one in the chat handler). Unify into one authoritative prompt that covers all tool-use scenarios.
- **Add explicit post-create display instruction**: The system prompt and `create_recipe` tool description must instruct the LLM to call `display_recipe` after successfully creating a recipe.
- **Expand the long-conversation reminder**: The 5+ message reminder currently only mentions `display_recipe`. It must also remind the LLM to use `list_recipes` for listing requests and to display recipes after creation.
- **Fix prompt/schema mismatch**: The system prompt example shows `list_recipes(query='chicken')` but the tool schema accepts no parameters. Remove the misleading example.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `web-chat`: Conversation context management must preserve the full message sequence (user, assistant, tool-call, tool-result) across turns, not just user/assistant text. The agent loop must not exit early when the LLM returns text with tool calls. The system prompt must be unified and authoritative.
- `recipe-artifact`: After a successful `create_recipe` tool call, the LLM must be instructed to call `display_recipe` with the new recipe's ID so the side panel shows the created recipe.

## Impact

- **Backend** (`src/ai/client.rs`): Agent loop control flow change for `TextWithToolUse` variant; reminder text expansion.
- **Backend** (`src/handlers/chat.rs`): Conversation session storage must include tool messages; system prompt consolidated here (or in a shared config).
- **Backend** (`src/ai/client.rs` / `src/handlers/chat.rs`): Remove duplicate system prompt from `AiAgentConfig::default()`.
- **MCP tool descriptions** (`src/mcp/tools.rs`): Update `create_recipe` description to include post-create display instruction.
- **LLM tool definition** (`src/ai/llm.rs`): No schema changes needed, but the `display_recipe` tool description may be refined.
- **No database changes, no API changes, no frontend changes required.**
