## 1. Share reqwest::Client across LLM providers

- [x] 1.1 Add `reqwest::Client` to application state (e.g. wrap in `Arc` in `AppState` or pass through `Config`)
- [x] 1.2 Update `LlmProvider::new()` to accept `Option<reqwest::Client>` — use it if `Some`, create new client if `None`
- [x] 1.3 Pass the shared client when constructing `LlmProvider` in `ChatState::get_or_create_agent()`
- [x] 1.4 Pass the shared client when constructing `LlmProvider` in `auto_assign_difficulty()` in `src/handlers/recipes.rs`

## 2. Enable prompt caching

- [x] 2.1 In `complete_anthropic()` in `src/ai/llm.rs`, change the `system` field from a plain string to an array with a `cache_control` block when `system_prompt` is `Some`
- [x] 2.2 Verify the request body format: `"system": [{"type": "text", "text": "...", "cache_control": {"type": "ephemeral"}}]`
- [x] 2.3 Confirm `system` is omitted entirely when `system_prompt` is `None` (no regression)

## 3. Update model configuration

- [x] 3.1 Change the `AI_MODEL` fallback default in `src/config.rs` from `claude-sonnet-4-5` to `claude-sonnet-4-6`
- [x] 3.2 Update `AI_MODEL` default value in `.env.example` to `claude-sonnet-4-6`
- [x] 3.3 Add a `DIFFICULTY_MODEL` field to `Config` in `src/config.rs`, defaulting to `claude-haiku-4-5`
- [x] 3.4 Add `DIFFICULTY_MODEL=claude-haiku-4-5` to `.env.example` with a comment explaining the split
- [x] 3.5 Pass `config.difficulty_model` (instead of `config.ai_model`) when constructing the `LlmProvider` in `auto_assign_difficulty()` in `src/handlers/recipes.rs`

## 4. Verify

- [x] 4.1 Run `cargo build` and confirm no compilation errors
- [ ] 4.2 Start the server locally and send a chat message — confirm TTFT is noticeably faster on the second turn
- [ ] 4.3 Check server logs or response usage stats for `cache_read_input_tokens > 0` on the second turn
- [ ] 4.4 Confirm recipes created without explicit difficulty still get auto-assessed correctly (no regression from client-sharing change)
- [ ] 4.5 Verify difficulty assessment uses `claude-haiku-4-5` (check logs for model name in API calls)
- [ ] 4.6 Verify chat uses `claude-sonnet-4-6` and that a native-language recipe search (e.g. "find me a Kolhapuri Misal Pav recipe") returns a correct Marathi query
