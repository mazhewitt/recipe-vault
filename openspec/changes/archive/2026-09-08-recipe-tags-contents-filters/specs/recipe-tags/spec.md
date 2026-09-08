## ADDED Requirements

### Requirement: Tag Storage

The system SHALL store recipe tags as a global, case-insensitive vocabulary in a `tags` table linked to recipes through a `recipe_tags` many-to-many table.

#### Scenario: Tag rows are shared by name
- **WHEN** two recipes are tagged `main`
- **THEN** exactly one `tags` row named `main` exists
- **AND** both recipes have a `recipe_tags` row pointing at it

#### Scenario: Tag names are unique ignoring case
- **WHEN** a tag named `Main` is requested and a tag `main` already exists
- **THEN** no second `tags` row is created
- **AND** the recipe is linked to the existing `main` tag

#### Scenario: Deleting a recipe removes its tag links
- **WHEN** a recipe with tags is deleted
- **THEN** its `recipe_tags` rows are removed by cascade
- **AND** the `tags` rows themselves remain available for other recipes

#### Scenario: Tags are not family-scoped
- **WHEN** a recipe in family A and a recipe in family B are both tagged `vegetarian`
- **THEN** they share the same `tags` row
- **AND** each family still only sees its own recipes when listing or filtering by tag

### Requirement: Tag Normalisation

The system SHALL normalise every tag name before storing or comparing it, and SHALL reject requests containing tags that cannot be normalised.

#### Scenario: Casing and whitespace are normalised
- **WHEN** a tag is supplied as `"  Gluten Free "`
- **THEN** it is stored and returned as `gluten free`

#### Scenario: Internal whitespace is collapsed
- **WHEN** a tag is supplied as `"slow   cooker"`
- **THEN** it is stored as `slow cooker`

#### Scenario: Invalid characters are rejected
- **WHEN** a create or update request includes a tag containing characters outside `[a-z0-9 -]` after normalisation (for example `"main!"` or `"dessert/pudding"`)
- **THEN** the request is rejected with a validation error naming the offending tag
- **AND** no changes are made

#### Scenario: Length bounds
- **WHEN** a tag normalises to an empty string or to more than 30 characters
- **THEN** the request is rejected with a validation error
- **AND** no changes are made

#### Scenario: Duplicates are collapsed
- **WHEN** a request supplies `["Main", "main", " MAIN "]`
- **THEN** the recipe is stored with the single tag `main`

#### Scenario: At most ten tags per recipe
- **WHEN** a request supplies more than 10 distinct tags after normalisation
- **THEN** the request is rejected with a validation error indicating the maximum of 10
- **AND** no changes are made

### Requirement: Tags in the REST API

The system SHALL expose tags as a `tags` array of strings on recipe responses and accept `tags` on create and update requests.

#### Scenario: Create recipe with tags
- **WHEN** `POST /api/recipes` is called with `tags: ["Dessert", "italian"]`
- **THEN** the recipe is created with tags `["dessert", "italian"]`
- **AND** the response includes `tags` sorted alphabetically
- **AND** no AI tag assessment is triggered

#### Scenario: Create recipe without tags
- **WHEN** `POST /api/recipes` is called without `tags` or with an empty array
- **THEN** the recipe is created with no tags
- **AND** the response includes `tags: []`
- **AND** AI tag assessment is triggered in the background

#### Scenario: List recipes includes tags
- **WHEN** `GET /api/recipes` is called
- **THEN** every recipe in the response includes a `tags` array (empty when the recipe has none)

#### Scenario: Get recipe includes tags
- **WHEN** `GET /api/recipes/:id` is called
- **THEN** the response includes the recipe's `tags` array sorted alphabetically

#### Scenario: Update replaces tags
- **WHEN** `PUT /api/recipes/:id` is called with `tags: ["main", "thai"]` on a recipe tagged `["dessert"]`
- **THEN** the recipe's tags become `["main", "thai"]`
- **AND** `updated_at` and `updated_by` are refreshed
- **AND** other recipe data is unchanged

#### Scenario: Update without tags leaves them unchanged
- **WHEN** `PUT /api/recipes/:id` is called without a `tags` field
- **THEN** the recipe's existing tags are unchanged

#### Scenario: Update with an empty array clears tags
- **WHEN** `PUT /api/recipes/:id` is called with `tags: []`
- **THEN** the recipe has no tags afterwards

#### Scenario: Invalid tags return 400
- **WHEN** a create or update request includes an invalid tag
- **THEN** a 400 Bad Request response is returned with the validation message
- **AND** no recipe data is created or changed

#### Scenario: Shared recipe page includes tags
- **WHEN** a recipe is fetched through its share token
- **THEN** the response includes the recipe's `tags`

