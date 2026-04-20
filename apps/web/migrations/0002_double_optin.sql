-- Add double opt-in support
ALTER TABLE subscribers ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE subscribers ADD COLUMN confirmation_token TEXT UNIQUE;

-- Existing subscribers stay active; new ones start as pending
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirmation_token ON subscribers(confirmation_token);

-- Add email column to rate_limits for per-email throttling
ALTER TABLE rate_limits ADD COLUMN email TEXT;
CREATE INDEX IF NOT EXISTS idx_rate_limits_email_timestamp ON rate_limits(email, timestamp);

-- Add newsletter_deliveries table for per-recipient tracking
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
