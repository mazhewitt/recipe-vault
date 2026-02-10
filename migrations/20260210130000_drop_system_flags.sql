-- Drop system_flags table (no longer needed after backfill completion)
-- The difficulty backfill is complete and this table is not used for anything else
DROP TABLE IF EXISTS system_flags;
