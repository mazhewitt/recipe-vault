# Change: Implement Recipe API Foundation

## Why

The Recipe Vault project currently has only a "Hello World" stub. To deliver the MVP, we need foundational infrastructure: a running Axum web server, SQLite database with migrations, and a complete REST API for recipe CRUD operations. This change establishes the technical foundation that all other features will build upon.

## What Changes

- Add Axum web framework with routing for recipe endpoints
- Set up SQLite database with sqlx for type-safe queries
- Implement database schema with migrations for recipes, ingredients, and steps
- Create REST API handlers for recipe CRUD operations (create, read, update, delete, list)
- Add structured error handling and logging
- Establish project structure following Rust conventions (models, handlers, db modules)
- Configure development environment with .env support

## Impact

- **Affected specs**: `recipe-domain` (new capability)
- **Affected code**:
  - `Cargo.toml` - Add dependencies (axum, sqlx, tokio, etc.)
  - `src/main.rs` - Server initialization and routing
  - `src/db/` - Database connection, migrations, queries
  - `src/models/` - Recipe, Ingredient, Step domain models
  - `src/handlers/` - HTTP request handlers for recipes
  - `migrations/` - SQLite schema definitions
- **Infrastructure**: Requires DATABASE_URL environment variable pointing to SQLite file
- **Breaking changes**: None (greenfield implementation)
