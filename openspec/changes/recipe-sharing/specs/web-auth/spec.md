## MODIFIED Requirements

### Requirement: Login Page

The system SHALL display a login form when accessing protected pages without a valid session.

#### Scenario: Access chat without session
- **WHEN** a user accesses `/chat` without a valid session cookie
- **THEN** the login form is displayed
- **AND** the form has a password input field
- **AND** the form has a submit button

#### Scenario: Access chat with valid session
- **WHEN** a user accesses `/chat` with a valid session cookie
- **THEN** the chat interface is displayed directly
- **AND** no login form is shown

#### Scenario: Access share page without session
- **WHEN** a user accesses `/share/:token` without any authentication
- **THEN** the share page is displayed directly
- **AND** no login form is shown
- **AND** no authentication is required

#### Scenario: Access share photo without session
- **WHEN** a user accesses `/share/:token/photo` without any authentication
- **THEN** the photo is served directly
- **AND** no authentication is required
