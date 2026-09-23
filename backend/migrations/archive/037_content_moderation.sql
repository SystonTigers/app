-- Content Moderation Tables
-- Support for user-generated content reports and moderation

CREATE TABLE IF NOT EXISTS content_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  reporter_id TEXT,  -- NULL for anonymous reports
  content_type TEXT NOT NULL CHECK(content_type IN ('post', 'comment', 'message')),
  content_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN ('spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'misinformation', 'other')),
  details TEXT,  -- Optional additional context from reporter
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_notes TEXT,  -- Admin comments on the report
  action_taken TEXT,  -- What action was taken (e.g., 'removed', 'warned_user', 'no_action')
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES auth_users(id) ON DELETE SET NULL
);

-- Index for finding pending reports by tenant
CREATE INDEX IF NOT EXISTS idx_content_reports_tenant_status 
ON content_reports(tenant_id, status, created_at DESC);

-- Index for finding all reports for specific content
CREATE INDEX IF NOT EXISTS idx_content_reports_content 
ON content_reports(content_type, content_id);

-- Index for finding reports by reporter
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter 
ON content_reports(reporter_id, created_at DESC);
