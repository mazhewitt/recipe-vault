# Builder stage
FROM rustlang/rust:nightly-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy source code
COPY . .

# Build release binaries (both API server and MCP server)
RUN cargo build --release --bin recipe-vault --bin recipe-vault-mcp

# Runtime stage - use same base as builder for glibc compatibility
FROM debian:trixie-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy binaries from builder
COPY --from=builder /app/target/release/recipe-vault /usr/local/bin/recipe-vault
COPY --from=builder /app/target/release/recipe-vault-mcp /usr/local/bin/recipe-vault-mcp

# Create data directory for SQLite
RUN mkdir -p /app/data
ENV DATABASE_URL=sqlite:///app/data/recipes.db?mode=rwc
ENV BIND_ADDRESS=0.0.0.0:3000
ENV MCP_BINARY_PATH=/usr/local/bin/recipe-vault-mcp

EXPOSE 3000

# Default command is the API server
ENTRYPOINT ["recipe-vault"]
