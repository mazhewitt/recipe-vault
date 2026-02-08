# Recipe Image Extraction Specification

## Purpose

The Recipe Image Extraction feature enables users to extract structured recipe data from images (handwritten recipes, cookbook pages, recipe cards) using Claude's vision API. This eliminates manual data entry for digitizing physical recipes.

## Requirements

### Requirement: Image Paste Detection

The system SHALL detect when a user pastes an image into the chat interface.

#### Scenario: User pastes image from clipboard
- **WHEN** a user pastes content containing an image into the chat textarea
- **THEN** the paste event is intercepted
- **AND** the image file is extracted from clipboard data
- **AND** the image is prepared for sending with the message

#### Scenario: User pastes text without image
- **WHEN** a user pastes plain text into the chat textarea
- **THEN** the paste event is not intercepted
- **AND** normal text pasting behavior occurs

### Requirement: Image Size Validation

The system SHALL validate image size before accepting it for upload.

#### Scenario: Image within size limit
- **WHEN** a user pastes an image that is 5MB or smaller
- **THEN** the image is accepted
- **AND** a visual indicator shows the image is attached with file size

#### Scenario: Image exceeds size limit
- **WHEN** a user pastes an image larger than 5MB
- **THEN** the image is rejected
- **AND** an error message displays: "Image too large (X.XMB). Max size is 5MB."
- **AND** the image is not attached to the message

#### Scenario: Display file size in UI
- **WHEN** an image is successfully attached
- **THEN** the UI displays "Image attached (X.XMB)"
- **AND** includes a remove button to clear the attachment

### Requirement: Image Encoding

The system SHALL convert accepted images to base64 format for API transmission.

#### Scenario: Convert image to base64
- **WHEN** an image is accepted for upload
- **THEN** the image is converted to a base64-encoded string
- **AND** the data URL prefix is removed (keep only base64 data)
- **AND** the media type is captured (e.g., "image/jpeg", "image/png")

### Requirement: Multi-Content Message Sending

The system SHALL support sending both text and image in a single chat message.

#### Scenario: Send message with text and image
- **WHEN** a user has attached an image and typed text
- **AND** clicks send
- **THEN** the request payload includes both message text and image data
- **AND** the image data includes base64 string and media type

#### Scenario: Send message with text only
- **WHEN** a user types text without attaching an image
- **AND** clicks send
- **THEN** the request payload includes only message text
- **AND** no image field is included

#### Scenario: Send message with image only
- **WHEN** a user attaches an image without typing text
- **AND** clicks send
- **THEN** the request payload includes image data and empty or minimal message text

### Requirement: Recipe Extraction via Vision API

The system SHALL send images to Claude's vision API for recipe extraction.

#### Scenario: Extract recipe from cookbook image
- **WHEN** a user sends a message with an image of a printed cookbook page
- **THEN** Claude receives both the image and any accompanying text
- **AND** Claude extracts recipe title, ingredients, and steps from the image
- **AND** Claude formats the extracted recipe in markdown
- **AND** Claude responds with the extracted recipe and asks for confirmation

#### Scenario: Extract recipe from handwritten note
- **WHEN** a user sends an image of a handwritten recipe
- **THEN** Claude performs OCR on the handwritten text
- **AND** extracts structured recipe data (ingredients, steps, timing)
- **AND** responds with the extracted recipe

#### Scenario: Use accompanying text as context
- **WHEN** a user sends an image with text like "This is grandma's cookie recipe, makes crispy cookies"
- **THEN** Claude uses the text to enrich the extraction
- **AND** may incorporate details like "grandma's" into the title
- **AND** may use "makes crispy cookies" in the description

#### Scenario: Image does not contain a recipe
- **WHEN** a user sends an image that does not contain a recipe
- **THEN** Claude responds indicating no recipe was found
- **AND** suggests the user paste a recipe image instead

### Requirement: Extraction Response Format

The system SHALL format extracted recipes in a conversational, reviewable format.

#### Scenario: Display extracted recipe in chat
- **WHEN** Claude successfully extracts a recipe from an image
- **THEN** the response includes formatted sections for:
  - Recipe title
  - Description (if available)
  - Ingredients list with quantities and units
  - Numbered preparation steps
  - Timing information (prep time, cook time if detected)
  - Temperature information (if detected)
- **AND** the response ends with "Would you like me to edit it or add it to the book?"

#### Scenario: User requests edits to extracted recipe
- **WHEN** a user responds with requested changes (e.g., "change servings to 24")
- **THEN** Claude incorporates the changes
- **AND** displays the updated recipe
- **AND** asks for confirmation again

#### Scenario: User confirms recipe for saving
- **WHEN** a user responds with confirmation (e.g., "yes", "add it", "save it")
- **THEN** Claude calls the create_recipe tool with extracted data
- **AND** confirms the recipe was saved
- **AND** displays the recipe in the side panel

### Requirement: Image Attachment UI

The system SHALL provide clear visual feedback for image attachments.

#### Scenario: Show attachment indicator
- **WHEN** an image is attached to the message being composed
- **THEN** a visual indicator appears above or within the textarea
- **AND** shows an image icon (🖼️) and file size
- **AND** includes a remove button (✕)

#### Scenario: Remove attached image
- **WHEN** a user clicks the remove button on the image indicator
- **THEN** the attached image is cleared
- **AND** the visual indicator disappears
- **AND** the message will send without an image

#### Scenario: Clear attachment after sending
- **WHEN** a message with an image is successfully sent
- **THEN** the image attachment is cleared from the compose area
- **AND** the next message will not include the image unless a new one is pasted

### Requirement: Error Handling

The system SHALL handle image extraction errors gracefully.

#### Scenario: Claude API error during extraction
- **WHEN** the Claude API returns an error while processing an image
- **THEN** an error message is shown to the user
- **AND** the user can try pasting the image again

#### Scenario: Network timeout during extraction
- **WHEN** the extraction request times out
- **THEN** an error message indicates the timeout
- **AND** suggests the user try again

#### Scenario: Unsupported image format
- **WHEN** a user pastes an image in an unsupported format
- **THEN** an error message indicates the format is not supported
- **AND** lists supported formats (JPEG, PNG, WEBP, GIF)

## Data Types

### ImageAttachment
```
ImageAttachment {
    data: String           // base64-encoded image data (without data URL prefix)
    media_type: String     // MIME type (e.g., "image/jpeg", "image/png")
}
```

### ChatRequest (Extended)
```
ChatRequest {
    message: String
    conversation_id: Option<String>
    image: Option<ImageAttachment>    // optional image attachment
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

## Non-Functional Requirements

### Performance
- Image validation should complete instantly (< 100ms)
- Base64 encoding should not block the UI
- Extraction latency should be 3-10 seconds depending on image size and complexity
- Loading indicator should appear immediately when sending image

### Usability
- Error messages should be clear and actionable
- File size should be displayed in human-readable format (MB, KB)
- Visual feedback should appear immediately when image is pasted

### Reliability
- Oversized images must be rejected before sending to backend
- Extraction failures should not crash the chat interface
- User should be able to retry failed extractions

### Security
- Images are not persisted to disk or database
- Image data is only transmitted to Claude API
- No image data is logged or stored
