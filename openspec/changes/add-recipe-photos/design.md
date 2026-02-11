## Context

Recipe Vault currently stores recipe text data (title, description, ingredients, steps) in SQLite with no support for images. Users have requested the ability to attach photos to recipes to make their recipe book more visually appealing and easier to navigate.

The system already handles images in one context: the image paste extraction feature uses Claude's vision API to extract recipe data from pasted images. However, those images are transient (used for OCR, then discarded) rather than permanently stored with recipes.

**Current State:**
- SQLite database at `/app/data/recipes.db`
- Docker deployment on Synology NAS with `/app/data/` volume mount
- Web UI with recipe list and detail views
- REST API at `/api/recipes/*`
- Authentication via Cloudflare Access (web) and API keys (API)

**Constraints:**
- Must work within existing Synology NAS deployment (Docker + volume mounts)
- Must not require cloud services (S3, CDN, etc.)
- Must keep implementation simple for MVP
- Must handle multi-user access (family tenancy)

## Goals / Non-Goals

**Goals:**
- Allow users to attach a single hero photo to each recipe
- Store photos on the filesystem (simple, cheap, fast)
- Support common image formats (JPG, PNG, WebP, GIF)
- Limit file size to 5MB to prevent abuse
- Provide explicit upload mechanism (file dialog)
- Display photos in recipe detail view
- Clean up orphaned photo files when recipes are deleted
- Work seamlessly with existing backup/deployment strategy

**Non-Goals:**
- Multiple photos per recipe (galleries, step-by-step photos) - can add later if needed
- Server-side image resizing/optimization - browser resizes for display, store originals
- Cloud storage integration - filesystem is sufficient for NAS deployment
- Drag-and-drop upload - file dialog is simpler for MVP
- Photo display in recipe list view - detail view only for MVP
- Auto-attach pasted images from extraction flow - keep extraction separate
- Photo editing/cropping - users prepare images before upload

## Decisions

### Decision 1: Filesystem Storage vs Database BLOBs vs Cloud

**Choice:** Store photos as files on the filesystem at `/app/data/photos/`

**Rationale:**
- **Filesystem** is simplest for this deployment context (Synology NAS with Docker volumes)
- Already have persistent storage at `/app/data/` - just add a subdirectory
- Keeps database small and fast (no BLOB bloat)
- Easy to back up alongside database (tar the whole `/app/data/` directory)
- No external dependencies or costs (unlike S3/R2)
- Fast serving without database overhead

**Alternatives Considered:**
- **SQLite BLOBs**: Would make backups atomic, but bloats database, increases memory pressure, complicates queries
- **Cloud Storage (S3/R2)**: Professional and scalable, but adds cost, complexity, network dependency, and auth overhead for a self-hosted NAS app
- **Hybrid (local + cloud)**: Most complex, unnecessary for current scale

**Trade-offs:**
- Filesystem requires separate cleanup on recipe delete (vs CASCADE DELETE with BLOBs)
- Backup strategy must include both database and photos directory
- More complex than BLOB storage, but simpler than cloud

### Decision 2: File Naming Strategy

**Choice:** `{recipe-id}.{extension}` (e.g., `abc-123.jpg`)

**Rationale:**
- One-to-one mapping between recipe and photo file
- Recipe ID is already a UUID, guaranteed unique
- Preserves original file format via extension
- Simple to compute path from recipe ID
- Easy to find orphaned files (files without matching recipe IDs)
- Updating photo with different format: delete old file, write new file

**Alternatives Considered:**
- **Original filename**: Can cause collisions, security risks (path traversal), non-deterministic
- **Hash-based**: Harder to debug, doesn't map clearly to recipes
- **Timestamp-based**: Doesn't handle format changes well

