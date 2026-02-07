## 1. Fix Agent Loop Control Flow

- [x] 1.1 Remove `break` from `TextWithToolUse` match arm in `src/ai/client.rs` — after executing tools and pushing messages, continue the loop instead of breaking
- [x] 1.2 In the `TextWithToolUse` arm, do not set `final_text` to the interim text — let the next loop iteration's `Text` response become the final text
- [x] 1.3 Verify the `ToolUse` arm (already loops correctly) is unchanged
- [x] 1.4 Add a loop iteration guard (e.g., max 10 iterations) to prevent infinite loops if the LLM never produces a text-only response

## 2. Persist Full Message Sequence in Conversation History

- [x] 2.1 Change the session store in `src/handlers/chat.rs` from `HashMap<String, Vec<ChatMessage>>` to `HashMap<String, Vec<Message>>` (using the LLM `Message` enum)
- [x] 2.2 Update `chat()` handler to store the user message as `Message::User` instead of `ChatMessage`
- [x] 2.3 Have `AiAgent::chat()` return the full message sequence (including tool calls and results) so the handler can persist it
- [x] 2.4 Update the handler to persist all messages from the agent loop (assistant with tool calls, tool results, final assistant text) into the session
- [x] 2.5 Remove the `ChatMessage` / `ChatRole` types if they are no longer used

## 3. Consolidate System Prompt

- [x] 3.1 Set `system_prompt` to `None` in `AiAgentConfig::default()` in `src/ai/client.rs`
- [x] 3.2 Rewrite the system prompt in `ChatState::get_or_create_agent()` in `src/handlers/chat.rs` to include: role statement, tool-use protocol with trigger-word mappings, correct examples (no phantom `query` param on `list_recipes`), post-create display instruction, and formatting guidelines
- [x] 3.3 Remove the example showing `list_recipes(query='chicken')` — the tool accepts no parameters

## 4. Expand Long-Conversation Reminder

- [x] 4.1 Update the reminder text in `src/ai/client.rs` (injected at 5+ messages) to cover: use `list_recipes` for listing requests, use `display_recipe` for viewing, and call `display_recipe` after creating a recipe

## 5. Update Tool Descriptions

- [x] 5.1 Update `create_recipe` tool description in `src/mcp/tools.rs` to append: "After successful creation, the assistant MUST call display_recipe with the new recipe_id to show it in the side panel."
- [x] 5.2 Review `display_recipe` tool description in `src/ai/llm.rs` for consistency with the new system prompt

## 6. Testing

- [x] 6.1 Run existing unit tests (`cargo test`) and verify no regressions
- [x] 6.2 Manually test "list all recipes" in a fresh conversation — verify `list_recipes` is called and results are shown
- [x] 6.3 Manually test "list all recipes" after 5+ messages — verify the reminder triggers correct behavior
- [x] 6.4 Manually test creating a recipe — verify `display_recipe` is called and the side panel shows the new recipe
- [x] 6.5 Manually test a follow-up referencing a recipe from a prior turn — verify the LLM has the recipe_id from history
