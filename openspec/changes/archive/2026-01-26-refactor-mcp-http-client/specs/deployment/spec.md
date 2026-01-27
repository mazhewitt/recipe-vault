## MODIFIED Requirements

### Requirement: Docker Deployment

The system SHALL be distributable as a container image to facilitate easy deployment and updates.

#### Scenario: Build Docker Image
- GIVEN the source code
- WHEN `docker build` is executed
- THEN a valid image is produced containing only the `recipe-vault` API server binary
- AND the image size is optimized (multi-stage build)
- AND the MCP server binary is NOT included in the image

#### Scenario: Run API Server via Docker Run
- GIVEN the Docker image is available
- WHEN `docker run -p 3000:3000 -v recipe-data:/app/data` is executed
- THEN the API server starts on port 3000
- AND the database is persisted in the mounted volume
- AND database migrations run automatically on startup

#### Scenario: API Server Accessible from Network
- GIVEN the API server container is running
- WHEN an HTTP request is made to the API from another machine
- THEN the API server responds correctly
- AND the response matches the same behavior as local access

## REMOVED Requirements

### Requirement: Run MCP Server via Docker

**Reason**: MCP server now runs as a local native process that communicates with the containerized API server via HTTP. The MCP protocol uses stdio which requires local process execution.

**Migration**: Run `recipe-vault-mcp` binary locally with `API_BASE_URL` environment variable pointing to the containerized API server.
