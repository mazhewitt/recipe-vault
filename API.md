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

**Method 2: Cloudflare Identity (Web UI)**
The Web UI uses Cloudflare Access identity headers. Include the `Cf-Access-Authenticated-User-Email` header with a valid email.

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
  "difficulty": 2,
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

# Note: difficulty is optional (1-5 scale)
# - 1 = Easy (simple, few steps, common ingredients)
# - 2 = Medium-Easy
# - 3 = Medium (requires some technique)
# - 4 = Medium-Hard (advanced techniques)
# - 5 = Hard (complex, many steps, precise timing)
# If omitted, AI will automatically assess and assign difficulty
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
  "difficulty": 3,
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
# Note: Cascades to delete all ingredients, steps, and associated photo file
```

#### Upload Recipe Photo
```bash
POST /api/recipes/{id}/photo
Content-Type: multipart/form-data

# Form field: photo (file upload)

# Supported formats: JPG, JPEG, PNG, WebP, GIF
# Maximum file size: 5MB (5,242,880 bytes)

# Example with curl:
curl -X POST http://localhost:3000/api/recipes/{id}/photo \
  -H "X-API-Key: your-api-key" \
  -F "photo=@/path/to/image.jpg"

# Response: 200 OK
{
  "photo_filename": "recipe-id.jpg"
}

# Response: 400 Bad Request (invalid format or missing file)
# Response: 404 Not Found (recipe doesn't exist)
# Response: 413 Payload Too Large (file exceeds 5MB)

# Notes:
# - Uploading a new photo replaces the existing one
# - If the new photo has a different format, the old file is deleted
# - Photo filename format: {recipe-id}.{extension}
```

#### Get Recipe Photo
```bash
GET /api/recipes/{id}/photo

# Example:
curl http://localhost:3000/api/recipes/{id}/photo \
  -H "X-API-Key: your-api-key" \
  -o downloaded-photo.jpg

# Response: 200 OK (binary image data)
# Content-Type header set based on file format:
#   - image/jpeg for JPG/JPEG
#   - image/png for PNG
#   - image/webp for WebP
#   - image/gif for GIF

# Response: 404 Not Found (recipe has no photo or doesn't exist)

# Note: Recipe detail endpoint (GET /api/recipes/{id}) includes
# "photo_filename" field to indicate if a photo exists
```

#### Delete Recipe Photo
```bash
DELETE /api/recipes/{id}/photo

# Example:
curl -X DELETE http://localhost:3000/api/recipes/{id}/photo \
  -H "X-API-Key: your-api-key"

# Response: 200 OK
# Response: 404 Not Found (recipe has no photo or doesn't exist)

# Notes:
# - Deletes the photo file from filesystem
# - Sets recipe's photo_filename to NULL in database
# - Recipe continues to exist without photo
```

#### Chat with AI Assistant
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "What recipes do I have?",
  "conversation_id": "optional-conversation-id",
  "image": {
    "data": "base64-encoded-image-data",
    "media_type": "image/jpeg"
  }
}

# Response: Server-Sent Events (SSE) stream
# Each event contains a chunk of the AI's response
# The AI can use tools to create/list/search recipes
# Image field is optional and supports recipe extraction from photos

# Image Requirements:
# - Max size: 5MB (frontend validation)
# - Supported formats: JPEG, PNG, GIF, WebP
# - Data must be base64-encoded without data URL prefix
# - Use for extracting recipes from handwritten notes or cookbook photos
```

Example with image:
```bash
# Extract recipe from image
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "This is my grandmas cookie recipe",
    "image": {
      "data": "'"$(base64 -i recipe-photo.jpg | tr -d '\n')"'",
      "media_type": "image/jpeg"
    }
  }'

# Text-only chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "Show me all my pasta recipes"
  }'
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
