-- Add authorship tracking to recipes table
ALTER TABLE recipes ADD COLUMN created_by TEXT;
ALTER TABLE recipes ADD COLUMN updated_by TEXT;

-- Backfill existing recipes with owner email
UPDATE recipes
SET created_by = 'mazhewitt@gmail.com',
    updated_by = 'mazhewitt@gmail.com'
WHERE created_by IS NULL;
