-- Add difficulty column to recipes table
-- Difficulty rating scale: 1 (Easy) to 5 (Hard)
-- CHECK constraint ensures difficulty is between 1 and 5 (or NULL)

ALTER TABLE recipes ADD COLUMN difficulty INTEGER CHECK (difficulty IS NULL OR (difficulty >= 1 AND difficulty <= 5));
