-- Match day: live video, and match alerts that skip people at the ground.

-- Where the match is played, for the "at the ground?" check done on each
-- phone. Set from the venue's UK postcode, or by staff in Match Centre ("the ground is here").
ALTER TABLE fixtures ADD COLUMN venue_lat REAL;
ALTER TABLE fixtures ADD COLUMN venue_lng REAL;

-- Live video for the match. youtube_live_id (video id) and youtube_status
-- ('live' | 'ended') already exist on fixtures.
ALTER TABLE fixtures ADD COLUMN stream_source TEXT;          -- 'youtube' (found on the club's channel) | 'link' (pasted by staff)
ALTER TABLE fixtures ADD COLUMN stream_embeddable INTEGER;   -- 0 when the channel blocks playing it inside other apps
ALTER TABLE fixtures ADD COLUMN stream_started_at INTEGER;

-- Whether a member is at the match. Phones work this out themselves and only
-- send yes/no: we never receive or store anyone's location.
CREATE TABLE IF NOT EXISTS match_attendance (
  tenant_id TEXT NOT NULL,
  fixture_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  at_venue INTEGER NOT NULL,
  source TEXT NOT NULL,                  -- 'location' | 'manual' (manual wins)
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, fixture_id, user_id)
);

-- One notification per match update (or "we're live"). Sent by the
-- once-a-minute cron after the club's undo window, to members who aren't at
-- the match. Unique per source, so queuing twice never notifies twice.
CREATE TABLE IF NOT EXISTS match_alerts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  fixture_id TEXT NOT NULL,
  source_id TEXT NOT NULL,               -- live event id, 'correction:<event id>' or 'stream:<fixture id>'
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  skip_user_id TEXT,                     -- whoever recorded the update doesn't need telling
  send_after INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sending | sent | cancelled
  sent_count INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_match_alerts_due ON match_alerts(status, send_after);
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
