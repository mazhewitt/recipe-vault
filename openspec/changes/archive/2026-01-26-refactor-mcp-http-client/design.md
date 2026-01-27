## Context

The Recipe Vault application has two binaries: an API server and an MCP server. Currently both directly access the SQLite database. The user wants to run the MCP server locally on their laptop while the API server runs containerized on their Mac Studio, enabling kitchen-based recipe access from any device.

**Stakeholders**: Developer using Claude Desktop from multiple machines

**Constraints**:
- Must maintain existing MCP tool interface (no changes to Claude Desktop usage)
- API server already exposes all required HTTP endpoints
- Must handle network errors gracefully

## Goals / Non-Goals

**Goals**:
- MCP server communicates with API server via HTTP
- Single container deployment (API server + SQLite)
- MCP server runs as native local process
- Enable remote usage scenarios (laptop -> Mac Studio)

**Non-Goals**:
- Authentication/authorization for API (home network assumed trusted)
- HTTPS (local network, can be added later)
- MCP server discovery (explicit URL configuration)

## Decisions

### Decision 1: HTTP Client Library

**Choice**: `reqwest` with blocking client

**Rationale**: The MCP server uses synchronous stdio for JSON-RPC communication. Using `reqwest::blocking` keeps the codebase simpler than mixing async/sync paradigms. The MCP server already processes one request at a time, so blocking HTTP calls are appropriate.

**Alternatives considered**:
- `ureq` - Simpler, but reqwest is already in the workspace (used by tests)
- Async reqwest with tokio runtime - Overkill for serial request processing

### Decision 2: Error Mapping

**Choice**: Map HTTP errors to existing JSON-RPC error codes

| HTTP Status | JSON-RPC Code | Meaning |
|-------------|---------------|---------|
| 404 | -32001 | Not found |
| 409 | -32002 | Conflict (duplicate) |
| 400 | -32602 | Invalid params |
| 5xx | -32603 | Internal error |
| Network error | -32603 | Internal error |

**Rationale**: Preserves existing MCP tool error semantics. Callers (Claude Desktop) see identical error responses.

### Decision 3: Configuration

**Choice**: `API_BASE_URL` environment variable

**Example**: `API_BASE_URL=http://192.168.1.100:3000`

**Rationale**: Simple, follows existing pattern (`DATABASE_URL`). No service discovery complexity.

### Decision 4: Container Simplification

**Choice**: Remove MCP binary from Docker image, delete docker-compose.yml

**Rationale**:
- MCP server is always local (stdio-based)
- Single container can be run with `docker run`
- Volume mount for SQLite persistence: `-v recipe-data:/app/data`

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Network latency adds to response time | Acceptable for home network (<10ms typical) |
| API server must be running for MCP to work | Clear error message when connection fails |
| No retry logic | Keep simple; user can retry manually |

## Migration Plan

1. Update MCP server code to use HTTP client
2. Update Dockerfile to exclude MCP binary
3. Delete docker-compose.yml
4. Update Claude Desktop config with API_BASE_URL
5. Rebuild and deploy API server container
6. Rebuild local MCP binary

**Rollback**: Revert to previous commit; both binaries continue working with direct DB access

## Open Questions

None - architecture is straightforward given existing API endpoints.
