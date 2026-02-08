## Why

Users can browse recipes in the UI, but the chat has no awareness of which recipe is currently visible unless the user restates it. This adds friction to natural follow-up questions like scaling or substitutions that should apply to the visible recipe.

## What Changes

- Capture the currently displayed recipe (or index/none state) in the web UI and include it with chat requests.
- Send this “current recipe context” alongside chat history to the LLM so follow-up questions can reference the visible recipe implicitly.
- Define how the context is cleared or updated when the user navigates away from a recipe or views the index.

## Capabilities

### New Capabilities
- `current-recipe-context`: Establishes how the UI, API, and LLM exchange the “currently viewed recipe” so chat can use it without the user restating the recipe name.

### Modified Capabilities
- `web-chat`: Extend conversation context rules to include explicit current recipe context from the UI, not just chat history.
- `recipe-browsing`: Ensure recipe navigation updates the current recipe context sent with chat requests.

## Impact

- Frontend chat payload construction and state management for current recipe ID/title.
- Chat API request/response handling to pass current recipe context to the LLM.
- LLM prompting/tool-use guidance to prefer current recipe context when present.
- Potential UI/UX updates for when no recipe is selected (index view) or when a recipe is deleted.