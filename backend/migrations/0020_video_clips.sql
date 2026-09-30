-- Clips marked on a club video on the website (start and end in seconds).
-- Nothing is cut or re-encoded: a clip plays that part of the video.
CREATE TABLE IF NOT EXISTS video_clips (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    start_sec REAL NOT NULL,
    end_sec REAL NOT NULL,
    title TEXT,
    created_by TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_video_clips_video ON video_clips(tenant_id, video_id);
