# Web Authentication Delta Spec

## REMOVED Requirements

### Requirement: Family Password Configuration
**Reason**: Replaced by Cloudflare Access authentication
**Migration**: Remove FAMILY_PASSWORD from .env; authentication handled by Cloudflare

### Requirement: Password Login
**Reason**: Replaced by Cloudflare Access Google OAuth
**Migration**: Users authenticate via Cloudflare Access before reaching the app

### Requirement: Session Cookie Format
**Reason**: Cloudflare Access manages sessions; no app-level cookies needed
**Migration**: Existing rv_session cookies can be ignored; Cloudflare handles session state

### Requirement: Logout
**Reason**: Logout handled by Cloudflare Access
**Migration**: Users log out via Cloudflare Access logout URL

### Requirement: Login Page
**Reason**: No app-level login needed; Cloudflare Access shows login before app loads
**Migration**: Remove /login route and login form template

## ADDED Requirements

### Requirement: Cloudflare Access Authentication

The system SHALL rely on Cloudflare Access for web UI authentication, trusting requests that reach the app through the tunnel.

#### Scenario: Request with Cloudflare identity
- **WHEN** a request to `/chat` includes the `Cf-Access-Authenticated-User-Email` header
- **THEN** the request is considered authenticated
- **AND** the chat interface is displayed with user identity shown

#### Scenario: Request without Cloudflare identity (local access)
- **WHEN** a request to `/chat` does not include the `Cf-Access-Authenticated-User-Email` header
- **THEN** the request is allowed (local network access)
- **AND** the chat interface is displayed without user identity

### Requirement: User Identity Display

The system SHALL display the authenticated user's email in the web UI when available.

#### Scenario: Show logged-in user
- **WHEN** a user accesses the chat interface with Cloudflare identity
- **THEN** the user's email is displayed in the UI
- **AND** a logout link to Cloudflare Access logout is provided

#### Scenario: No identity available
- **WHEN** a user accesses the chat interface without Cloudflare identity
- **THEN** no user identity is displayed
- **AND** no logout link is shown
