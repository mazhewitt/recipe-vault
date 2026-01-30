## Why

When users ask the AI Chef about recipes during chat, the recipe content gets mixed into the conversation flow and scrolls away. Users need to see the full recipe persistently while continuing to ask questions - similar to how Claude Desktop shows artifacts in a side panel. This enables a better cooking experience where the recipe stays visible while chatting.

## What Changes

- Add a recipe artifact panel to the right of the chat interface
- Introduce a `display_recipe` tool that Claude calls when it wants to show a recipe
- When the tool is called, the recipe renders in the side panel (not in chat)
- The panel shows structured recipe data: title, image, ingredients, preparation steps, timer
- Chat continues on the left while recipe stays visible on the right

## Capabilities

### New Capabilities
- `recipe-artifact`: Tool-based recipe display panel that renders structured recipe data when Claude calls display_recipe

### Modified Capabilities
- `web-chat`: Add SSE event type for recipe artifact updates, modify UI layout to support side panel

## Impact

- Frontend: New split-panel layout, recipe artifact component, SSE handler for artifact events
- Backend: New display_recipe tool definition in Claude API calls, artifact event streaming
- No database changes - uses existing recipe data
- No breaking changes to existing chat functionality
