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

# Install sqlx-cli for migrations
RUN cargo install sqlx-cli --no-default-features --features sqlite

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

# Copy binaries from builder (including sqlx for migrations)
COPY --from=builder /app/target/release/recipe-vault /usr/local/bin/recipe-vault
COPY --from=builder /app/target/release/recipe-vault-mcp /usr/local/bin/recipe-vault-mcp
COPY --from=builder /usr/local/cargo/bin/sqlx /usr/local/bin/sqlx

# Copy static assets, entrypoint script, and migrations
COPY static /app/static
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY migrations /app/migrations

# Make entrypoint executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory for SQLite
RUN mkdir -p /app/data
ENV DATABASE_URL=sqlite:///app/data/recipe-vault.db
ENV BIND_ADDRESS=0.0.0.0:3000
ENV MCP_BINARY_PATH=/usr/local/bin/recipe-vault-mcp

EXPOSE 3000

# Use entrypoint script that handles backups and migrations
ENTRYPOINT ["docker-entrypoint.sh"]