### Requirement: Tags via MCP

The MCP `create_recipe` and `update_recipe` tools SHALL accept an optional `tags` array, and `list_recipes` SHALL return each recipe's tags.

#### Scenario: Tool schemas declare tags
- **WHEN** tools are discovered
- **THEN** `create_recipe` and `update_recipe` each declare an optional `tags` parameter of type array of strings
- **AND** the parameter description names `main` for main courses and `dessert` for sweets

#### Scenario: Create via MCP with tags
- **WHEN** `create_recipe` is called with `tags: ["main", "curry"]`
- **THEN** the recipe is created with those tags and they appear in the returned recipe

#### Scenario: Update via MCP replaces tags
- **WHEN** `update_recipe` is called with `recipe_id` and `tags: ["dessert"]`
- **THEN** the recipe's tags are replaced with `["dessert"]`
- **AND** the updated recipe is returned

#### Scenario: Invalid tags via MCP
- **WHEN** `create_recipe` or `update_recipe` is called with a tag that fails normalisation
- **THEN** a JSON-RPC error with code -32602 (invalid params) is returned
- **AND** no changes are persisted

#### Scenario: List via MCP includes tags
- **WHEN** `list_recipes` is called
- **THEN** each recipe object includes a `tags` array

### Requirement: AI Tag Assessment

The system SHALL invoke the configured LLM provider to assign tags to a recipe from its content, using a structured prompt and a fixed course vocabulary.

#### Scenario: Prompt includes recipe context and vocabulary
- **WHEN** a recipe is assessed for tags
- **THEN** the prompt includes the title, description, timing, servings, ingredients and steps
- **AND** asks for a JSON array of 1–5 lowercase tags containing exactly one course tag from `main`, `side`, `dessert`, `breakfast`, `snack`, `drink`, `sauce`, `bread`
- **AND** allows an optional cuisine tag and optional diet tags (e.g. `vegetarian`, `vegan`, `gluten-free`)

#### Scenario: Successful tag assignment
- **WHEN** the provider returns a valid JSON array such as `["main", "indian", "vegetarian"]`
- **THEN** each tag is normalised and the recipe's tags are set to the result

#### Scenario: Tolerant parsing
- **WHEN** the provider wraps the array in code fences or leading prose
- **THEN** the array is still extracted and parsed
- **AND** elements that fail normalisation are dropped
- **AND** at most 5 tags are kept

#### Scenario: Missing course tag
- **WHEN** the parsed array contains no tag from the course vocabulary
- **THEN** the assessment is treated as a failure
- **AND** the recipe's tags are left unchanged
- **AND** the error is logged with the recipe ID

#### Scenario: Provider failure
- **WHEN** the provider is unavailable or returns an error
- **THEN** the error is logged with the recipe ID
- **AND** the recipe's tags are left unchanged

#### Scenario: Mock provider returns fixed tags
- **WHEN** the application runs with the mock LLM provider
- **THEN** tag assessment returns `["main", "curry"]`

### Requirement: Auto-Assignment of Tags for New Recipes

The system SHALL automatically tag recipes that are created without tags, without blocking the create response.

#### Scenario: Create without tags triggers assessment
- **WHEN** a recipe is created via `POST /api/recipes` with no tags
- **THEN** a background task assesses the recipe after the create transaction commits
- **AND** stores the assigned tags without changing `updated_by`

#### Scenario: Create with tags skips assessment
- **WHEN** a recipe is created with one or more tags
- **THEN** no AI assessment is invoked

#### Scenario: Assessment failure does not block creation
- **WHEN** the background assessment fails
- **THEN** the create request has already returned 201 with `tags: []`
- **AND** the recipe remains untagged
- **AND** the user is not shown an error

#### Scenario: Assessment reuses the difficulty provider configuration
- **WHEN** tag assessment builds its LLM provider
- **THEN** it uses the same provider and model configured for difficulty assessment
- **AND** no additional configuration keys are required

### Requirement: Course Tag Vocabulary

The system SHALL treat `main` and `dessert` as the fixed tag names behind the contents Mains and Sweets tabs, and SHALL state them wherever tags are described to a user or model.

#### Scenario: Chat prompt names the course tags
- **WHEN** the chat system prompt is built
- **THEN** it lists the course vocabulary and states that `main` and `dessert` drive the Mains and Sweets tabs

#### Scenario: Tag chips on the recipe page
- **WHEN** a recipe with tags is displayed
- **THEN** up to three tags render as muted chips at the end of the meta line
- **AND** a recipe without tags shows no chips

#### Scenario: Chat request to change a course
- **WHEN** the user says a displayed recipe is a pudding
- **THEN** the model calls `update_recipe` with the recipe's current tags with the course tag replaced by `dessert`
