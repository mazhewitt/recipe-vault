## Why

Users have family recipes in handwritten notes, old cookbooks, and recipe cards that they want to digitize. Manually typing out ingredients and steps is tedious and error-prone. Claude's vision API can read recipe images (handwritten or printed) and extract structured recipe data in one step, making it trivial to add recipes from photos.

## What Changes

- Users can paste images from their clipboard into the chat interface
- Frontend validates image size (max 5MB) before sending
- Chat API accepts images alongside text messages
- Images are sent to Claude's vision API for OCR and parsing
- Claude extracts recipe structure (title, ingredients, steps, timing) from the image
- Claude responds conversationally with the extracted recipe
- User can review and edit before saving to the recipe book
- Images are not persisted (extract and discard)

## Capabilities

### New Capabilities
- `recipe-image-extraction`: Ability to extract structured recipe data from images using Claude's vision API

### Modified Capabilities
- `web-chat`: Chat request data type changes to support optional image attachments

## Impact

**Frontend (JavaScript):**
- Chat input handler needs paste event detection
- Image validation and base64 conversion
- Visual indicator for attached images
- Updated ChatRequest payload to include image data

**Backend (Rust):**
- `ChatRequest` struct gains optional `image` field
- `Message::User` enum changes from `content: String` to `content: Vec<ContentBlock>` to support text + image
- `LlmProvider::message_to_anthropic()` updated to serialize content blocks for Anthropic API
- System prompt enhanced with image extraction guidance

**API:**
- No new endpoints
- Existing POST /api/chat accepts images in request body
- Response format unchanged (SSE stream)

**Dependencies:**
- No new dependencies (Claude API already supports vision)
