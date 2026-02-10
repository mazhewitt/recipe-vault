## Why

Recipes currently display a hardcoded difficulty rating of "1" (Easy), providing no useful information to users. Users need accurate, AI-assessed difficulty ratings to help them choose appropriate recipes based on their skill level and available time.

## What Changes

- **One-time backfill**: On first application startup, Claude analyzes all existing recipes lacking a difficulty rating and assigns appropriate ratings (1-5 scale)
- **Auto-assignment for new recipes**: When a user saves a new recipe without specifying difficulty, Claude automatically assigns a rating based on technique complexity, ingredient count, steps, and timing
- **User override via chat**: Users can request difficulty updates through the chat interface (e.g., "Make this recipe medium difficulty")
- **UI display**: Recipe detail view displays the actual difficulty rating instead of the hardcoded "1"
- **Persistent tracking**: A flag prevents re-running the backfill after initial completion

## Capabilities

### New Capabilities
- `recipe-difficulty-rating`: AI-powered difficulty assessment system that analyzes recipes and assigns ratings on a 1-5 scale (1=Easy, 2=Medium-Easy, 3=Medium, 4=Medium-Hard, 5=Hard)
- `difficulty-backfill`: One-time migration system that processes existing recipes without difficulty ratings on application startup

### Modified Capabilities
- `recipe-domain`: Add `difficulty` field (optional u8, 1-5) to Recipe data type, update create/update endpoints to accept difficulty parameter
- `mcp-interface`: Extend existing `update_recipe` MCP tool to accept optional difficulty parameter for user-driven updates via chat

## Impact

**Database:**
- New migration to add `difficulty` column to `recipes` table (nullable, 1-5 constraint)
- New migration to add `difficulty_backfill_completed` flag to track one-time migration status

**Backend:**
- New startup routine to check backfill flag and process recipes if needed
- Recipe save flow modified to invoke Claude for difficulty assignment when not user-specified
- Extend existing `update_recipe` MCP tool handler to accept difficulty parameter
- AI prompting logic to analyze recipe complexity

**Frontend:**
- Recipe detail UI updated to display actual difficulty value from database instead of hardcoded "1"
- Existing circle-based difficulty display remains unchanged (no new UI components)

**Related Systems:**
- MCP interface tool definition extended (update_recipe gains difficulty parameter)
- Chat system prompt updated to include difficulty update capability
