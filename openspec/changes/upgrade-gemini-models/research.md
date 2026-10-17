# Recipe Vault: LLM model upgrade research (2026-10-17)

Scope: the chat agent loop (tools, images, multilingual, guided cooking) and the background difficulty and tag jobs.
Current defaults (`src/config.rs:169-174`): Anthropic `claude-sonnet-4-6` / `claude-haiku-4-5`; Gemini `gemini-2.5-pro` / `gemini-2.5-flash`.
Sources were fetched raw (curl) and read directly. Copies are in `scratchpad/web/`. Anything not confirmed from a primary page is marked **UNVERIFIED**.

---

## 1. Gemini lineup as of 2026-10-17

Sources:
- Models: https://ai.google.dev/gemini-api/docs/models (last updated 2026-10-13)
- Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Deprecations: https://ai.google.dev/gemini-api/docs/deprecations
- Release notes: https://ai.google.dev/gemini-api/docs/changelog
- Per-model pages: `/gemini-api/docs/models/<id>`
- Owner's ListModels JSON: `scratchpad/gemini-models.json`

Prices are Paid Tier, Standard, in USD per 1M tokens. Output prices include thinking tokens.

| Model id | Status (Gemini API) | Input / Output | Cached input | Notes |
|---|---|---|---|---|
| `gemini-4-argon` | **Stable GA** (2026-10-13) | **$2 / $10 through 2026-11-30, then $4 / $20** | $0.10, then $0.20 (implicit only; 95% off) | "Flagship reasoning model". 1M unified context. Thinking low/medium(default)/high. Not on Free tier. Explicit caching not supported. |
| `gemini-3.1-pro-preview` (+ `-customtools`) | **Preview** (2026-02-19), no shutdown date | $2 / $12 (≤200k prompt) | $0.20 | The only "Pro" text model besides 2.5 Pro. `-customtools` is "better at prioritizing custom tools". |
| `gemini-3.8-flash` | **Stable GA** (2026-09-02) | **$0.75 / $3.75 through 2026-12-31, then $1.50 / $7.50** | $0.075, then $0.15 | "Our most intelligent Flash model". Thinking low/medium(default)/high. **`minimal` returns an error.** |
| `gemini-3.7-flash` | Deprecated (2026-10-08) | n/a | | Auto-routed to `gemini-3.8-flash`. Do not pin. |
| `gemini-3.6-flash` | **Stable GA** (2026-07-21) | $0.75 / $3.75 intro, then $1.50 / $7.50 (same as 3.8) | $0.075 | "Previous-generation Flash". Built for "token and turn reduction" and less verbose output. |
| `gemini-3.5-flash` | Deprecated (2026-10-08) | n/a | | Auto-routed to `gemini-3.6-flash`. Do not pin. |
| `gemini-3.5-flash-lite` | **Stable GA** (2026-07-21) | **$0.30 / $2.50** | $0.03 | Default thinking level is **minimal**. Google recommends it (with 3.8 Flash) for new projects. |
| `gemini-3.1-flash-lite` | Stable GA (2026-05-07) | $0.25 / $1.50 | $0.025 | **Shutdown 2027-05-07**. Replacement is 3.5 Flash-Lite. |
| `gemini-3-flash-preview` | Preview ("legacy Flash") | $0.50 / $3.00 | $0.05 | Replacement is 3.6 Flash. |
| `gemini-2.5-pro` | Restricted access, "not deprecated" | $1.25 / $10 (≤200k) | $0.125 | See section 1a. |
| `gemini-2.5-flash` | Restricted access, "not deprecated" | $0.30 / $2.50 | $0.03 | See section 1a. |
| `gemini-2.5-flash-lite` | Restricted access | $0.10 / $0.40 | $0.01 | |

Capabilities: every text model above lists Text, Image, Video, Audio and PDF input, function calling, thinking, a 1,048,576-token input window and 65,536 output tokens. Argon's model page says 65,536 output by default and up to 1M with long decode, but ListModels reports `outputTokenLimit: 32768` for Argon. That discrepancy is unresolved.

