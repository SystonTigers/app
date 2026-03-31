-- Migration: Add Videos Table
-- Description: Store metadata for match highlights and clips
-- Created: 2025-10-15

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  match_id TEXT, -- Optional link to a match
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  youtube_url TEXT, -- Optional external link
  duration INTEGER DEFAULT 0, -- Duration in seconds
  type TEXT NOT NULL, -- 'goal', 'save', 'skill', 'highlights', 'full-match'
  views INTEGER DEFAULT 0,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (match_id) REFERENCES fixtures(id)
);

CREATE INDEX IF NOT EXISTS idx_videos_tenant ON videos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_videos_match ON videos(match_id);
CREATE INDEX IF NOT EXISTS idx_videos_type ON videos(type);
