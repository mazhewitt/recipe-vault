## Context

Recipe Vault currently displays a hardcoded difficulty rating of "1" (Easy) for all recipes. The application uses:
- **Backend**: Rust/Actix-web with SQLx for database access (SQLite)
- **Frontend**: Vanilla JavaScript with server-side templates
- **AI**: Claude API for chat interactions and recipe analysis via MCP
- **Database**: SQLite with migration checksums tracked by sqlx

Current constraints (from CLAUDE.md):
- NEVER modify existing migrations (sqlx checksums)
- Database at `/app/data/recipes.db` in production
- Migration format: `YYYYMMDDHHMMSS_description.sql`

## Goals / Non-Goals

**Goals:**
- Provide accurate AI-assessed difficulty ratings (1-5 scale) for all recipes
- One-time backfill of existing recipes without blocking startup
- Auto-assign difficulty for new recipes when user doesn't specify
- Allow users to override difficulty via chat
- Store difficulty ratings persistently in the database

**Non-Goals:**
- User-facing difficulty editing UI (chat-only for now)
- Historical tracking of difficulty changes
- Per-user difficulty ratings (system-wide only)
- Difficulty-based filtering/search (can be added later)

## Decisions

### Decision 1: Difficulty Scale (1-5 numeric)

**Chosen**: Store as `INTEGER CHECK(difficulty >= 1 AND difficulty <= 5)` in SQLite

**Rationale**:
- Simple numeric scale is database-friendly and easy to query
- Maps clearly to UI representations (stars, labels, etc.)
- Claude can reliably output a single integer

**Alternatives considered**:
- String enum ("easy", "medium", "hard") - requires more complex validation
- 1-10 scale - too granular, harder for users and AI to differentiate

**Scale mapping**:
- 1 = Easy (simple techniques, few ingredients, < 30 min)
- 2 = Medium-Easy (basic techniques, moderate ingredients)
- 3 = Medium (intermediate techniques, multiple steps)
- 4 = Medium-Hard (advanced techniques, timing-sensitive)
- 5 = Hard (complex techniques, many steps, precision required)

### Decision 2: Backfill Strategy (Async startup task)

**Chosen**: Run backfill as async task during application startup, don't block server readiness

**Rationale**:
- Large recipe collections could take several minutes to process
- Application should be available for requests during backfill
- Users can continue using the app while backfill completes in background
- Backfill errors shouldn't prevent app startup

**Implementation**:
1. Check `difficulty_backfill_completed` flag on startup
2. If false, spawn async tokio task to process recipes
3. Server starts normally (non-blocking)
4. Task processes recipes in batches (e.g., 10 at a time)
5. Set flag to true when complete

**Alternatives considered**:
- Blocking startup until complete - unacceptable for large collections
- Manual migration script - requires separate deployment step
- Lazy backfill (on-demand) - complexity in tracking what's been processed

### Decision 3: AI Invocation Points

**Chosen**: Three distinct invocation paths with different prompting:

1. **Backfill (bulk assessment)**:
   - Prompt: "Analyze this recipe and rate difficulty 1-5 based on: technique complexity, ingredient count, number of steps, timing precision. Return only the number."
   - Context: Full recipe (title, ingredients, steps, timing)
   - Invoked: Startup backfill task

2. **New recipe auto-assignment**:
   - Prompt: Same as backfill
   - Context: Full recipe data from save request
   - Invoked: POST /api/recipes handler (if difficulty is None)

3. **User override via chat**:
   - Prompt: "The user wants to update the difficulty for recipe '{title}'. Validate the requested difficulty (1-5) and confirm."
   - Context: Current recipe, user message
   - Invoked: Existing MCP tool `update_recipe` with difficulty parameter

**Rationale**:
- Separates concerns (bulk processing vs. single recipe)
- Allows different error handling strategies
- Chat path validates user intent before updating

**Alternatives considered**:
- Single unified prompt for all paths - less control over behavior
- Client-side difficulty assignment - unreliable, requires API key exposure

### Decision 4: Database Schema

**Chosen**: Two migrations

