# MCP Tool Documentation

This document provides detailed information about the Model Context Protocol (MCP) tools available in Recipe Vault.

## Overview

Recipe Vault exposes five MCP tools that enable natural language interaction with your recipe database through Claude Desktop. These tools wrap the existing database operations and provide structured interfaces for recipe management.

The web chat interface (`/chat`) also includes a `display_recipe` tool for visual recipe rendering in the side panel. This tool is not part of the standalone MCP server but is documented here for completeness.

## Tools

### list_recipes

**Purpose:** Discover what recipes are available in your database. Returns recipe IDs that must be used with other tools. Returns recipe IDs that must be used with other tools.

**Parameters:** None

**Returns:** Object containing:
- `recipes` (array): Array of recipe objects with:
  - `recipe_id` (string): UUID of the recipe - **use this value for display_recipe, get_recipe, etc.**
  - `title` (string): Recipe title
  - `description` (string): Brief description
  - `prep_time_minutes` (integer, optional): Preparation time
  - `cook_time_minutes` (integer, optional): Cooking time
  - `servings` (integer, optional): Number of servings
- `note` (string): Reminder to use exact recipe_id values
- `created_at` (string): Timestamp when recipe was created
- `updated_at` (string): Timestamp when recipe was last modified

**Example Prompts:**
- "Show me all my recipes"
- "What recipes do I have?"
- "List all recipes"
- "What can I cook?"

**Example Response:**
```json
{
  "recipes": [
    {
      "recipe_id": "abc-123-def-456",
      "title": "Chocolate Chip Cookies",
      "description": "Classic homemade cookies",
      "prep_time_minutes": 15,
      "cook_time_minutes": 12,
      "servings": 24
    },
    {
      "recipe_id": "xyz-789-uvw-012",
      "title": "Banana Bread",
      "description": "Moist and delicious banana bread",
      "prep_time_minutes": 15,
      "cook_time_minutes": 60,
      "servings": 8
    }
  ],
  "note": "Use the exact recipe_id values above when calling display_recipe or get_recipe. Do not fabricate IDs."
}
```

**Error Scenarios:**
- Database connection error → Returns internal error with message

---

### get_recipe

**Purpose:** Retrieve complete details for a specific recipe including all ingredients and cooking steps.

**Parameters:**
- `recipe_id` (string, required): The UUID of the recipe to retrieve

**Returns:** Complete recipe object with:
- All fields from list_recipes, plus:
- `prep_time_minutes` (integer, optional): Preparation time
- `cook_time_minutes` (integer, optional): Cooking time
- `servings` (integer, optional): Number of servings
- `ingredients` (array): List of ingredient objects with:
  - `id` (string): Ingredient UUID
  - `recipe_id` (string): Parent recipe UUID
  - `position` (integer): Order in ingredient list
  - `name` (string): Ingredient name
  - `quantity` (number, optional): Amount needed
  - `unit` (string, optional): Measurement unit
  - `notes` (string, optional): Additional preparation notes
- `steps` (array): List of step objects with:
  - `id` (string): Step UUID
  - `recipe_id` (string): Parent recipe UUID
  - `position` (integer): Order in step sequence
  - `instruction` (string): What to do
  - `duration_minutes` (integer, optional): How long this step takes
  - `temperature_value` (integer, optional): Temperature setting
  - `temperature_unit` (string, optional): Temperature unit (celsius/fahrenheit)

**Example Prompts:**
- "Show me the recipe for Chocolate Chip Cookies"
- "Get the banana bread recipe"
- "What are the ingredients for [recipe name]?"
- "How do I make [recipe name]?"

