# Web Chat Specification

## Purpose

The Web Chat feature provides a browser-based interface for conversing with Claude, with Claude having access to Recipe Vault tools via MCP. This replicates the Claude Desktop + MCP experience in a web browser.

## Requirements

### Requirement: Chat Message Handling

The system SHALL accept chat messages via API and return AI responses using the configured LLM provider. Messages MAY include optional image attachments alongside text.

#### Scenario: Send message and receive response
- **WHEN** a user sends a message via POST /api/chat
- **THEN** the message is sent to the configured LLM provider
- **AND** the provider's response is streamed back
- **AND** the response includes any tool use results

#### Scenario: Send message with image attachment
- **WHEN** a user sends a message via POST /api/chat with an image field
- **THEN** the message text and image are both sent to the configured LLM provider
- **AND** the provider can see and analyze the image content
- **AND** the response may reference or extract data from the image
- **AND** the response is streamed back

#### Scenario: Message with tool use
- **WHEN** a user asks "What recipes do I have?"
- **AND** the configured LLM provider determines it needs to call list_recipes
- **THEN** the MCP tool is invoked
- **AND** the tool result is incorporated into the provider's response
- **AND** the user sees the recipe list in the response

#### Scenario: LLM returns text alongside tool calls
- **WHEN** the configured LLM provider returns both text and tool calls in a single response
- **THEN** the agent loop SHALL execute the tool calls
- **AND** send the tool results back to the provider
- **AND** continue the loop so the provider can produce a final response incorporating tool output
- **AND** the final response text shown to the user is from the provider's response after seeing tool results

### Requirement: MCP Tool Access

The system SHALL provide Claude with access to Recipe Vault tools via MCP.

#### Scenario: List recipes via MCP
- GIVEN Claude needs to list recipes
- WHEN Claude calls the list_recipes tool
- THEN the MCP server executes the tool
- AND returns the recipe list to Claude

#### Scenario: Get recipe details via MCP
- GIVEN Claude needs to get a specific recipe
- WHEN Claude calls the get_recipe tool with a recipe ID
- THEN the MCP server returns the full recipe
- AND Claude can describe the recipe to the user

#### Scenario: Create recipe via MCP
- GIVEN a user asks Claude to create a recipe
- WHEN Claude calls the create_recipe tool
- THEN the MCP server creates the recipe
- AND returns the created recipe details
- AND Claude confirms creation to the user

#### Scenario: MCP server unavailable
- GIVEN the MCP server process has crashed
- WHEN a user sends a message requiring tool use
- THEN an error is returned to the user
- AND the system attempts to restart the MCP server

### Requirement: Streaming Responses

The system SHALL stream AI responses to the browser in real-time.

#### Scenario: Stream text chunks
- GIVEN Claude is generating a response
- WHEN response tokens are produced
- THEN they are sent as SSE events immediately
- AND the browser displays text as it arrives

#### Scenario: Stream tool use notifications
- GIVEN Claude is calling a tool
- WHEN the tool call begins
- THEN a tool_use event is sent
- AND the browser can show "Searching recipes..." or similar

#### Scenario: Stream completion
- GIVEN Claude has finished responding
- WHEN the response is complete
- THEN a done event is sent
- AND the browser knows the response is finished

### Requirement: Conversation Context

The system SHALL maintain conversation context within a browser session, including the full message sequence of user messages, assistant messages (with any tool calls), tool results, and explicit current recipe context from the UI when available.

#### Scenario: Follow-up questions
- **WHEN** a user has asked about a recipe
- **AND** they ask a follow-up question like "How long does it take?"
- **THEN** Claude understands "it" refers to the previous recipe
- **AND** responds with relevant timing information

#### Scenario: Current recipe context included in chat request
- **WHEN** a recipe is displayed in the UI
- **AND** the user sends a chat message
- **THEN** the conversation context sent to the LLM includes `current_recipe` with `recipe_id`
- **AND** includes `title` when available

#### Scenario: No current recipe context
- **WHEN** the recipe index is displayed
- **AND** the user sends a chat message
- **THEN** the conversation context omits `current_recipe` or sets it to null

#### Scenario: LLM uses current recipe context for details
- **WHEN** `current_recipe` is present in the chat request
- **AND** the user asks about "this recipe"
- **THEN** Claude treats `current_recipe` as the active recipe
- **AND** calls `get_recipe` if it needs full recipe details

#### Scenario: New session
- **WHEN** a user refreshes the page
- **AND** they send a new message
- **THEN** conversation history is cleared
- **AND** Claude has no memory of previous messages

#### Scenario: Context window management
- **WHEN** a conversation has many messages
- **AND** a new message is sent
- **THEN** older messages are truncated if needed
- **AND** the most recent context is preserved

