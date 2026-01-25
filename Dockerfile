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

# Build release binary (MCP server runs locally, not in container)
RUN cargo build --release --bin recipe-vault

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/recipe-vault /usr/local/bin/recipe-vault

# Create data directory for SQLite
RUN mkdir -p /app/data
ENV DATABASE_URL=sqlite:///app/data/recipes.db?mode=rwc
ENV BIND_ADDRESS=0.0.0.0:3000

EXPOSE 3000

# Default command is the API server
ENTRYPOINT ["recipe-vault"]