**Example Response:**
```json
{
  "id": "abc-123-def-456",
  "title": "Chocolate Chip Cookies",
  "description": "Classic homemade cookies",
  "prep_time_minutes": 15,
  "cook_time_minutes": 12,
  "servings": 24,
  "created_at": "2024-01-24T10:30:00Z",
  "updated_at": "2024-01-24T10:30:00Z",
  "ingredients": [
    {
      "id": "ing-001",
      "recipe_id": "abc-123-def-456",
      "position": 0,
      "name": "all-purpose flour",
      "quantity": 2.25,
      "unit": "cups",
      "notes": null
    },
    {
      "id": "ing-002",
      "recipe_id": "abc-123-def-456",
      "position": 1,
      "name": "chocolate chips",
      "quantity": 2,
      "unit": "cups",
      "notes": "semi-sweet or dark"
    }
  ],
  "steps": [
    {
      "id": "step-001",
      "recipe_id": "abc-123-def-456",
      "position": 0,
      "instruction": "Preheat oven to 375°F",
      "duration_minutes": null,
      "temperature_value": 190,
      "temperature_unit": "celsius"
    },
    {
      "id": "step-002",
      "recipe_id": "abc-123-def-456",
      "position": 1,
      "instruction": "Mix dry ingredients in a large bowl",
      "duration_minutes": 3,
      "temperature_value": null,
      "temperature_unit": null
    },
    {
      "id": "step-003",
      "recipe_id": "abc-123-def-456",
      "position": 2,
      "instruction": "Bake until edges are golden brown",
      "duration_minutes": 12,
      "temperature_value": null,
      "temperature_unit": null
    }
  ]
}
```

**Error Scenarios:**
- Recipe not found → Returns error code -32001 with "Recipe not found: {id}" message
- Invalid UUID format → Returns error code -32602 with "Missing or invalid recipe_id parameter"
- Database error → Returns error code -32603 with "Database error: {details}"

**Follow-up Interactions:**

After getting a recipe, you can ask Claude:
- "What substitutions can I make for [ingredient]?"
- "How can I adapt this for [dietary restriction]?"
- "What wine would pair with this?"
- "Can I make this ahead of time?"
- "How do I store leftovers?"

Claude will use the recipe context to provide relevant answers.

---

### create_recipe

**Purpose:** Add a new recipe to your database with ingredients and cooking instructions.

**Parameters:**
- `title` (string, required): Recipe title - must be unique
- `description` (string, required): Brief description of the recipe
- `servings` (integer, optional): Number of servings this recipe makes
- `prep_time_minutes` (integer, optional): Time needed for preparation
- `cook_time_minutes` (integer, optional): Time needed for cooking
- `ingredients` (array, optional): List of ingredients, each with:
  - `name` (string, required): Name of the ingredient
  - `quantity` (number, optional): Amount needed
  - `unit` (string, optional): Measurement unit (cups, tbsp, grams, etc.)
  - `notes` (string, optional): Preparation notes (e.g., "finely chopped")
- `steps` (array, optional): Cooking instructions in order, each with:
  - `instruction` (string, required): What to do
  - `duration_minutes` (integer, optional): How long this step takes
  - `temperature_celsius` (integer, optional): Temperature for this step in Celsius

**Returns:** The created recipe with all fields populated, including:
- Generated UUID (`id`)
- Timestamps (`created_at`, `updated_at`)
- All ingredients with positions and IDs
- All steps with positions and IDs

**Example Prompts:**

*Simple recipe:*
> "Create a recipe called 'Scrambled Eggs' with description 'Quick breakfast'"

*Detailed recipe:*
> "Create a recipe for banana bread. It serves 8, takes 15 minutes prep and 60 minutes to bake. Ingredients: 3 ripe bananas, 2 cups flour, 1 cup sugar, 2 eggs, 1/2 cup melted butter, 1 tsp baking soda. Steps: Preheat oven to 350°F, mash bananas, mix wet ingredients, add dry ingredients, pour into greased pan, bake for 60 minutes."

*From a description:*
> "Save this recipe: [paste recipe text from website or book]"

**Validation Rules:**