**Migration 1**: Add difficulty column
```sql
ALTER TABLE recipes ADD COLUMN difficulty INTEGER;
ALTER TABLE recipes ADD CONSTRAINT check_difficulty
  CHECK (difficulty IS NULL OR (difficulty >= 1 AND difficulty <= 5));
```

**Migration 2**: Add backfill tracking
```sql
CREATE TABLE IF NOT EXISTS system_flags (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO system_flags (key, value) VALUES ('difficulty_backfill_completed', 'false');
```

**Rationale**:
- Nullable difficulty allows gradual rollout
- CHECK constraint enforces data integrity at database level
- Separate system_flags table is reusable for future one-time migrations
- Two migrations keeps changes atomic and reversible

**Alternatives considered**:
- Single migration with both changes - harder to roll back incrementally
- App-level validation only - less safe, can be bypassed
- Boolean column on recipes table - doesn't scale for future flags

### Decision 5: Use Existing update_recipe Tool

**Chosen**: Extend existing `update_recipe` MCP tool to accept difficulty parameter

The existing tool already supports updating recipe metadata. Simply add difficulty to the schema:
```typescript
{
  "name": "update_recipe",
  "description": "Update recipe metadata including title, description, times, and difficulty",
  "inputSchema": {
    "type": "object",
    "properties": {
      "recipe_id": { "type": "string" },
      "title": { "type": "string" },
      "description": { "type": "string" },
      "prep_time_minutes": { "type": "integer" },
      "cook_time_minutes": { "type": "integer" },
      "servings": { "type": "integer" },
      "difficulty": { "type": "integer", "minimum": 1, "maximum": 5 }  // NEW
    },
    "required": ["recipe_id"]
  }
}
```

**Rationale**:
- Simpler - reuses existing tool infrastructure
- Consistent with current architecture
- Less code to write and maintain
- Natural fit since difficulty is recipe metadata
- Claude can update difficulty alongside other fields if needed

**Alternatives considered**:
- Dedicated `update_recipe_difficulty` tool - unnecessary complexity, another tool to maintain
- Separate tools for different field updates - inconsistent with current design

### Decision 6: AI Prompting for Assessment

**Chosen**: Structured prompt with explicit criteria:

```
Analyze this recipe and assign a difficulty rating from 1-5:

Title: {title}
Prep time: {prep_time} minutes
Cook time: {cook_time} minutes
Servings: {servings}

Ingredients:
{ingredients}

Steps:
{steps}

Rating criteria:
1 (Easy): Simple techniques, common ingredients, < 6 steps, < 30 min total
2 (Medium-Easy): Basic techniques, readily available ingredients, 6-10 steps, 30-45 min
3 (Medium): Intermediate techniques, some specialty ingredients, 10-15 steps, 45-60 min
4 (Medium-Hard): Advanced techniques (soufflé, tempering), timing-sensitive, 15+ steps, 60-90 min
5 (Hard): Expert techniques (sous vide, molecular), rare ingredients, complex timing, 90+ min

Respond with ONLY a number 1-5.
```

**Rationale**:
- Explicit criteria reduce rating variance
- "Respond with ONLY a number" makes parsing reliable
- Considers multiple dimensions (technique, ingredients, time, steps)

**Alternatives considered**:
- Unstructured prompt - inconsistent results
- Multi-shot examples - token overhead for every request
- Separate prompts per difficulty aspect - too many API calls

### Decision 7: UI Rendering

**Chosen**: Keep existing circle-based difficulty display, populate with actual rating instead of hardcoded "1"

**Implementation location**: Recipe detail view (existing difficulty UI component)

**Change required**:
- Replace hardcoded `difficulty: 1` with actual value from database
- No visual design changes needed
- Existing circle UI already supports 1-5 scale

**Rationale**:
- UI pattern already exists and is familiar to users
- Minimal frontend changes - just data binding update
- Consistent with existing design language
- No accessibility or styling work needed

**Alternatives considered**:
- Text-only display - inconsistent with current UI pattern
- New star rating UI - unnecessary redesign
- Enhanced visualizations - not needed, current circles work well

## Risks / Trade-offs

