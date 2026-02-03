## 1. Discovery and Verification

- [x] 1.1 Verify network connectivity to the remote Recipe Vault API at `http://192.168.1.9:3000`
- [x] 1.2 Retrieve the current API Key from the NAS instance (e.g., via `docker exec recipe-vault cat /app/data/.api_key`)
- [x] 1.3 Confirm the local standalone MCP binary exists and is executable at `target/release/recipe-vault-mcp`

## 2. Configuration

- [x] 2.1 Update `~/Library/Application Support/Claude/claude_desktop_config.json` with the new remote settings
- [x] 2.2 Configure `API_BASE_URL` to `http://192.168.1.9:3000`
- [x] 2.3 Configure `API_KEY` with the key retrieved from the NAS
- [x] 2.4 Ensure the `command` path in the config points correctly to the local MCP binary

## 3. Verification and Documentation

- [x] 3.1 Restart Claude Desktop and verify the `recipe-vault` MCP server is active
- [x] 3.2 Test a simple tool call (e.g., `list_recipes`) to verify remote connectivity
- [x] 3.3 Update the project `MCP.md` or `SYNOLOGY.md` to document the remote setup procedure
