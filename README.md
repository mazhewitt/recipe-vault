# Recipe Vault

A recipe management system built with Rust, featuring both a REST API and Claude Desktop integration via the Model Context Protocol (MCP).

## Features

- **REST API**: Full CRUD operations for recipes via HTTP
- **Claude Desktop Integration**: Natural language recipe management through MCP
- **SQLite Database**: Lightweight, file-based storage
- **Recipe Management**: Store recipes with ingredients, cooking steps, prep/cook times, and servings
- **Unique Titles**: Automatic enforcement of unique recipe titles
- **Remote Access**: Run API server on one machine, use MCP from another
- **API Key Authentication**: Secure API access with auto-generated keys
- **Web Chat Interface**: Browser-based chat with AI assistant (Claude/OpenAI)

## Web Chat Interface

Recipe Vault includes a web-based chat interface that lets you manage recipes through natural language conversation, just like Claude Desktop but in your browser.

### Setup

1. **Set your Anthropic API key** in `.env`:
   ```
   ANTHROPIC_API_KEY=your-anthropic-api-key-here
   AI_MODEL=claude-sonnet-4-5  # Optional, defaults to claude-sonnet-4-5
   ```

2. **Build and run** the server:
   ```bash
   cargo build --release
   ./target/release/recipe-vault
   ```

3. **Open** `http://localhost:3000/chat` in your browser

4. **Enter your API key** when prompted (the Recipe Vault API key, not Anthropic)

### Features

- **Real-time streaming** - Responses stream as they're generated
- **Tool use indicators** - See when the AI is searching or creating recipes
- **Conversation context** - Follow-up questions understand previous context
- **Mobile responsive** - Works on phones and tablets
- **Model agnostic** - Supports both Anthropic Claude and OpenAI (configure via `AI_MODEL`)

### Example Conversations

> "What recipes do I have?"

> "Show me the chocolate chip cookies recipe"

> "Create a new recipe for banana bread with 3 bananas, 2 cups flour, and 1 cup sugar"

> "How long does it take to make?" (follows up on previous recipe)

## Architecture

Recipe Vault consists of two binaries:

1. **recipe-vault** - REST API server (Axum) with SQLite database
2. **recipe-vault-mcp** - MCP server for Claude Desktop (stdio/JSON-RPC 2.0)

The MCP server communicates with the API server via HTTP, enabling remote usage scenarios:

```
┌─────────────────┐       HTTP        ┌─────────────────────────────┐
│  MCP Server     │ ───────────────▶  │  Docker Container           │
│  (local binary) │                   │  ┌─────────────────────┐   │
│                 │                   │  │  API Server         │   │
│  stdio ↕        │                   │  │  (recipe-vault)     │   │
│                 │                   │  └──────────┬──────────┘   │
└─────────────────┘                   │             │              │
        ↕                             │  ┌──────────▼──────────┐   │
┌─────────────────┐                   │  │  SQLite             │   │
│ Claude Desktop  │                   │  │  /app/data/         │   │
└─────────────────┘                   │  └─────────────────────┘   │
                                      └─────────────────────────────┘
```

## Prerequisites

- Rust 1.75+ (2024 edition)
- SQLite 3
- Claude Desktop (for MCP integration)
- Docker (for containerized deployment)

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

## API Key Authentication

The API server uses API key authentication to protect all `/api/*` endpoints.

### How It Works

1. **First startup**: The server automatically generates a 32-character hex API key
2. **Key storage**: The key is saved to `/app/data/.api_key` (in the Docker volume)
3. **Key display**: On first generation, the key is printed to stdout - save it immediately!
4. **Subsequent startups**: The key is loaded from file and not displayed again

### Getting Your API Key

**First time setup:**
```bash
# Start the API server
docker run -p 3000:3000 -v recipe-data:/app/data mazhewitt/recipe-vault

# The API key will be printed once:
# ========================================
# NEW API KEY GENERATED
# ========================================
# API Key: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
# ========================================
# Save this key! You will need it to configure
# the MCP server in Claude Desktop.
# ========================================
```

**If you need to retrieve your key later:**
```bash
docker exec <container-name> cat /app/data/.api_key
```

**To generate a new key:**
```bash
docker exec <container-name> rm /app/data/.api_key
# Then restart the container
```

### Using the API Key

