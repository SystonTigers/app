-- Migration 018: Add In-App Notifications
-- Description: Creates notifications table for discussion updates, mentions, and replies

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('discussion_comment', 'comment_reply', 'mention', 'discussion_locked', 'discussion_pinned')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    related_id TEXT,
    read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
