## 1. Database Migrations

- [x] 1.1 Create migration `YYYYMMDDHHMMSS_add_difficulty_to_recipes.sql` to add difficulty column (nullable INTEGER with CHECK constraint 1-5)
- [x] 1.2 Create migration `YYYYMMDDHHMMSS_add_system_flags.sql` to create system_flags table and insert difficulty_backfill_completed flag
- [x] 1.3 Test migrations against local database to verify schema changes
- [x] 1.4 Verify migration checksums are tracked by sqlx

## 2. AI Difficulty Assessment Module

- [x] 2.1 Create new module `src/ai/difficulty_assessment.rs` for AI rating logic
- [x] 2.2 Implement `assess_recipe_difficulty()` function that formats prompt and calls Claude API
- [x] 2.3 Add structured prompt template with rating criteria (1-5 scale with descriptions)
- [x] 2.4 Add response parsing logic to extract integer rating from AI response
- [x] 2.5 Add error handling for invalid AI responses (non-numeric, out of range)
- [x] 2.6 Add error handling for API failures (timeout, rate limit, unavailable)
- [x] 2.7 Add unit tests for prompt formatting and response parsing

## 3. Recipe Domain Updates

- [x] 3.1 Update `Recipe` struct in `src/domain/recipe.rs` to include `difficulty: Option<u8>` field
- [x] 3.2 Update `create_recipe()` to accept optional difficulty parameter
- [x] 3.3 Update `update_recipe()` to accept optional difficulty parameter
- [x] 3.4 Add validation for difficulty range (1-5) in create/update functions
- [x] 3.5 Update `get_recipe()` and `list_recipes()` to include difficulty in responses
- [x] 3.6 Update database queries to include difficulty column in SELECT statements

## 4. Auto-Assignment for New Recipes

- [x] 4.1 Update POST /api/recipes handler to check if difficulty is None after recipe creation
- [x] 4.2 If difficulty is None, spawn async task to assess and update difficulty
- [x] 4.3 Add logging for auto-assignment attempts and results
- [x] 4.4 Ensure auto-assignment failures don't block recipe creation response
- [x] 4.5 Test that user-specified difficulty skips auto-assignment

## 5. Backfill System

- [x] 5.1 Create new module `src/backfill/difficulty_backfill.rs` for backfill logic
- [x] 5.2 Implement `check_backfill_status()` to query system_flags table
- [x] 5.3 Implement `run_backfill()` async function to process recipes with NULL difficulty
- [x] 5.4 Add SQL query to select recipes WHERE difficulty IS NULL
- [x] 5.5 Add sequential processing loop with 100ms delay between recipes
- [x] 5.6 Add progress logging every 10 recipes processed
- [x] 5.7 Add error handling to continue processing on individual failures
- [x] 5.8 Update system_flags to set difficulty_backfill_completed = 'true' on completion
- [x] 5.9 Integrate backfill trigger in main server startup (spawn async task if flag is false)
- [x] 5.10 Add logging for backfill start, progress, and completion with counts

## 6. MCP Interface Extension

- [x] 6.1 Add `difficulty` field to `UpdateRecipeParams` struct in MCP server
- [x] 6.2 Update `update_recipe` tool schema to include difficulty parameter (type: integer, min: 1, max: 5)
- [x] 6.3 Update `update_recipe` tool handler to pass difficulty to API endpoint
- [x] 6.4 Add validation for difficulty range in tool parameter validation
- [x] 6.5 Update tool discovery response to include difficulty in update_recipe schema
- [x] 6.6 Test update_recipe tool with difficulty parameter via MCP

## 7. Frontend Updates

- [x] 7.1 Locate the template/component that displays recipe difficulty (currently hardcoded to 1)
- [x] 7.2 Update template to bind difficulty value from recipe data instead of hardcoded value
- [x] 7.3 Handle NULL difficulty display (show "Not rated" or empty circles)
- [ ] 7.4 Test difficulty display on recipe detail page
- [ ] 7.5 Verify circle UI correctly displays ratings 1-5

## 8. Web Chat Prompt Updates

- [x] 8.1 Update chat system prompt to include instructions for updating recipe difficulty
- [x] 8.2 Add examples showing how to use update_recipe tool with difficulty parameter
- [ ] 8.3 Test chat-based difficulty updates (e.g., "Make this recipe medium difficulty")

## 9. Testing & Validation

- [ ] 9.1 Test database migrations on copy of production database
- [x] 9.2 Test AI assessment with sample recipes (easy, medium, hard examples)
- [x] 9.3 Test backfill with multiple recipes in test database
- [x] 9.4 Test auto-assignment when creating recipes without difficulty
- [x] 9.5 Test user-specified difficulty prevents auto-assignment
- [ ] 9.6 Test difficulty updates via MCP tool (chat interface)
- [ ] 9.7 Test difficulty display in frontend (all ratings 1-5)
- [x] 9.8 Test error handling for invalid difficulty values
- [x] 9.9 Test backfill resumption after interruption (idempotency)
- [x] 9.10 Verify existing recipes without tests still function correctly

## 10. Deployment

- [ ] 10.1 Review CLAUDE.md deployment rules and verify compliance
- [ ] 10.2 Verify no secrets in staged files before committing
- [ ] 10.3 Test migrations against production database copy
- [ ] 10.4 Deploy migrations to production
- [ ] 10.5 Deploy backend code with backfill and AI assessment logic
- [ ] 10.6 Deploy frontend changes
- [ ] 10.7 Monitor backfill completion in production logs
- [ ] 10.8 Spot-check difficulty ratings on production recipes
- [ ] 10.9 Purge Cloudflare cache if difficulty display doesn't update
- [ ] 10.10 Verify API cost monitoring for backfill
