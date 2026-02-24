## Why

When a user asks to *find* a recipe for a regional dish (e.g. Kolhapuri Misal Pav, Goan Vindaloo, Bangladeshi Beef Bhuna), the system currently relies on Claude's training data or English-language sources, which tend to surface diaspora or restaurant interpretations rather than authentic local recipes. Searching in the dish's native language, against local recipe sites, yields far more authentic results.

## What Changes

- Add a web search MCP server to the container (Brave Search), spawned alongside the existing fetch server
- Extend the system prompt to distinguish "find me a recipe" (search the web) from "create me a recipe" (generate from knowledge)
- Claude generates search queries in the native language of the dish's cuisine, using locally appropriate terminology
- When a dish has a significant diaspora/restaurant variant that differs from the original, Claude asks the user to clarify which they want before searching
- Search results are fetched and extracted using the existing `mcp-server-fetch` flow
- Source attribution (site name, URL, language, translated by Claude) is shown in chat when presenting a found recipe — no additional DB fields required

## Capabilities

### New Capabilities
- `recipe-web-search`: Web search MCP integration, native-language query generation, diaspora disambiguation prompt, and source attribution in chat when presenting found recipes

### Modified Capabilities
- none

## Impact

- `src/chat/state.rs`: spawn Brave Search MCP server alongside existing fetch server
- `src/ai/prompts.rs`: system prompt additions for find vs create distinction, language detection, disambiguation behaviour, source citation
- `Dockerfile`: add Node.js runtime (for `npx`-based Brave Search MCP) or equivalent
- `docker-compose.yml` / env config: `BRAVE_API_KEY` environment variable
- No database schema changes
- No changes to MCP tool definitions or REST API
