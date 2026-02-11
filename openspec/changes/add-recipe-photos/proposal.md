## Why

Users want to visually document their recipes with photos. Currently, Recipe Vault stores recipe text data but has no way to attach photos to recipes. Adding photo support makes the recipe book more engaging and helps users identify recipes at a glance.

## What Changes

- Add single hero image storage for each recipe (optional)
- Store photos as files on the filesystem (< 5MB, multiple formats supported)
- Provide API endpoints for uploading, retrieving, and deleting recipe photos
- Add photo upload UI in the recipe detail view (file dialog triggered by icon)
- Display photos in recipe detail view under the title
- Store original format, resize in browser for display
- Delete photo files when recipes are deleted (cascade cleanup)

## Capabilities

### New Capabilities
- `recipe-photo-storage`: Handles photo upload, storage, retrieval, and deletion for recipe images via filesystem and API endpoints

### Modified Capabilities
- `recipe-domain`: Add `photo_filename` field to Recipe data type to track associated photo files

## Impact

**Database**:
- Migration adds `photo_filename TEXT` column to `recipes` table

**Filesystem**:
- New `/app/data/photos/` directory for storing recipe images
- Files named `{recipe-id}.{ext}` (e.g., `abc-123.jpg`)

**API**:
- New endpoints: `POST /api/recipes/{id}/photo`, `GET /api/recipes/{id}/photo`, `DELETE /api/recipes/{id}/photo`
- Multipart form data handling for uploads

**Models**:
- `Recipe` struct gains `photo_filename: Option<String>` field
- Update/create input structs unchanged (photo upload is separate operation)

**Web UI**:
- Recipe detail page adds photo upload icon and image display area
- Client-side file validation (size < 5MB)
- Browser-based image resizing for display

**Handlers**:
- New photo upload handler with multipart parsing
- New photo retrieval handler with content-type detection
- Photo deletion on recipe delete (cleanup orphaned files)

**Deployment**:
- Docker volume at `/app/data/` already covers new photos/ subdirectory
- Backup strategy extends to include photos