**Trade-offs:**
- Changing photo format requires deleting old file (can't just overwrite)
- Need to handle extension detection/validation

### Decision 3: API Endpoint Design

**Choice:**
- `POST /api/recipes/{id}/photo` - Upload photo (multipart/form-data)
- `GET /api/recipes/{id}/photo` - Retrieve photo (returns image bytes)
- `DELETE /api/recipes/{id}/photo` - Delete photo

**Rationale:**
- RESTful design, follows existing `/api/recipes/*` pattern
- Photo is a sub-resource of recipe (not standalone)
- Recipe ID in URL naturally scopes authorization (family tenancy)
- Separate from recipe CRUD (recipe creation doesn't require photo)
- Multipart form data is standard for file uploads

**Alternatives Considered:**
- **Static file serving (`/photos/{filename}`)**: Exposes filenames, harder to apply auth, less control
- **Base64 in recipe JSON**: Bloats payloads, not standard for file uploads
- **Include in recipe create/update**: Complicates those endpoints, not all clients support multipart

**Trade-offs:**
- Requires multipart form parsing (Axum provides `Multipart` extractor)
- Separate endpoint means two requests to create recipe + photo (acceptable for MVP)

### Decision 4: Content-Type Detection

**Choice:** Determine content-type from file extension when serving photos

```rust
fn content_type_from_extension(filename: &str) -> &'static str {
    match Path::new(filename).extension().and_then(|s| s.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        _ => "application/octet-stream",
    }
}
```

**Rationale:**
- Simple, fast, no dependencies
- Extension is already stored in filename
- Covers common image formats
- Falls back to octet-stream for unknown types

**Alternatives Considered:**
- **Magic number detection**: More accurate, but requires reading file bytes, adds complexity
- **Store content-type in database**: Redundant with extension, extra column

**Trade-offs:**
- Relies on correct file extension (validated on upload)
- Won't detect mismatched extension/content (acceptable for MVP)

### Decision 5: File Upload Validation

**Choice:** Validate on both client and server:
- **Client**: Check file size < 5MB before upload (immediate feedback)
- **Server**: Validate size, check extension is allowed, ensure recipe exists

**Rationale:**
- Client-side validation improves UX (no waiting for server rejection)
- Server-side validation is security requirement (can't trust client)
- Extension whitelist prevents malicious file uploads

**Validation Rules:**
- File size ≤ 5MB (5,242,880 bytes)
- Extension must be: jpg, jpeg, png, webp, gif (case-insensitive)
- Recipe ID must exist and be accessible by user (family tenancy)
- Must be authenticated (API key or Cloudflare Access)

**Trade-offs:**
- No server-side image format verification (relies on extension)
- No dimension limits (user can upload huge resolution images)
- Can add stricter validation later if needed

### Decision 6: Orphaned File Cleanup

**Choice:** Delete photo file when recipe is deleted

**Implementation:**
- In recipe delete handler, after successful DB delete, remove photo file
- Ignore errors if photo file doesn't exist (graceful handling)
- Log errors if file deletion fails (for debugging)

**Rationale:**
- Prevents orphaned files accumulating over time
- Keeps storage clean
- Simple to implement in existing delete handler

**Alternatives Considered:**
- **Periodic cleanup job**: More complex, can miss recent orphans
- **Keep orphaned files**: Wastes storage, harder to debug
- **Soft delete recipes**: Defers cleanup, adds complexity

**Trade-offs:**
- If recipe delete succeeds but file delete fails, file is orphaned (rare, logged)
- Could add manual cleanup tool later if needed

### Decision 7: Photo Display Strategy

**Choice:**
- Store original image (no server-side resize)
- Resize in browser using CSS (`max-width`, `object-fit`)
- Client controls display size

**Rationale:**
- Simple server implementation (just store bytes)
- Preserves original quality
- Browser handles resizing efficiently
- Allows users to download full-resolution photos later if desired
- No dependencies on image processing libraries

**Alternatives Considered:**
- **Server-side resize on upload**: Requires image processing library (image crate), more complexity, loses original
- **Multiple sizes (thumbnails + full)**: Requires more storage, more complexity, not needed for MVP

**Trade-offs:**
- Larger bandwidth usage (serving full images)
- Slower initial load for large images
- Can add server-side optimization later if performance becomes issue

### Decision 8: Database Schema Changes

**Choice:** Add `photo_filename TEXT` column to existing `recipes` table

```sql
ALTER TABLE recipes ADD COLUMN photo_filename TEXT;
```

**Rationale:**
- Minimal schema change
- Nullable (most recipes won't have photos initially)
- Stores only the filename, path is computed (`/app/data/photos/{photo_filename}`)
- No foreign key needed (filename is derived from recipe ID)

**Alternatives Considered:**
- **Separate `photos` table**: Overkill for one-to-one relationship
- **Store full path**: Redundant, harder to migrate storage location later

**Trade-offs:**
- If storage location changes, need to update path construction in code (not in DB)

### Decision 9: Testing Strategy

**Choice:** Shift-left testing with Playwright E2E tests for UI workflows, supplemented by integration tests and minimal manual testing.

**Rationale:**
- Project already has Playwright infrastructure (`tests/e2e/`)
- Photo upload/display/deletion are primarily UI interactions (ideal for E2E)
- Automated tests catch regressions immediately vs manual testing before release
- Fast feedback loop (CI runs on every commit)
- Manual testing reduced to deployment-specific scenarios (server restarts, filesystem verification)

**Test Distribution:**
```
Unit Tests (14 tasks):
├─ Content-type detection
├─ File size validation
├─ Extension validation
└─ Filename generation

Integration Tests (12 tasks):
├─ API endpoint behavior
├─ Family tenancy enforcement
├─ Error responses (413, 400, 404)
└─ Filesystem operations

Playwright E2E Tests (22 tasks):
├─ Photo upload (JPG, PNG, WebP)
├─ Photo display and sizing
├─ Photo replacement
├─ Photo deletion with confirmation
├─ Validation errors (client-side)
├─ Responsive behavior
└─ Recipe deletion cascade (UI)

Manual/Deployment Tests (3 tasks):
├─ Photos persist across restarts
├─ Filesystem cleanup verification
└─ Backup/restore validation
```

**Test Fixtures:**
- `tests/e2e/fixtures/test-photo.jpg` (< 1MB)
- `tests/e2e/fixtures/test-photo.png` (< 1MB)
- `tests/e2e/fixtures/test-photo.webp` (< 1MB)
- `tests/e2e/fixtures/large-photo.jpg` (6MB, for rejection)
- `tests/e2e/fixtures/invalid-file.txt` (for format validation)

**Alternatives Considered:**
- **Manual-only testing**: Slower feedback, no regression detection, easy to skip
- **API-only testing**: Misses UI/UX issues, doesn't test client-side validation
- **No E2E tests**: Cheaper to run, but leaves integration gaps

**Trade-offs:**
- Playwright tests are slower than unit tests (but still < 5 min for suite)
- Requires maintaining test fixtures (small cost)
- Need to run server for E2E tests (already required for existing tests)

## Risks / Trade-offs

### Risk: Orphaned Photo Files
**Description:** If recipe delete succeeds but file deletion fails (permissions, disk full, etc.), photo file remains on disk with no recipe reference.

**Mitigation:**
- Log file deletion errors for monitoring
- Implement manual cleanup script later if needed
- Could add health check endpoint to list orphaned files

### Risk: Disk Space Exhaustion
**Description:** Users upload many large photos (5MB each), filling disk.

**Mitigation:**
- 5MB limit per file keeps growth manageable
- Monitor disk usage on NAS
- Can add total storage quota per family later if needed
- Synology NAS has plenty of storage for typical usage

### Risk: Unsupported Image Formats
**Description:** User uploads obscure format or corrupted file, breaks display.

**Mitigation:**
- Whitelist common extensions (jpg, png, webp, gif)
- Browser handles unsupported formats gracefully (shows broken image icon)
- Can add stricter validation (magic number check) later

### Risk: Backup Complexity
**Description:** Backing up database + photos directory requires coordinated backup.

**Mitigation:**
- Entire `/app/data/` directory is already mounted as single volume
- Backup strategy extends naturally: `tar -czf backup.tar.gz /app/data/`
- Docker volume backup captures both DB and photos atomically

### Risk: Photo Format Changes
**Description:** User uploads JPG, then uploads PNG - need to delete old JPG file.

**Mitigation:**
- Before saving new photo, query DB for old `photo_filename`
- Delete old file if extension differs
- Handle missing old file gracefully (already deleted)

### Risk: Concurrent Photo Uploads
**Description:** Two users upload photos to same recipe simultaneously.

**Mitigation:**
- Last write wins (acceptable for MVP)
- DB update is atomic (filename column)
- File write could race, but same filename resolves to overwrite
- Can add optimistic locking later if needed

## Migration Plan

### Phase 1: Database Migration
1. Create migration file: `migrations/YYYYMMDDHHMMSS_add_recipe_photos.sql`
2. Add column: `ALTER TABLE recipes ADD COLUMN photo_filename TEXT;`
3. Migration runs automatically on server startup (sqlx)

### Phase 2: Filesystem Setup
1. Update Docker entrypoint to create `/app/data/photos/` directory
2. Set permissions: `mkdir -p /app/data/photos && chown appuser:appuser /app/data/photos`
3. Verify volume mount includes `/app/data/` (already exists)

### Phase 3: Code Deployment
1. Deploy updated binary with new handlers
2. Existing recipes have `photo_filename = NULL` (no photos)
3. Users can upload photos via new API/UI
4. No downtime required (additive change)

### Phase 4: Testing
1. Run unit tests: `cargo test` (content-type detection, validation logic)
2. Run integration tests: `cargo test --test photo_upload_test` (API endpoints, family tenancy)
3. Run Playwright E2E tests: `cd tests/e2e && npm test photo-management.spec.ts` (UI workflows)
4. Manual deployment tests: server restart persistence, filesystem cleanup, backups

### Rollback Strategy
- If issues arise, can quickly rollback to previous version
- New column is nullable, doesn't break existing queries
- Photos directory can remain (doesn't affect app if code rolled back)
- Can drop column in separate migration if needed: `ALTER TABLE recipes DROP COLUMN photo_filename;`

## Open Questions

None - design is complete for MVP scope.

**Future Enhancements (Post-MVP):**
- Server-side image optimization (resize, compress, convert to WebP)
- Multiple photos per recipe (gallery, step photos)
- Photo display in recipe list view (thumbnails)
- Drag-and-drop upload UI
- Auto-attach extracted images from paste flow
- Image cropping/editing in browser before upload
- CDN integration for faster serving
- Photo metadata (caption, attribution, upload date)
