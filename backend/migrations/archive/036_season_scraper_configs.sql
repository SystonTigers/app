-- Season Scraper Configurations
-- Enables per-season FA Full-Time scraper URLs for multi-season support

BEGIN TRANSACTION;

-- Season-specific FA scraper configurations
CREATE TABLE IF NOT EXISTS season_scraper_configs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    fa_team_page_url TEXT,      -- FA Full-Time team page URL
    fa_snippet_url TEXT,         -- FA embed snippet URL (optional)
    team_name TEXT NOT NULL,     -- Team name for matching in scraped data
    last_scraped_at INTEGER,     -- Timestamp of last successful scrape
    last_scrape_result TEXT,     -- JSON: {added: n, updated: n, errors: []}
    is_active INTEGER DEFAULT 1, -- Enable/disable without deleting
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, season_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraper_configs_season ON season_scraper_configs(season_id);
CREATE INDEX IF NOT EXISTS idx_scraper_configs_tenant ON season_scraper_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scraper_configs_active ON season_scraper_configs(tenant_id, is_active);

COMMIT;
