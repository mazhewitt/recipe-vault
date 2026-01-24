# Recipe Vault

A recipe management system built with Rust, featuring both a REST API and Claude Desktop integration via the Model Context Protocol (MCP).

## Features

- **REST API**: Full CRUD operations for recipes via HTTP
- **Claude Desktop Integration**: Natural language recipe management through MCP
- **SQLite Database**: Lightweight, file-based storage
- **Recipe Management**: Store recipes with ingredients, cooking steps, prep/cook times, and servings
- **Unique Titles**: Automatic enforcement of unique recipe titles

## Architecture

Recipe Vault consists of two binaries:

1. **recipe-vault** - REST API server (Axum)
2. **recipe-vault-mcp** - MCP server for Claude Desktop (stdio/JSON-RPC 2.0)

Both share the same database and business logic.

## Prerequisites

- Rust 1.75+ (2024 edition)
- SQLite 3
- Claude Desktop (for MCP integration)

## Getting Started

### 1. Clone and Build

```bash
git clone <repository-url>
cd recipe-vault
cargo build --release
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
DATABASE_URL=sqlite://recipes.db
PORT=3000
```

### 3. Run Database Migrations

Migrations run automatically on server startup, creating the necessary tables.

## Using the REST API

### Start the REST API Server

```bash
cargo run --bin recipe-vault
```

The server will start on `http://localhost:3000`.

### API Endpoints

See [API.md](API.md) for complete API documentation with examples.

**Quick Examples:**

```bash
# Create a recipe
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Chocolate Chip Cookies",
    "description": "Classic homemade cookies",
    "servings": 24,
    "prep_time_minutes": 15,
    "cook_time_minutes": 12,
    "ingredients": [
      {"name": "flour", "quantity": 2.25, "unit": "cups"},
      {"name": "chocolate chips", "quantity": 2, "unit": "cups"}
    ],
    "steps": [
      {"instruction": "Preheat oven to 375°F", "temperature_value": 190, "temperature_unit": "celsius"},
      {"instruction": "Mix dry ingredients"},
      {"instruction": "Bake for 10-12 minutes", "duration_minutes": 12}
    ]
  }'

# List all recipes
curl http://localhost:3000/api/recipes

# Get specific recipe
curl http://localhost:3000/api/recipes/{recipe-id}
```

## Using with Claude Desktop

The MCP integration allows you to manage recipes using natural language through Claude Desktop.

### 1. Build the MCP Server

```bash
cargo build --release --bin recipe-vault-mcp
```

The binary will be created at `target/release/recipe-vault-mcp`.

### 2. Configure Claude Desktop

Find your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the MCP server configuration:

```json
{
  "mcpServers": {
    "recipe-vault": {
      "command": "/absolute/path/to/recipe-vault/target/release/recipe-vault-mcp",
      "env": {
        "DATABASE_URL": "sqlite:///absolute/path/to/recipe-vault/recipes.db"
      }
    }
  }
}
```

**Important**: Use absolute paths, not relative paths.

### 3. Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

### 4. Verify Integration

In Claude Desktop, you should see the Recipe Vault tools available. You can verify by asking:

> "What recipe tools do you have available?"

Claude should list four tools: `list_recipes`, `get_recipe`, `create_recipe`, and `delete_recipe`.

### Example Usage

Once configured, you can interact with your recipes naturally:

**List recipes:**
> "Show me all my recipes"

**Get recipe details:**
> "Show me the recipe for Chocolate Chip Cookies"

**Create a new recipe:**
> "Create a recipe for banana bread with these ingredients: 3 ripe bananas, 2 cups flour, 1 cup sugar, 2 eggs, 1/2 cup butter. The steps are: mash bananas, mix wet ingredients, add dry ingredients, pour into pan, bake at 350°F for 60 minutes."

**Search for recipes:**
> "List all recipes" (Claude will show all recipes and you can ask follow-up questions)

## Available MCP Tools

### list_recipes

Lists all recipes in the database with ID, title, and description.

**Parameters:** None

**Returns:** Array of recipe summaries

### get_recipe

Retrieves complete details for a specific recipe including all ingredients and steps.

**Parameters:**
- `recipe_id` (string, required): The UUID of the recipe

**Returns:** Full recipe with ingredients and steps

### create_recipe

Creates a new recipe with ingredients and cooking steps.

