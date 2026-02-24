## 1. Research & Container Setup

- [x] 1.1 Check PyPI / uvx for a Python-based Brave Search MCP package — if one exists, the Node.js path can be avoided; document the finding and update design.md accordingly
- [x] 1.2 Add Node.js runtime to the Dockerfile runtime stage (only if no Python alternative found in 1.1) — use `node:slim` layer or minimal Node install to keep image size reasonable
- [x] 1.3 Add `BRAVE_API_KEY` to deployment env config (docker-compose env and Synology NAS environment variables); treat it as optional — app must start without it

## 2. MCP Server Wiring

- [x] 2.1 Check whether `McpServerConfig` in `src/chat/state.rs` supports passing environment variables to child processes; add an `env` field if missing (needed to pass `BRAVE_API_KEY` to the npx subprocess)
- [x] 2.2 Add conditional Brave Search server spawn to `src/chat/state.rs`, mirroring the existing uvx/fetch pattern: check `npx` is on PATH and `BRAVE_API_KEY` is set, push server config if both present, log a clear warning if either is absent

## 3. System Prompt Updates

- [x] 3.1 Add a "Finding Recipes from the Web" section to `src/ai/prompts.rs` covering find vs create intent: "find me / search for / look up" triggers web search, "create / generate / write me" triggers generation, ambiguous phrasing triggers a clarifying question before any tool call
- [x] 3.2 Add native language query generation instructions: when searching, detect the cuisine's country of origin, generate the query in the native language using locally-appropriate dish terminology (not a literal English translation), include worked examples (Marathi for Maharashtrian, Bengali for Bangladeshi, etc.)
- [x] 3.3 Add diaspora disambiguation instructions: before searching for a dish with a well-known restaurant/diaspora variant significantly different from the original, ask the user which version they want and briefly describe the key differences — include Vindaloo (BIR vs Goan) as an example; note that unambiguously regional dishes (e.g. Misal Pav) should skip this step
- [x] 3.4 Add source attribution instruction: when presenting a found recipe, include a line of the form "Found on [Site Name](url) · Language → translated by Claude" before or as part of the recipe preview; omit attribution for generated recipes

## 4. Switch to DuckDuckGo (replaces Brave/Tavily — no API key needed)

- [x] 4.1 Revert Dockerfile: remove `nodejs` and `npm` from the runtime apt-get install, revert verify line back to `uvx --version` only
- [x] 4.2 Update `src/chat/state.rs`: replace Tavily block with `uvx duckduckgo-mcp serve` — spawned unconditionally alongside the fetch server when `uvx` is available; no API key check needed
- [x] 4.3 Update both `.env.example` files: remove API key comments, replace with a note that web search is enabled automatically via DuckDuckGo when uv is installed
- [x] 4.4 Update design.md: document DuckDuckGo decision, why Python Tavily packages were rejected (HTTP servers, not stdio), verified native-language search result

## 5. Verification

- [x] 5.1 Verified `uvx duckduckgo-mcp serve` spawns cleanly (v2.1.0); direct test of `कोल्हापुरी मिसळ रेसिपी` returned correct Marathi recipe sites
- [x] 5.2 Manual test — "find me a kolhapuri misal pav recipe": confirm search tool is called (not create_recipe), query is in Marathi, no disambiguation prompt shown
- [x] 5.3 Manual test — "find me a vindaloo recipe": confirm no tool call is made before Claude asks the BIR vs Goan question; after user selects Goan, confirm search proceeds with appropriate query
- [x] 5.4 Manual test — "create me a banana bread recipe": confirm no search tool call, existing create flow unchanged
- [x] 5.5 Start the app and confirm "DuckDuckGo search server enabled" appears in logs
