-- Share links for time-limited public recipe sharing
CREATE TABLE share_links (
    token TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);

CREATE INDEX idx_share_links_recipe_id ON share_links(recipe_id);
