## 1. Configuration Schema

- [x] 1.1 Add `McpServerConfig` struct to `src/ai/client.rs` with fields: name, command, args, env (HashMap<String, String>)
- [x] 1.2 Update `AiAgentConfig` to replace single mcp_binary_path with `mcp_servers: Vec<McpServerConfig>`
- [x] 1.3 Remove deprecated fields from `AiAgentConfig` (mcp_binary_path, api_base_url, api_key, user_email)
- [x] 1.4 Update `AiAgentConfig::default()` to return empty mcp_servers Vec

## 2. AiAgent Core Refactor

- [x] 2.1 Add `name: String` field to `McpProcess` struct
- [x] 2.2 Replace `mcp_process: Arc<Mutex<Option<McpProcess>>>` with `mcp_processes: Arc<Mutex<HashMap<String, McpProcess>>>`
- [x] 2.3 Add `tool_registry: Arc<Mutex<HashMap<String, String>>>` field to `AiAgent` struct (maps tool name → server name)
- [x] 2.4 Update `AiAgent::new()` to initialize empty HashMap for mcp_processes and tool_registry

## 3. Server Spawning and Initialization

- [x] 3.1 Create `spawn_mcp_server(&self, config: &McpServerConfig) -> Result<McpProcess, AiError>` method
- [x] 3.2 Update `start()` to iterate through `config.mcp_servers` and spawn each server sequentially
- [x] 3.3 Rename `initialize_mcp()` to `initialize_mcp_server(&self, server_name: &str)` for per-server init
- [x] 3.4 Update initialization to call initialize_mcp_server for each spawned server
- [x] 3.5 Update `stop()` to iterate through all processes in HashMap and kill each

## 4. Tool Registry and Routing

- [x] 4.1 Rename `fetch_tools()` to `fetch_tools_from_server(&self, server_name: &str)` to fetch from one server
- [x] 4.2 Update start() to call fetch_tools_from_server for each server and build registry
- [x] 4.3 Add logic to populate tool_registry: for each tool, insert (tool_name, server_name) entry
- [x] 4.4 Add duplicate tool name detection: log warning if tool name already exists in registry
- [x] 4.5 Add native tool "display_recipe" to registry with server_name "native"
- [x] 4.6 Rename `call_mcp()` to `call_mcp_server(&self, server_name: &str, method: &str, params: Value)`
- [x] 4.7 Update call_mcp_server to look up server by name in mcp_processes HashMap
- [x] 4.8 Update `execute_tool()` to look up tool name in tool_registry to determine target server
- [x] 4.9 Update execute_tool() to call call_mcp_server with the resolved server name
- [x] 4.10 Add error handling in execute_tool for unknown tools (not in registry)

## 5. ChatState Configuration

- [x] 5.1 Update `ChatState::new()` in `src/handlers/chat.rs` to build McpServerConfig for recipes server
- [x] 5.2 Create McpServerConfig for recipes server with command, args, and env (API_BASE_URL, API_KEY, USER_EMAIL)
- [x] 5.3 Create McpServerConfig for fetch server with command "uvx", args ["mcp-server-fetch"], empty env
- [x] 5.4 Update AiAgentConfig creation to pass vec![recipes_config, fetch_config] as mcp_servers
- [x] 5.5 Remove old mcp_binary_path, api_base_url, api_key, user_email fields from AiAgentConfig instantiation

## 6. System Prompt Update

- [x] 6.1 Add "Fetching Recipes from URLs" section to system_prompt in `src/handlers/chat.rs`
- [x] 6.2 Document fetch tool usage: call fetch with URL parameter
- [x] 6.3 Document workflow: fetch → extract recipe from markdown → create_recipe → display_recipe
- [x] 6.4 Add guidance on handling non-recipe URLs (inform user, suggest alternatives)

## 7. Docker Infrastructure

- [x] 7.1 Add `RUN apk add --no-cache python3 py3-pip` to Dockerfile
- [x] 7.2 Add `RUN pip3 install --no-cache-dir uv` to Dockerfile
- [x] 7.3 Verify uvx is available by adding `RUN uvx --version` test command to Dockerfile

## 8. Local Testing

- [x] 8.1 Test that both servers start successfully when AiAgent initializes
- [x] 8.2 Verify tool_registry contains tools from both servers (list_recipes, get_recipe, create_recipe, update_recipe, delete_recipe, fetch)
- [x] 8.3 Test recipe tool call routes to recipes server (e.g., create_recipe)
- [x] 8.4 Test fetch tool call routes to fetch server
- [x] 8.5 Test complete URL-to-recipe workflow: fetch URL → extract → create → display
- [x] 8.6 Test error handling for unknown tool name
- [x] 8.7 Test error handling for unreachable URL in fetch tool
- [x] 8.8 Verify both servers shut down cleanly when AiAgent stops

## 9. Integration Testing

- [x] 9.1 Test with real recipe URL (e.g., AllRecipes, NYT Cooking) to verify fetch and extraction
- [x] 9.2 Verify fetched recipe is saved to database with correct fields
- [x] 9.3 Verify display_recipe shows the newly saved recipe in UI
- [x] 9.4 Test with non-recipe URL and verify Claude handles gracefully
- [x] 9.5 Test existing recipe functionality still works (list, create, update, delete)
