## Why

Claude Desktop provides powerful features through its MCP server (web browsing, image recognition, etc.) that enhance the recipe management experience. Currently, the MCP server needs to be configured to connect to the production Recipe Vault instance running on the NAS (192.168.1.9) so that both Claude Desktop and the main recipe chat application share the same recipe database, ensuring consistency across all interfaces.

## What Changes

- Configure the MCP server to connect to the remote production Recipe Vault instance at 192.168.1.9
- Update Claude Desktop MCP configuration to use the remote endpoint instead of a local instance
- Ensure proper network connectivity and authentication between Claude Desktop and the NAS-hosted Recipe Vault
- Document the configuration process for future reference

## Capabilities

### New Capabilities
- `mcp-remote-connection`: Configuration and setup for MCP server to connect to a remote Recipe Vault instance over the local network

### Modified Capabilities
<!-- Leave empty - this is a new configuration, not modifying existing spec-level requirements -->

## Impact

- Claude Desktop MCP server configuration files
- MCP server connection/endpoint settings
- Network configuration (ensure 192.168.1.9 is accessible from the laptop)
- Potentially authentication/API token configuration for remote access
