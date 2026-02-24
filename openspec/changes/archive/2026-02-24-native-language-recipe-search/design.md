## Context

The app already supports two recipe acquisition flows: (1) generate from Claude's knowledge (`create_recipe`), and (2) import from a URL via `mcp-server-fetch`. This change adds a third: web search using a native-language query, then extraction via the existing fetch flow.

`src/chat/state.rs` already has a clean conditional-spawn pattern for optional MCP servers: check if the runtime is available, add the server config if so, log a warning if not. `mcp-server-fetch` uses this pattern via `uvx`. The search MCP will follow the same pattern.

`src/ai/prompts.rs` is a single static string. All behavioural changes to Claude are made here.

## Goals / Non-Goals

**Goals:**
- When a user asks to *find* a recipe, search the web using a native-language query rather than relying on Claude's training data
- Ask the user to clarify when a dish has a well-known diaspora/restaurant variant that differs significantly from the original
- Show source attribution (site, URL, language, "translated by Claude") in chat when presenting a found recipe

**Non-Goals:**
- Sub-agent or separate LLM call for language detection — Claude handles this in the main context
- Database schema changes — provenance lives in chat history only
- Storing the original-language recipe text
- Supporting self-hosted search (SearXNG etc.) — out of scope for this iteration

## Decisions

### 1. `duckduckgo-mcp` over API-key alternatives

**Decision**: Use `duckduckgo-mcp` (Python, via `uvx duckduckgo-mcp serve`) — no API key required.

**Rationale**: During implementation, both Python Tavily MCP packages were found to be HTTP servers, not stdio MCP servers, making them incompatible with the existing spawn pattern. Brave Search dropped their free tier (Feb 2026). `duckduckgo-mcp` v2.1.0 is a proper stdio MCP server, installable via `uvx`, requires zero API keys, and was verified to return correct native-language results (Marathi recipe sites for `कोल्हापुरी मिसळ रेसिपी`).

**Alternatives considered**:
- Brave Search MCP (`npx`): Free tier dropped; requires Node.js in Dockerfile
- Tavily MCP (`npx tavily-mcp`): Works but requires Node.js and a `TAVILY_API_KEY`
- `mcp-tavily` / `tavily-mcp` Python packages: Both are HTTP servers, not stdio — incompatible with spawn pattern
- SearXNG sidecar: Self-hosted, no API cost, but Docker Compose complexity and a custom MCP wrapper needed

**Trade-off**: DuckDuckGo search quality for very regional queries may vary; it is not a paid index. Accepted — the live test showed correct Marathi results, and the graceful-degradation pattern means quality can be assessed in production.

### 2. `uvx` spawn — unconditional when `uvx` is available

**Decision**: Spawn `uvx duckduckgo-mcp serve` alongside the fetch server, with no API key check. If `uvx` is available (already required for fetch), search is always enabled.

**Rationale**: No key to manage, no env var to set. Simplest possible integration. If DuckDuckGo is unavailable (network issue, rate limit), the MCP server will fail and Claude will surface an error naturally — no special handling needed.

```
// in state.rs — no key check required:
if uvx_available {
    mcp_servers.push(search_server);  // duckduckgo-mcp serve
}
```

### 3. System prompt only for language intelligence — no sub-agent

**Decision**: All language detection, native query generation, and disambiguation logic lives in the system prompt. No additional LLM call.

**Rationale**: Claude already has strong multilingual knowledge and knows the cultural history of dishes (e.g. that Vindaloo is Portuguese-Goan, that Misal Pav is Maharashtrian, etc.). A sub-agent would add a full round-trip of latency and cost for work Claude does trivially inline.

### 4. "find me" vs "create me" as the trigger

**Decision**: The system prompt instructs Claude to interpret "find me a recipe for X" as a web search intent, and "create me a recipe for X" as a generation intent. Ambiguous phrasing ("give me", "I want") should default to asking which the user means.

**Rationale**: Clean semantic split that aligns with user mental models. No keyword matching in code — this is entirely prompt-driven behaviour.

### 5. Disambiguation before any tool call

**Decision**: When the dish has a significant diaspora/restaurant variant, Claude asks a clarifying question *before* calling any tool. No tool needs to return a prompt.

**Rationale**: The agentic loop already allows conversational turns before tool use. Encoding this in the tool would add complexity with no benefit.

**Example**:
> User: "find me a vindaloo recipe"
> Claude: "Vindaloo comes in two quite different forms — the British Indian Restaurant version (very spicy, tomato-based) or the authentic Goan original (pork, wine vinegar, Portuguese influence). Which would you like?"

### 6. Source attribution in chat message only

**Decision**: When presenting a found recipe, Claude's chat message always includes: source site name, URL, source language, and "translated by Claude". No new DB fields.

**Rationale**: The chat history is the provenance record. Adding DB fields would require a migration, add complexity to the API, and surface data the user rarely needs after the initial save.

**Format** (guidance in system prompt):
> Found on [Ruchkar Mejwani](https://ruchkar.com/...) · Marathi → translated by Claude

## Risks / Trade-offs

- **Search quality for regional languages** → DuckDuckGo's index quality for very regional domains may vary. Mitigation: Live-tested with Marathi query and got correct regional results; Claude can include site: hints or country-specific terms if needed.
- **Rate limiting** → DuckDuckGo may rate-limit heavy scraping; at ~30 requests/month this is not a concern, but worth monitoring if usage grows.
- **Translation accuracy** → Claude's translation of recipe content is generally strong for major languages but may miss regional culinary terms. Mitigation: The source attribution is shown so users can check the original.
- **`duckduckgo-mcp` package maturity** → Community package. Mitigation: Graceful-degradation pattern — if the package breaks, it logs a warning at startup rather than crashing the app.

## Open Questions

- ~~Is there a Python-based Brave Search MCP available via `uvx` that would avoid adding Node.js?~~ **Resolved**: `mcp-server-brave-search` on PyPI is a name reservation. Brave dropped free tier (Feb 2026). Python Tavily packages are HTTP servers, not stdio. Settled on `duckduckgo-mcp` — free, no API key, stdio, verified working with native-language queries.
- Should the "find vs create" disambiguation also apply to image uploads? (Probably not — image paste is always an import intent.)
