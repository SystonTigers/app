-- Gallery tagging: staff tag players in club gallery photos, so the photos
-- also show on each player's page (with the same photo consent rules as
-- their own photos). One row per player per photo.
CREATE TABLE IF NOT EXISTS photo_players (
  tenant_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  tagged_at INTEGER NOT NULL,
  PRIMARY KEY (photo_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_photo_players_tenant_player ON photo_players(tenant_id, player_id);
CREATE INDEX IF NOT EXISTS idx_photo_players_tenant_photo ON photo_players(tenant_id, photo_id);
