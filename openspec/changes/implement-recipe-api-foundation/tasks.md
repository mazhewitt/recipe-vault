# Implementation Tasks

## 1. Project Setup
- [ ] 1.1 Add dependencies to Cargo.toml (axum, sqlx, tokio, serde, uuid, thiserror, tower, tower-http, dotenv)
- [ ] 1.2 Add dev-dependencies to Cargo.toml (rstest, rstest_reuse)
- [ ] 1.3 Create .env.example with DATABASE_URL template
- [ ] 1.4 Add .gitignore entries for .env and *.db files
- [ ] 1.5 Configure sqlx for compile-time query checking

## 2. Database Schema and Migrations
- [ ] 2.1 Create migrations directory structure
- [ ] 2.2 Write initial migration for recipes table (id, title, description, prep_time_minutes, cook_time_minutes, servings, created_at, updated_at)
- [ ] 2.3 Write initial migration for ingredients table (id, recipe_id, position, name, quantity, unit, notes)
- [ ] 2.4 Write initial migration for steps table (id, recipe_id, position, instruction, duration_minutes, temperature_value, temperature_unit)
- [ ] 2.5 Add foreign key constraints and cascade delete rules
- [ ] 2.6 Add index on recipe title for unique constraint
- [ ] 2.7 Run migrations to create local development database

## 3. Database Layer
- [ ] 3.1 Create src/db/mod.rs and export submodules
- [ ] 3.2 Implement connection.rs with SQLite pool setup and WAL mode configuration
- [ ] 3.3 Implement queries.rs:create_recipe with transaction support
- [ ] 3.4 Implement queries.rs:get_recipe with JOIN to load ingredients and steps
- [ ] 3.5 Implement queries.rs:list_recipes with basic metadata only
- [ ] 3.6 Implement queries.rs:update_recipe with ingredient/step replacement logic
- [ ] 3.7 Implement queries.rs:delete_recipe (cascade handled by schema)

## 4. Domain Models
- [ ] 4.1 Create src/models/mod.rs and export submodules
- [ ] 4.2 Define Recipe struct in models/recipe.rs with validation (title length 1-200, description max 2000)
- [ ] 4.3 Define Ingredient struct in models/ingredient.rs with optional quantity/unit
- [ ] 4.4 Define Step struct in models/step.rs with optional duration/temperature
- [ ] 4.5 Implement Serialize/Deserialize for all models
- [ ] 4.6 Add helper methods for total_time calculation on Recipe

## 5. Error Handling
- [ ] 5.1 Create src/error.rs with ApiError enum using thiserror
- [ ] 5.2 Define error variants (NotFound, Database, Validation, Conflict)
- [ ] 5.3 Implement IntoResponse for ApiError with appropriate status codes
- [ ] 5.4 Add structured error JSON format

## 6. HTTP Handlers
- [ ] 6.1 Create src/handlers/mod.rs and export recipes module
- [ ] 6.2 Implement handlers/recipes.rs:create_recipe (POST /api/recipes)
- [ ] 6.3 Implement handlers/recipes.rs:list_recipes (GET /api/recipes)
- [ ] 6.4 Implement handlers/recipes.rs:get_recipe (GET /api/recipes/:id)
- [ ] 6.5 Implement handlers/recipes.rs:update_recipe (PUT /api/recipes/:id)
- [ ] 6.6 Implement handlers/recipes.rs:delete_recipe (DELETE /api/recipes/:id)
- [ ] 6.7 Add request validation and error handling to all handlers

## 7. Server Setup and Routing
- [ ] 7.1 Create src/config.rs to load environment variables (DATABASE_URL, BIND_ADDRESS)
- [ ] 7.2 Update main.rs to initialize logging (env_logger or tracing)
- [ ] 7.3 Update main.rs to create database connection pool
- [ ] 7.4 Configure Axum router with recipe routes under /api/recipes
- [ ] 7.5 Add CORS middleware for future frontend development
- [ ] 7.6 Add request logging middleware
- [ ] 7.7 Start server with graceful shutdown support

## 8. Behavioral Testing (Spec Scenario Coverage)
- [ ] 8.1 Set up test infrastructure (common/mod.rs with rstest fixtures for test database and test server)
- [ ] 8.2 Test "Complete recipe creation" scenario - POST with all fields
- [ ] 8.3 Test "Minimal recipe creation" scenario - POST with only title
- [ ] 8.4 Test "List all recipes" scenario - GET returns alphabetically sorted recipes
- [ ] 8.5 Test "Get recipe details" scenario - GET includes ingredients and steps in order
- [ ] 8.6 Test "Recipe not found" scenario - GET nonexistent recipe returns 404
- [ ] 8.7 Test "Update recipe metadata" scenario - PUT preserves ingredients when updating title
- [ ] 8.8 Test "Replace ingredients" scenario - PUT with new ingredients removes old ones
- [ ] 8.9 Test "Replace steps" scenario - PUT with new steps removes old ones
- [ ] 8.10 Test "Delete recipe" scenario - DELETE cascades to ingredients and steps
- [ ] 8.11 Test "Duplicate recipe title" scenario - POST with existing title returns 409
- [ ] 8.12 Test "Invalid recipe data" scenario - POST with empty title returns 400 validation error
- [ ] 8.13 Test "Ingredient without measurement" scenario - Ingredient with null quantity/unit
- [ ] 8.14 Test "Step with timing" scenario - Step duration stored and retrieved correctly
- [ ] 8.15 Test "Step with temperature" scenario - Temperature value and unit stored correctly
- [ ] 8.16 Verify all tests pass with `cargo test`
- [ ] 8.17 Manual smoke testing with curl/HTTPie for each endpoint

## 9. Documentation
- [ ] 9.1 Add API endpoint documentation to README or API.md
- [ ] 9.2 Document environment variables needed for deployment
- [ ] 9.3 Add example curl commands for each endpoint
- [ ] 9.4 Document development setup (cargo sqlx prepare, running migrations)
