## MODIFIED Requirements

### Requirement: Authentication

The system SHALL require authentication for chat access.

#### Scenario: Valid session cookie
- **WHEN** a request includes a valid `rv_session` cookie
- **THEN** the chat endpoint processes the request normally

#### Scenario: Valid API key
- **WHEN** a request includes a valid `X-API-Key` header
- **THEN** the chat endpoint processes the request normally

#### Scenario: No valid authentication
- **WHEN** a request has neither valid session cookie nor valid API key
- **THEN** a 401 Unauthorized response is returned

#### Scenario: Web UI authentication
- **WHEN** a user accesses the chat web UI without a valid session
- **THEN** they are shown a login form requesting the family password
- **AND** upon successful login, they are redirected to the chat interface

## ADDED Requirements

### Requirement: Logout UI

The system SHALL provide a logout button in the chat interface.

#### Scenario: Logout button displayed
- **WHEN** a user is viewing the chat interface
- **THEN** a logout button is visible in the header

#### Scenario: Logout button clicked
- **WHEN** a user clicks the logout button
- **THEN** a POST request is made to `/logout`
- **AND** the user is redirected to the login form
