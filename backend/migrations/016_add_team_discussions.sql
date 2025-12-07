-- Migration 016: Add Team Discussion & Tactical Hub Tables
-- Description: Creates tables for team discussions, comments, training drills, and training plans

-- ======================
-- DISCUSSIONS
-- ======================

CREATE TABLE IF NOT EXISTS discussions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('tactics', 'training', 'match-analysis', 'general')),
    title TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    video_id TEXT,
    pinned INTEGER DEFAULT 0,
    locked INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_discussions_tenant ON discussions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discussions_category ON discussions(category);
CREATE INDEX IF NOT EXISTS idx_discussions_pinned ON discussions(pinned);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON discussions(created_at DESC);

-- ======================
-- DISCUSSION COMMENTS
-- ======================

CREATE TABLE IF NOT EXISTS discussion_comments (
    id TEXT PRIMARY KEY,
    discussion_id TEXT NOT NULL,
    parent_comment_id TEXT,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    video_timestamp INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES discussion_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_discussion ON discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON discussion_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON discussion_comments(created_at);

-- ======================
-- TRAINING DRILLS
-- ======================

CREATE TABLE IF NOT EXISTS training_drills (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('warmup', 'passing', 'shooting', 'fitness', 'set-pieces', 'defending', 'other')),
    duration_minutes INTEGER NOT NULL,
    equipment TEXT,
    description TEXT NOT NULL,
    diagram_url TEXT,
    demo_video_url TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drills_tenant ON training_drills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drills_category ON training_drills(category);

-- ======================
-- TRAINING PLANS
-- ======================

CREATE TABLE IF NOT EXISTS training_plans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plans_tenant ON training_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plans_date ON training_plans(scheduled_date);

-- ======================
-- TRAINING PLAN DRILLS (Junction Table)
-- ======================

CREATE TABLE IF NOT EXISTS training_plan_drills (
    plan_id TEXT NOT NULL,
    drill_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    PRIMARY KEY (plan_id, drill_id),
    FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (drill_id) REFERENCES training_drills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plan_drills_plan ON training_plan_drills(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_drills_order ON training_plan_drills(plan_id, order_index);
