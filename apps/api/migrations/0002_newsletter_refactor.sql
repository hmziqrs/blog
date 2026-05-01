-- Rename post_slug to issue_slug in newsletter_sent
ALTER TABLE newsletter_sent RENAME COLUMN post_slug TO issue_slug;
DROP INDEX IF EXISTS idx_post_slug;
CREATE INDEX IF NOT EXISTS idx_issue_slug ON newsletter_sent(issue_slug);

-- Rename post_slug to issue_slug in newsletter_deliveries
ALTER TABLE newsletter_deliveries RENAME COLUMN post_slug TO issue_slug;
DROP INDEX IF EXISTS idx_deliveries_post_slug;
CREATE INDEX IF NOT EXISTS idx_deliveries_issue_slug ON newsletter_deliveries(issue_slug);

-- Drop posts table (no longer used for send validation)
DROP TABLE IF EXISTS posts;
