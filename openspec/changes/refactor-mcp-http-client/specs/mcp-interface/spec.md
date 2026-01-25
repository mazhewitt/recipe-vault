## ADDED Requirements

### Requirement: HTTP Client Communication

The MCP server SHALL communicate with the Recipe Vault API server via HTTP rather than accessing the database directly.

#### Scenario: MCP tool calls API endpoint
- GIVEN the MCP server is configured with API_BASE_URL
- WHEN Claude Desktop invokes an MCP tool
- THEN the MCP server makes an HTTP request to the API server
- AND the response is translated to JSON-RPC format
- AND the tool result matches the expected MCP response structure

#### Scenario: API server unreachable
- GIVEN the API server is not running or unreachable
- WHEN Claude Desktop invokes an MCP tool
- THEN a JSON-RPC error is returned
- AND the error code is -32603 (internal error)
- AND the error message indicates the API server is unavailable

### Requirement: MCP Configuration

The MCP server SHALL be configurable to connect to a remote API server.

#### Scenario: Configure API base URL
- GIVEN the environment variable API_BASE_URL is set to "http://192.168.1.100:3000"
- WHEN the MCP server starts
- THEN it uses that URL for all API requests
- AND no DATABASE_URL is required

#### Scenario: Missing API base URL
- GIVEN the environment variable API_BASE_URL is not set
- WHEN the MCP server starts
- THEN it logs an error message
- AND exits with a non-zero status code

## MODIFIED Requirements

### Requirement: Error Handling

The system SHALL map HTTP errors from the API server to appropriate JSON-RPC error codes.

#### Scenario: API returns 404
- GIVEN the API server returns HTTP 404
- WHEN the MCP server receives the response
- THEN a JSON-RPC error is returned with code -32001 (not found)

#### Scenario: API returns 409
- GIVEN the API server returns HTTP 409 (conflict)
- WHEN the MCP server receives the response
- THEN a JSON-RPC error is returned with code -32002 (conflict)

#### Scenario: API returns 400
- GIVEN the API server returns HTTP 400 (bad request)
- WHEN the MCP server receives the response
- THEN a JSON-RPC error is returned with code -32602 (invalid params)

#### Scenario: API returns 5xx
- GIVEN the API server returns HTTP 500 or other 5xx error
- WHEN the MCP server receives the response
- THEN a JSON-RPC error is returned with code -32603 (internal error)

#### Scenario: Network timeout
- GIVEN the API server does not respond within timeout
- WHEN the MCP server times out
- THEN a JSON-RPC error is returned with code -32603 (internal error)
- AND the error message indicates a timeout occurred
