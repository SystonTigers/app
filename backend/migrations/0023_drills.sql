-- Club drills: the full drill page (set-up, steps, coaching points), favourites
-- per person, and TikTok/Instagram/YouTube links on any drill.
ALTER TABLE training_drills ADD COLUMN players TEXT;
ALTER TABLE training_drills ADD COLUMN difficulty TEXT;
-- JSON lists
ALTER TABLE training_drills ADD COLUMN focus TEXT;
ALTER TABLE training_drills ADD COLUMN steps TEXT;
ALTER TABLE training_drills ADD COLUMN coaching_points TEXT;
ALTER TABLE training_drills ADD COLUMN setup TEXT;
CREATE INDEX IF NOT EXISTS idx_training_drills_tenant ON training_drills(tenant_id, title);

-- drill_ref: "lib:<id>" (built-in library) or "club:<id>" (training_drills)
CREATE TABLE IF NOT EXISTS drill_favourites (
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    drill_ref TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, user_id, drill_ref)
);

CREATE TABLE IF NOT EXISTS drill_links (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    drill_ref TEXT NOT NULL,
    url TEXT NOT NULL,
    platform TEXT NOT NULL,
    title TEXT,
    author TEXT,
    thumbnail_url TEXT,
    added_by TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE (tenant_id, drill_ref, url)
);
CREATE INDEX IF NOT EXISTS idx_drill_links_ref ON drill_links(tenant_id, drill_ref);