### [Risk] Backfill API costs for large collections
**Mitigation**:
- Process in batches with rate limiting (100ms delay between recipes)
- Add logging to track progress and costs
- Consider adding CLI flag to disable auto-backfill for self-hosters

### [Risk] Rating inconsistency across recipe types
**Example**: Baking (precise) vs. stir-fry (forgiving) may be rated differently
**Mitigation**:
- Prompt includes diverse examples across recipe types
- User override via chat allows corrections
- Can refine prompt based on user feedback

### [Risk] Backfill failure leaves recipes partially processed
**Mitigation**:
- Don't set `difficulty_backfill_completed` until 100% complete
- If app restarts mid-backfill, it resumes from where it left off (idempotent - only processes recipes where difficulty IS NULL)
- Log errors for specific recipes but continue processing

### [Risk] AI call during recipe save adds latency
**Impact**: POST /api/recipes takes ~1-2 seconds instead of <100ms
**Mitigation**:
- Only invoke AI if user hasn't specified difficulty
- Consider async processing (return 202 Accepted, update difficulty in background)
- User sees recipe immediately, difficulty appears shortly after

### [Trade-off] System-wide rating vs. per-user ratings
**Chosen**: System-wide (single difficulty per recipe)
**Trade-off**: Different skill levels may perceive difficulty differently, but per-user ratings add significant complexity
**Revisit if**: Users consistently request personalized difficulty

### [Risk] Database migration fails in production
**Mitigation**:
- Test migration on copy of production database first (per CLAUDE.md)
- Migrations are backward-compatible (nullable column)
- Rollback: Set difficulty to NULL doesn't break app
- `docker-entrypoint.sh` creates backups before migrations

## Migration Plan

### Pre-deployment
1. Test migrations against production database copy
2. Review backfill API cost estimate (# recipes × $0.003/recipe)
3. Verify AI prompting produces consistent results on sample recipes

### Deployment Sequence
1. **Deploy database migrations**:
   - Migration 1: Add difficulty column (nullable, with CHECK constraint)
   - Migration 2: Add system_flags table with backfill flag

2. **Deploy backend code**:
   - Backfill task (checks flag, processes recipes with NULL difficulty)
   - Update recipe save handler (AI invocation for new recipes)
   - New MCP tool handler (update_recipe_difficulty)

3. **Deploy frontend**:
   - Update recipe detail template to display difficulty

4. **Verify backfill**:
   - Monitor logs for backfill progress
   - Check `system_flags` table for completion status
   - Spot-check recipe difficulty ratings

### Rollback Strategy
- **If backfill fails repeatedly**:
  - Manually set `difficulty_backfill_completed = 'true'` to prevent retry
  - Run backfill manually via CLI tool (to be created if needed)

- **If ratings are poor quality**:
  - Update recipes with NULL difficulty: `UPDATE recipes SET difficulty = NULL WHERE difficulty IS NOT NULL`
  - Reset flag: `UPDATE system_flags SET value = 'false' WHERE key = 'difficulty_backfill_completed'`
  - Refine AI prompt and redeploy

- **If migration causes issues**:
  - Cannot roll back migration (per CLAUDE.md rules)
  - Instead: Set all difficulty values to NULL as workaround
  - Frontend can show "Not rated" for NULL values

### Post-deployment
1. Monitor backfill completion (tail logs)
2. Review sample of assigned difficulties for quality
3. Purge Cloudflare cache if difficulty display doesn't update (per CLAUDE.md)

## Open Questions

1. **Should backfill process recipes in parallel (e.g., 5 concurrent requests)?**
   - Pro: Faster completion
   - Con: Higher API costs if rate-limited, harder to debug
   - **Recommendation**: Start sequential, optimize if too slow

2. **Should we add a CLI command to manually trigger backfill?**
   - Use case: Re-rating all recipes after prompt refinement
   - **Recommendation**: Add `--backfill-difficulty` flag to backend binary

3. **How should we handle recipes where AI fails to return a valid rating?**
   - Options: Skip (leave NULL), default to 3 (medium), retry with different prompt
   - **Recommendation**: Log error, leave NULL, continue processing