#### Scenario: Tool interactions preserved across turns
- **WHEN** Claude calls `list_recipes` and receives recipe IDs in the tool result
- **AND** the user sends a follow-up message referencing a recipe by name
- **THEN** the conversation history sent to the LLM includes the prior tool call and tool result
- **AND** Claude can use the recipe IDs from the prior tool result without calling `list_recipes` again

#### Scenario: Multiple tool calls preserved
- **WHEN** Claude calls `create_recipe` followed by `display_recipe` in one turn
- **AND** the user sends a follow-up message
- **THEN** both tool calls and their results are present in the conversation history

### Requirement: Web User Interface

The system SHALL provide a web-based chat interface in which the user writes notes into the recipe book and AI replies render as margin notes on the open page; the full thread **for the open recipe** is available from the Notes view.

#### Scenario: Send message via UI
- **WHEN** a user types a note and presses Enter or taps send
- **THEN** the note is sent to the API
- **AND** it is stored in the thread as a user entry and appears in the Notes view without a speaker prefix

#### Scenario: Display streaming response
- **WHEN** chunks arrive via SSE for an AI response
- **THEN** a single streaming margin note in `#page-margin` grows in place as text arrives
- **AND** on the `done` event the note loses its streaming state and stays in the margin

#### Scenario: Display tool use
- **WHEN** a `tool_use` event is received
- **THEN** a muted status line naming the tool appears in `#page-margin`

#### Scenario: Handle errors gracefully
- **WHEN** an `error` event is received or the request fails
- **THEN** the error text appears as a margin note styled in the leather red
- **AND** the note input is re-enabled so the user can try again

#### Scenario: Display recipe artifact
- **WHEN** a `recipe_artifact` event is received
- **THEN** the right page shows the loading skeleton
- **AND** the frontend fetches recipe data from /api/recipes/:id
- **AND** renders the recipe on the right page when the fetch completes, leaving `#page-margin` and its notes in place

#### Scenario: Responsive layout with artifact
- **WHEN** the viewport is wider than 1024px and a recipe is displayed in `cook` mode
- **THEN** the left page shows the ingredients and the right page shows the method, with no margin column
- **AND** a reply is pinned to the top corner of the method page as a single slip, so a note written while cooking still gets a visible answer
- **WHEN** the viewport is wider than 1024px and a recipe is displayed in `contents` or `notes` mode
- **THEN** the right page is a two-column grid with the recipe content beside a 150px margin column
- **WHEN** the viewport is 1024px or narrower and wider than 600px
- **THEN** the margin column collapses and notes render beneath the right page content
- **WHEN** the viewport is 600px or narrower
- **THEN** a single page with Ingredients / Method / Notes tabs is shown and the last three notes for the open recipe render beneath the active tab's content

#### Scenario: Reply renders as a margin note
- **WHEN** a recipe is displayed and an AI reply completes
- **THEN** the reply is rendered as markdown inside a `.margin-note[data-kind="reply"]` element in `#page-margin`
- **AND** the note uses the handwritten font in the biro colour

#### Scenario: Margin shows the last three notes
- **WHEN** more than three reply or status notes exist for the open recipe
- **THEN** only the three most recent of that recipe's notes are rendered in `#page-margin`
- **AND** all entries remain available from the thread store and the Notes view

#### Scenario: Reply on the contents page renders as a sticky note
- **WHEN** the contents page is displayed and an AI reply completes
- **THEN** the latest reply is rendered as a single `.sticky-note` pinned to the top of the right page (or beneath the contents on phones)
- **AND** earlier notes are not shown until a recipe is opened

#### Scenario: Timer confirmation renders as a status line
- **WHEN** a `timer_start` event is received
- **THEN** the timer starts as today
- **AND** a status line such as "Timer set: Marinate chicken, 30 min" appears in `#page-margin`

#### Scenario: Notes tab shows the full thread
- **WHEN** the user opens the Notes view (the left-edge Notes tab on desktop, the paper tab on phone)
- **THEN** it lists every user note, reply and status line written while that recipe was open, in order
- **AND** notes belonging to other recipes are not shown

#### Scenario: Notes view with no recipe open
- **WHEN** the user opens the Notes view while no recipe is displayed
- **THEN** it lists the book-level thread: every entry written while the contents or a meal plan was displayed

### Requirement: Recipe Artifact Event Handling

The system SHALL handle recipe_artifact SSE events from the chat API so that the right page always shows the current version of the recipe.

#### Scenario: Parse recipe artifact event
- **WHEN** a recipe_artifact SSE event is received
- **THEN** the recipe_id is extracted from the event data
- **AND** the right page shows the loading state immediately

