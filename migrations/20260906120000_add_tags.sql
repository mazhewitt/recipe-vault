-- Free-form, many-to-many recipe tags.
-- Tags are a global, case-insensitive vocabulary; family scoping comes from the recipe.

CREATE TABLE tags (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_tags_name_lower ON tags (LOWER(name));

CREATE TABLE recipe_tags (
    recipe_id  TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (recipe_id, tag_id)
);
CREATE INDEX idx_recipe_tags_tag_id ON recipe_tags (tag_id);
