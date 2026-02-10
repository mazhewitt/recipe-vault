## ADDED Requirements

### Requirement: Multiple MCP Server Management
The system SHALL support spawning and managing multiple MCP server processes concurrently. Each server SHALL be identified by a unique name and run as an independent child process communicating via stdin/stdout.

#### Scenario: Start multiple servers successfully
- **WHEN** AiAgent starts with configuration for two servers ("recipes" and "fetch")
- **THEN** both server processes SHALL be spawned and initialized
- **AND** both servers SHALL respond to JSON-RPC initialization handshake

#### Scenario: Server process tracking
- **WHEN** multiple servers are running
- **THEN** system SHALL maintain separate process handles for each server by name
- **AND** each server SHALL have independent request ID sequencing

### Requirement: Tool Registration and Discovery
The system SHALL aggregate tools from all running MCP servers and maintain a registry mapping each tool name to its originating server.

#### Scenario: Aggregate tools from multiple servers
- **WHEN** AiAgent initializes with recipes server (5 tools) and fetch server (1 tool)
- **THEN** system SHALL expose all 6 tools to Claude API
- **AND** tool definitions SHALL include tools from both servers

#### Scenario: Build tool-to-server mapping
- **WHEN** servers report their tool lists during initialization
- **THEN** system SHALL create registry entry for each tool name pointing to its server
- **AND** native tools (display_recipe) SHALL be mapped to "native" pseudo-server

#### Scenario: Handle duplicate tool names
- **WHEN** two servers define tools with the same name
- **THEN** system SHALL log a warning
- **AND** later server's tool definition SHALL override earlier one in registry

### Requirement: Tool Call Routing
The system SHALL route each tool call from Claude to the correct MCP server based on the tool registry.

#### Scenario: Route to correct server
- **WHEN** Claude calls "create_recipe" tool
- **THEN** system SHALL look up tool in registry to find "recipes" server
- **AND** system SHALL send tools/call JSON-RPC message to recipes server process
- **AND** result SHALL be returned to Claude

#### Scenario: Route to native tool
- **WHEN** Claude calls "display_recipe" tool
- **THEN** system SHALL detect "native" pseudo-server in registry
- **AND** system SHALL execute native handler code directly without MCP call

#### Scenario: Unknown tool call
- **WHEN** Claude calls a tool name not in registry
- **THEN** system SHALL return error "Unknown tool: {name}"
- **AND** error SHALL be returned to Claude in tool result

### Requirement: Server Configuration Schema
The system SHALL accept configuration for multiple MCP servers including command, arguments, and environment variables for each server.

#### Scenario: Configure server with environment variables
- **WHEN** recipes server is configured with API_KEY and USER_EMAIL env vars
- **THEN** server process SHALL inherit those environment variables
- **AND** variables SHALL not leak to other server processes

#### Scenario: Configure server command and args
- **WHEN** fetch server is configured with command "uvx" and args ["mcp-server-fetch"]
- **THEN** system SHALL spawn process with correct command and arguments
- **AND** process SHALL communicate via stdin/stdout

### Requirement: Startup and Shutdown Lifecycle
The system SHALL start all configured servers during initialization and stop all servers during shutdown.

#### Scenario: Sequential server startup
- **WHEN** AiAgent starts with multiple servers
- **THEN** servers SHALL be started sequentially (not in parallel)
- **AND** initialization SHALL fail if any server fails to start

#### Scenario: Graceful shutdown
- **WHEN** AiAgent stops
- **THEN** all running server processes SHALL be terminated
- **AND** process handles SHALL be cleaned up

#### Scenario: Lazy initialization
- **WHEN** chat request arrives before servers are started
- **THEN** system SHALL automatically start all servers before processing request
- **AND** subsequent requests SHALL reuse running servers
