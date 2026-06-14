ALTER TABLE users ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN country TEXT;
ALTER TABLE users ADD COLUMN gender TEXT;
ALTER TABLE users ADD COLUMN age_bracket TEXT;

CREATE TABLE IF NOT EXISTS recipe_ratings (
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating   INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (recipe_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_ratings_recipe_id ON recipe_ratings(recipe_id);
