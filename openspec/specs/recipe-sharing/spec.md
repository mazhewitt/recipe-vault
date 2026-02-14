# recipe-sharing Specification

## Purpose
TBD - created by archiving change recipe-sharing. Update Purpose after archive.
## Requirements
### Requirement: Share link creation

The system SHALL allow an authenticated user to generate a time-limited share link for any recipe they can access.

#### Scenario: Successful share link creation
- **WHEN** an authenticated user sends `POST /api/recipes/:id/share` for a recipe in their family
- **THEN** the system creates a `share_links` row with a random 10-character alphanumeric token
- **AND** `expires_at` is set to 30 days from now
- **AND** `created_by` is set to the authenticated user's email
- **AND** the response is 201 Created with JSON `{ "token": "<token>", "url": "/share/<token>", "expires_at": "<datetime>" }`

#### Scenario: Share link for non-existent recipe
- **WHEN** an authenticated user sends `POST /api/recipes/:id/share` for a recipe ID that does not exist
- **THEN** the system returns 404 Not Found

#### Scenario: Share link for recipe outside family
- **WHEN** an authenticated user sends `POST /api/recipes/:id/share` for a recipe not in their family
- **THEN** the system returns 404 Not Found

#### Scenario: Unauthenticated share link creation
- **WHEN** an unauthenticated request is made to `POST /api/recipes/:id/share`
- **THEN** the system returns 401 Unauthorized

### Requirement: Share page rendering

The system SHALL serve a standalone, server-rendered HTML page for valid share links that displays the full recipe without requiring authentication or JavaScript.

#### Scenario: Valid share link
- **WHEN** a request is made to `GET /share/:token` with a valid, non-expired token
- **THEN** the system returns 200 OK with an HTML page containing the recipe title, description, photo (if present), prep time, cook time, total time, servings, difficulty, ingredients list, and preparation steps
- **AND** the HTML includes Open Graph meta tags (`og:title`, `og:description`, `og:image`, `og:type`)
- **AND** the page renders without JavaScript

#### Scenario: Expired share link
- **WHEN** a request is made to `GET /share/:token` with an expired token
- **THEN** the system returns 404 Not Found with a friendly "This share link has expired" HTML page

#### Scenario: Invalid share link
- **WHEN** a request is made to `GET /share/:token` with a token that does not exist
- **THEN** the system returns 404 Not Found

#### Scenario: Recipe deleted after sharing
- **WHEN** a request is made to `GET /share/:token` for a share link whose recipe has been deleted
- **THEN** the system returns 404 Not Found (CASCADE delete removes the share_links row)

### Requirement: Shared recipe photo access

The system SHALL serve recipe photos for valid share links without requiring authentication.

#### Scenario: Photo exists for shared recipe
- **WHEN** a request is made to `GET /share/:token/photo` with a valid, non-expired token
- **AND** the recipe has a photo
- **THEN** the system returns 200 OK with the photo binary data and appropriate Content-Type header

#### Scenario: No photo for shared recipe
- **WHEN** a request is made to `GET /share/:token/photo` with a valid token
- **AND** the recipe has no photo
- **THEN** the system returns 404 Not Found

#### Scenario: Expired token photo request
- **WHEN** a request is made to `GET /share/:token/photo` with an expired token
- **THEN** the system returns 404 Not Found

### Requirement: Share link database schema

The system SHALL store share links in a `share_links` table with cascade deletion.

#### Scenario: Table structure
- **WHEN** migrations have been run
- **THEN** the `share_links` table exists with columns: `token` (TEXT PK), `recipe_id` (TEXT NOT NULL FK → recipes.id ON DELETE CASCADE), `created_by` (TEXT NOT NULL), `created_at` (TEXT NOT NULL DEFAULT datetime('now')), `expires_at` (TEXT NOT NULL)
- **AND** an index exists on `recipe_id`

#### Scenario: Recipe deletion cascades to share links
- **WHEN** a recipe with active share links is deleted
- **THEN** all share_links rows referencing that recipe are deleted

### Requirement: Share button in recipe UI

The system SHALL display a "Share" button on the recipe card that generates a share link and copies the URL to the clipboard.

#### Scenario: User clicks share button
- **WHEN** a user clicks the "Share" button on a displayed recipe card
- **THEN** the system calls `POST /api/recipes/:id/share`
- **AND** copies the full share URL to the clipboard
- **AND** displays a brief confirmation message (e.g., "Link copied!")

#### Scenario: Share button visibility
- **WHEN** a recipe is displayed in the recipe card view
- **THEN** a "Share" button is visible in the recipe card UI

### Requirement: Copy to clipboard on share page

The share page SHALL include a "Copy to clipboard" button that copies a plain text version of the recipe.

#### Scenario: Copy button clicked
- **WHEN** a visitor clicks the "Copy to clipboard" button on the share page
- **THEN** the system copies the recipe as formatted plain text (title, ingredients with quantities, steps) to the clipboard
- **AND** displays a brief confirmation message

#### Scenario: Clipboard API unavailable
- **WHEN** the visitor's browser does not support the Clipboard API
- **THEN** the copy button is hidden
- **AND** the page remains fully functional for viewing