1. **Title must be unique** - Cannot create recipe with same title as existing recipe
2. **Title required** - Cannot be empty
3. **Description required** - Cannot be empty
4. **Servings must be positive** - If provided, must be > 0
5. **Ingredient names required** - Each ingredient must have a name
6. **Step instructions required** - Each step must have an instruction

**Example Response:**
```json
{
  "id": "new-uuid-generated",
  "title": "Banana Bread",
  "description": "Moist and delicious banana bread",
  "prep_time_minutes": 15,
  "cook_time_minutes": 60,
  "servings": 8,
  "created_at": "2024-01-24T15:45:00Z",
  "updated_at": "2024-01-24T15:45:00Z",
  "ingredients": [
    {
      "id": "ing-new-001",
      "recipe_id": "new-uuid-generated",
      "position": 0,
      "name": "ripe bananas",
      "quantity": 3,
      "unit": null,
      "notes": null
    },
    {
      "id": "ing-new-002",
      "recipe_id": "new-uuid-generated",
      "position": 1,
      "name": "all-purpose flour",
      "quantity": 2,
      "unit": "cups",
      "notes": null
    }
  ],
  "steps": [
    {
      "id": "step-new-001",
      "recipe_id": "new-uuid-generated",
      "position": 0,
      "instruction": "Preheat oven to 350°F",
      "duration_minutes": null,
      "temperature_value": 177,
      "temperature_unit": "celsius"
    },
    {
      "id": "step-new-002",
      "recipe_id": "new-uuid-generated",
      "position": 1,
      "instruction": "Mash bananas in a bowl",
      "duration_minutes": 3,
      "temperature_value": null,
      "temperature_unit": null
    }
  ]
}
```

**Error Scenarios:**
- Duplicate title → Error code -32002: "Recipe with title '{title}' already exists"
- Missing title → Error code -32602: "Missing or invalid title parameter"
- Missing description → Error code -32602: "Missing or invalid description parameter"
- Invalid servings → Error code -32602: "Servings must be greater than 0"
- Ingredient missing name → Error code -32602: "Ingredient {index} missing name"
- Step missing instruction → Error code -32602: "Step {index} missing instruction"
- Database error → Error code -32603: "Database error: {details}"

---

### update_recipe

**Purpose:** Modify an existing recipe. Supports partial updates (change just the title) or full replacement of ingredients and steps.

**Parameters:**
- `recipe_id` (string, required): The UUID of the recipe to update
- `title` (string, optional): New recipe title
- `description` (string, optional): New description
- `servings` (integer, optional): New number of servings
- `prep_time_minutes` (integer, optional): New preparation time
- `cook_time_minutes` (integer, optional): New cooking time
- `ingredients` (array, optional): New list of ingredients (replaces ALL existing ingredients)
- `steps` (array, optional): New cooking instructions (replaces ALL existing steps)

**Returns:** The updated recipe with all fields

**Example Prompts:**
- "Change the title of my pancake recipe to 'Fluffy Pancakes'"
- "Update the banana bread to serve 12 instead of 8"
- "Add chocolate chips to the cookie recipe ingredients"
- "Change the baking time in the bread recipe to 45 minutes"

**Example Response:**
```json
{
  "id": "abc-123-def-456",
  "title": "Fluffy Pancakes",
  "description": "Light and fluffy breakfast pancakes",
  "prep_time_minutes": 10,
  "cook_time_minutes": 15,
  "servings": 4,
  "created_at": "2024-01-24T10:30:00Z",
  "updated_at": "2024-01-25T09:15:00Z",
  "ingredients": [...],
  "steps": [...]
}
```

**Important Notes:**
- Only fields you specify will be updated
- If you provide `ingredients`, ALL existing ingredients are replaced (not merged)
- If you provide `steps`, ALL existing steps are replaced (not merged)
- To add an ingredient, you must get the current recipe, add to the list, and update with the full list

