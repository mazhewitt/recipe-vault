## Context

Recipe Vault currently supports text-based chat with Claude for recipe management. Users can create recipes through conversation, but must manually type all details. The codebase already uses Claude's API via the `llm` crate and supports tool calling through MCP.

The chat message flow is:
1. Frontend sends `ChatRequest { message: String }` to POST /api/chat
2. Backend wraps in `Message::User { content: String }`
3. `LlmProvider` converts to Anthropic API format
4. Response streams back via SSE

Current constraint: `Message::User` only supports plain text strings.

## Goals / Non-Goals

**Goals:**
- Enable pasting images into chat for recipe extraction
- Validate images client-side to prevent oversized uploads
- Support both text + image in a single message (user provides context)
- Extract recipes using Claude's vision API in one request (no separate OCR step)
- Allow natural conversation flow for reviewing/editing extracted data
- Maintain existing chat architecture and tool calling patterns

**Non-Goals:**
- Persisting images to disk or database (extract and discard)
- Supporting drag-and-drop file upload (paste only for v1)
- Handling multiple images per message
- Mobile camera integration (desktop-first)
- Batch extraction of multiple recipes
- Supporting conversation history persistence (not currently implemented)

## Decisions

### Decision 1: Content Block Architecture

**Choice:** Change `Message::User` from `{ content: String }` to `{ content: Vec<ContentBlock> }` where `ContentBlock` is an enum of `Text` or `Image`.

**Rationale:**
- Matches Anthropic's API structure directly (user messages can have multiple content blocks)
- Allows combining text + image naturally (e.g., "This is grandma's recipe" + photo)
- Extensible for future content types (files, audio, etc.)
- Clean separation between content types

**Alternatives considered:**
- Add separate `image: Option<ImageData>` field to `Message::User` → Less flexible, doesn't match API structure
- Keep string content and embed base64 in text → Hacky, mixing concerns

### Decision 2: Frontend Validation

**Choice:** Validate image size (5MB max) in the browser before sending to backend.

**Rationale:**
- Claude API has ~5MB image limit
- Faster feedback to user (no round-trip)
- Reduces unnecessary backend load
- Can show file size in UI before sending

**Alternatives considered:**
- Backend validation only → Slower feedback, wastes bandwidth
- No size limit → Would fail at Claude API with cryptic error

### Decision 3: Image Storage

**Choice:** Do not persist images. Extract data and discard.

**Rationale:**
- Images are large (storage cost)
- Original source (cookbook, handwritten note) remains with user
- Extracted structured data is the valuable artifact
- User can re-paste if extraction fails
- Simpler implementation (no file storage, no cleanup)

**Alternatives considered:**
- Store images attached to recipes → Storage overhead, unclear value
- Store temporarily for retry → Added complexity, not needed for v1

### Decision 4: Extraction Flow

**Choice:** User pastes image + text → Claude extracts in conversational response → User confirms → Claude calls `create_recipe` tool.

**Rationale:**
- Leverages existing tool calling architecture
- Natural conversation flow (review before save)
- User can request edits before saving
- Claude can use accompanying text to enrich extraction (e.g., "makes crispy cookies" → description)

**Alternatives considered:**
- Auto-save extracted recipe → No review step, risky if extraction is wrong
- Dedicated extraction endpoint → Requires new API, less conversational
- Frontend parses Claude's response for JSON → Fragile, violates separation of concerns

### Decision 5: System Prompt Enhancement

**Choice:** Enhance existing system prompt with image extraction guidance rather than creating a separate extraction prompt.

**Rationale:**
- Single unified prompt keeps Claude's behavior consistent
- Tool calling and extraction both need same context
- Easier to maintain one source of truth
- Claude can naturally blend extraction with other tasks

**Example prompt addition:**
```
When the user sends an image with their message:
- If the image contains a recipe (handwritten, printed, cookbook), extract it
- Use any accompanying text as additional context
- Format the extracted recipe nicely using markdown
- Ask: "Would you like me to edit it or add it to the book?"
- If the image doesn't contain a recipe, politely say so
```

## Risks / Trade-offs

**[Risk: OCR accuracy on handwritten recipes]**
→ Mitigation: Claude's vision is quite good, but set user expectation that they'll review/edit. Conversational flow allows refinement.

**[Risk: Large images impact response latency]**
→ Mitigation: 5MB limit keeps this reasonable (~2-5 seconds). Show loading indicator in UI.

**[Risk: User pastes non-recipe image]**
→ Mitigation: Prompt instructs Claude to identify this and politely respond that it's not a recipe.

**[Risk: Breaking change to Message::User structure]**
→ Mitigation: Conversations are not persisted (in-memory only), so no migration needed. Old clients would need to be updated, but this is single-user app.

**[Trade-off: No image persistence]**
→ User loses reference image if they want it later. Acceptable because source material remains with user and structured data is more useful.

**[Trade-off: Paste-only (no file upload button)]**
→ Simpler UX, but less discoverable. Can add upload button in v2 if needed.

## Migration Plan

**Deployment:**
1. Deploy backend changes (new Message structure, ChatRequest schema)
2. Deploy frontend changes (paste handler, image validation)
3. No database migrations needed (no persistence)
4. No MCP schema changes (tools unchanged)

**Rollback:**
- If issues arise, revert both frontend and backend simultaneously
- In-memory sessions clear on restart, so no state to clean up

**Testing before release:**
- Test with various image types (handwritten, printed, photos)
- Test with oversized images (validation)
- Test with non-recipe images (error handling)
- Test with text-only messages (backward compatibility)

## Open Questions

None - all decisions have been made during exploration phase.
