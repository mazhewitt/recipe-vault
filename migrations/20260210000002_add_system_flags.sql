-- Create system_flags table for tracking one-time operations
-- This table is reusable for future migration flags beyond just difficulty backfill

CREATE TABLE IF NOT EXISTS system_flags (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert the difficulty_backfill_completed flag with initial value 'false'
INSERT INTO system_flags (key, value) VALUES ('difficulty_backfill_completed', 'false');
