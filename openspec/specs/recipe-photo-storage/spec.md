# Recipe Photo Storage Specification

## Purpose

The Recipe Photo Storage capability allows users to attach a single hero image to each recipe, with photos stored on the filesystem and served via HTTP API. This enhances the visual appeal of the recipe book and helps users identify recipes at a glance.

## Requirements

### Requirement: Photo Upload

The system SHALL allow users to upload a photo for a recipe via multipart form data.

#### Scenario: Successful photo upload
- **WHEN** a user uploads a valid image file (< 5MB, supported format) for a recipe they own
- **THEN** the photo is saved to the filesystem at `/app/data/photos/{recipe-id}.{ext}`
- **AND** the recipe's `photo_filename` field is updated to `{recipe-id}.{ext}`
- **AND** a 200 OK response is returned
- **AND** the response includes the photo filename

#### Scenario: Upload photo to non-existent recipe
- **WHEN** a user attempts to upload a photo to a recipe ID that doesn't exist
- **THEN** a 404 Not Found response is returned
- **AND** no file is written to the filesystem

#### Scenario: Upload photo to recipe outside family
- **WHEN** a user attempts to upload a photo to a recipe created by a different family
- **THEN** a 404 Not Found response is returned
- **AND** no file is written to the filesystem

#### Scenario: Upload photo in god mode
- **WHEN** a photo is uploaded using god mode (API key without X-User-Email)
- **THEN** the photo can be uploaded to any recipe regardless of family
- **AND** the upload succeeds

#### Scenario: Upload replaces existing photo
- **WHEN** a user uploads a new photo to a recipe that already has a photo
- **AND** the new photo has a different format (e.g., PNG replacing JPG)
- **THEN** the old photo file is deleted from the filesystem
- **AND** the new photo is saved with the new extension
- **AND** the recipe's `photo_filename` is updated to reflect the new filename

#### Scenario: Upload replaces existing photo with same format
- **WHEN** a user uploads a new photo to a recipe with the same format
- **THEN** the new photo overwrites the existing file
- **AND** the recipe's `photo_filename` remains unchanged

### Requirement: Photo Upload Validation

The system SHALL validate photo uploads to ensure they meet size and format requirements.

#### Scenario: File too large rejected
- **WHEN** a user attempts to upload a photo larger than 5MB
- **THEN** a 413 Payload Too Large response is returned
- **AND** the error message indicates the maximum file size
- **AND** no file is written to the filesystem

#### Scenario: Unsupported format rejected
- **WHEN** a user attempts to upload a file with an unsupported extension (not jpg, jpeg, png, webp, gif)
- **THEN** a 400 Bad Request response is returned
- **AND** the error message indicates the supported formats
- **AND** no file is written to the filesystem

#### Scenario: Valid formats accepted
- **WHEN** a user uploads a photo with extension jpg, jpeg, png, webp, or gif (case-insensitive)
- **THEN** the upload is accepted
- **AND** the file is saved with the lowercase extension

### Requirement: Photo Retrieval

The system SHALL serve recipe photos via HTTP GET endpoint.

#### Scenario: Retrieve existing photo
- **WHEN** a user requests a photo for a recipe that has one
- **AND** the recipe is accessible to the user (family membership or god mode)
- **THEN** the photo file is returned as binary data
- **AND** the Content-Type header matches the file format (image/jpeg, image/png, etc.)
- **AND** a 200 OK response is returned

#### Scenario: Retrieve photo for recipe without photo
- **WHEN** a user requests a photo for a recipe that has no photo (photo_filename is NULL)
- **THEN** a 404 Not Found response is returned

#### Scenario: Retrieve photo for non-existent recipe
- **WHEN** a user requests a photo for a recipe ID that doesn't exist
- **THEN** a 404 Not Found response is returned

#### Scenario: Retrieve photo for recipe outside family
- **WHEN** a user requests a photo for a recipe created by a different family
- **THEN** a 404 Not Found response is returned

#### Scenario: Retrieve photo in god mode
- **WHEN** a photo is requested using god mode
- **THEN** the photo can be retrieved for any recipe regardless of family

