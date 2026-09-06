## MODIFIED Requirements

### Requirement: List Recipes via MCP

The system SHALL expose recipe listing through an MCP tool that Claude Desktop can invoke, including each recipe's tags.

#### Scenario: List all recipes
- GIVEN the MCP server is running
- WHEN Claude Desktop calls the `list_recipes` tool
- THEN all recipes in the database are returned
- AND each recipe includes id, title, description and tags
- AND the response is valid JSON

#### Scenario: List recipes from empty database
- GIVEN the database has no recipes
- WHEN Claude Desktop calls the `list_recipes` tool
- THEN an empty array is returned
- AND no error occurs

#### Scenario: Untagged recipe in list
- GIVEN a recipe with no tags
- WHEN Claude Desktop calls the `list_recipes` tool
- THEN that recipe's `tags` is an empty array

### Requirement: Create Recipe via MCP

The system SHALL expose recipe creation through an MCP tool that accepts recipe details, including optional tags, and returns the created recipe.

#### Scenario: Create recipe with minimal fields
- GIVEN a valid title "Simple Pasta" and description
- WHEN Claude Desktop calls `create_recipe` with title and description
- THEN a new recipe is created
- AND a UUID is generated
- AND the created recipe is returned
- AND created_at timestamp is set
- AND tags are assigned automatically in the background

#### Scenario: Create recipe with full details
- GIVEN a complete recipe with title, description, ingredients, steps, and tags
- WHEN Claude Desktop calls `create_recipe` with all fields
- THEN a new recipe is created with all details
- AND ingredients are stored with correct positions
- AND steps are stored with correct positions
- AND the supplied tags are stored normalised
- AND the complete recipe is returned

#### Scenario: Create recipe with duplicate title
- GIVEN a recipe exists with title "Chocolate Cake"
- WHEN Claude Desktop calls `create_recipe` with title "Chocolate Cake"
- THEN a JSON-RPC error is returned
- AND the error code is -32002 (conflict)
- AND the error message indicates the title already exists

#### Scenario: Create recipe with missing required field
- GIVEN a recipe request without a title
- WHEN Claude Desktop calls `create_recipe` without the title parameter
- THEN a JSON-RPC error is returned
- AND the error code is -32602 (invalid params)
- AND the error message indicates which field is missing

#### Scenario: Create recipe with invalid servings
- GIVEN a recipe request with servings = -5
- WHEN Claude Desktop calls `create_recipe` with invalid servings
- THEN a JSON-RPC error is returned
- AND the error code is -32602 (invalid params)
- AND the error message indicates invalid servings value

#### Scenario: Create recipe with invalid tags
- GIVEN a recipe request whose `tags` contains a value that fails normalisation
- WHEN Claude Desktop calls `create_recipe`
- THEN a JSON-RPC error is returned
- AND the error code is -32602 (invalid params)
- AND the error message names the offending tag
- AND no recipe is created

### Requirement: Update Recipe via MCP

The system SHALL expose recipe updating through an MCP tool that accepts recipe ID and fields to update, including difficulty and tags.

#### Scenario: Update recipe difficulty via MCP
- **WHEN** Claude calls `update_recipe` with recipe_id and difficulty (1-5)
- **THEN** the recipe's difficulty is updated in the database
- **AND** the updated recipe is returned
- **AND** updated_at timestamp is refreshed

#### Scenario: Update multiple fields including difficulty
- **WHEN** Claude calls `update_recipe` with recipe_id, title, and difficulty
- **THEN** both title and difficulty are updated
- **AND** other fields remain unchanged
- **AND** the complete updated recipe is returned

#### Scenario: Update recipe with invalid difficulty
- **WHEN** Claude calls `update_recipe` with difficulty outside range 1-5
- **THEN** a JSON-RPC error is returned
- **AND** the error code is -32602 (invalid params)
- **AND** the error message indicates valid difficulty range is 1-5
- **AND** no changes are persisted

#### Scenario: Update recipe that doesn't exist
- **WHEN** Claude calls `update_recipe` with an invalid recipe_id
- **THEN** a JSON-RPC error is returned
- **AND** the error code is -32001 (not found)
- **AND** the error message indicates the recipe was not found

#### Scenario: Update recipe in different family
- **WHEN** USER_EMAIL is configured (scoped mode)
- **AND** Claude calls `update_recipe` for a recipe created by a different family
- **THEN** a JSON-RPC error is returned
- **AND** the error code is -32001 (not found)
- **AND** the recipe details are not disclosed

#### Scenario: Update recipe in god mode
- **WHEN** USER_EMAIL is NOT configured (god mode)
- **AND** Claude calls `update_recipe` for any recipe
- **THEN** the recipe is updated regardless of which family created it
- **AND** the updated recipe is returned

#### Scenario: Update recipe tags via MCP
- **WHEN** Claude calls `update_recipe` with recipe_id and `tags: ["dessert", "french"]`
- **THEN** the recipe's tags are replaced with `["dessert", "french"]`
- **AND** the updated recipe including `tags` is returned
- **AND** updated_at timestamp is refreshed

#### Scenario: Update recipe without tags parameter
- **WHEN** Claude calls `update_recipe` without a `tags` parameter
- **THEN** the recipe's existing tags are unchanged

#### Scenario: Update recipe with invalid tags
- **WHEN** Claude calls `update_recipe` with a tag that fails normalisation
- **THEN** a JSON-RPC error is returned
- **AND** the error code is -32602 (invalid params)
- **AND** no changes are persisted

#### Scenario: Tool schema declares tags
- **WHEN** Claude Desktop discovers tools
- **THEN** `create_recipe` and `update_recipe` both declare an optional `tags` array-of-strings parameter
- **AND** the description states that `main` marks a main course and `dessert` marks a sweet
