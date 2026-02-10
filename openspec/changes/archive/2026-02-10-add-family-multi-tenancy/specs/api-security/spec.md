# API Security Specification (Delta)

## ADDED Requirements

### Requirement: X-User-Email Header Support

The system SHALL accept an X-User-Email header to scope API requests to a specific user's family.

#### Scenario: API key with X-User-Email header
- **WHEN** a request includes a valid `X-API-Key` header
- **AND** includes `X-User-Email` header with a configured email
- **THEN** the request is authenticated
- **AND** scoped to that user's family (same as Cloudflare auth)

#### Scenario: API key with X-User-Email not in configuration
- **WHEN** a request includes a valid `X-API-Key` header
- **AND** includes `X-User-Email` header with an email not in the family configuration
- **THEN** the server returns HTTP 403 Forbidden
- **AND** the response body indicates the email is not configured

#### Scenario: API key without X-User-Email header (god mode)
- **WHEN** a request includes a valid `X-API-Key` header
- **AND** does NOT include `X-User-Email` header
- **THEN** the request is authenticated with god mode access
- **AND** can access all recipes regardless of family
- **AND** recipe operations use DEV_USER_EMAIL for authorship

### Requirement: Case-Insensitive Email Handling

The system SHALL normalize all email addresses to lowercase for consistent authentication.

#### Scenario: Cloudflare email normalized
- **WHEN** Cloudflare header contains "Alice@Example.COM"
- **THEN** it is normalized to "alice@example.com"
- **AND** used for family lookup

#### Scenario: X-User-Email normalized
- **WHEN** `X-User-Email` header contains "Bob@GMAIL.com"
- **THEN** it is normalized to "bob@gmail.com"
- **AND** used for family lookup

#### Scenario: DEV_USER_EMAIL normalized
- **WHEN** `DEV_USER_EMAIL` environment variable contains "TEST@Example.com"
- **THEN** it is normalized to "test@example.com"
- **AND** used for family lookup

## MODIFIED Requirements

### Requirement: API Key Authentication

The system SHALL require a valid API key for all requests to `/api/*` endpoints, with optional user scoping via X-User-Email header.

#### Scenario: Valid API key provided
- GIVEN the API server is running with a configured key
- WHEN a request is made with header `X-API-Key: <valid-key>`
- THEN the request is processed normally
- AND the response is returned as expected

#### Scenario: Missing API key
- GIVEN the API server is running
- WHEN a request is made without the `X-API-Key` header
- THEN the server returns HTTP 401 Unauthorized
- AND the response body indicates authentication required

#### Scenario: No valid credentials
- **WHEN** a request to `/api/recipes` has no valid key
- **THEN** the response is 401 Unauthorized

#### Scenario: Valid API key with X-User-Email scoping
- **WHEN** a request to `/api/recipes` includes valid `X-API-Key`
- **AND** includes `X-User-Email` header
- **THEN** the request is authenticated and scoped to that user's family
- **AND** only recipes from that family are accessible

#### Scenario: Valid API key without X-User-Email (god mode)
- **WHEN** a request to `/api/recipes` includes valid `X-API-Key`
- **AND** does NOT include `X-User-Email` header
- **THEN** the request is authenticated with god mode access
- **AND** all recipes from all families are accessible
