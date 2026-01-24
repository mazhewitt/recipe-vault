-- Create recipes table
CREATE TABLE recipes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create unique index on recipe title (case-insensitive)
CREATE UNIQUE INDEX idx_recipes_title_unique ON recipes (LOWER(title));

-- Create ingredients table
CREATE TABLE ingredients (
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
CREATE INDEX idx_ingredients_recipe_id ON ingredients (recipe_id);

-- Create steps table
CREATE TABLE steps (
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
CREATE INDEX idx_steps_recipe_id ON steps (recipe_id);
