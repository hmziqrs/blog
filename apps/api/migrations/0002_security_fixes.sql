-- Posts table for slug validation (H2)
CREATE TABLE IF NOT EXISTS posts (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  published_at TEXT DEFAULT (datetime('now'))
);

-- Token hash column for L6 (lookup by hash instead of plaintext)
ALTER TABLE subscribers ADD COLUMN unsubscribe_token_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_subscribers_token_hash ON subscribers(unsubscribe_token_hash);
