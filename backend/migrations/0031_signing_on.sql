-- Signing on (a club extra, Club Settings → Club extras): each season a
-- parent (or the player, or staff from a paper form) fills in the child's
-- details, up to three emergency contacts, photo/video consent and the code
-- of conduct. Staff mark the fee paid. Medical notes are only ever shown to
-- staff and the child's own family.
CREATE TABLE IF NOT EXISTS signing_on_forms (
  tenant_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  fee_pence INTEGER,
  fee_note TEXT,
  conduct TEXT,
  updated_by TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, season_id)
);

CREATE TABLE IF NOT EXISTS signing_on_entries (
  tenant_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  details TEXT NOT NULL,
  contacts TEXT NOT NULL,
  photo_consent INTEGER NOT NULL,
  video_consent INTEGER NOT NULL,
  conduct_agreed INTEGER NOT NULL DEFAULT 0,
  submitted_by TEXT,
  submitted_at INTEGER NOT NULL,
  paid_at INTEGER,
  paid_marked_by TEXT,
  PRIMARY KEY (tenant_id, player_id, season_id)
);
CREATE INDEX IF NOT EXISTS idx_signing_on_entries_season ON signing_on_entries(tenant_id, season_id);
