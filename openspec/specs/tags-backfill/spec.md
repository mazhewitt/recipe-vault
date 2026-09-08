# tags-backfill Specification

## Purpose
One-time, flag-gated startup task that AI-assigns tags to recipes that have none. Tracked in the `backfill_flags` table so it runs once, resumes after an interruption, survives individual failures, and never blocks or crashes startup.

## Requirements

### Requirement: Backfill Flags Tracking

The system SHALL maintain a persistent `backfill_flags` table and use the key `tags_backfill_completed` to record whether the tags backfill has completed.

#### Scenario: Flag table created by migration
- **WHEN** migration `20260906120100_add_backfill_flags.sql` runs
- **THEN** a `backfill_flags` table exists with `key` (primary key), `value` and `updated_at` columns
- **AND** a row `tags_backfill_completed = 'false'` is present

#### Scenario: Check status on startup
- **WHEN** the application starts and migrations have succeeded
- **THEN** the system reads `backfill_flags` for key `tags_backfill_completed`

#### Scenario: Backfill not yet run
- **WHEN** the flag value is `'false'`
- **THEN** the backfill task is spawned
- **AND** the application continues startup without waiting

#### Scenario: Backfill already completed
- **WHEN** the flag value is `'true'`
- **THEN** the backfill is skipped
- **AND** startup continues normally

#### Scenario: Flag table or row missing
- **WHEN** the `backfill_flags` table or the `tags_backfill_completed` row does not exist
- **THEN** the backfill is skipped
- **AND** an info log notes the missing flag

### Requirement: Async Non-Blocking Execution

The system SHALL run the tags backfill as a background Tokio task that does not block server startup.

#### Scenario: Server serves requests during backfill
- **WHEN** the backfill task is running
- **THEN** the HTTP server accepts and serves requests normally

#### Scenario: Long-running backfill is not timed out
- **WHEN** the backfill takes several minutes
- **THEN** the task runs to completion without a timeout
- **AND** progress is logged periodically

### Requirement: Idempotent Processing

The system SHALL only process recipes that have no tags, so the backfill is idempotent and resumable.

#### Scenario: Only untagged recipes are selected
- **WHEN** the backfill queries for recipes to process
- **THEN** only recipes with no `recipe_tags` rows are selected
- **AND** recipes that already have tags are skipped

#### Scenario: Interrupted backfill resumes
- **WHEN** the application restarts while the flag is still `'false'`
- **THEN** the backfill runs again
- **AND** processes only the recipes that are still untagged

#### Scenario: Recipes tagged by auto-assignment are skipped
- **WHEN** a recipe was tagged by the create-time auto-assignment before the backfill reaches it
- **THEN** the backfill does not re-assess it

### Requirement: Sequential Batch Processing

The system SHALL assess recipes one at a time with a delay between calls to control API cost.

#### Scenario: Sequential with delay
- **WHEN** the backfill processes recipes
- **THEN** each recipe is assessed in turn, not in parallel
- **AND** the task waits at least 100 ms between assessments

#### Scenario: Progress logging
- **WHEN** the backfill has processed a multiple of 10 recipes
- **THEN** a progress log entry records the count processed and the count remaining

### Requirement: Error Handling and Resilience

The system SHALL continue past individual assessment failures and only mark completion after a full pass.

#### Scenario: Single recipe fails
- **WHEN** assessment fails for one recipe
- **THEN** the error is logged with the recipe ID and title
- **AND** that recipe stays untagged
- **AND** processing continues with the next recipe

#### Scenario: Full pass with some failures sets the flag
- **WHEN** the backfill reaches the end of the list and at least one recipe was tagged successfully
- **THEN** `tags_backfill_completed` is set to `'true'`
- **AND** the completion log records the counts of successes and failures

#### Scenario: Every attempt fails
- **WHEN** there was at least one recipe to process and every assessment failed
- **THEN** a critical error is logged
- **AND** the flag remains `'false'` so the backfill retries on the next start

#### Scenario: No recipes to process
- **WHEN** the backfill runs and every recipe already has tags
- **THEN** the flag is set to `'true'`
- **AND** the log records that 0 recipes were processed

### Requirement: Completion Logging

The system SHALL log the start and end of the backfill so operators can monitor it.

#### Scenario: Start logged
- **WHEN** the backfill begins
- **THEN** a log entry records "Starting tags backfill for N recipes"

#### Scenario: Completion logged
- **WHEN** the backfill finishes
- **THEN** a log entry records "Tags backfill completed: N recipes processed, M failures"
- **AND** includes the elapsed time
