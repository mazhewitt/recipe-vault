# Design: Dockerization Strategy

## Context
The application consists of two components that share a database:
1.  **REST API Server**: Long-running process, needs port binding.
2.  **MCP Server**: Interactive CLI process, speaks JSON-RPC on stdin/stdout.

## Goals
- Distribute `recipe-vault` via Docker Hub (`mazhewitt/recipe-vault`).
- Simplify deployment for the API server.
- Allow MCP integration without requiring a local Rust toolchain.
- Ensure data persistence for the SQLite database.

## Decisions

### 1. Single Image Strategy
We will build a **single Docker image** that contains both the `recipe-vault` (API) and `recipe-vault-mcp` binaries.
- **Why**: Reduces build times and simplifies versioning. Users pull one image for everything.
- **Mechanism**: The image will have an entrypoint script or default command that can be overridden to run either binary.

### 2. Docker Compose for API Server
We will provide a `docker-compose.yml` for running the API server.
- **Why**: Compose handles volume mounting (`./data:/app/data`) and port mapping (`3000:3000`) declaratively. It's the standard for "running a server".

### 3. MCP via `docker run`
For the MCP integration (Claude/Gemini), users will configure their clients to run the docker container in interactive mode.
- **Command**: `docker run -i -v recipe-data:/app/data mazhewitt/recipe-vault mcp`
- **Constraint**: The MCP container must share the same volume/data directory as the API server to see the same recipes.

## Data Persistence
- **Volume**: A named Docker volume (or bind mount) will store `recipes.db`.
- **Concurrency**: SQLite supports multi-process access (WAL mode is enabled in code), so running the API container and an ephemeral MCP container against the same volume is safe on local file systems.

## Image Structure
- **Base**: `debian:bookworm-slim` (compatible with Rust binaries, smaller than Ubuntu+glibc issues).
- **Build Stage**: `rust:latest` to compile release binaries.
- **Runtime**: Minimal image, copies binaries from build stage.