**Error Scenarios:**
- Recipe not found → Returns error code -32001 with "Recipe not found: {id}" message
- Invalid UUID format → Returns error code -32602 with "Missing or invalid recipe_id parameter"
- Duplicate title → Returns error code -32002 with "Recipe with title '{title}' already exists"

---

### delete_recipe

**Purpose:** Delete a recipe by ID. Permanently removes the recipe and all associated data (ingredients and steps).

**Parameters:**
- `recipe_id` (string, required): The UUID of the recipe to delete

**Returns:** Success message with status and ID

**Example Prompts:**
- "Delete the banana bread recipe"
- "Remove the recipe with ID [uuid]"

**Example Response:**
```json
{
  "status": "success",
  "message": "Recipe 123-abc deleted"
}
```

**Error Scenarios:**
- Recipe not found → Returns error code -32001 with "Recipe not found: {id}" message
- Invalid UUID format → Returns error code -32602 with "Missing or invalid recipe_id parameter"

---

### display_recipe (Web Chat Only)

**Purpose:** Renders a recipe in the visual side panel of the web chat interface. This tool is only available in the web chat (`/chat`) and is not part of the standalone MCP server.

**Note:** This is a "native" tool handled directly by the chat backend, not an MCP tool. It exists to signal when the AI should visually display a recipe to the user.

**Parameters:**
- `recipe_id` (string, optional): The exact UUID from `list_recipes`. Use this if you have it.
- `title` (string, optional): The recipe title to search for. Use this if you don't have the exact `recipe_id`.

At least one parameter should be provided. If `title` is provided, the system performs a case-insensitive fuzzy search to find the matching recipe.

**Behavior:**
1. The backend emits a `recipe_artifact` SSE event to the frontend
2. The frontend fetches the full recipe from `/api/recipes/:id`
3. The recipe is displayed in a persistent side panel
4. The AI provides a brief summary in the chat

**Example Prompts:**
- "Show me the scrambled eggs recipe"
- "Display the chicken curry"
- "I want to cook the banana bread"

**When Claude Uses This Tool:**
- When a user asks to "see", "show", "display", or "view" a recipe
- When a user says they want to "cook" or "make" a recipe
- When providing recipe details that should be visually presented

**Why This Tool Exists:**
The chat window is for conversation. The side panel is for structured recipe data. This separation keeps the chat readable while providing a rich recipe viewing experience.

---

## Natural Language Tips

### Discovery
Start conversations by asking what recipes you have:
> "What recipes do I have?"

Then follow up with specific requests:
> "Show me the pancake recipe"

### Creating Recipes

**Method 1: Conversational**
> "I want to save a recipe for pasta carbonara"

Claude will prompt you for details, making it easy to create recipes interatively.

**Method 2: Complete Description**
> "Create a recipe for [name] with these ingredients: [...] and these steps: [...]"

**Method 3: From External Source**
> "Save this recipe: [paste recipe from website]"

Claude will parse the text and structure it appropriately.

### Recipe Modifications

**Updating recipes:**
> "Change the pancake recipe to serve 6 instead of 4"
> "Update the cookie recipe with a new title: 'Grandma's Cookies'"
> "Add 1 cup of walnuts to the banana bread ingredients"