Include the `X-API-Key` header in all requests:
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/recipes
```

Without the header or with an invalid key, you'll receive:
```json
{"error": "Missing API key. Include X-API-Key header."}
```

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
# Set your API key
export API_KEY="your-api-key-here"

# Create a recipe
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
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
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/recipes

# Get specific recipe
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/recipes/{recipe-id}
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
        "API_BASE_URL": "http://localhost:3000",
        "API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**For remote API server** (e.g., running on another machine):

```json
{
  "mcpServers": {
    "recipe-vault": {
      "command": "/absolute/path/to/recipe-vault/target/release/recipe-vault-mcp",
      "env": {
        "API_BASE_URL": "http://192.168.1.100:3000",
        "API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Important**:
- Use absolute paths for the command, not relative paths.
- The `API_KEY` must match the key generated by the API server (see [API Key Authentication](#api-key-authentication)).

### 3. Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

### 4. Verify Integration

In Claude Desktop, you should see the Recipe Vault tools available. You can verify by asking:

> "What recipe tools do you have available?"

Claude should list five tools: `list_recipes`, `get_recipe`, `create_recipe`, `update_recipe`, and `delete_recipe`.

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

### update_recipe

Updates an existing recipe. Supports partial updates or full replacement of ingredients/steps.

**Parameters:**
- `recipe_id` (string, required): The UUID of the recipe to update
- `title` (string, optional): New recipe title
- `description` (string, optional): New description
- `servings` (integer, optional): New number of servings
- `prep_time_minutes` (integer, optional): New prep time
- `cook_time_minutes` (integer, optional): New cook time
- `ingredients` (array, optional): New list of ingredients (replaces all existing)
- `steps` (array, optional): New cooking instructions (replaces all existing)

**Returns:** Updated recipe

### delete_recipe

Deletes a recipe by ID. Permanently removes the recipe and all associated data (ingredients and steps).

**Parameters:**
- `recipe_id` (string, required): The UUID of the recipe to delete

**Returns:** Success message

## Docker Deployment

You can run the Recipe Vault API server using Docker.

### 1. Build the Image
```bash
docker build -t mazhewitt/recipe-vault .
```

### 2. Run the API Server
```bash

```

The server will be available at `http://localhost:3000`. Data is persisted in a Docker volume named `recipe-data`.

### 3. Push to Docker Hub
```bash
docker push mazhewitt/recipe-vault
```

### 4. Remote Setup (e.g., Mac Studio as Server)

To run the API server on one machine (e.g., Mac Studio) and use Claude Desktop from another (e.g., laptop):

**On the server machine:**
```bash
docker run -d -p 3000:3000 -v recipe-data:/app/data mazhewitt/recipe-vault
```

**On the client machine:**
1. Build the MCP binary locally: `cargo build --release --bin recipe-vault-mcp`
2. Get the API key from the server (see [API Key Authentication](#api-key-authentication))
3. Configure Claude Desktop with the server's IP and API key:
```json
{
  "mcpServers": {
    "recipe-vault": {
      "command": "/path/to/recipe-vault-mcp",
      "env": {
        "API_BASE_URL": "http://<server-ip>:3000",
        "API_KEY": "your-api-key-here"
      }
    }
  }
}
```

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
cargo test --lib                    # Unit tests
```

### Test Coverage

- **13 REST API integration tests** - Testing HTTP endpoints and database operations
- **13 MCP/HTTP client unit tests** - Testing tool schemas and error mapping
- **5 Auth unit tests** - Testing API key generation and constant-time comparison

### Project Structure

```
recipe-vault/
├── src/
│   ├── ai/
│   │   ├── client.rs              # AI agent with MCP integration
│   │   ├── llm.rs                 # LLM provider abstraction (Anthropic/OpenAI)
│   │   └── mod.rs                 # AI module exports
│   ├── bin/
│   │   └── recipe_vault_mcp.rs    # MCP server binary
│   ├── db/
│   │   ├── connection.rs          # Database connection
│   │   └── queries.rs             # Database queries
│   ├── handlers/
│   │   ├── chat.rs                # Chat API with SSE streaming
│   │   ├── recipes.rs             # Recipe CRUD handlers
│   │   └── ui.rs                  # Web UI pages
│   ├── mcp/
│   │   ├── http_client.rs         # HTTP client for API calls
│   │   ├── protocol.rs            # JSON-RPC types
│   │   ├── server.rs              # MCP server loop
│   │   └── tools.rs               # Tool definitions and handlers
│   ├── models/
│   │   ├── recipe.rs              # Recipe models
│   │   ├── ingredient.rs          # Ingredient models
│   │   └── step.rs                # Step models
│   ├── auth.rs                    # API key authentication
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
4. Test that the API server is reachable from the MCP server machine

### API Server Unreachable

1. Ensure the API server is running: `curl http://localhost:3000/api/recipes`
2. Check firewall settings if accessing remotely
3. Verify the `API_BASE_URL` in Claude Desktop config

### Authentication Errors (401 Unauthorized)

1. Verify you have the correct API key from the server
2. Check that `API_KEY` is set in Claude Desktop config
3. Ensure the `X-API-Key` header is included in API requests
4. Retrieve the key from the server: `docker exec <container> cat /app/data/.api_key`

### Database Errors

1. Ensure the database directory exists (for local development)
2. Check file permissions
3. Verify DATABASE_URL in .env file

### Port Already in Use

Change the PORT in your `.env` file to an available port.

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]
