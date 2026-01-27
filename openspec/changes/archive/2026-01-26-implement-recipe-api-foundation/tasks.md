# Implementation Tasks

## 1. Project Setup
- [x] 1.1 Add dependencies to Cargo.toml (axum, sqlx, tokio, serde, uuid, thiserror, tower, tower-http, dotenv)
- [x] 1.2 Add dev-dependencies to Cargo.toml (rstest, rstest_reuse)
- [x] 1.3 Create .env.example with DATABASE_URL template
- [x] 1.4 Add .gitignore entries for .env and *.db files
- [x] 1.5 Configure sqlx for compile-time query checking

## 2. Database Schema and Migrations
- [x] 2.1 Create migrations directory structure
- [x] 2.2 Write initial migration for recipes table (id, title, description, prep_time_minutes, cook_time_minutes, servings, created_at, updated_at)
- [x] 2.3 Write initial migration for ingredients table (id, recipe_id, position, name, quantity, unit, notes)
- [x] 2.4 Write initial migration for steps table (id, recipe_id, position, instruction, duration_minutes, temperature_value, temperature_unit)
- [x] 2.5 Add foreign key constraints and cascade delete rules
- [x] 2.6 Add index on recipe title for unique constraint
- [x] 2.7 Run migrations to create local development database

## 3. Database Layer
- [x] 3.1 Create src/db/mod.rs and export submodules
- [x] 3.2 Implement connection.rs with SQLite pool setup and WAL mode configuration
- [x] 3.3 Implement queries.rs:create_recipe with transaction support
- [x] 3.4 Implement queries.rs:get_recipe with JOIN to load ingredients and steps
- [x] 3.5 Implement queries.rs:list_recipes with basic metadata only
- [x] 3.6 Implement queries.rs:update_recipe with ingredient/step replacement logic
- [x] 3.7 Implement queries.rs:delete_recipe (cascade handled by schema)

## 4. Domain Models
- [x] 4.1 Create src/models/mod.rs and export submodules
- [x] 4.2 Define Recipe struct in models/recipe.rs with validation (title length 1-200, description max 2000)
- [x] 4.3 Define Ingredient struct in models/ingredient.rs with optional quantity/unit
- [x] 4.4 Define Step struct in models/step.rs with optional duration/temperature
- [x] 4.5 Implement Serialize/Deserialize for all models
- [x] 4.6 Add helper methods for total_time calculation on Recipe

## 5. Error Handling
- [x] 5.1 Create src/error.rs with ApiError enum using thiserror
- [x] 5.2 Define error variants (NotFound, Database, Validation, Conflict)
- [x] 5.3 Implement IntoResponse for ApiError with appropriate status codes
- [x] 5.4 Add structured error JSON format

## 6. HTTP Handlers
- [x] 6.1 Create src/handlers/mod.rs and export recipes module
- [x] 6.2 Implement handlers/recipes.rs:create_recipe (POST /api/recipes)
- [x] 6.3 Implement handlers/recipes.rs:list_recipes (GET /api/recipes)
- [x] 6.4 Implement handlers/recipes.rs:get_recipe (GET /api/recipes/:id)
- [x] 6.5 Implement handlers/recipes.rs:update_recipe (PUT /api/recipes/:id)
- [x] 6.6 Implement handlers/recipes.rs:delete_recipe (DELETE /api/recipes/:id)
- [x] 6.7 Add request validation and error handling to all handlers

## 7. Server Setup and Routing
- [x] 7.1 Create src/config.rs to load environment variables (DATABASE_URL, BIND_ADDRESS)
- [x] 7.2 Update main.rs to initialize logging (env_logger or tracing)
- [x] 7.3 Update main.rs to create database connection pool
- [x] 7.4 Configure Axum router with recipe routes under /api/recipes
- [x] 7.5 Add CORS middleware for future frontend development
- [x] 7.6 Add request logging middleware
- [x] 7.7 Start server with graceful shutdown support

## 8. Behavioral Testing (Spec Scenario Coverage)
- [x] 8.1 Set up test infrastructure (common/mod.rs with rstest fixtures for test database and test server)
- [x] 8.2 Test "Complete recipe creation" scenario - POST with all fields
- [x] 8.3 Test "Minimal recipe creation" scenario - POST with only title
- [x] 8.4 Test "List all recipes" scenario - GET returns alphabetically sorted recipes
- [x] 8.5 Test "Get recipe details" scenario - GET includes ingredients and steps in order
- [x] 8.6 Test "Recipe not found" scenario - GET nonexistent recipe returns 404
- [x] 8.7 Test "Update recipe metadata" scenario - PUT preserves ingredients when updating title
- [x] 8.8 Test "Replace ingredients" scenario - PUT with new ingredients removes old ones
- [x] 8.9 Test "Replace steps" scenario - PUT with new steps removes old ones
- [x] 8.10 Test "Delete recipe" scenario - DELETE cascades to ingredients and steps
- [x] 8.11 Test "Duplicate recipe title" scenario - POST with existing title returns 409
- [x] 8.12 Test "Invalid recipe data" scenario - POST with empty title returns 400 validation error
- [x] 8.13 Test "Ingredient without measurement" scenario - Ingredient with null quantity/unit
- [x] 8.14 Test "Step with timing" scenario - Step duration stored and retrieved correctly
- [x] 8.15 Test "Step with temperature" scenario - Temperature value and unit stored correctly
- [x] 8.16 Verify all tests pass with `cargo test`
- [x] 8.17 Manual smoke testing with curl/HTTPie for each endpoint

## 9. Documentation
- [x] 9.1 Add API endpoint documentation to README or API.md
- [x] 9.2 Document environment variables needed for deployment
- [x] 9.3 Add example curl commands for each endpoint
- [x] 9.4 Document development setup (cargo sqlx prepare, running migrations)
