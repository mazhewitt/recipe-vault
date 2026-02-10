-- Baseline migration for v2.6.1
-- This migration consolidates all previous migrations into a single baseline
-- Applied to production on v2.6.1
--
-- NOTE: This migration is idempotent and safe to run on existing databases
-- It uses CREATE TABLE IF NOT EXISTS to avoid conflicts with existing schema

-- Create recipes table with all columns
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    updated_by TEXT,
    difficulty INTEGER CHECK (difficulty IS NULL OR (difficulty >= 1 AND difficulty <= 5))
);

-- Create unique index on recipe title (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_title_unique ON recipes (LOWER(title));

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    notes TEXT,
    FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
);

-- Create index for ingredient lookups by recipe
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients (recipe_id);

-- Create steps table
CREATE TABLE IF NOT EXISTS steps (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    duration_minutes INTEGER,
    temperature_value INTEGER,
    temperature_unit TEXT CHECK(temperature_unit IN ('Celsius', 'Fahrenheit') OR temperature_unit IS NULL),
    FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
);

-- Create index for step lookups by recipe
CREATE INDEX IF NOT EXISTS idx_steps_recipe_id ON steps (recipe_id);
