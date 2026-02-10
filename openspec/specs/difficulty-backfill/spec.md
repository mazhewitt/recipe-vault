# Difficulty Backfill Specification

## Purpose

The Difficulty Backfill capability provides a one-time migration system that processes existing recipes without difficulty ratings on application startup, assigning AI-generated difficulty ratings to all recipes with NULL difficulty values.

## Requirements

### Requirement: System Flags Tracking

The system SHALL maintain a persistent flag to track whether the difficulty backfill has been completed.

#### Scenario: Check backfill completion status on startup
- **WHEN** the application starts
- **THEN** the system queries the system_flags table for key 'difficulty_backfill_completed'
- **AND** reads the boolean value to determine if backfill is needed

#### Scenario: Backfill not yet run
- **WHEN** the system_flags table shows 'difficulty_backfill_completed' = 'false'
- **THEN** the backfill process is triggered
- **AND** the application continues startup (non-blocking)

#### Scenario: Backfill already completed
- **WHEN** the system_flags table shows 'difficulty_backfill_completed' = 'true'
- **THEN** the backfill process is skipped
- **AND** the application continues startup normally

#### Scenario: System flags table missing
- **WHEN** the system_flags table does not exist
- **THEN** the backfill process is skipped
- **AND** an info log is written noting the table is missing

### Requirement: Async Non-Blocking Execution

The system SHALL run the backfill process as an async background task without blocking application startup.

#### Scenario: Server starts while backfill runs
- **WHEN** the backfill process begins
- **THEN** an async Tokio task is spawned
- **AND** the main server initialization continues immediately
- **AND** the server accepts requests while backfill is in progress

#### Scenario: Long-running backfill doesn't timeout
- **WHEN** the backfill process takes several minutes
- **THEN** the async task continues running until complete
- **AND** no timeout terminates the task
- **AND** progress is logged periodically

### Requirement: Idempotent Processing

The system SHALL only process recipes that currently have NULL difficulty values, making the backfill idempotent and resumable.

#### Scenario: Process only recipes with NULL difficulty
- **WHEN** the backfill task queries for recipes to process
- **THEN** only recipes WHERE difficulty IS NULL are selected
- **AND** recipes with existing difficulty values are skipped

#### Scenario: Backfill interrupted and restarted
- **WHEN** the application restarts mid-backfill
- **AND** the difficulty_backfill_completed flag is still 'false'
- **THEN** the backfill process resumes
- **AND** only processes remaining recipes with NULL difficulty
- **AND** skips recipes that were already processed

### Requirement: Sequential Batch Processing

The system SHALL process recipes sequentially with rate limiting to control API costs.

#### Scenario: Process recipes one at a time
- **WHEN** the backfill task processes recipes
- **THEN** each recipe is assessed sequentially (not in parallel)
- **AND** waits at least 100ms between assessments
- **AND** continues until all NULL difficulty recipes are processed

#### Scenario: Large recipe collection
- **WHEN** there are hundreds of recipes to process
- **THEN** the system continues processing sequentially
- **AND** logs progress every 10 recipes
- **AND** does not overwhelm the Claude API with parallel requests

### Requirement: Error Handling and Resilience

The system SHALL handle individual recipe assessment failures gracefully without aborting the entire backfill.

#### Scenario: Single recipe assessment fails
- **WHEN** AI assessment fails for one recipe
- **THEN** the error is logged with the recipe ID
- **AND** that recipe's difficulty remains NULL
- **AND** processing continues with the next recipe
- **AND** the backfill is not aborted

#### Scenario: Multiple consecutive failures
- **WHEN** AI assessment fails for multiple recipes in a row
- **THEN** each failure is logged individually
- **AND** processing continues through the entire list
- **AND** the backfill completes and sets the flag to 'true'

#### Scenario: Critical API failure
- **WHEN** the Claude API is completely unavailable
- **AND** all assessment attempts fail
- **THEN** the backfill task logs a critical error
- **AND** does NOT set difficulty_backfill_completed to 'true'
- **AND** will retry on next application restart

### Requirement: Completion Tracking

The system SHALL set the completion flag only after successfully processing all eligible recipes.

#### Scenario: Successful backfill completion
- **WHEN** all recipes with NULL difficulty have been processed
- **THEN** the system updates system_flags SET value = 'true' WHERE key = 'difficulty_backfill_completed'
- **AND** logs a completion message with count of recipes processed
- **AND** the backfill task terminates

#### Scenario: Partial completion doesn't set flag
- **WHEN** the backfill task is interrupted mid-processing
- **THEN** the difficulty_backfill_completed flag remains 'false'
- **AND** the next application startup will resume backfill

#### Scenario: No recipes to process
- **WHEN** the backfill runs but all recipes already have difficulty values
- **THEN** the system sets difficulty_backfill_completed to 'true'
- **AND** logs that 0 recipes were processed

### Requirement: Progress Logging

The system SHALL log backfill progress to help operators monitor status and costs.

#### Scenario: Backfill start logged
- **WHEN** the backfill task begins
- **THEN** a log entry records: "Starting difficulty backfill for N recipes"
- **AND** includes the timestamp

#### Scenario: Periodic progress logging
- **WHEN** the backfill processes recipes
- **THEN** progress is logged every 10 recipes
- **AND** the log includes count processed and estimated remaining

#### Scenario: Backfill completion logged
- **WHEN** the backfill completes
- **THEN** a log entry records: "Difficulty backfill completed: N recipes processed, M failures"
- **AND** includes total elapsed time

#### Scenario: Individual failures logged
- **WHEN** a recipe assessment fails
- **THEN** an error log entry includes:
  - Recipe ID
  - Recipe title (if available)
  - Error message from AI API

## Data Types

### SystemFlag
```
SystemFlag {
    key: String (PRIMARY KEY)
    value: String
    updated_at: Timestamp
}
```

### BackfillStatus
```
BackfillStatus {
    total_recipes: usize
    processed: usize
    successful: usize
    failed: usize
    started_at: Instant
}
```

## Related Capabilities

- **recipe-difficulty-rating**: Uses this capability to assess each recipe
- **recipe-domain**: Queries recipes with NULL difficulty and updates difficulty values
