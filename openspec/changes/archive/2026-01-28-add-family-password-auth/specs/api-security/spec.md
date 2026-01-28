## ADDED Requirements

### Requirement: Session Cookie Authentication

The system SHALL accept a valid session cookie as an alternative to API key for `/api/*` endpoints.

#### Scenario: Valid session cookie provided
- **WHEN** a request to `/api/*` includes a valid `rv_session` cookie
- **AND** no `X-API-Key` header is present
- **THEN** the request is authenticated
- **AND** processed normally

#### Scenario: Both cookie and API key provided
- **WHEN** a request includes both a valid `rv_session` cookie and valid `X-API-Key` header
- **THEN** the request is authenticated (either is sufficient)

#### Scenario: Invalid session cookie without API key
- **WHEN** a request to `/api/*` includes an invalid `rv_session` cookie
- **AND** no `X-API-Key` header is present
- **THEN** the server returns HTTP 401 Unauthorized

#### Scenario: No authentication provided
- **WHEN** a request to `/api/*` has neither valid cookie nor valid API key
- **THEN** the server returns HTTP 401 Unauthorized
