## ADDED Requirements

### Requirement: Family Password Configuration

The system SHALL read a family password from the `FAMILY_PASSWORD` environment variable.

#### Scenario: Password configured
- **WHEN** the server starts with `FAMILY_PASSWORD` set
- **THEN** the password is loaded and available for authentication

#### Scenario: Password not configured
- **WHEN** the server starts without `FAMILY_PASSWORD` set
- **THEN** the server logs a warning
- **AND** web authentication is disabled (falls back to API key only)

### Requirement: Password Login

The system SHALL provide a login endpoint that validates the family password and creates a session.

#### Scenario: Successful login
- **WHEN** a POST request to `/login` includes the correct password
- **THEN** the server sets a session cookie
- **AND** redirects to `/chat`

#### Scenario: Invalid password
- **WHEN** a POST request to `/login` includes an incorrect password
- **THEN** the server returns the login form with an error message
- **AND** no cookie is set

#### Scenario: Empty password submitted
- **WHEN** a POST request to `/login` includes an empty password
- **THEN** the server returns the login form with an error message

### Requirement: Session Cookie Format

The system SHALL use a password-derived value for the session cookie that auto-invalidates when the password changes.

#### Scenario: Cookie generation
- **WHEN** a user successfully logs in
- **THEN** the cookie value is `SHA256(FAMILY_PASSWORD + "recipe-vault-session-v1")` encoded as hex
- **AND** the cookie name is `rv_session`
- **AND** the cookie has `HttpOnly` flag set
- **AND** the cookie has `SameSite=Strict`
- **AND** the cookie has `Max-Age` of 10 years

#### Scenario: Cookie validation
- **WHEN** a request includes the `rv_session` cookie
- **THEN** the server computes `SHA256(current_password + "recipe-vault-session-v1")`
- **AND** compares it to the cookie value
- **AND** grants access only if they match

#### Scenario: Password changed invalidates cookie
- **WHEN** the `FAMILY_PASSWORD` environment variable is changed and server restarted
- **THEN** existing session cookies no longer validate
- **AND** users must log in again with the new password

### Requirement: Logout

The system SHALL provide a logout endpoint that clears the session cookie.

#### Scenario: Successful logout
- **WHEN** a POST request is made to `/logout`
- **THEN** the `rv_session` cookie is cleared (Max-Age=0)
- **AND** the user is redirected to `/chat`

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
