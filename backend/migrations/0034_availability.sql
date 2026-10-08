-- Availability: a family (or staff) says whether each child can make a
-- match, training session or club event. One answer per child per item.
CREATE TABLE IF NOT EXISTS player_availability (
  tenant_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('match', 'training', 'event')),
  item_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('yes', 'no', 'maybe')),
  -- A short reason for staff ("Holiday", "Injured"), never shown to other families
  note TEXT,
  set_by TEXT,
  set_by_staff INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, item_type, item_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_player_availability_player ON player_availability(tenant_id, player_id);

-- Reminders sent to a family about one item (claimed before sending, so a
-- second cron run or a double tap never sends it twice). user_id '*' marks a
-- coach's "remind everyone" for the item.
CREATE TABLE IF NOT EXISTS availability_reminders (
  tenant_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'auto',
  sent_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, item_type, item_id, user_id, kind)
);
