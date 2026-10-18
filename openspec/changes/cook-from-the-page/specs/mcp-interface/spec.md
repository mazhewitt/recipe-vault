## ADDED Requirements

### Requirement: Set the page's servings via MCP

The system SHALL expose a page tool `set_servings` that sets the servings the open recipe's page shows. It SHALL make no database write and SHALL NOT change the saved recipe.

#### Scenario: Tool discovery lists set_servings
- **WHEN** a client requests the available tools
- **THEN** `set_servings` is listed after `start_timer`, with a JSON Schema whose only property is `servings` (`"type": "integer"`, `"minimum": 1`, `"maximum": 24`), which is required
- **AND** its description says it changes what the page shows for tonight and never the saved recipe, and that `update_recipe` is for saving

#### Scenario: Valid call
- **WHEN** the model calls `set_servings` with `{"servings": 6}`
- **THEN** the tool returns a result carrying `"servings": 6` and a confirmation message
- **AND** no request is made to the recipes API (the `ApiClient` is not used)

#### Scenario: Integer-valued float accepted
- **WHEN** the model calls `set_servings` with `{"servings": 6.0}`
- **THEN** the tool returns `"servings": 6`

#### Scenario: Invalid servings rejected
- **WHEN** the model calls `set_servings` with servings missing, 0, 25, -2, 2.5 or a string
- **THEN** a JSON-RPC error with code -32602 (invalid params) is returned and no event is emitted
