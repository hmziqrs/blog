-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TEXT DEFAULT (datetime('now')),
  unsubscribe_token TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email ON subscribers(email);

-- Newsletter tracking table
CREATE TABLE IF NOT EXISTS newsletter_sent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT UNIQUE NOT NULL,
  sent_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_post_slug ON newsletter_sent(post_slug);

-- Blacklist table
CREATE TABLE IF NOT EXISTS blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  reason TEXT,
  added_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blacklist_email ON blacklist(email);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_timestamp ON rate_limits(ip, timestamp);
