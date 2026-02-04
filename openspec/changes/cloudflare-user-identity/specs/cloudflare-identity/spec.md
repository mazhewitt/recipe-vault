# Cloudflare Identity Specification

## Purpose

The Cloudflare Identity capability extracts authenticated user information from Cloudflare Access headers, providing user identity context throughout the application.

## ADDED Requirements

### Requirement: Identity Header Extraction

The system SHALL read user identity from the `Cf-Access-Authenticated-User-Email` header when present.

#### Scenario: Cloudflare headers present
- **WHEN** a request includes the `Cf-Access-Authenticated-User-Email` header
- **THEN** the email value is extracted and made available as the current user identity
- **AND** the identity is accessible to handlers for tracking purposes

#### Scenario: Cloudflare headers absent
- **WHEN** a request does not include the `Cf-Access-Authenticated-User-Email` header
- **THEN** the current user identity is `None`
- **AND** the request proceeds without user context

### Requirement: Development Mode Identity

The system SHALL support simulating Cloudflare identity in development via environment variable.

#### Scenario: DEV_USER_EMAIL configured
- **WHEN** the `DEV_USER_EMAIL` environment variable is set
- **AND** no `Cf-Access-Authenticated-User-Email` header is present
- **THEN** the value of `DEV_USER_EMAIL` is used as the current user identity

#### Scenario: Production mode ignores DEV_USER_EMAIL
- **WHEN** both `DEV_USER_EMAIL` is set and `Cf-Access-Authenticated-User-Email` header is present
- **THEN** the header value takes precedence over the environment variable

### Requirement: Identity Propagation

The system SHALL make user identity available to all request handlers.

#### Scenario: Identity in request context
- **WHEN** a request is processed with an identified user
- **THEN** handlers can access the user email via request extensions or state
- **AND** the email can be used for created_by/updated_by tracking

## Data Types

### UserIdentity
```
UserIdentity {
    email: Option<String>
}
```

## Related Capabilities

- **web-auth**: Uses identity for authenticated access
- **api-security**: Identity available alongside API key auth
- **recipe-domain**: Uses identity for tracking recipe authorship
