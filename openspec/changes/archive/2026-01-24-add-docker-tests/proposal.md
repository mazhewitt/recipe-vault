# Change: Add Docker Integration Tests

## Why
We have dockerized the application, but we lack automated verification that the Docker setup works correctly end-to-end. We need a test script that validates the container build, startup, API connectivity, and MCP CLI functionality inside the container.

## What Changes
- Add `tests/docker_test.sh` script.
- The script will:
    - Build the Docker image.
    - Start the stack with Docker Compose.
    - Verify the REST API via `curl`.
    - Verify the MCP server via `docker run`.
    - Clean up resources.

## Impact
- **Affected specs:** `deployment`
- **Affected code:** New test script only.
