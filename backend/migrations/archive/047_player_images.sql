-- Migration: Player Images Table
-- Description: Store multiple images per player (headshots, action shots)
-- Created: 2026-02-14

CREATE TABLE IF NOT EXISTS player_images (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL, -- 'headshot' | 'action'
  uploaded_at INTEGER NOT NULL,
  uploaded_by TEXT,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_player_images_tenant ON player_images(tenant_id);
CREATE INDEX IF NOT EXISTS idx_player_images_player ON player_images(tenant_id, player_id);
