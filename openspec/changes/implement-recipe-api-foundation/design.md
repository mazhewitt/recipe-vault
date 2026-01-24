# Design: Recipe API Foundation

## Context

Recipe Vault needs a robust, maintainable backend to support family recipe management. The implementation must be simple enough for a single developer to maintain while being extensible for future features like AI cooking guidance, recipe import, and multi-user support.

**Constraints:**
- Home server deployment (Mac Studio) - no cloud dependencies
- Single-user initially, but should accommodate multi-user later
- Mobile-friendly for kitchen use (tablets/phones)
- Minimal JavaScript complexity (server-rendered HTML preferred)

**Stakeholders:**
- Developer's family (end users)
- Developer (maintainer, evaluating OpenSpec methodology)

## Goals / Non-Goals

**Goals:**
- Establish clean architecture patterns for Rust/Axum/SQLite stack
- Type-safe database operations using sqlx compile-time checking
- RESTful API design that supports both JSON and htmx partial responses
- Database schema that supports recipe relationships (ingredients, steps)
- Migration system for schema evolution
- Clear error handling and logging for debugging

**Non-Goals:**
- Authentication/authorization (deferred - family home network)
- Recipe import from URLs/photos (post-MVP)
- Recipe scaling or unit conversion (post-MVP)
- Real-time collaboration features (post-MVP)
- GraphQL or other API paradigms (REST sufficient for MVP)

## Decisions

### Technology Stack

**Axum web framework**
- **Why**: Modern async Rust framework with excellent ergonomics, type-safe extractors, and strong ecosystem integration
- **Alternatives considered**:
  - Actix-web: More mature but more complex, unnecessary for this scale
  - Rocket: Easier for beginners but less async-native
  - Warp: Lower-level, more boilerplate required

**SQLite via sqlx**
- **Why**: Compile-time checked queries, async support, excellent migration tooling
- **Alternatives considered**:
  - Diesel: More mature ORM but sync-only (conflicts with Axum async)
  - rusqlite: Lower-level, less type safety
  - SeaORM: Heavier abstraction, unnecessary complexity for simple schema

**UUID for primary keys**
- **Why**: Avoids ID enumeration, easier to merge data if multi-instance needed later
- **Alternatives considered**: Integer IDs (simpler but exposes enumeration)

### API Design

**REST with resource-oriented routes:**
```
POST   /api/recipes              - Create recipe
GET    /api/recipes              - List all recipes
GET    /api/recipes/:id          - Get single recipe with ingredients/steps
PUT    /api/recipes/:id          - Update recipe
DELETE /api/recipes/:id          - Delete recipe
```

**JSON-first with htmx compatibility:**
- All endpoints return JSON by default
- Accept `Accept: text/html` header for partial HTML responses (future htmx enhancement)
- Consistent error format: `{"error": "message", "code": "ERROR_CODE"}`

### Database Schema

**Three core tables:**
1. `recipes` - Core recipe metadata (title, description, timing, servings)
2. `ingredients` - Linked to recipe with quantity/unit/notes, ordered by position
3. `steps` - Linked to recipe with instruction text, optional duration/temperature, ordered by position

**Cascade deletion**: When a recipe is deleted, all ingredients and steps are automatically removed

**Position field**: Both ingredients and steps use a `position` integer (0-indexed) for ordering, ensuring consistent display

### Error Handling

**thiserror for custom errors:**
```rust
#[derive(thiserror::Error, Debug)]
enum ApiError {
    #[error("Recipe not found: {0}")]
    NotFound(Uuid),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Invalid input: {0}")]
    Validation(String),
}
```

**Axum IntoResponse implementation**: Convert errors to appropriate HTTP status codes (404 for NotFound, 400 for Validation, 500 for Database)

### File Structure

```
src/
├── main.rs              # Server setup, routing, startup
├── config.rs            # Environment variable loading, app configuration
├── error.rs             # Custom error types and HTTP response conversion
├── db/
│   ├── mod.rs
│   ├── connection.rs    # SQLite connection pool setup
│   └── queries.rs       # Database query functions (create_recipe, get_recipe, etc.)
├── models/
│   ├── mod.rs
│   ├── recipe.rs        # Recipe struct with domain logic
│   ├── ingredient.rs    # Ingredient struct
│   └── step.rs          # Step struct
└── handlers/
    ├── mod.rs
    └── recipes.rs       # HTTP handlers (create_recipe, get_recipe, list_recipes, etc.)
```

### Testing Strategy

**Spec-driven behavioral testing approach:**

The specification scenarios define the expected behavior - tests should verify these scenarios through the public API. This ensures implementation matches intent and provides living documentation.

**Test structure:**
```
tests/
├── common/
│   └── mod.rs           # Shared test fixtures (test database, test server setup)
└── api/
    └── recipes_test.rs  # HTTP API behavioral tests
```

