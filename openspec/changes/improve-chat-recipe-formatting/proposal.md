## Why

The chat interface displays recipes as dense, unformatted walls of text that are difficult to read and scan. When users ask to list recipes or view recipe details, the response lacks visual structure—ingredients, steps, and metadata all run together. This creates a poor user experience for a cooking assistant where quick readability is essential (users often have messy hands or are multitasking in the kitchen).

## What Changes

- **System prompt enhancement**: Add explicit formatting guidelines to the AI system prompt instructing the LLM to use structured markdown when presenting recipes
- **UI markdown rendering**: Enable markdown parsing in the chat UI so formatted responses render properly (headers, lists, bold text)
- **Recipe presentation standards**: Define consistent formatting patterns for recipe lists, recipe details, ingredients, and cooking steps

## Capabilities

### New Capabilities

- `chat-formatting`: Defines how recipes and other content should be formatted in chat responses, including markdown usage, visual hierarchy, and presentation patterns for different recipe data types

### Modified Capabilities

None. This change adds presentation layer formatting without modifying the underlying MCP interface, recipe domain, or API behavior.

## Impact

- **AI Client** ([src/ai/client.rs](src/ai/client.rs)): System prompt modifications to include formatting instructions
- **Chat UI** ([src/handlers/ui.rs](src/handlers/ui.rs)): Add markdown parsing library and rendering logic to the frontend JavaScript
- **No API changes**: The underlying recipe data structures and MCP tools remain unchanged
- **No breaking changes**: Existing functionality continues to work; responses simply become better formatted