#### Scenario: Fetch recipe data
- **WHEN** a recipe_artifact event triggers a fetch
- **THEN** the frontend clears the prefetch cache
- **AND** calls GET /api/recipes/:id with credentials: same-origin
- **AND** renders the recipe on the right page on success

#### Scenario: Recipe fetch error handling
- **WHEN** the recipe fetch returns 404
- **THEN** the right page shows "Recipe not found" message
- **AND** the book remains visible (does not hide)

#### Scenario: Recipe panel close button on mobile
- **WHEN** a recipe is displayed on a phone
- **THEN** there is no close button: the recipe is the page, and the note input remains reachable beneath the book
- **AND** the user returns to the contents by tapping the book header or swiping back past the first recipe

#### Scenario: Duplicate ids within one turn fetch once
- **WHEN** two recipe_artifact events with the same recipe_id arrive during a single chat turn
- **THEN** the recipe is fetched and rendered once
- **AND** the second event does not trigger another page turn

### Requirement: Authentication

The system SHALL require authentication for chat access.

#### Scenario: Valid session cookie
- **WHEN** a request includes a valid `rv_session` cookie
- **THEN** the chat endpoint processes the request normally

#### Scenario: Valid API key
- **WHEN** a request includes a valid `X-API-Key` header
- **THEN** the chat endpoint processes the request normally

#### Scenario: No valid authentication
- **WHEN** a request has neither valid session cookie nor valid API key
- **THEN** a 401 Unauthorized response is returned

#### Scenario: Web UI authentication
- **WHEN** a user accesses the chat web UI without a valid session
- **THEN** they are shown a login form requesting the family password
- **AND** upon successful login, they are redirected to the chat interface

### Requirement: display_meal_plan Tool
The system SHALL provide a `display_meal_plan` tool that the AI can call to signal a meal plan should be rendered in the artifact panel. The tool SHALL only be called after the user has explicitly confirmed the proposed meal in chat.

#### Scenario: Tool definition included in chat requests
- **WHEN** a chat request is made
- **THEN** the `display_meal_plan` tool SHALL be included in the tools array sent to Claude
- **AND** the schema SHALL specify: `title` (string, required), `guest_count` (integer, optional), `recipes` (array of `{recipe_id: string, role: string}`, required, min 1 item)

#### Scenario: Valid call triggers meal_artifact event
- **WHEN** Claude calls `display_meal_plan` with valid recipe_ids
- **THEN** the backend SHALL validate all recipe_ids exist in the user's family vault
- **AND** emit a `meal_artifact` SSE event with the full meal plan payload
- **AND** return a tool result confirming the display was triggered

#### Scenario: Unknown recipe_id in payload
- **WHEN** Claude calls `display_meal_plan` and one or more recipe_ids do not exist in the vault
- **THEN** if the unknown ID is the centrepiece, the backend SHALL return an error to Claude and NOT emit a `meal_artifact` event
- **AND** if the unknown IDs are non-centrepiece recipes, they SHALL be dropped from the payload and the remaining plan emitted

#### Scenario: meal_artifact SSE event structure
- **WHEN** a `meal_artifact` event is emitted
- **THEN** it SHALL contain: `title` (string), `guest_count` (integer or null), `recipes` (array of `{recipe_id, title, role}`)
- **AND** recipe titles SHALL be resolved server-side so the frontend does not need to fetch each recipe individually for panel rendering

### Requirement: Unified System Prompt

The system SHALL use a single authoritative system prompt for all chat interactions, including guidance on the recipe tag vocabulary.

#### Scenario: Single prompt source
- **WHEN** the chat agent is initialized
- **THEN** exactly one system prompt is sent to the LLM
- **AND** no default prompt from the agent config competes with the handler prompt

#### Scenario: Prompt includes tool-use triggers
- **WHEN** the system prompt is sent to the LLM
- **THEN** it includes explicit mappings from user intent to required tool calls:
  - Listing/browsing requests → `list_recipes`
  - Viewing/cooking/reading a specific recipe → `display_recipe`
  - After successful recipe creation → `display_recipe` with the new recipe_id
  - Changing a recipe's course, cuisine or diet tags → `update_recipe` with the full `tags` array

#### Scenario: Prompt examples match tool schemas
- **WHEN** the system prompt includes tool call examples
- **THEN** the examples use only parameters that exist in the tool schemas
- **AND** no phantom parameters (e.g., `query` on `list_recipes`) are shown

