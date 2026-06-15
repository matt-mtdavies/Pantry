CREATE TABLE IF NOT EXISTS daily_tips (
  date TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  tip TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🍳',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
