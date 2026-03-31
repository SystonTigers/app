-- Migration: Add Gallery Tables
-- Description: Store metadata for photo albums and photos
-- Created: 2025-10-15

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  event_date DATETIME NOT NULL, -- 'date' in frontend
  cover_photo_url TEXT,
  type TEXT NOT NULL, -- 'match', 'training', 'social', 'throwback'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_albums_tenant ON albums(tenant_id);
CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(event_date);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  album_id TEXT NOT NULL,
  url TEXT NOT NULL, -- 'uri' in frontend
  uploaded_by TEXT, -- User ID or Name
  caption TEXT,
  tags TEXT, -- JSON array of strings
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);
