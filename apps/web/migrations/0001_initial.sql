-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TEXT DEFAULT (datetime('now')),
  unsubscribe_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);

-- Newsletter tracking table
CREATE TABLE IF NOT EXISTS newsletter_sent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT UNIQUE NOT NULL,
  sent_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_post_slug ON newsletter_sent(post_slug);

-- Newsletter deliveries table
CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  subscriber_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TEXT,
  UNIQUE(post_slug, subscriber_id),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_post_slug ON newsletter_deliveries(post_slug);
CREATE INDEX IF NOT EXISTS idx_deliveries_subscriber ON newsletter_deliveries(subscriber_id);

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
  timestamp INTEGER NOT NULL,
  email TEXT
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_timestamp ON rate_limits(ip, timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limits_email_timestamp ON rate_limits(email, timestamp);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_path TEXT NOT NULL UNIQUE,
  r2_key TEXT NOT NULL,
  r2_url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_local_path ON media(local_path);
