# MCP Interface Specification (Delta)

## MODIFIED Requirements

### Requirement: MCP Client Authentication

The MCP server SHALL send the API key with all HTTP requests to the API server, with optional X-User-Email header for scoped access.

#### Scenario: MCP request includes API key
- GIVEN the MCP server has `API_KEY` environment variable set
- WHEN the MCP server makes an HTTP request to the API
- THEN the request includes header `X-API-Key: <key>`

#### Scenario: MCP request includes user email for scoping
- GIVEN the MCP server has `API_KEY` and `USER_EMAIL` environment variables set
- WHEN the MCP server makes an HTTP request to the API
- THEN the request includes header `X-API-Key: <key>`
- AND the request includes header `X-User-Email: <email>`
- AND the request is scoped to that user's family

#### Scenario: MCP request without user email (god mode)
- GIVEN the MCP server has `API_KEY` but NOT `USER_EMAIL` environment variable
- WHEN the MCP server makes an HTTP request to the API
- THEN the request includes header `X-API-Key: <key>`
- AND does NOT include `X-User-Email` header
- AND the request has god mode access to all recipes

#### Scenario: MCP server missing API key
- GIVEN the MCP server does not have `API_KEY` environment variable
- WHEN the MCP server starts
- THEN it logs a warning about missing API_KEY
- AND requests will fail with 401 from the API server

## ADDED Requirements

### Requirement: Optional User Email Configuration

The MCP server SHALL optionally read a user email from the `USER_EMAIL` environment variable to scope requests.

#### Scenario: USER_EMAIL configured
- **WHEN** the MCP server starts with `USER_EMAIL` environment variable set
- **THEN** the email is loaded
- **AND** included in all API requests as `X-User-Email` header
- **AND** the MCP server operates in scoped mode for that user's family

#### Scenario: USER_EMAIL not configured
- **WHEN** the MCP server starts without `USER_EMAIL` environment variable
- **THEN** no `X-User-Email` header is sent with requests
- **AND** the MCP server operates in god mode (access to all recipes)
- **AND** no warning is logged (god mode is valid)
