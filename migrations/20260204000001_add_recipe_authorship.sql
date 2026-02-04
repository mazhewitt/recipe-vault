-- Add authorship tracking to recipes table
ALTER TABLE recipes ADD COLUMN created_by TEXT;
ALTER TABLE recipes ADD COLUMN updated_by TEXT;
