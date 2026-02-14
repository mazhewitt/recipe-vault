## MODIFIED Requirements

### Requirement: Public photo access via share token

The system SHALL serve recipe photos for valid share links without requiring authentication, using the share token to authorize access.

#### Scenario: Valid share token photo retrieval
- **WHEN** a request is made to `GET /share/:token/photo`
- **AND** the token is valid and not expired
- **AND** the recipe has a photo
- **THEN** the photo file is returned as binary data
- **AND** the Content-Type header matches the file format

#### Scenario: Share token photo for recipe without photo
- **WHEN** a request is made to `GET /share/:token/photo`
- **AND** the token is valid and not expired
- **AND** the recipe has no photo (photo_filename is NULL)
- **THEN** a 404 Not Found response is returned

#### Scenario: Expired share token photo retrieval
- **WHEN** a request is made to `GET /share/:token/photo`
- **AND** the token exists but is expired
- **THEN** a 404 Not Found response is returned