Implicit caching minimum prefix (https://ai.google.dev/gemini-api/docs/caching): 4,096 tokens on Argon, 3.8 Flash, 3.6 Flash and 3.1 Pro; 2,048 on 2.5 Flash and 2.5 Pro.

### 1a. Deprecation and shutdown of gemini-2.5-pro and gemini-2.5-flash
- **Gemini Developer API** (generativelanguage.googleapis.com, which this app uses): the deprecations page shows "No shutdown date announced" for both. A notice dated 2026-09-18 reads: *"we are limiting access to the 2.5 models to users who have actively used them in the past. These models are not deprecated and will continue to be served until further notice through the API. For any new projects, use our latest models: 3.5 Flash-Lite or 3.8 Flash."*
- **Vertex AI / Gemini Enterprise Agent Platform**: `gemini-2.5-pro`, `gemini-2.5-flash` and `gemini-2.5-flash-lite` have a **retirement date of October 20, 2026**, three days from now. Listed replacements: 2.5 Pro → "gemini-3.8-flash or gemini-3.5-flash"; 2.5 Flash → "gemini-3.8-flash or gemini-3.5-flash-lite or gemini-3.1-flash-lite". Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions
- Takeaway: the app is not hit by the Vertex date. Still, 2.5 is end-of-line, and a Gemini API shutdown could follow (an inference, **UNVERIFIED**).

### 1b. `-latest` aliases
- 2026-01-21 changelog: "gemini-pro-latest switched to gemini-3-pro-preview".
- 2026-03-09 changelog: "gemini-3-pro-preview now points to gemini-3.1-pro-preview".
- No later changelog entry moves `gemini-pro-latest`, and the Argon GA note does not mention aliases. So it most likely resolves to 3.1 Pro preview, but its **current target is UNVERIFIED**.
- 2026-05-19 changelog: `gemini-3.5-flash` "is now the model behind gemini-flash-latest". 3.5 Flash is now deprecated and routed to 3.6 Flash. The current target of `gemini-flash-latest` is **UNVERIFIED**.
- The models page says aliases get "hot-swapped with every new release" and that "Most production apps should use a specific stable model". Do not use `-latest` aliases in production.

---

## 2. API changes from Gemini 2.5 to 3.x/4 that matter here

### Thought signatures (function calling)
Primary source for the generateContent rules is the Google Cloud page. The ai.google.dev page `/thought-signatures` now only says "This page has moved", and the AI Studio thinking guide is written around the Interactions API.

URL: https://cloud.google.com/vertex-ai/generative-ai/docs/thought-signatures (redirects to https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking/thought-signatures). Exact text:

> "Gemini 3 models enforce stricter validation on thought signatures than previous Gemini versions because they improve model performance for function calling. To ensure the model maintains full context across multiple turns of a conversation, you must return the thought signatures from previous responses in your subsequent requests, even when using MINIMAL thinking levels. If a required thought signature is not returned when using Gemini 3 models, the model will return a 400 error."

> "Function calling: If the model response contains one or more functionCall parts, a thought_signature is required for correct processing. In cases of parallel function calls in a single response, only the first functionCall part will contain the thought_signature. In cases of sequential function calls across multiple steps in a turn, each functionCall part will contain a thought_signature.
> Rule: When constructing the next request, you must include the part containing the functionCall and its thought_signature exactly as it was returned by the model. For sequential (multi-step) function calling, validation is performed on all steps in the current turn, and omitting a required thought_signature for the first functionCall part in any step of the current turn results in a 400 error. A turn begins with the most recent user message that is not a functionResponse.
> If the model returns parallel function calls (for example, FC1+signature, FC2), your response must contain all function calls followed by all function responses (FC1+signature, FC2, FR1, FR2). Interleaving responses (FC1+signature, FR1, FC2, FR2) results in a 400 error."

> "Non-function calling: If the model response does not contain a functionCall, it might include a thought_signature in the last part of the response (for example, the last text part). Rule: Including this signature in the next request is recommended for best performance, but omitting it won't cause an error."

> "Always send the thought_signature back to the model inside its original Part. Don't merge a Part containing a signature with one that does not."

> "For Gemini 3.5 Flash and newer models, thoughts from previous turns are preserved by default … either include the full context (thoughts, function calls, and responses) or omit it entirely. Providing partial context can degrade model performance."

The AI Studio thinking guide (https://ai.google.dev/gemini-api/docs/thinking) adds: *"In the generateContent API, there are no dedicated thought blocks. Because of this, signatures are metadata that can be attached to any part, such as living inside functionCall parts or the final part of a response."*

The 3.8 Flash migration checklist (https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.8) says: "Only if using generateContent API: Ensure all FunctionResponse objects include call_id and name" (the generateContent field is `id`), and "Baseline Gemini 3 requirements: … thought signature preservation".

The docs say only "a 400 error". The exact error message string is **UNVERIFIED**.

### Thinking config
- REST `ThinkingConfig` has `includeThoughts`, `thinkingBudget` and `thinkingLevel` (MINIMAL/LOW/MEDIUM/HIGH). For `thinkingLevel` the reference says "Recommended for Gemini 3 or later models. **Use with earlier models results in an error.**" (https://ai.google.dev/api/generate-content)
- "You cannot use both thinking_level and the legacy thinking_budget parameter in the same request. Doing so will return a 400 error." (Gemini 3 guide, now marked deprecated)
- Defaults: 3.8 Flash medium (minimal is an error), Argon medium, 3.6 Flash medium, 3.5 Flash-Lite minimal, 3.x Pro high.
- `max_output_tokens` covers thinking plus output. The Argon guide says: *"Existing apps with a limit lower than 32K: Raise max_output_tokens to at least 32,768. Gemini 4 Argon can spend more of the limit on thinking than earlier models."*
- The 3.8 Flash guide says it "can use more tokens on longer running and complex tasks, by design … For everyday tasks, you can lower the reasoning effort … Alternatively, Gemini 3.6 Flash remains supported."

### Sampling and turn validation (since 3.6 Flash / 3.5 Flash-Lite; applies "to these models and all future Gemini model releases")
- "temperature, top_p, and top_k are deprecated and ignored. In future model generations, supplying these parameters returns an HTTP 400 error." The older Gemini 3 guidance was to leave temperature at its default of 1.0. (https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.6)
- "Prefilling model turns is no longer supported. If the last non-empty turn in the request is a model turn, the API returns a 400 error."
- `candidate_count` is unsupported in Gemini 3 and later.

### media_resolution
For Gemini 3/4 images, the default ("unspecified") is 1120 tokens. Per-item `low` is 280, `medium` 560, `high` 1120 (recommended for images), `ultra_high` 2240. (https://ai.google.dev/gemini-api/docs/media-resolution)

### Request shape
`v1beta/models/{id}:generateContent` and `streamGenerateContent` are still documented. The thought-signature REST examples use generateContent, and the Argon guide mentions "client-side continuation in the GenerateContent API". The docs now default to the **Interactions API** (`/v1beta/interactions`, `previous_interaction_id`), but nothing says generateContent is going away. For streaming, signatures "might be returned in a part with empty text content", so parse all parts.

---

## 3. Recipe Vault Gemini client assessment (`src/ai/llm.rs`)

**Endpoint**
- Non-streaming `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` (llm.rs:593-595). Auth is the `x-goog-api-key` header (llm.rs:601).
- The frontend's "SSE" is not token streaming. The handler sends an empty `chunk` and then waits for the whole agent loop (`state.chat(...)`, handlers/chat.rs:180-185) before emitting results. Latency seen by the user is therefore the sum of all model calls, thinking included.

**Thought signatures: mostly correct**
- Read from each `functionCall` part, accepting `thoughtSignature` or `thought_signature` (llm.rs:794-798). Stored on `ToolCall.thought_signature` (llm.rs:44, serialized with serde).
- Echoed back as `part["thoughtSignature"]` on the same functionCall part (llm.rs:711-722). There is a unit test (llm.rs:883, 906).
- Kept across steps in a turn: the loop pushes `Message::Assistant { tool_calls: Some(pending_tool_calls) }` (client.rs:754-757). Kept across turns: the session stores the returned `new_messages` in memory (client.rs:772; sessions.rs `append_messages`).
- Parallel calls keep a per-call `Option`, so only the first FC carries a signature, as the docs describe. All FCs go in one `model` turn and all FRs in one following `user` turn (llm.rs:731-751). That matches the required "FC1+sig, FC2, FR1, FR2" order.

**Gaps and risks**
1. **`maxOutputTokens: 4096` (llm.rs:626-629)** is shared by chat and the background jobs. On 3.x/4 it includes thinking tokens, and Argon's guide says raise it to at least 32,768. On 3.8 Flash at the default medium level, a long `create_recipe` call (a full recipe from a photo) plus thinking could hit the cap.
2. **Truncated or empty responses become hard errors.** `parse_gemini_response` requires `candidates[0].content.parts` and fails otherwise (llm.rs:758-767). `finishReason` is never read (MAX_TOKENS, MALFORMED_FUNCTION_CALL, SAFETY), so the user just sees a chat error.
3. **Function call ids are synthesised.** If Gemini omits `functionCall.id`, the code invents `gemini_call_{index}` (llm.rs:785-789) and sends it back inside the functionCall part (llm.rs:713-718). That modifies a part the docs say must be returned "exactly as it was returned by the model". Whether this breaks signature validation is **UNVERIFIED**; check it in the live eval. The safe fix is to echo `id` only when the model supplied one.
4. Text-part signatures are dropped. Only `text` is read (llm.rs:773-775), and all text parts are joined into one string (llm.rs:808). The docs say this causes no error but is "recommended for best performance".
5. No `usageMetadata` parsing, so real thinking and cached-token counts are invisible. Worth logging during the eval.
6. No timeout: `reqwest::Client::new()` (main.rs:111). That is fine for Flash. Argon's guide warns hard prompts "can take several minutes".

**No conflicts found**
- No `temperature`, `topP`, `topK`, `thinkingConfig`, `candidateCount` or `mediaResolution` is sent (llm.rs:620-647). Nothing deprecated, and no thinkingLevel/thinkingBudget clash.
- If a `thinkingLevel` is added later, gate it by model: it errors on 2.5, and `minimal` errors on 3.8 Flash.
- Requests always end with a `user` or functionResponse turn, so no prefilled-model-turn 400.
- FunctionResponse includes `id` and `name` (llm.rs:737-740), which satisfies the 3.8 checklist.
- Images go inline as `inline_data`/`mime_type` (llm.rs:691-696), which already works on 2.5. Images stay in session history, so each is re-sent (about 1120 tokens) on every later call in that conversation.

**Anthropic path, relevant if Claude 5.5 is considered**
- The Sonnet 5.5 migration guide (https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide) says: thinking runs by default with no `thinking` field; "Pass thinking blocks back unchanged in tool-use loops, including empty ones"; "Revisit max_tokens"; "Keep conversations append-only".
- The app drops non-text, non-tool_use blocks (llm.rs:572) and rebuilds assistant turns from only text and tool_use (llm.rs:492-512), with `max_tokens: 4096` (llm.rs:412). So `AI_MODEL=claude-sonnet-5-5` is **not a drop-in**. It needs thinking-block preservation, or `thinking: {"type":"between_tools"}`.
- The reminder appended to the last user message only in the request copy (client.rs:663-676) is an "edit to earlier history" on later turns. Sonnet 5.5 thinking blocks are "signed over the conversation before it", so on accounts created on or after 2026-08-31 replaying them would return 400. Whether this affects the owner's account is **UNVERIFIED**.
- Haiku 5.5 is fine for the single-shot background jobs: no tool loop, and blocks are parsed by type.

---

## 4. Anthropic lineup (verified)
Sources: https://platform.claude.com/docs/en/about-claude/pricing, `/docs/en/models/overview`, `/docs/en/models/sonnet-5-5/overview`, `/docs/en/models/haiku-5-5/overview`, `/docs/en/about-claude/model-deprecations`.

| Model id | Input / Output per MTok | Cache read | Thinking (default effort) | Latency | Retirement |
|---|---|---|---|---|---|
| `claude-sonnet-5-5` | **$2 / $10** | $0.10 (5m write $2.50) | Adaptive, on by default (high) | Fast | not before 2027-09-28 |
| `claude-haiku-5-5` | **$0.10 / $0.50** (prompts ≤100k); $0.50 / $2.50 above | $0.01 | Adaptive (medium) | Fastest | not before 2027-10-07 |
| `claude-opus-5-5` | $4 / $20 | $0.20 | Adaptive, always on (medium) | Moderate | not before 2027-09-22 |
| `claude-fable-5-1` | $10 / $50 | $0.25 | Adaptive, always on (high) | Slower | not before 2027-09-01 |

All have a 1M context window and 128K max output, and accept text and image input.
- Haiku 5.5 counts about 30% more tokens than Haiku 4.5 for the same text.
- On Sonnet 5.5, non-default temperature, top_p or top_k returns 400, and forced `tool_choice` (any/tool) returns 400. The app sends neither.
- `claude-sonnet-4-6` is Active (retirement not before 2027-02-17). `claude-haiku-4-5-20251001` is Active (retirement "not sooner than October 15, 2026", with no deprecation announced yet).

---

## 5. Cost estimate (monthly, list prices, no caching)

Assumptions (estimates, not measured):
- Chat calls = turns/day × calls/turn × 30.
- Input per call = system prompt (`src/ai/prompts.rs` is 15.3 KB, about 3.8k tokens) + tools (~2-3k) + history.
- Output per call = visible text and tool arguments plus thinking. Thinking volume is the biggest unknown, so measure `thoughtsTokenCount` in the eval. The same budget is applied to every model; 3.8 Flash and Argon likely think more and 3.6 Flash less.

| Scenario | Calls/mo | Input tok/call | Output tok/call | Input M | Output M |
|---|---|---|---|---|---|
| Low (20 turns/day × 1.5) | 900 | 7,000 | 800 | 6.3 | 0.72 |
| Mid (35 turns/day × 2) | 2,100 | 8,000 | 1,000 | 16.8 | 2.1 |
| High (50 turns/day × 3) | 4,500 | 10,000 | 1,200 | 45.0 | 5.4 |

Formula: cost = InputM × $in + OutputM × $out. Worked example for 3.8 Flash at intro pricing, mid scenario: 16.8 × 0.75 + 2.1 × 3.75 = 12.60 + 7.88 = **$20.48**.

| Chat model | Low | Mid | High |
|---|---|---|---|
| gemini-2.5-pro (current) $1.25/$10 | $15.07 | $42.00 | $110.25 |
| gemini-3.1-pro-preview $2/$12 | $21.24 | $58.80 | $154.80 |
| gemini-4-argon intro $2/$10 (to Nov 30) | $19.80 | $54.60 | $144.00 |
| gemini-4-argon from Dec 1, $4/$20 | $39.60 | $109.20 | $288.00 |
| **gemini-3.8-flash intro $0.75/$3.75 (to Dec 31)** | **$7.42** | **$20.48** | **$54.00** |
| gemini-3.8-flash / 3.6-flash from Jan 1 2027, $1.50/$7.50 | $14.85 | $40.95 | $108.00 |
| gemini-3.5-flash-lite $0.30/$2.50 | $3.69 | $10.29 | $27.00 |
| claude-sonnet-5-5 $2/$10 | $19.80 | $54.60 | $144.00 |
| claude-haiku-5-5 $0.10/$0.50 | $0.99 | $2.73 | $7.20 |

**Caching**
- Gemini implicit caching bills cached input at 10% of the input price (5% on Argon). It applies only when the shared prefix is at least 4,096 tokens on 3.x/4; system plus tools is about 6k, so it should qualify.
- If about half the input tokens hit the cache, the input part of each row drops by about 45%. The hit rate is **UNVERIFIED**: implicit cache TTL is not documented, and turns may be minutes apart.
- Anthropic: the app already caches the system prompt (llm.rs:414-419). Cold turns pay 1.25× on the cache write.
- Token counts are not comparable across vendors because tokenizers differ.

**Background jobs (difficulty + tag)**
Assumptions: 45 recipes/month → 90 calls × about 1,200 input tokens = 0.108M input.
- 3.5 Flash-Lite at minimal thinking, ~50 output tokens: 0.108 × 0.30 + 0.0045 × 2.50 = **$0.04/mo**.
- 2.5 Flash (dynamic thinking, ~450 output): $0.13.
- 3.8 Flash at medium (~450 output): $0.23.
- Haiku 5.5: about $0.04.

These are negligible, and a 300-recipe backfill is still under $1. Choose for reliability, not price.

---

## 6. Recommendation

**Chat: `gemini-3.8-flash`, pinned to the exact id (no `-latest`).**
- Stable GA, and Google's named successor to 2.5 Pro and 2.5 Flash. Built for agents and tool orchestration; image, PDF and multilingual input; 1M context.
- About half the cost of current 2.5 Pro until Dec 31 (mid scenario $20 vs $42). It rises to roughly 2.5 Pro's cost from Jan 1, 2027.
- Run the eval at thinking `low` and `medium` and keep the lowest that passes. Google's guidance is "pick the lowest level that meets your quality bar". On a tablet mid-recipe, latency matters because the app does not stream.
- Include `gemini-3.6-flash` in the eval: same price, fewer tokens and turns, and explicitly offered for workloads that don't need 3.8's extra verification. It may be the better fit for guided cooking.
- Not Argon: about 2.7× the Flash price now, 2× more from Dec 1, slower, and it wants max_output_tokens of at least 32k. Overkill for a recipe agent.
- Not 3.1 Pro: still preview, older (Feb 2026), and pricier than Flash.
- Not Claude Sonnet 5.5: priced the same as Argon intro, needs Anthropic-path code changes, and the owner's budget is on Gemini. Keep it as the fallback if the Gemini eval fails on tool reliability.

**Background jobs: `gemini-3.5-flash-lite`.**
- Stable GA, no shutdown date (unlike 3.1 Flash-Lite, which shuts down 2027-05-07). Defaults to minimal thinking, so latency and token use are low. Strong at "structured JSON parsing". About $0.04/mo.
- Haiku 5.5 would be equally cheap, but it means a second provider key for no real saving.

**Before switching** (the coordinator's call; no repo files were changed):
- Raise `maxOutputTokens` from 4096 to at least 16k, or 32k if Argon is ever used (llm.rs:628).
- Handle `finishReason` and empty `parts` gracefully (llm.rs:758-767).
- Stop synthesising `functionCall.id` in echoed parts (llm.rs:785-789, 713-718), or confirm in the eval that it is harmless.
- Optionally preserve text-part signatures (llm.rs:773-775).
- Log `usageMetadata`.
- If you add `thinkingConfig.thinkingLevel`, gate it to 3.x/4 models.
- Update the defaults at config.rs:171-172 and README.md:98-107 and 316.

**Live eval checklist**
- A multi-step tool chain in one turn (list → get → update).
- Parallel tool calls.
- A non-English handwritten recipe photo → `create_recipe`.
- Guided cooking with `start_timer`.
- A conversation of 5+ messages, to exercise the reminder injection and cross-turn signatures.
- A URL fetch → create.
- Record latency per turn, `thoughtsTokenCount`, `cachedContentTokenCount`, and any 400s.
