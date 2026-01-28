## Recipe Vault API Documentation

### Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. The server will automatically run migrations on startup.

3. Start the server:
```bash
cargo run
```

Server will start on `http://127.0.0.1:3000` by default.

### Authentication

Authentication is required for all API endpoints.

**Method 1: API Key (Recommended for scripts/MCP)**
Include the `X-API-Key` header with every request.
The key is generated on first startup and stored in `data/.api_key`.

**Method 2: Session Cookie (Web UI)**
The Web UI uses the `rv_session` cookie, which is set via the `/login` endpoint using the `FAMILY_PASSWORD`.

### API Endpoints

#### Create Recipe
```bash
POST /api/recipes
Content-Type: application/json

{
  "title": "Chocolate Chip Cookies",
  "description": "Classic chewy cookies",
  "prep_time_minutes": 15,
  "cook_time_minutes": 12,
  "servings": 24,
  "ingredients": [
    {
      "name": "flour",
      "quantity": 2.5,
      "unit": "cups",
      "notes": "all-purpose"
    },
    {
      "name": "chocolate chips",
      "quantity": 2.0,
      "unit": "cups"
    }
  ],
  "steps": [
    {
      "instruction": "Preheat oven to 180°C",
      "temperature_value": 180,
      "temperature_unit": "Celsius"
    },
    {
      "instruction": "Mix ingredients and bake for 12 minutes",
      "duration_minutes": 12
    }
  ]
}

# Response: 201 Created
# Returns the created recipe with id
```

#### List All Recipes
```bash
GET /api/recipes

# Response: 200 OK
# Returns array of recipes (without ingredients/steps) ordered by title
```

#### Get Single Recipe
```bash
GET /api/recipes/{id}

# Response: 200 OK (recipe with ingredients and steps)
# Response: 404 Not Found (if recipe doesn't exist)
```

#### Update Recipe
```bash
PUT /api/recipes/{id}
Content-Type: application/json

{
  "title": "Updated Title",
  "ingredients": [
    {"name": "new ingredient"}
  ]
}

# Partial updates supported
# If ingredients or steps are provided, they completely replace existing ones
# Response: 200 OK (updated recipe)
# Response: 404 Not Found
# Response: 409 Conflict (duplicate title)
```

#### Delete Recipe
```bash
DELETE /api/recipes/{id}

# Response: 204 No Content
# Response: 404 Not Found
# Note: Cascades to delete all ingredients and steps
```

### Example cURL Commands

```bash
export API_KEY="your-api-key"

# Create a recipe
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "title": "Simple Pasta",
    "ingredients": [{"name": "pasta", "quantity": 200, "unit": "g"}],
    "steps": [{"instruction": "Boil pasta for 10 minutes", "duration_minutes": 10}]
  }'

# List all recipes
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/recipes

# Get specific recipe
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/recipes/{recipe-id}

# Update recipe
curl -X PUT http://localhost:3000/api/recipes/{recipe-id} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"title": "Updated Simple Pasta"}'

# Delete recipe
curl -X DELETE -H "X-API-Key: $API_KEY" http://localhost:3000/api/recipes/{recipe-id}
```

### Error Responses

All errors return JSON with `error` and `code` fields:

```json
{
  "error": "Recipe not found: {id}",
  "code": "NOT_FOUND"
}
```

Error codes:
- `NOT_FOUND` (404) - Resource doesn't exist
- `VALIDATION_ERROR` (400) - Invalid input data
- `CONFLICT` (409) - Duplicate recipe title
- `DATABASE_ERROR` (500) - Database operation failed
- `INTERNAL_ERROR` (500) - Other server error

### Running Tests

```bash
# Run all tests
cargo test

# Run only API tests
cargo test --test recipes_test

# Run specific test
cargo test test_create_recipe_with_all_fields
```

All tests use in-memory databases and run in isolation.
