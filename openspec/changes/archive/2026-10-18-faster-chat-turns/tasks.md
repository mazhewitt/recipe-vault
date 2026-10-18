## 1. The open recipe in the message

- [x] 1.1 Tests first (`tests/chat_test.rs`): the block with a recipe holds each ingredient and step (duration, temperature) under `update_recipe`'s field names and keeps `recipe_id:` / `page_servings:`; without one it is today's block; the family-scoped read gives another family's recipe nothing
- [x] 1.2 `current_recipe_context_text(ctx, Option<&RecipeWithDetails>)`; `open_recipe_for_context` reads with `queries::get_recipe` and the family scope, logs a database error at `warn`
- [x] 1.3 The pool reaches `ChatState`; the handler builds the block from the read
- [x] 1.4 Guidance: system prompt, long-conversation reminder, `get_recipe` tool description

## 2. Thinking for chat only

- [x] 2.1 Test first: the assessment provider sends no `thinkingConfig` with `GEMINI_THINKING_LEVEL=low`
- [x] 2.2 `build_assessment_provider` drops the thinking level. Red-checks: the read without the family scope → the other-family test red; the assessment provider given the level → its test red; both restored byte-identical
- [x] 2.3 Docs: `README.md`, `SYNOLOGY.md`, `.env.example`, `deploy/.env.example`: production sets `GEMINI_THINKING_LEVEL=low`, chat only

## 3. Verification

- [x] 3.1 `cargo test`, `make lint`, full e2e: all green (e2e 862 passed, 185 skipped, 0 failed)
- [x] 3.2 The timing table again on the real implementation (`low`): median 2.2 s, mean 2.6 s, worst 4.4 s (was 4.6 / 5.8 / 10.9 s); no `get_recipe` in any turn
- [x] 3.3 Model eval at `low`, basic and hard sets: f1 84/85; the tightened vegetarian check failed in 2 of 3 rounds (tags trusted, bakes dropped) and the German card ended in English once
- [x] 3.5 Prompt fixes: diet judged from what a recipe is; the confirmation asked in the user's language; the tags rule (the context carries the tags). Specs: `recipe-tags` ADDED, `recipe-image-extraction` MODIFIED
- [x] 3.6 Re-run on fresh books, rounds g1–g3: 37/37, 25/25, 25/25; all eight vegetarian recipes named and the German card wholly German every time
- [x] 3.4 `openspec validate faster-chat-turns --strict`

## 4. Release (with the combined release)

- [x] 4.1 NAS: `GEMINI_THINKING_LEVEL=low` beside `AI_MODEL=gemini-3.8-flash` and `DIFFICULTY_MODEL=gemini-3.5-flash-lite` (set by the owner and the container recreated on v2.10.0, 2026-10-18)
- [x] 4.2 Archive after `upgrade-gemini-models`