**Getting suggestions (doesn't modify):**
> "Show me the chocolate chip cookie recipe"
> "How can I make these cookies vegan?"
> "What if I don't have brown sugar?"

### Meal Planning

List recipes and ask for suggestions:
> "What recipes do I have?"
> "What can I make for dinner tonight that takes less than 30 minutes?"

Claude will review your recipes and make recommendations based on your criteria.

## JSON-RPC Error Codes

All tools return standard JSON-RPC 2.0 error codes:

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse error | Invalid JSON received |
| -32600 | Invalid request | JSON-RPC structure invalid |
| -32601 | Method not found | Tool name doesn't exist |
| -32602 | Invalid params | Missing required parameter or wrong type |
| -32603 | Internal error | Database or server error |
| -32001 | Not found (custom) | Recipe doesn't exist |
| -32002 | Conflict (custom) | Duplicate recipe title |

### 2. Configure Claude Desktop

Edit your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "recipe-vault": {
      "command": "/absolute/path/to/recipe-vault-mcp",
      "env": {
        "API_BASE_URL": "http://localhost:3000",
        "API_KEY": "your-api-key",
        "DEFAULT_AUTHOR_EMAIL": "your-email@example.com"
      }
    }
  }
}
```

**Optional Environment Variables:**
- `DEFAULT_AUTHOR_EMAIL`: Email address to attribute recipes created via MCP. If not set, MCP-created recipes will have null authors.

#### Remote Setup (e.g., Synology NAS)

If your Recipe Vault API is running on a remote server like a Synology NAS, update the `env` section in the config above:

1.  **Get the API Key from the NAS:**
    ```bash
    # Run via SSH on your Synology
    sudo docker exec recipe-vault cat /app/data/.api_key
    ```
2.  **Update Config:**
    - `API_BASE_URL`: Change to `http://<your-nas-ip>:3000`
    - `API_KEY`: Paste the key retrieved in step 1
    - `DEFAULT_AUTHOR_EMAIL`: (Optional) Your email address for recipe attribution

3.  **Restart Claude Desktop.**

### 3. Restart Claude Desktop

## Testing Your Setup

### 1. Verify Tools Are Loaded

Ask Claude:
> "What recipe tools do you have available?"

Expected response: Claude lists the five tools (list_recipes, get_recipe, create_recipe, update_recipe, delete_recipe)

### 2. Test Empty Database

> "List all recipes"

Expected: Empty list or message indicating no recipes

### 3. Create First Recipe

> "Create a simple recipe for toast"

Expected: Recipe created with generated ID

### 4. List Recipes Again

> "List my recipes"

Expected: Shows the toast recipe

### 5. Get Recipe Details

> "Show me the toast recipe"

Expected: Full recipe with all details

### 6. Update a Recipe

> "Change the toast recipe to serve 2 people"

Expected: Recipe updated with new servings value

### 7. Test Error Handling

> "Create another recipe called toast"

Expected: Error about duplicate title

## Debugging

### Check MCP Server Logs

The MCP server logs to stderr. To see logs, you can run it manually:

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | ./target/release/recipe-vault-mcp 2>&1
```

You should see:
- Server startup logs
- Request processing logs
- Response sent confirmation

### Common Issues

**Tools not appearing:**
- Check Claude Desktop config has correct absolute paths
- Restart Claude Desktop after config changes
- Verify binary is executable

**"Recipe not found" errors:**
- Use list_recipes to get valid recipe IDs
- Recipe IDs are UUIDs, not titles

**Duplicate title errors:**
- Recipe titles must be unique
- Delete or rename existing recipe first

**Database errors:**
- Check DATABASE_URL points to writable location
- Verify database file permissions
- Check disk space

## Advanced Usage

### Batch Operations

You can ask Claude to perform multiple operations:

> "List all my dessert recipes and tell me which ones are quick to make"

Claude will:
1. Call list_recipes
2. Analyze the results
3. Call get_recipe for recipes that might be desserts
4. Compare prep/cook times
5. Provide a curated list

### Recipe Analysis

> "What ingredients appear most often in my recipes?"

Claude will:
1. Get all recipes
2. Analyze ingredient lists
3. Provide frequency statistics

### Smart Search

Since list_recipes returns all recipes, Claude can filter and search for you:

> "Find recipes that use chicken"
> "Show me vegetarian recipes"
> "What can I make with the ingredients I have?"

Claude will retrieve recipes and analyze them based on your criteria.

## Future Enhancements

Potential future tools:
- `search_recipes` - Server-side search by keywords
- `start_cooking_session` - Interactive cooking guidance
- `import_recipe_from_url` - Extract recipes from websites

See the openspec/specs/ directory for capability specifications.
