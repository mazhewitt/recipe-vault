## ADDED Requirements

### Requirement: Web Search Intent Detection
The system SHALL distinguish between a user asking to *find* a recipe (search the web) and asking to *create* a recipe (generate from Claude's knowledge). Phrases such as "find me", "search for", "look up", or "get me a recipe for" SHALL trigger web search intent. Phrases such as "create", "make up", "write me", or "generate" SHALL trigger generation intent. Ambiguous phrasing SHALL result in Claude asking which the user means before proceeding.

#### Scenario: Find intent triggers web search
- **WHEN** user sends "find me a recipe for Kolhapuri Misal Pav"
- **THEN** Claude SHALL use the web search tool rather than generating from memory
- **AND** Claude SHALL NOT call `create_recipe` until the user has confirmed the found recipe

#### Scenario: Create intent triggers generation
- **WHEN** user sends "create me a recipe for banana bread"
- **THEN** Claude SHALL generate the recipe from its knowledge without calling the web search tool

#### Scenario: Ambiguous intent prompts clarification
- **WHEN** user sends "give me a chocolate cake recipe"
- **THEN** Claude SHALL ask whether they want a recipe found from the web or generated from Claude's knowledge
- **AND** Claude SHALL wait for the user's response before calling any tool

---

### Requirement: Native Language Query Generation
When performing a web search for a recipe, Claude SHALL generate the search query in the native language of the dish's cuisine rather than translating the English dish name literally. Claude SHALL use locally-appropriate terminology and naming conventions for the dish as it is known in its country of origin.

#### Scenario: Maharashtrian dish searched in Marathi
- **WHEN** user asks to find a Kolhapuri Misal Pav recipe
- **THEN** Claude SHALL construct a search query in Marathi (e.g. "कोल्हापुरी मिसळ रेसिपी")
- **AND** the search SHALL NOT use the English transliteration as the primary query term

#### Scenario: Bangladeshi dish searched in Bengali
- **WHEN** user asks to find a Bangladeshi Beef Bhuna recipe
- **THEN** Claude SHALL construct a search query in Bengali (e.g. "গরুর মাংসের ভুনা রেসিপি")

#### Scenario: Dish with no clear single origin uses best available language
- **WHEN** user asks to find a recipe for a dish with mixed or uncertain regional origin
- **THEN** Claude SHALL use the most closely associated language or a combination of native and English terms
- **AND** Claude SHALL proceed with the search rather than blocking on perfect language selection

---

### Requirement: Diaspora Disambiguation Prompt
Before searching, Claude SHALL identify dishes that have a well-known diaspora or restaurant-adapted variant significantly different from the original regional recipe. In these cases, Claude SHALL ask the user which version they want before generating the search query.

#### Scenario: Diaspora dish prompts clarification before search
- **WHEN** user asks to find a Vindaloo recipe
- **THEN** Claude SHALL ask whether they want the British Indian Restaurant version or the authentic Goan original
- **AND** Claude SHALL NOT call the web search tool until the user responds
- **AND** Claude's question SHALL briefly describe the key differences between versions

#### Scenario: Unambiguously regional dish skips clarification
- **WHEN** user asks to find a Kolhapuri Misal Pav recipe
- **THEN** Claude SHALL proceed directly to searching in Marathi without asking for clarification
- **AND** Claude SHALL treat the request as unambiguously regional

#### Scenario: User specifies variant explicitly — no clarification needed
- **WHEN** user asks "find me an authentic Goan Vindaloo recipe"
- **THEN** Claude SHALL proceed directly to searching without a disambiguation prompt
- **AND** the search SHALL target Goan sources

---

### Requirement: Web Search MCP Server Integration
The system SHALL integrate a web search MCP server that Claude can call to retrieve a ranked list of URLs and snippets for a given query. The server SHALL be spawned as a managed child process alongside the existing `fetch` and `recipes` MCP servers. The server SHALL be treated as optional: if the required runtime or API key is absent at startup, the server SHALL not be spawned and a warning SHALL be logged. All other features SHALL remain unaffected.

#### Scenario: Search server spawned when runtime and key are available
- **WHEN** the application starts and both `npx` and `BRAVE_API_KEY` are present in the environment
- **THEN** the Brave Search MCP server SHALL be spawned as a child process
- **AND** Claude SHALL have access to a `brave_web_search` tool

#### Scenario: Search server omitted when prerequisites are absent
- **WHEN** the application starts and `npx` is not found on PATH, or `BRAVE_API_KEY` is not set
- **THEN** the Brave Search MCP server SHALL NOT be spawned
- **AND** a warning SHALL be logged indicating that web recipe search is unavailable
- **AND** the application SHALL start successfully and all other features SHALL function normally

#### Scenario: Search returns ranked URLs for native-language query
- **WHEN** Claude calls the web search tool with a Marathi query string
- **THEN** the tool SHALL return a list of results including URLs and text snippets
- **AND** Claude SHALL use the `fetch` tool to retrieve the most relevant result(s) for recipe extraction

---

### Requirement: Source Attribution in Chat
When presenting a recipe found via web search, Claude SHALL include a source attribution line in its chat message before or alongside the recipe preview. The attribution SHALL identify the source site, link to the source URL, state the original language of the page, and note that the recipe was translated by Claude. This attribution SHALL appear in the chat message and does not need to be stored in the database.

#### Scenario: Attribution shown when presenting found recipe
- **WHEN** Claude has fetched and extracted a recipe from a web search result
- **THEN** Claude's chat message SHALL include the source site name as a markdown link to the source URL
- **AND** the message SHALL state the original language of the source page
- **AND** the message SHALL note that the content was translated by Claude
- **AND** this attribution SHALL appear before the recipe preview or as part of the introductory sentence

#### Scenario: Attribution format
- **WHEN** Claude presents a Marathi recipe found at a URL
- **THEN** the attribution SHALL follow the pattern: "Found on [Site Name](url) · Marathi → translated by Claude"

#### Scenario: No attribution for manually created recipes
- **WHEN** a recipe is created via the "create me a recipe" flow (generation from knowledge)
- **THEN** Claude SHALL NOT include source attribution
- **AND** the response SHALL follow the existing create recipe flow unchanged
