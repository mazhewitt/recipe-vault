## 1. Add Markdown Library

- [x] 1.1 Add `marked` library script tag to chat page head in `src/handlers/ui.rs`

## 2. Update Message Rendering

- [x] 2.1 Create `renderMarkdown(text)` helper function that calls `marked.parse()`
- [x] 2.2 Update `addMessage()` to use `innerHTML` with `renderMarkdown()` for assistant messages
- [x] 2.3 Update `updateStreamingMessage()` to use `innerHTML` with `renderMarkdown()` for streaming content
- [x] 2.4 Update `finalizeStreamingMessage()` if needed for rendered content

## 3. Add Markdown CSS Styles

- [x] 3.1 Add CSS rules for headers (h1-h4) within `.message.assistant`
- [x] 3.2 Add CSS rules for lists (ul, ol, li) with proper indentation and spacing
- [x] 3.3 Add CSS rules for paragraphs (p) with vertical margins
- [x] 3.4 Add CSS rules for inline elements (strong, em) if needed

## 4. Update System Prompt

- [x] 4.1 Enhance system prompt in `src/ai/client.rs` with markdown formatting instructions
- [x] 4.2 Add recipe list format template to system prompt
- [x] 4.3 Add recipe detail format template to system prompt

## 5. Testing

- [x] 5.1 Test recipe list display with markdown formatting
- [x] 5.2 Test single recipe detail display with formatted ingredients and steps
- [x] 5.3 Verify user messages remain as plain text
