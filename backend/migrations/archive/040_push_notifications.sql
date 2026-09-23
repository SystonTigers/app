-- Migration: Add devices table for push notifications
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK(platform IN ('ios', 'android', 'web')),
    created_at INTEGER NOT NULL,
    last_active INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(token);

-- Table for storing scheduled notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    notification_type TEXT NOT NULL CHECK(notification_type IN ('match_reminder', 'motm_voting', 'custom')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data TEXT, -- JSON string
    scheduled_for INTEGER NOT NULL,
    sent_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_tenant ON scheduled_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user ON scheduled_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
