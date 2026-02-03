## Context

Recipe Vault is currently deployed in two parts: the main API server running on a Synology NAS (192.168.1.9) and the standalone MCP server intended for use with Claude Desktop. Currently, the MCP server defaults to local communication. To leverage the full power of Claude Desktop while maintaining a single source of truth (the NAS database), the MCP server must be configured to connect remotely.

## Goals / Non-Goals

**Goals:**
- Establish stable network connectivity between local Claude Desktop and remote Recipe Vault API.
- Secure the connection using the existing API Key authentication.
- Document the setup process so it can be replicated on other local machines.

**Non-Goals:**
- Implementing new authentication methods (e.g., OAuth).
- Setting up a VPN or remote proxy (limited to local network for now).
- Changing the MCP protocol or tool definitions.

## Decisions

### Decision: Reuse Standalone MCP Binary

**Choice:** Use the existing `recipe-vault-mcp` binary built on the local machine.

**Rationale:** The binary is already built and contains all the logic for communicating with the API via HTTP. No code changes are required, only environment variable configuration.

### Decision: Environment Variable Injection via Claude Config

**Choice:** Configure `API_BASE_URL` and `API_KEY` directly in `claude_desktop_config.json`.

**Rationale:** This is the standard way to configure MCP servers in Claude Desktop. It keeps the configuration isolated to the tool and avoids polluting the global environment.

### Decision: Static IP for Synology

**Choice:** Target the specific static IP `192.168.1.9`.

**Rationale:** The NAS is already established at this address. For a home network setup, using the IP is simpler than setting up local DNS/mDNS if it's already fixed.

## Risks / Trade-offs

**[Risk] Network Latency** → The local network is fast enough that the overhead for MCP tool calls will be negligible compared to LLM processing time.

**[Risk] API Key Exposure** → The API key will be stored in plaintext in the Claude Desktop configuration file. Since this is on the user's local filesystem and the source repo is public, this is an acceptable trade-off for a home project.

**[Risk] NAS IP Change** → If the NAS IP changes (DHCP lease), the MCP server will fail. Mitigation: Document how to update the IP in the config.
