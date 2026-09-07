-- Generic one-time backfill flags (the old system_flags table was dropped in
-- 20260210130000_drop_system_flags.sql once the difficulty backfill completed).

CREATE TABLE backfill_flags (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO backfill_flags (key, value) VALUES ('tags_backfill_completed', 'false');