**Parameters:**
- `title` (string, required): Recipe title (must be unique)
- `description` (string, required): Brief description
- `servings` (integer, optional): Number of servings
- `prep_time_minutes` (integer, optional): Preparation time
- `cook_time_minutes` (integer, optional): Cooking time
- `ingredients` (array, optional): List of ingredients with name, quantity, unit, notes
- `steps` (array, optional): Cooking instructions with instruction, duration_minutes, temperature_celsius

**Returns:** Created recipe with generated ID

### delete_recipe

Deletes a recipe by ID. Permanently removes the recipe and all associated data (ingredients and steps).

**Parameters:**
- `recipe_id` (string, required): The UUID of the recipe to delete

**Returns:** Success message

## Docker Deployment

You can run Recipe Vault using Docker, which simplifies setup by including all dependencies and binaries in a single image.

### 1. Build the Image
```bash
docker build -t mazhewitt/recipe-vault .
```

### 2. Run API Server with Docker Compose
```bash
docker compose up -d
```
The server will be available at `http://localhost:3000`. Data is persisted in a Docker volume named `recipe-data`.

### 3. Push to Docker Hub
```bash
docker push mazhewitt/recipe-vault
```

### 4. Running the MCP Server via Docker

**Method 1: If API Server is Running (Recommended)**
If you are already running the API server with Docker Compose (step 2), the best way to run the MCP server is to execute it inside the running container. This avoids file locking issues with the SQLite database.

```json
{
  "mcpServers": {
    "recipe-vault": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "recipe-vault-api-1",
        "recipe-vault-mcp"
      ]
    }
  }
}
```

**Method 2: Standalone Container**
If you are *not* running the API server, or if you need to run it in a separate container (ensure the API server is stopped to avoid locks):

```json
{
  "mcpServers": {
    "recipe-vault": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "recipe-vault_recipe-data:/app/data",
        "mazhewitt/recipe-vault",
        "recipe-vault-mcp"
      ]
    }
  }
}
```
**Note**: Ensure the volume name (`recipe-vault_recipe-data`) matches the one created by Docker Compose. You can check your volumes with `docker volume ls`.

### 5. Running Docker Tests
You can run the automated end-to-end test for the Docker setup:
```bash
./tests/docker_test.sh
```
This will build the image, start the API server, verify functionality, and clean up.

## Development

### Run Tests

```bash
# Run all tests
cargo test

# Run specific test suite
cargo test --test recipes_test      # REST API tests
cargo test --test mcp_server_test   # MCP protocol tests
cargo test --lib                    # Unit tests
```

### Test Coverage

- **13 REST API integration tests** - Testing HTTP endpoints and database operations
- **14 MCP integration tests** - Testing JSON-RPC protocol and tool handlers
- **5 MCP unit tests** - Testing tool schema definitions

### Project Structure

```
recipe-vault/
├── src/
│   ├── bin/
│   │   └── recipe_vault_mcp.rs    # MCP server binary
│   ├── db/
│   │   ├── connection.rs          # Database connection
│   │   └── queries.rs             # Database queries
│   ├── handlers/
│   │   └── recipes.rs             # HTTP handlers
│   ├── mcp/
│   │   ├── protocol.rs            # JSON-RPC types
│   │   ├── server.rs              # MCP server loop
│   │   └── tools.rs               # Tool definitions and handlers
│   ├── models/
│   │   ├── recipe.rs              # Recipe models
│   │   ├── ingredient.rs          # Ingredient models
│   │   └── step.rs                # Step models
│   ├── config.rs                  # Configuration
│   ├── error.rs                   # Error types
│   ├── lib.rs                     # Library exports
│   └── main.rs                    # REST API server
├── migrations/                     # Database migrations
├── tests/                          # Integration tests
└── openspec/                       # Specification documents
```

## Troubleshooting

### MCP Server Not Loading

1. Check Claude Desktop logs for errors
2. Verify absolute paths in configuration
3. Ensure the binary is executable: `chmod +x target/release/recipe-vault-mcp`
4. Test the binary manually: `echo '{"test": true}' | ./target/release/recipe-vault-mcp`

### Database Errors

1. Ensure the database directory exists
2. Check file permissions
3. Verify DATABASE_URL in .env or Claude Desktop config

### Port Already in Use

Change the PORT in your `.env` file to an available port.

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]