#### Scenario: Prompt describes the tag vocabulary
- **WHEN** the system prompt is sent to the LLM
- **THEN** a "## Tags" section states that tags are lowercase, that exactly one course tag is expected from `main`, `side`, `dessert`, `breakfast`, `snack`, `drink`, `sauce`, `bread`, and that `main` and `dessert` drive the Mains and Sweets contents tabs
- **AND** it explains that `update_recipe` replaces the whole tag set, so the current tags should be read first and re-sent with the change

### Requirement: Long-Conversation Reminder

The system SHALL inject a reminder into messages when conversations reach 5 or more messages.

#### Scenario: Reminder covers all tool-use patterns
- **WHEN** a conversation has 5 or more messages
- **AND** a new user message is sent
- **THEN** a reminder is appended to the user message covering:
  - Use `list_recipes` when the user asks to see their recipes
  - Use `display_recipe` to show recipe details in the side panel
  - After creating a recipe, call `display_recipe` with the new recipe_id
  - Do not output full ingredient lists or steps in chat

### Requirement: Logout UI

The system SHALL provide a logout button in the chat interface.

#### Scenario: Logout button displayed
- **WHEN** a user is viewing the chat interface
- **THEN** a logout button is visible in the header

#### Scenario: Logout button clicked
- **WHEN** a user clicks the logout button
- **THEN** a POST request is made to `/logout`
- **AND** the user is redirected to the login form

### Requirement: Notes are scoped to the recipe they were written under

Every thread entry SHALL record the recipe that was open when its turn began, and the margin and Notes view SHALL show only the entries belonging to the recipe currently displayed.

#### Scenario: Note is stamped at turn start
- **WHEN** the user sends a note
- **THEN** the user entry and every reply, status line and error produced by that turn are stamped with the recipe id that was displayed at the moment the note was sent

#### Scenario: Reply arriving after navigation stays with its recipe
- **WHEN** the user sends a note about recipe A, navigates to recipe B, and A's reply then completes
- **THEN** the reply is filed under recipe A
- **AND** it does not appear in recipe B's margin or Notes view

#### Scenario: Notes written while browsing form the book thread
- **WHEN** the user sends a note while the contents page or a meal plan is displayed
- **THEN** the entries for that turn are filed under the book-level thread rather than any recipe

#### Scenario: A recipe created mid-turn does not claim the turn's notes
- **WHEN** a turn creates a recipe and then displays it
- **THEN** that turn's entries remain on the book-level thread, because they were written before the recipe existed

#### Scenario: Server-side conversation history is unaffected
- **WHEN** notes are filtered for display
- **THEN** the conversation sent to the LLM still contains the whole session history
- **AND** the AI can refer to anything said earlier in the session regardless of which recipe is open

#### Scenario: Empty thread for a recipe
- **WHEN** the Notes view is opened for a recipe with no notes
- **THEN** it shows the empty-thread message rather than another recipe's notes

## Data Types

### ChatRequest
```
ChatRequest {
    message: String
    conversation_id: Option<String>
    image: Option<ImageAttachment>    // optional image attachment
}
```

### ImageAttachment
```
ImageAttachment {
    data: String           // base64-encoded image data (without data URL prefix)
    media_type: String     // MIME type (e.g., "image/jpeg", "image/png")
}
```

### Message
```
Message (enum) {
    User {
        content: Vec<ContentBlock>    // text and/or images
    }
    Assistant {
        content: Option<String>
        tool_calls: Option<Vec<ToolCall>>
    }
    Tool {
        tool_results: Vec<ToolResult>
    }
}
```

### ContentBlock
```
ContentBlock (enum) {
    Text { text: String }
    Image { source: ImageSource }
}
```

### ImageSource
```
ImageSource {
    source_type: String    // "base64"
    media_type: String     // "image/jpeg", "image/png", etc.
    data: String          // base64-encoded image data
}
```

### SSE Events
```
ChunkEvent {
    event: "chunk"
    data: { text: String }
}

ToolUseEvent {
    event: "tool_use"
    data: { tool: String, status: String }
}

RecipeArtifactEvent {
    event: "recipe_artifact"
    data: { recipe_id: String }
}

DoneEvent {
    event: "done"
    data: { tokens_used: Option<u32> }
}

ErrorEvent {
    event: "error"
    data: { message: String, recoverable: bool }
}
```

### ConversationSession (In-Memory)
```
ConversationSession {
    id: String
    messages: Vec<Message>
    created_at: Instant
    last_activity: Instant
}
```

## Non-Functional Requirements

### Performance
- First token should stream within 2 seconds of request
- UI should remain responsive during streaming

### Reliability
- MCP server crashes should be recoverable
- Network interruptions should be handled gracefully

### Security
- API key must not be exposed to browser (server-side only)
- User input should be sanitized before sending to Claude
