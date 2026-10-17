## 1. Usage logging (`src/ai/llm.rs`)

- [x] 1.1 After every Gemini `generateContent` response, log one `info` line: `gemini usage model=<id> prompt_tokens=<n> output_tokens=<n> thoughts_tokens=<n> cached_tokens=<n> finish_reason=<r>` (missing counts → 0, missing reason → `UNKNOWN`). No content.
- [x] 1.2 Unit test: the usage extraction from a sample `usageMetadata` (with and without `thoughtsTokenCount` / `cachedContentTokenCount`).

## 2. Output budget and thinking level (`src/config.rs`, `src/ai/llm.rs`)

- [x] 2.1 `GEMINI_MAX_OUTPUT_TOKENS` (positive integer, default 16384) parsed in `Config`; invalid values fail config loading with the variable named.
- [x] 2.2 `GEMINI_THINKING_LEVEL` (`low` | `medium` | `high`, optional) parsed in `Config`; any other value fails config loading, naming the variable and the accepted values.
- [x] 2.3 Thread both into the Gemini provider (chat and difficulty/tag instances). `build_gemini_request` sets `maxOutputTokens` from config and adds `thinkingConfig.thinkingLevel` only when a level is set **and** the model id starts with `gemini-3` or `gemini-4`.
- [x] 2.4 Unit tests for each scenario in the spec delta: default budget, override, invalid override, level unset / set on 3.x / set on 2.5 / invalid.

## 3. Finish reasons (`src/ai/llm.rs`)

- [x] 3.1 `parse_gemini_response` reads `candidates[0].finishReason` and `promptFeedback.blockReason`.
- [x] 3.2 `MAX_TOKENS` with no usable content → `LlmError` whose message says the reply was cut off; with text but no call → return the text. Both log at `warn`.
- [x] 3.3 Block reasons, `SAFETY` / `RECITATION` / `PROHIBITED_CONTENT` / `BLOCKLIST` / `SPII` / `MALFORMED_FUNCTION_CALL` with no usable content → `LlmError` naming the reason, no content in the message.
- [x] 3.4 Unit tests for each spec scenario, including "STOP parses exactly as before".

## 4. Function calls echoed unchanged (`src/ai/llm.rs`, `ToolCall`)

- [x] 4.1 Record on `ToolCall` whether its id was synthesised. Serde default `false`, so stored session history still deserialises.
- [x] 4.2 Gemini serializer: omit `id` from `functionCall` when synthesised, and omit it from the paired `functionResponse` too.
- [x] 4.3 Unit tests: model-supplied id round-trips on both parts; omitted id stays omitted on both parts; signature survives on the same part. Existing Anthropic and mock paths unchanged.

## 5. Defaults and docs

- [x] 5.1 `src/config.rs` defaults: Gemini chat `gemini-3.8-flash`, Gemini difficulty `gemini-3.5-flash-lite`. Anthropic defaults unchanged. Update the config unit tests.
- [x] 5.2 `.env.example`, `deploy/.env.example` (replace the stale `claude-3-5-sonnet-20241022` comment), `README.md`: new ids, the two new optional variables, the rollback line.

## 5b. Found by the eval

- [x] 5b.1 `handlers/chat.rs:166-173` adds the "[System] … explain to the user that the conversation was reset" notice to every new session, and the browser sends no `conversation_id` on its first message (`static/chat.js:155`), so with a real model the first reply of every chat opens with "Our conversation was reset…". Inject it only when the request carried a `conversation_id` the server does not hold (web-chat delta). Test at the handler level that a request without an id gets no notice and one with an unknown id does.
- [x] 5b.2 Config-loading test (critic minor): `Config::from_env` fails, naming the variable, for `GEMINI_THINKING_LEVEL=minimal` and for `GEMINI_MAX_OUTPUT_TOKENS=0`. The helper tests alone would pass if `from_env` swallowed the error.

## 6. Live eval (`tests/model-eval/`)

- [x] 6.1 Move the eval harness into `tests/model-eval/`: `seed.cjs`, `gemini-server.sh` (takes `GEMINI_API_KEY` from the environment and never prints it), `run-eval.cjs`, `card.cjs` + `recipe-card.png`, and a README explaining how to run it and what it costs.
- [x] 6.2 Run it against `gemini-2.5-pro` (baseline), `gemini-3.8-flash` (default thinking and `low`), `gemini-3.6-flash`, `gemini-4-argon` and `gemini-3.5-flash-lite`. Record checks passed, latency and summed usage per model in `design.md` → Results, plus any 400s.
- [x] 6.3 Confirm the D1/D2 choice, or amend it with the reason, in `design.md`.

- [x] 6.4 Harder scenarios (`hard-*`, run with `FILTER=hard`) and a blind judge of reply quality (`eval-judgement.md`), added because every model passed the basic set.

## 7. Verification

- [x] 7.1 `cargo test`, `cargo clippy --all-targets`, `make lint`
- [x] 7.2 `make test-e2e` (mock LLM; must remain green)

## 8. Rollout (deployer)

- [ ] 8.1 Production `.env`: `AI_MODEL=gemini-3.8-flash`, `DIFFICULTY_MODEL=gemini-3.5-flash-lite` (or remove both to take the defaults). Leave `GEMINI_THINKING_LEVEL` unset unless the eval says otherwise.
- [ ] 8.2 After a week, read the `gemini usage` lines to get the real monthly cost. Rollback is `AI_MODEL=gemini-2.5-pro`.