**Testing framework:**
- `rstest` for fixtures and parametrized tests
- `#[tokio::test]` (via rstest's `#[rstest]` with `#[tokio::test]` support) for async tests
- `axum-test` or manual HTTP requests to test endpoints
- In-memory SQLite (`:memory:` or temporary file) for test isolation
- Each test gets a fresh database instance via rstest fixtures

**Mapping specs to tests:**

Each requirement scenario should have at least one corresponding test. Examples:

| Spec Scenario | Test Name | What It Verifies |
|--------------|-----------|------------------|
| Complete recipe creation | `test_create_recipe_with_all_fields()` | POST /api/recipes with full data returns 201, assigns UUID |
| Minimal recipe creation | `test_create_recipe_minimal()` | POST /api/recipes with only title succeeds |
| List all recipes | `test_list_recipes_ordered_by_title()` | GET /api/recipes returns alphabetically sorted list |
| Get recipe details | `test_get_recipe_with_ingredients_and_steps()` | GET /api/recipes/:id includes related data in order |
| Recipe not found | `test_get_nonexistent_recipe_returns_404()` | GET /api/recipes/:invalid-id returns 404 |
| Update recipe metadata | `test_update_recipe_preserves_ingredients()` | PUT /api/recipes/:id changes title, keeps ingredients |
| Replace ingredients | `test_update_recipe_replaces_ingredients()` | PUT with new ingredients removes old ones |
| Delete recipe | `test_delete_recipe_cascades()` | DELETE /api/recipes/:id removes recipe and children |
| Duplicate title | `test_create_duplicate_title_returns_conflict()` | POST with existing title returns 409 |
| Invalid data | `test_create_recipe_empty_title_returns_validation_error()` | POST with empty title returns 400 with field errors |

**Test coverage targets:**
- **Focus**: Happy paths and error cases from spec scenarios (10-15 tests)
- **Not needed**: Internal implementation details, private functions
- **Avoid**: Over-testing edge cases not in spec (can add later if bugs found)

**Test data strategy:**
- Use descriptive test data ("Test Recipe Title", "250g flour") rather than "test1", "test2"
- Each test is independent - no shared state between tests
- Cleanup handled automatically through in-memory database disposal

**Example rstest patterns:**

```rust
// Fixture for test app with fresh database
#[fixture]
async fn test_app() -> TestApp {
    let db = SqlitePool::connect(":memory:").await.unwrap();
    sqlx::migrate!().run(&db).await.unwrap();
    TestApp::new(db)
}

// Simple behavioral test
#[rstest]
#[tokio::test]
async fn test_create_recipe_with_all_fields(#[future] test_app: TestApp) {
    let app = test_app.await;
    let response = app.post("/api/recipes")
        .json(&json!({
            "title": "Chocolate Chip Cookies",
            "description": "Classic chewy cookies",
            "prep_time_minutes": 15,
            "cook_time_minutes": 12,
            "servings": 24
        }))
        .await;

    assert_eq!(response.status(), 201);
    let recipe: Recipe = response.json().await;
    assert_eq!(recipe.title, "Chocolate Chip Cookies");
    assert!(recipe.id.is_some());
}

// Parametrized test for multiple error cases
#[rstest]
#[case("", "Title cannot be empty")]
#[case("a".repeat(201), "Title exceeds maximum length")]
#[tokio::test]
async fn test_validation_errors(
    #[future] test_app: TestApp,
    #[case] title: &str,
    #[case] expected_error: &str
) {
    let app = test_app.await;
    let response = app.post("/api/recipes")
        .json(&json!({"title": title}))
        .await;

    assert_eq!(response.status(), 400);
    let error: ApiError = response.json().await;
    assert!(error.message.contains(expected_error));
}
```

**Running tests:**
```bash
# Run all tests
cargo test

# Run only API tests
cargo test --test recipes_test

# Run specific test
cargo test test_create_recipe_with_all_fields
```

**CI considerations:**
- Tests must pass before merging
- No external dependencies (database is in-memory)
- Fast execution (< 5 seconds for full suite)

## Risks / Trade-offs

**Risk: SQLite file corruption**
- **Mitigation**: Use WAL mode, implement backup strategy (simple file copy), log all write operations

**Risk: Concurrent write conflicts**
- **Mitigation**: SQLite handles locking, acceptable for family-scale usage (< 10 concurrent users)
- **Future**: If needed, add optimistic locking with version fields

**Trade-off: UUID vs Integer IDs**
- **Cost**: Slightly larger database, less human-readable
- **Benefit**: Better security (no enumeration), easier data merging, more flexible for future multi-instance scenarios

**Trade-off: Compile-time query checking vs Development speed**
- **Cost**: Requires DATABASE_URL at compile time, slower initial setup
- **Benefit**: Catches SQL errors before runtime, better refactoring confidence

## Migration Plan

**Initial setup:**
1. Add dependencies to Cargo.toml
2. Create initial migration with all three tables (recipes, ingredients, steps)
3. Set up connection pool in main.rs
4. Implement database query layer
5. Implement models with validation
6. Implement HTTP handlers
7. Wire up routes in main.rs

**Running migrations:**
```bash
# Development
sqlx migrate run --database-url sqlite:recipe-vault.db

# Production (same, different path)
sqlx migrate run --database-url sqlite:/path/to/data/recipe-vault.db
```

**Rollback strategy:**
- Initial deployment has no prior state, no rollback needed
- Future migrations will include DOWN migrations for reversibility
- Database backups before migration runs

## Open Questions

None - this is a greenfield implementation with clear requirements from the Recipe Domain spec.
