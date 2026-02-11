## 1. Database Migration

- [x] 1.1 Create migration file `migrations/YYYYMMDDHHMMSS_add_recipe_photos.sql`
- [x] 1.2 Add `ALTER TABLE recipes ADD COLUMN photo_filename TEXT;` to migration
- [x] 1.3 Test migration runs successfully on local database
- [x] 1.4 Verify existing recipes have `photo_filename = NULL` after migration

## 2. Data Model Changes

- [x] 2.1 Add `photo_filename: Option<String>` field to `Recipe` struct in `src/models/recipe.rs`
- [x] 2.2 Update `RecipeWithDetails` serialization to include `photo_filename`
- [x] 2.3 Verify `CreateRecipeInput` does NOT include `photo_filename` (photo upload is separate operation)
- [x] 2.4 Verify `UpdateRecipeInput` does NOT include `photo_filename` (photo upload is separate operation)

## 3. Filesystem Setup

- [x] 3.1 Create `/app/data/photos/` directory on application startup in `src/main.rs`
- [x] 3.2 Set proper permissions on photos directory (readable/writable by app user)
- [x] 3.3 Add error handling for directory creation failure

## 4. Photo Upload Handler

- [x] 4.1 Create new handler `upload_photo` in `src/handlers/recipes.rs`
- [x] 4.2 Accept multipart form data using Axum's `Multipart` extractor
- [x] 4.3 Validate file size <= 5MB (5,242,880 bytes)
- [x] 4.4 Validate file extension is one of: jpg, jpeg, png, webp, gif (case-insensitive)
- [x] 4.5 Verify recipe exists and is accessible by user (family tenancy check)
- [x] 4.6 Query database for existing `photo_filename` to handle format changes
- [x] 4.7 Delete old photo file if format differs (e.g., replacing JPG with PNG)
- [x] 4.8 Determine extension from content-type or filename
- [x] 4.9 Save file to `/app/data/photos/{recipe-id}.{ext}` using atomic write
- [x] 4.10 Update recipe's `photo_filename` in database
- [x] 4.11 Return JSON response with `photo_filename`
- [x] 4.12 Handle errors: file too large (413), invalid format (400), recipe not found (404), filesystem errors (500)

## 5. Photo Retrieval Handler

- [x] 5.1 Create new handler `get_photo` in `src/handlers/recipes.rs`
- [x] 5.2 Extract recipe ID from path parameter
- [x] 5.3 Query database for recipe and verify family tenancy
- [x] 5.4 Return 404 if recipe doesn't exist or has no photo (`photo_filename` is NULL)
- [x] 5.5 Read photo file from `/app/data/photos/{photo_filename}`
- [x] 5.6 Detect content-type from file extension (jpg→image/jpeg, png→image/png, webp→image/webp, gif→image/gif)
- [x] 5.7 Return photo bytes with appropriate Content-Type header
- [x] 5.8 Handle errors: recipe not found (404), photo not found (404), file read errors (500)

## 6. Photo Deletion Handler

- [x] 6.1 Create new handler `delete_photo` in `src/handlers/recipes.rs`
- [x] 6.2 Extract recipe ID from path parameter
- [x] 6.3 Query database for recipe and verify family tenancy
- [x] 6.4 Return 404 if recipe doesn't exist or has no photo
- [x] 6.5 Delete photo file from filesystem at `/app/data/photos/{photo_filename}`
- [x] 6.6 Set recipe's `photo_filename` to NULL in database
- [x] 6.7 Return 200 OK on successful deletion
- [x] 6.8 Handle errors: recipe not found (404), file deletion errors (log but succeed)

## 7. Cascade Deletion

- [x] 7.1 Update `delete_recipe` handler in `src/handlers/recipes.rs`
- [x] 7.2 Before deleting recipe from database, check if `photo_filename` exists
- [x] 7.3 If photo exists, delete file from `/app/data/photos/{photo_filename}`
- [x] 7.4 Log error if file deletion fails but continue with recipe deletion
- [x] 7.5 Ensure recipe deletion succeeds even if photo file doesn't exist

## 8. Content-Type Utility

- [x] 8.1 Create utility function `content_type_from_extension(filename: &str) -> &'static str`
- [x] 8.2 Map extensions: jpg/jpeg → image/jpeg, png → image/png, webp → image/webp, gif → image/gif
- [x] 8.3 Return `application/octet-stream` as fallback for unknown extensions
- [x] 8.4 Place in `src/handlers/recipes.rs` or create `src/utils/content_type.rs`

## 9. API Routes

- [x] 9.1 Add route `POST /api/recipes/:id/photo` → `upload_photo` handler
- [x] 9.2 Add route `GET /api/recipes/:id/photo` → `get_photo` handler
- [x] 9.3 Add route `DELETE /api/recipes/:id/photo` → `delete_photo` handler
- [x] 9.4 Ensure all routes require authentication (API key or Cloudflare Access)
- [x] 9.5 Update route registration in `src/main.rs`

## 10. Web UI - Photo Display

- [ ] 10.1 Locate recipe detail view template/component in web UI code
- [ ] 10.2 Add `<img>` element to display photo under recipe title
- [ ] 10.3 Set image src to `/api/recipes/{id}/photo` when `photo_filename` exists
- [ ] 10.4 Add CSS to resize image (max-width, object-fit: cover/contain)
- [ ] 10.5 Show placeholder or hide image when `photo_filename` is null
- [ ] 10.6 Add `onerror` handler to gracefully handle missing/broken images

## 11. Web UI - Photo Upload

