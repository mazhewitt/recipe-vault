# Deployment Specification

## Purpose

The Deployment capability defines how Recipe Vault is packaged and distributed as a container image, enabling easy deployment across different environments.

## Requirements

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

### Requirement: Docker Integration Testing

The system SHALL include automated tests to verify the Docker deployment workflow.

#### Scenario: End-to-End Docker Test
- GIVEN the Docker environment is available
- WHEN `tests/docker_test.sh` is executed
- THEN the image is built successfully
- AND the API server starts and responds to HTTP requests
- AND the environment is torn down cleanly

## Deprecated Requirements

### ~~Requirement: Run MCP Server via Docker~~ (Removed)

**Reason**: MCP server now runs as a local native process that communicates with the containerized API server via HTTP. The MCP protocol uses stdio which requires local process execution.

**Migration**: Run `recipe-vault-mcp` binary locally with `API_BASE_URL` environment variable pointing to the containerized API server.

## Related Capabilities

- **mcp-interface**: MCP server runs locally and connects to containerized API
- **api-security**: API key must be shared between MCP client and container

