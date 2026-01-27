## Context

The chat UI currently renders all assistant messages as plain text using `textContent`, which ignores any formatting. The system prompt provides no formatting guidance, so the LLM returns dense paragraph text when describing recipes.

**Current state:**
- [src/handlers/ui.rs:278](src/handlers/ui.rs#L278): Uses `div.textContent = content` for all messages
- [src/ai/client.rs:50-54](src/ai/client.rs#L50-L54): System prompt has no formatting instructions
- No markdown library is loaded in the frontend

## Goals / Non-Goals

**Goals:**
- Render assistant messages with proper markdown formatting (headers, lists, bold, etc.)
- Guide the LLM to use consistent markdown patterns for recipe presentation
- Maintain clean, readable CSS styling for rendered markdown
- Keep the solution simple and maintainable

**Non-Goals:**
- Supporting advanced markdown features (tables, footnotes, syntax highlighting)
- Building a custom markdown parser
- Changing how user messages are displayed
- Adding a WYSIWYG editor for user input

## Decisions

### Decision 1: Use `marked` library via CDN

**Choice:** Load `marked` (https://marked.js.org/) from unpkg CDN

**Alternatives considered:**
- **markdown-it**: More configurable but larger (~90KB vs ~50KB)
- **showdown**: Similar size but less actively maintained
- **Custom regex-based parser**: Would require ongoing maintenance and likely have edge cases

**Rationale:** `marked` is lightweight (~50KB), fast, well-maintained, and already used extensively in production. The project already uses unpkg for htmx, so this is consistent.

### Decision 2: Parse markdown only for assistant messages

**Choice:** Use `innerHTML` with `marked.parse()` for assistant messages, keep `textContent` for user messages

**Rationale:**
- User messages are short queries that don't need formatting
- Only assistant messages contain recipe content that benefits from structure
- Reduces parsing overhead and potential XSS surface area

### Decision 3: Enhance system prompt with formatting guidelines

**Choice:** Add explicit markdown formatting instructions to the system prompt, including templates for recipe lists and details

**Rationale:** The LLM needs clear guidance on expected output format. Without it, formatting will be inconsistent.

### Decision 4: Add scoped CSS for markdown elements

**Choice:** Add CSS rules for `.message.assistant` descendants (h1-h4, ul, ol, li, strong, em, p)

**Rationale:** Need reasonable spacing and typography for rendered HTML without affecting the rest of the page.

## Risks / Trade-offs

**[Security - XSS via markdown]** → `marked` escapes HTML by default. We will not disable this. User-controlled content could only enter via the LLM, which is sandboxed.

**[Performance - parsing on each message]** → `marked.parse()` is fast (<1ms for typical messages). No caching needed.

**[LLM inconsistency]** → The LLM may not always follow formatting guidelines. Mitigation: Keep guidelines simple and provide examples in the system prompt.

**[Bundle size increase]** → Adding ~50KB for marked. Acceptable trade-off for significantly improved UX.

## Implementation Approach

1. Add `<script src="https://unpkg.com/marked@latest/marked.min.js"></script>` to head
2. Create helper function `renderMarkdown(text)` that calls `marked.parse(text)`
3. Update `addMessage()` and `updateStreamingMessage()` to use `innerHTML` + `renderMarkdown()` for assistant role
4. Add CSS rules for markdown elements within `.message.assistant`
5. Update system prompt with formatting guidelines and recipe templates