#### Scenario: Content-Type detection
- **WHEN** a photo with extension `.jpg` or `.jpeg` is retrieved
- **THEN** Content-Type header is `image/jpeg`
- **WHEN** a photo with extension `.png` is retrieved
- **THEN** Content-Type header is `image/png`
- **WHEN** a photo with extension `.webp` is retrieved
- **THEN** Content-Type header is `image/webp`
- **WHEN** a photo with extension `.gif` is retrieved
- **THEN** Content-Type header is `image/gif`

### Requirement: Photo Deletion

The system SHALL allow users to delete recipe photos.

#### Scenario: Delete existing photo
- **WHEN** a user deletes a photo for a recipe they own
- **AND** the recipe has a photo
- **THEN** the photo file is deleted from the filesystem
- **AND** the recipe's `photo_filename` field is set to NULL
- **AND** a 200 OK response is returned

#### Scenario: Delete photo for recipe without photo
- **WHEN** a user attempts to delete a photo for a recipe that has no photo
- **THEN** a 404 Not Found response is returned

#### Scenario: Delete photo for non-existent recipe
- **WHEN** a user attempts to delete a photo for a recipe that doesn't exist
- **THEN** a 404 Not Found response is returned

#### Scenario: Delete photo for recipe outside family
- **WHEN** a user attempts to delete a photo for a recipe created by a different family
- **THEN** a 404 Not Found response is returned

#### Scenario: Delete photo in god mode
- **WHEN** a photo is deleted using god mode
- **THEN** the photo can be deleted for any recipe regardless of family

### Requirement: Cascade Deletion

The system SHALL automatically delete photo files when recipes are deleted.

#### Scenario: Recipe deletion removes photo
- **WHEN** a recipe with a photo is deleted
- **THEN** the recipe is removed from the database
- **AND** the associated photo file is deleted from the filesystem
- **AND** the deletion succeeds even if the photo file doesn't exist

#### Scenario: Photo file deletion failure logged
- **WHEN** a recipe with a photo is deleted
- **AND** the photo file deletion fails (permissions, disk error, etc.)
- **THEN** the recipe deletion still succeeds
- **AND** the error is logged for monitoring
- **AND** the photo file becomes orphaned

### Requirement: Filesystem Management

The system SHALL manage photo files on the filesystem with proper error handling.

#### Scenario: Photo directory creation on startup
- **WHEN** the application starts
- **THEN** the `/app/data/photos/` directory is created if it doesn't exist
- **AND** the directory has proper permissions for the application user

#### Scenario: Atomic file writes
- **WHEN** a photo is uploaded
- **THEN** the file is written atomically to prevent partial writes
- **AND** temporary files are cleaned up on failure

#### Scenario: File write failure
- **WHEN** a photo upload fails due to filesystem error (disk full, permissions, etc.)
- **THEN** a 500 Internal Server Error response is returned
- **AND** the error is logged
- **AND** the recipe's `photo_filename` field is not updated

### Requirement: Authentication and Authorization

The system SHALL enforce authentication and family-based authorization for all photo operations.

#### Scenario: Upload requires authentication
- **WHEN** an unauthenticated request is made to upload a photo
- **THEN** a 401 Unauthorized response is returned

#### Scenario: Retrieval requires authentication
- **WHEN** an unauthenticated request is made to retrieve a photo
- **THEN** a 401 Unauthorized response is returned

#### Scenario: Deletion requires authentication
- **WHEN** an unauthenticated request is made to delete a photo
- **THEN** a 401 Unauthorized response is returned

#### Scenario: Family tenancy enforced
- **WHEN** any photo operation is performed
- **THEN** the system verifies the recipe belongs to the user's family (or god mode)
- **AND** returns 404 for recipes outside the family

## Data Types

### PhotoUploadRequest
```
multipart/form-data with field:
  photo: File (< 5MB, .jpg/.jpeg/.png/.webp/.gif)
```

### PhotoUploadResponse
```
{
    photo_filename: String  // e.g., "abc-123.jpg"
}
```

### PhotoFile
```
Stored at: /app/data/photos/{photo_filename}
Filename format: {recipe-id}.{extension}
Example: /app/data/photos/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpg
```

## Related Capabilities

- **recipe-domain**: Stores `photo_filename` field in Recipe model
- **api-security**: Enforces authentication for photo endpoints
- **family-multi-tenancy**: Enforces family-based access control for photos
