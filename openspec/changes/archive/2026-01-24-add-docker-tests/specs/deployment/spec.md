## ADDED Requirements

### Requirement: Docker Integration Testing

The system SHALL include automated tests to verify the Docker deployment workflow.

#### Scenario: End-to-End Docker Test
- GIVEN the Docker environment is available
- WHEN `tests/docker_test.sh` is executed
- THEN the image is built successfully
- AND the API server starts and responds to HTTP requests
- AND the MCP server runs inside a container and responds to JSON-RPC
- AND the environment is torn down cleanly
