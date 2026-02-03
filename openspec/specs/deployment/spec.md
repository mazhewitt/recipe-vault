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

### Requirement: Automated Image Publishing

The system SHALL publish Docker images to Docker Hub automatically when version tags are pushed.

#### Scenario: Tag triggers image build and publish
- **WHEN** a git tag matching `v*` pattern is pushed to the repository
- **THEN** GitHub Actions builds the Docker image for linux/amd64
- **AND** pushes to Docker Hub with the version tag (e.g., `v1.2.0`)
- **AND** pushes to Docker Hub with the `latest` tag

#### Scenario: Non-tag pushes do not trigger publish
- **WHEN** a commit is pushed to any branch without a tag
- **THEN** no Docker image is built or published

### Requirement: Production Deployment Configuration

The system SHALL provide a production-ready docker-compose configuration for Synology NAS deployment.

#### Scenario: Start production stack
- **WHEN** `docker-compose up -d` is executed in the deployment directory
- **THEN** the recipe-vault container starts
- **AND** the container reads secrets from the `.env` file
- **AND** the database is persisted to a mounted volume on RAID storage

#### Scenario: Automatic container updates via Watchtower
- **WHEN** a new `:latest` image is published to Docker Hub
- **AND** Watchtower is running alongside the application
- **THEN** Watchtower detects the new image within the polling interval
- **AND** pulls the new image
- **AND** restarts the recipe-vault container with the new image

### Requirement: Secrets Externalization

The system SHALL NOT contain secrets in the repository or Docker image.

#### Scenario: Image contains no secrets
- **WHEN** the Docker image is built
- **THEN** no environment variables with secrets are baked into the image
- **AND** no `.env` files are included in the image

#### Scenario: Runtime secrets loaded from host
- **WHEN** the container starts in production
- **THEN** secrets are loaded from the `.env` file mounted from the host filesystem
- **AND** the application can access `ANTHROPIC_API_KEY` and other configured secrets

### Requirement: GitHub Actions Workflow

The system SHALL include a GitHub Actions workflow file for the release pipeline.

#### Scenario: Workflow file present and valid
- **WHEN** the repository is checked
- **THEN** `.github/workflows/release.yml` exists
- **AND** the workflow is triggered on `v*` tag pushes
- **AND** the workflow uses GitHub Secrets for Docker Hub authentication

#### Scenario: Required GitHub Secrets documented
- **WHEN** setting up the repository for CI/CD
- **THEN** documentation specifies that `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are required

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

