# Claude 5.5 is not a drop-in `AI_MODEL` for chat: thinking blocks are discarded

Status: needs-triage
Reported: 2026-10-17
Reporter: Claude (research for `openspec/changes/upgrade-gemini-models`, see its `research.md` §3-4)
Severity: low today (production chat runs on Gemini); blocks any move of chat to Claude 5.x

## Description

`claude-sonnet-5-5` thinks by default, and its migration guide says: "Pass thinking
blocks back unchanged in tool-use loops, including empty ones" and "Keep
conversations append-only"
(https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide).

The Anthropic path in `src/ai/llm.rs` keeps only `text` and `tool_use` blocks when
parsing a response (`llm.rs:572`) and rebuilds assistant turns from just those two
(`llm.rs:492-512`). Setting `AI_MODEL=claude-sonnet-5-5` would therefore break, or at
best degrade, every multi-step tool turn. `max_tokens: 4096` (`llm.rs:412`) would
also be shared with thinking.

A second, unverified risk: the long-conversation reminder is appended to the last
user message in the request copy only (`src/ai/client.rs:663-676`). On later turns
that is an edit to earlier history, which signed thinking blocks may reject with a
400 on accounts created on or after 2026-08-31.

`claude-haiku-5-5` is fine for the single-shot difficulty and tag jobs (no tool loop).

## What a fix needs

- Preserve thinking blocks (with signatures) in `Message::Assistant` and echo them
  verbatim, or request `thinking: {"type": "between_tools"}` if that mode suits.
- Make the reminder injection append-only (a separate trailing user block that is
  stored as sent), or drop it for Claude 5.
- Raise or make configurable `max_tokens`.
- Re-run `tests/model-eval/` (added by `upgrade-gemini-models`) with an Anthropic
  variant before switching.

## Comments
