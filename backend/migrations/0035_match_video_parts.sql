-- A match can have more than one YouTube video: a stream that drops and is
-- restarted, or one per half. Each part keeps when it started, so every tap
-- in Match Centre is matched to the part that was live at that moment.
-- fixtures.youtube_live_id stays the latest part (what "watch live" opens).
CREATE TABLE IF NOT EXISTS fixture_videos (
  tenant_id TEXT NOT NULL,
  fixture_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('youtube', 'link')),
  -- When the stream went live (ms), from YouTube; null for a link we couldn't look up
  started_at INTEGER,
  -- When it was added to the match (ms)
  added_at INTEGER NOT NULL,
  -- Staff line-up: this many seconds into the video is the moment at anchor_at (ms)
  anchor_sec INTEGER,
  anchor_at INTEGER,
  embeddable INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, fixture_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_fixture_videos_fixture ON fixture_videos(tenant_id, fixture_id);

-- Matches that already have a video become part one
INSERT OR IGNORE INTO fixture_videos (tenant_id, fixture_id, video_id, source, started_at, added_at, embeddable)
SELECT tenant_id, id, youtube_live_id, stream_source,
       CASE WHEN stream_source = 'youtube' THEN stream_started_at END,
       COALESCE(stream_started_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
       COALESCE(stream_embeddable, 1)
FROM fixtures
WHERE youtube_live_id IS NOT NULL AND stream_source IN ('youtube', 'link');
