## ADDED Requirements

### Requirement: API Key Authentication

The system SHALL require a valid API key for all requests to `/api/*` endpoints.

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

#### Scenario: Invalid API key
- GIVEN the API server is running with a configured key
- WHEN a request is made with header `X-API-Key: <wrong-key>`
- THEN the server returns HTTP 401 Unauthorized
- AND the response body indicates invalid API key

### Requirement: API Key Generation

The system SHALL automatically generate an API key on first startup if none exists.

#### Scenario: First startup without key
- GIVEN no API key file exists at `/app/data/.api_key`
- WHEN the API server starts
- THEN a random 32-character hex key is generated
- AND the key is saved to `/app/data/.api_key`
- AND the key is logged to stdout with a message to save it

#### Scenario: Subsequent startup with existing key
- GIVEN an API key file exists at `/app/data/.api_key`
- WHEN the API server starts
- THEN the key is loaded from the file
- AND no new key is generated
- AND the key is NOT logged (security)

### Requirement: MCP Client Authentication

The MCP server SHALL send the API key with all HTTP requests to the API server.

#### Scenario: MCP request includes API key
- GIVEN the MCP server has `API_KEY` environment variable set
- WHEN the MCP server makes an HTTP request to the API
- THEN the request includes header `X-API-Key: <key>`

#### Scenario: MCP server missing API key
- GIVEN the MCP server does not have `API_KEY` environment variable
- WHEN the MCP server starts
- THEN it logs a warning about missing API_KEY
- AND requests will fail with 401 from the API server
