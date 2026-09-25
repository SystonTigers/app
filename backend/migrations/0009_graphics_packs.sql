-- Server-drawn social graphics: each club picks a design pack, can add a
-- sponsor to every graphic, and premium packs are unlocked per club.
ALTER TABLE tenants ADD COLUMN graphics_pack TEXT NOT NULL DEFAULT 'touchline';
ALTER TABLE tenants ADD COLUMN sponsor_name TEXT;
ALTER TABLE tenants ADD COLUMN sponsor_logo_url TEXT;

CREATE TABLE IF NOT EXISTS graphics_unlocks (
  tenant_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  -- 'owner' (granted from the owner console) or 'purchase'
  source TEXT NOT NULL,
  unlocked_by TEXT,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, pack_id)
);
