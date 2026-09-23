-- Migration Fix Script for Production Database
-- Purpose: Mark already-applied migrations and create missing tables
-- Run with: wrangler d1 execute syston-db --env production --remote --file=fix_migrations.sql

-- ============================================
-- PART 1: Mark migrations 008-013 as applied
-- (These altered existing tables that are already modified)
-- ============================================

INSERT OR IGNORE INTO d1_migrations (name, applied_at) VALUES 
  ('008_add_promo_active.sql', datetime('now')),
  ('009_expand_fixture_results_schema.sql', datetime('now')),
  ('010_add_provision_state_machine.sql', datetime('now')),
  ('011_fixtures_multitenant_prod.sql', datetime('now')),
  ('012_add_lifetime_and_billing_tier.sql', datetime('now')),
  ('013_add_match_events.sql', datetime('now'));

-- ============================================
-- PART 2: Create missing tables
-- (These are new tables that don't exist yet)
-- ============================================

-- GOTM Voting (from 014)
CREATE TABLE IF NOT EXISTS gotm_voting (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS gotm_candidates (
    id TEXT PRIMARY KEY,
    voting_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    match_id TEXT,
    description TEXT,
    video_url TEXT,
    votes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gotm_votes (
    id TEXT PRIMARY KEY,
    voting_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gotm_voting_tenant ON gotm_voting(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gotm_candidates_voting ON gotm_candidates(voting_id);
CREATE INDEX IF NOT EXISTS idx_gotm_votes_voting_user ON gotm_votes(voting_id, user_id);

-- Seasons (from 015)
CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_current INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS player_seasons (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    squad_number INTEGER,
    position TEXT,
    joined_date TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fun_stats_cache (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT,
    stat_type TEXT NOT NULL,
    stat_key TEXT NOT NULL,
    subject_id TEXT,
    value TEXT NOT NULL,
    computed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seasons_tenant ON seasons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seasons_current ON seasons(tenant_id, is_current);
CREATE INDEX IF NOT EXISTS idx_player_seasons_season ON player_seasons(season_id);
CREATE INDEX IF NOT EXISTS idx_player_seasons_player ON player_seasons(player_id);

-- Discussions (from 016)
CREATE TABLE IF NOT EXISTS discussions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    video_id TEXT,
    pinned INTEGER DEFAULT 0,
    locked INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS discussion_comments (
    id TEXT PRIMARY KEY,
    discussion_id TEXT NOT NULL,
    parent_comment_id TEXT,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    video_timestamp INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS training_drills (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    equipment TEXT,
    description TEXT NOT NULL,
    diagram_url TEXT,
    demo_video_url TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS training_plans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS training_plan_drills (
    plan_id TEXT NOT NULL,
    drill_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    PRIMARY KEY (plan_id, drill_id)
);

CREATE INDEX IF NOT EXISTS idx_discussions_tenant ON discussions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discussions_category ON discussions(category);
CREATE INDEX IF NOT EXISTS idx_comments_discussion ON discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_drills_tenant ON training_drills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plans_tenant ON training_plans(tenant_id);

-- Notifications (from 018)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data TEXT,
    read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(tenant_id, user_id, read);

-- Push tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(tenant_id, user_id);

-- LMS (Last Man Standing from 038)
CREATE TABLE IF NOT EXISTS lms_games (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    entry_fee INTEGER DEFAULT 0,
    prize_pool INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS lms_entries (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    eliminated_round INTEGER,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lms_rounds (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    deadline TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lms_predictions (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    fixture_id TEXT NOT NULL,
    predicted_winner TEXT NOT NULL,
    result TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lms_games_tenant ON lms_games(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_entries_game ON lms_entries(game_id);
CREATE INDEX IF NOT EXISTS idx_lms_rounds_game ON lms_rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_lms_predictions_round ON lms_predictions(round_id);

-- ============================================
-- PART 3: Mark all migrations as applied
-- ============================================

INSERT OR IGNORE INTO d1_migrations (name, applied_at) VALUES 
  ('014_add_gotm_voting.sql', datetime('now')),
  ('015_add_seasons.sql', datetime('now')),
  ('016_add_team_discussions.sql', datetime('now')),
  ('017_add_discussion_relations.sql', datetime('now')),
  ('017_add_tenant_to_results.sql', datetime('now')),
  ('017_season_management_enhancements.sql', datetime('now')),
  ('018_add_notifications.sql', datetime('now')),
  ('018_season_management_enhancements.sql', datetime('now')),
  ('019_ensure_shop_tables.sql', datetime('now')),
  ('020_add_printify_fields.sql', datetime('now')),
  ('020_season_management.sql', datetime('now')),
  ('021_player_transfers.sql', datetime('now')),
  ('022_wearables_gps_tracking.sql', datetime('now')),
  ('023_user_roles_login_codes.sql', datetime('now')),
  ('024_auth_player_links.sql', datetime('now')),
  ('025_add_users_table.sql', datetime('now')),
  ('026_opponent_badges.sql', datetime('now')),
  ('027_friendly_marketplace.sql', datetime('now')),
  ('028_billing.sql', datetime('now')),
  ('029_organizations.sql', datetime('now')),
  ('030_team_claiming.sql', datetime('now')),
  ('031_member_dues.sql', datetime('now')),
  ('032_registration_system.sql', datetime('now')),
  ('033_personalized_shop.sql', datetime('now')),
  ('034_player_headshots.sql', datetime('now')),
  ('035_add_shipping_address.sql', datetime('now')),
  ('036_season_scraper_configs.sql', datetime('now')),
  ('037_content_moderation.sql', datetime('now')),
  ('038_last_man_standing.sql', datetime('now'));
