# Recipe Vault

A recipe management system built with Rust, featuring a REST API, Claude Desktop integration via MCP, and a web-based AI chat interface.

## Features

- **REST API**: Full CRUD operations for recipes via HTTP
- **Web Chat Interface**: Browser-based AI assistant for natural language recipe management
- **Image Recipe Extraction**: Paste images of handwritten or printed recipes to extract structured data using Claude's vision capabilities
- **Claude Desktop Integration**: Natural language recipe management through MCP
- **AI Difficulty Assessment**: Automatic recipe difficulty ratings (1-5 scale) based on ingredients, techniques, and complexity
- **SQLite Database**: Lightweight, file-based storage
- **Recipe Management**: Store recipes with ingredients, cooking steps, prep/cook times, servings, and difficulty ratings
- **Multi-Model Support**: Works with Anthropic Claude and OpenAI models
- **API Key Authentication**: Secure API access with auto-generated keys
- **Remote Access**: Run API server on one machine, access from anywhere

## Architecture

Recipe Vault provides three ways to interact with your recipes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Recipe Vault                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Web Browser   │    │  Claude Desktop │    │   REST Client   │         │
│  │   /chat         │    │                 │    │   curl/Postman  │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                   │
│           │ HTTP/SSE             │ stdio                │ HTTP              │
│           ▼                      ▼                      ▼                   │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    recipe-vault (API Server)                     │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │       │
│  │  │ Chat Handler│  │ MCP Client  │  │    Recipe Handlers      │ │       │
│  │  │ /api/chat   │  │ (spawns MCP)│  │    /api/recipes/*       │ │       │
│  │  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │       │
│  │         │                │                      │               │       │
│  │         ▼                ▼                      ▼               │       │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    AI Agent Layer                            │   │   │
│  │  │  • Anthropic Claude API    • MCP Tool Execution             │   │   │
│  │  │  • OpenAI API              • Conversation Management        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                      │   │
│  │                              ▼                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │                    Database Layer (SQLite + SQLx)             │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              recipe-vault-mcp (Standalone MCP Server)            │       │
│  │  • JSON-RPC over stdio        • HTTP client to API server       │       │
│  │  • 5 recipe tools             • For Claude Desktop integration  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Binary | Purpose |
|--------|---------|
| `recipe-vault` | Main API server with REST endpoints, web chat UI, and embedded AI agent |
| `recipe-vault-mcp` | Standalone MCP server for Claude Desktop (communicates with API via HTTP) |

## Quick Start

### 1. Clone and Build

```bash
git clone <repository-url>
cd recipe-vault
cargo build --release
```

### 2. Configure Environment

Create a `.env` file:

```bash
# Required for web chat
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional
DATABASE_URL=sqlite://recipes.db
PORT=3000
AI_MODEL=claude-sonnet-4-5  # or gpt-4o for OpenAI
DEV_USER_EMAIL=test@example.com  # For local development (simulates Cloudflare auth)
```

### 3. Run the Server

```bash
./target/release/recipe-vault
```

The server starts at `http://localhost:3000` with:
- **Web Chat**: `http://localhost:3000/chat`
- **REST API**: `http://localhost:3000/api/recipes`

## Web Chat Interface

The web chat provides a browser-based AI assistant for managing recipes through natural language.

### Authentication

The Web UI uses **Cloudflare Access** for authentication.

1.  **Production**: Identity is read from the `Cf-Access-Authenticated-User-Email` header provided by Cloudflare.
2.  **Local Development**: Set `DEV_USER_EMAIL` in your `.env` to simulate an authenticated user.

### Features

- **Single Sign-On** - Authenticate once via Google/Cloudflare and you're in
- **User Identity** - See who's logged in directly in the UI
- **Real-time streaming** - Responses stream as they're generated
- **Tool use indicators** - See when the AI is searching or creating recipes
- **Conversation context** - Follow-up questions understand previous context
- **Mobile responsive** - Works on phones and tablets

### Example Conversations

```
You: What recipes do I have?
AI: [Calls list_recipes] You have 3 recipes: Chocolate Chip Cookies,
    Banana Bread, and Pasta Carbonara.

You: Show me the banana bread
AI: [Calls get_recipe] Here's your Banana Bread recipe...

You: How long does it take to make?
AI: Based on the recipe, it takes 15 minutes prep and 60 minutes baking,
    so about 1 hour 15 minutes total.

You: Create a recipe for pancakes with flour, eggs, milk, and butter
AI: [Calls create_recipe] I've created a new Pancakes recipe for you...
```

## REST API

### Authentication

All `/api/*` endpoints require authentication.

1.  **API Key**: Include the `X-API-Key` header (Standard for API clients/MCP).
2.  **Cloudflare Identity**: Include valid Cloudflare Access headers (Standard for Web UI).

**First startup**: The server generates a 32-character API key and prints it to stdout.

```bash
# Retrieve key later (Docker)
docker exec <container> cat /app/data/.api_key

# Generate new key
docker exec <container> rm /app/data/.api_key && docker restart <container>
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recipes` | List all recipes |
| GET | `/api/recipes/:id` | Get recipe with ingredients and steps |
| POST | `/api/recipes` | Create a new recipe |
| PUT | `/api/recipes/:id` | Update a recipe |
| DELETE | `/api/recipes/:id` | Delete a recipe |

### Example

```bash
export API_KEY="your-api-key"

# Create a recipe
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "title": "Chocolate Chip Cookies",
    "description": "Classic homemade cookies",
    "servings": 24,
    "ingredients": [
      {"name": "flour", "quantity": 2.25, "unit": "cups"},
      {"name": "chocolate chips", "quantity": 2, "unit": "cups"}
    ],
    "steps": [
      {"instruction": "Preheat oven to 375°F"},
      {"instruction": "Mix ingredients"},
      {"instruction": "Bake for 12 minutes", "duration_minutes": 12}
    ]
  }'

# List recipes
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/recipes
```

See [API.md](API.md) for complete documentation.

## Claude Desktop Integration

Use natural language to manage recipes through Claude Desktop.

### Setup

1. Build the MCP server:
   ```bash
   cargo build --release --bin recipe-vault-mcp
   ```

2. Configure Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "recipe-vault": {
         "command": "/absolute/path/to/recipe-vault-mcp",
         "env": {
           "API_BASE_URL": "http://localhost:3500",
           "API_KEY": "your-api-key"
         }
       }
     }
   }
   ```

   > **Note**: Port 3500 is the API-only port that strips Cloudflare headers, ensuring MCP clients authenticate via API key only.

3. Restart Claude Desktop

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_recipes` | List all recipes with titles and descriptions |
| `get_recipe` | Get complete recipe details by ID |
| `create_recipe` | Create a new recipe with ingredients and steps |
| `update_recipe` | Update an existing recipe (partial or full) |
| `delete_recipe` | Delete a recipe by ID |

See [MCP.md](MCP.md) for detailed tool documentation.

## Deployment

### Synology NAS (Production)

For automated production deployment on Synology NAS, see the detailed **[Synology Deployment Guide](SYNOLOGY.md)**.

Features:
- **One-click install** via Container Manager (docker-compose)
- **Automatic Updates** via Watchtower
- **Persistent Storage** for your recipe database
- **Secure Secrets** management

### Docker (Quick Run)

For a quick test run on any machine with Docker:

```bash
docker run -d -p 3000:3000 \
  -v recipe-data:/app/data \
  -e ANTHROPIC_API_KEY=your-key \
  mazhewitt/recipe-vault:latest
```

### Automated Releases

Changes tagged with `v*` (e.g., `v1.0.0`) are automatically built and pushed to Docker Hub via GitHub Actions.

## Development

### Run Tests

```bash
# Rust tests
cargo test                          # All tests
cargo test --test recipes_test      # REST API integration tests
cargo test --test chat_test         # Chat endpoint tests
cargo test --lib                    # Unit tests

# End-to-end tests (Playwright)
cd tests/e2e
npm test                            # Run all e2e tests
npm test -- image-paste.spec.ts     # Run specific test file
```

### Test Coverage

| Category | Tests | Description |
|----------|-------|-------------|
| REST API | 13 | CRUD operations, validation, error handling |
| Chat | 10 | Authentication, SSE format, request handling |
| MCP Tools | 8 | Tool schemas, parameter validation |
| HTTP Client | 7 | Error mapping, client configuration |
| Auth | 5 | API key generation, constant-time comparison |
| Integration | 9 | Ignored by default, require running server |
| E2E (Playwright) | 31 | Chat interface, image paste, navigation, responsive |

**Total: 45 passing Rust tests + 9 integration tests + 31 passing e2e tests**

### Project Structure

```
recipe-vault/
├── src/
│   ├── ai/                        # AI agent layer
│   │   ├── client.rs              # AI agent with MCP tool execution
│   │   ├── llm.rs                 # LLM provider (Anthropic/OpenAI)
│   │   └── mod.rs
│   ├── bin/
│   │   └── recipe_vault_mcp.rs    # Standalone MCP server binary
│   ├── db/                        # Database layer
│   │   ├── connection.rs          # SQLite connection management
│   │   └── queries.rs             # Recipe CRUD operations
│   ├── handlers/                  # HTTP handlers
│   │   ├── chat.rs                # Chat API with SSE streaming
│   │   ├── recipes.rs             # Recipe REST endpoints
│   │   └── ui.rs                  # Web UI (chat page)
│   ├── mcp/                       # MCP protocol implementation
│   │   ├── http_client.rs         # HTTP client for API calls
│   │   ├── protocol.rs            # JSON-RPC 2.0 types
│   │   ├── server.rs              # MCP server message loop
│   │   └── tools.rs               # Tool definitions and handlers
│   ├── models/                    # Data models
│   │   ├── recipe.rs              # Recipe, CreateRecipeInput, etc.
│   │   ├── ingredient.rs          # Ingredient models
│   │   └── step.rs                # Step models
│   ├── auth.rs                    # API key authentication
│   ├── config.rs                  # Configuration from environment
│   ├── error.rs                   # Error types
│   ├── lib.rs                     # Library exports
│   └── main.rs                    # API server entry point
├── migrations/                    # SQLite migrations (auto-run)
├── tests/                         # Integration tests
│   ├── chat_test.rs               # Chat endpoint tests
│   ├── mcp_integration_test.rs    # MCP integration tests
│   ├── recipes_test.rs            # REST API tests
│   └── e2e/                       # End-to-end tests (Playwright)
│       ├── tests/
│       │   ├── chat.spec.ts       # Chat interface tests
│       │   ├── image-paste.spec.ts # Image paste tests
│       │   ├── navigation.spec.ts # Navigation tests
│       │   ├── recipe-display.spec.ts # Recipe display tests
│       │   └── responsive.spec.ts # Responsive layout tests
│       ├── playwright.config.ts
│       └── package.json
└── openspec/                      # Specifications and archives
```

## Troubleshooting

### Web Chat Not Working

1. Verify `ANTHROPIC_API_KEY` is set in `.env`
2. Check browser console for errors
3. Ensure you entered the correct Recipe Vault API key

### MCP Server Not Loading

1. Use absolute paths in Claude Desktop config
2. Verify binary is executable: `chmod +x target/release/recipe-vault-mcp`
3. Check Claude Desktop logs for errors
4. Test API is reachable: `curl -H "X-API-Key: your-key" http://localhost:3500/api/recipes`

### Authentication Errors (401)

1. Verify API key matches server's key
2. Include `X-API-Key` header in requests
3. Retrieve key: `docker exec <container> cat /app/data/.api_key`

### Database Errors

1. Check `DATABASE_URL` in `.env`
2. Verify write permissions on database directory
3. Migrations run automatically on startup

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]