- [ ] 11.1 Add hidden file input element: `<input type="file" accept="image/*">`
- [ ] 11.2 Add upload icon/button that triggers file dialog on click
- [ ] 11.3 Add JavaScript event listener for file selection
- [ ] 11.4 Validate file size < 5MB on client side before upload
- [ ] 11.5 Create FormData with selected file
- [ ] 11.6 POST to `/api/recipes/{id}/photo` with multipart form data
- [ ] 11.7 Include API key or auth headers in request
- [ ] 11.8 Show loading indicator during upload
- [ ] 11.9 On success, reload image with cache-busting query param (`?t={timestamp}`)
- [ ] 11.10 On error, display user-friendly error message (file too large, invalid format, etc.)

## 12. Web UI - Photo Deletion

- [ ] 12.1 Add delete icon/button near photo (only when photo exists)
- [ ] 12.2 Add confirmation dialog ("Are you sure you want to delete this photo?")
- [ ] 12.3 Send DELETE request to `/api/recipes/{id}/photo`
- [ ] 12.4 On success, hide photo and show placeholder
- [ ] 12.5 On error, display error message

## 13. Error Types

- [x] 13.1 Add error variants to `src/error.rs`: FileTooLarge, UnsupportedFileType, FileSystemError
- [x] 13.2 Implement HTTP status mappings: FileTooLarge → 413, UnsupportedFileType → 400, FileSystemError → 500
- [x] 13.3 Add user-friendly error messages for each variant

## 14. Testing - Unit Tests

- [ ] 14.1 Test `content_type_from_extension` with various extensions
- [ ] 14.2 Test file size validation logic
- [ ] 14.3 Test file extension validation logic
- [ ] 14.4 Test filename generation from recipe ID and extension

## 15. Testing - Integration Tests

- [ ] 15.1 Create `tests/photo_upload_test.rs`
- [ ] 15.2 Test successful photo upload (POST with valid image)
- [ ] 15.3 Test upload with file too large returns 413
- [ ] 15.4 Test upload with invalid extension returns 400
- [ ] 15.5 Test upload to non-existent recipe returns 404
- [ ] 15.6 Test upload to recipe outside family returns 404
- [ ] 15.7 Test replacing photo with different format deletes old file
- [ ] 15.8 Test photo retrieval returns correct content-type
- [ ] 15.9 Test photo retrieval for recipe without photo returns 404
- [ ] 15.10 Test photo deletion removes file and sets field to NULL
- [ ] 15.11 Test recipe deletion cascades to photo file deletion
- [ ] 15.12 Test god mode can upload/retrieve/delete photos for any recipe

## 16. Testing - E2E (Playwright)

- [ ] 16.1 Create `tests/e2e/tests/photo-management.spec.ts`
- [ ] 16.2 Create test fixtures directory `tests/e2e/fixtures/`
- [ ] 16.3 Add test image: `test-photo.jpg` (< 1MB)
- [ ] 16.4 Add test image: `test-photo.png` (< 1MB)
- [ ] 16.5 Add test image: `test-photo.webp` (< 1MB)
- [ ] 16.6 Add test file: `large-photo.jpg` (6MB for rejection test)
- [ ] 16.7 Add test file: `invalid-file.txt` (for format rejection test)
- [ ] 16.8 Test: Upload JPG photo displays correctly
- [ ] 16.9 Test: Upload PNG photo displays correctly
- [ ] 16.10 Test: Upload WebP photo displays correctly
- [ ] 16.11 Test: Replace photo with different format updates image
- [ ] 16.12 Test: Photo displays under title with correct sizing (CSS validation)
- [ ] 16.13 Test: Recipe without photo shows no image or placeholder
- [ ] 16.14 Test: Delete photo removes image and shows placeholder
- [ ] 16.15 Test: Confirmation dialog appears before photo deletion
- [ ] 16.16 Test: Cancel deletion keeps photo intact
- [ ] 16.17 Test: Upload 6MB file shows client-side error (no server request)
- [ ] 16.18 Test: Upload .txt file is rejected by file input accept attribute
- [ ] 16.19 Test: Loading indicator appears during upload
- [ ] 16.20 Test: Error message displays for failed upload
- [ ] 16.21 Test: Photo scales correctly on mobile viewport (responsive)
- [ ] 16.22 Test: Recipe deletion removes photo from UI

## 17. Testing - Manual/Deployment

- [x] 17.1 Verify photos persist across server restarts
- [x] 17.2 Verify recipe deletion removes photo file from filesystem (not just UI)
- [x] 17.3 Test backup/restore includes photos directory

## 18. Docker/Deployment

- [x] 18.1 Update `docker-entrypoint.sh` to create `/app/data/photos/` directory
- [x] 18.2 Set ownership: `chown -R appuser:appuser /app/data/photos`
- [x] 18.3 Verify `/app/data/` volume mount includes photos subdirectory
- [x] 18.4 Test deployment on local Docker container
- [x] 18.5 Verify photos survive container restarts

## 19. Documentation

- [ ] 19.1 Update API.md with photo upload/retrieval/deletion endpoints
- [ ] 19.2 Add example curl commands for photo operations
- [ ] 19.3 Update README.md features section to mention photo support
- [ ] 19.4 Document photo size limit and supported formats
- [ ] 19.5 Update troubleshooting section with photo-related errors

## 20. Backup Strategy

- [x] 20.1 Verify existing backup scripts include `/app/data/photos/` directory
- [x] 20.2 Test backup/restore process with photos
- [ ] 20.3 Document backup strategy for photos in deployment docs
