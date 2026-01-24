# deployment Specification

## Purpose
TBD - created by archiving change dockerize-application. Update Purpose after archive.
## Requirements
### Requirement: Docker Deployment

The system SHALL be distributable as a container image to facilitate easy deployment and updates.

#### Scenario: Build Docker Image
- GIVEN the source code
- WHEN `docker build` is executed
- THEN a valid image is produced containing `recipe-vault` and `recipe-vault-mcp` binaries
- AND the image size is optimized (multi-stage build)

#### Scenario: Run API Server via Compose
- GIVEN the `docker-compose.yml` file
- WHEN `docker compose up` is executed
- THEN the API server starts on port 3000
- AND the database is persisted in a Docker volume
- AND database migrations run automatically on startup

#### Scenario: Run MCP Server via Docker
- GIVEN the docker image is available
- WHEN `docker run -i` is executed with the MCP command
- THEN the MCP server starts and communicates via stdin/stdout
- AND it can access the database volume if mounted

