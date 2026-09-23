-- Migration 006: Add provisioning tracking fields
-- Run with: npx wrangler d1 migrations apply syston-db

-- Add provisioning fields to tenants table
ALTER TABLE tenants ADD COLUMN route_ready INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN owner_email_sent_at INTEGER;
ALTER TABLE tenants ADD COLUMN provisioned_at INTEGER;

-- Add validation field to make_connections table
ALTER TABLE make_connections ADD COLUMN validated_at INTEGER;
ALTER TABLE make_connections ADD COLUMN updated_at INTEGER;

-- Add automation fields to pro_automation table
ALTER TABLE pro_automation ADD COLUMN kv_namespace TEXT;
ALTER TABLE pro_automation ADD COLUMN cron_schedule TEXT;
ALTER TABLE pro_automation ADD COLUMN apps_script_deploy_job_id TEXT;
ALTER TABLE pro_automation ADD COLUMN apps_script_deploy_status TEXT;  -- 'pending', 'deploying', 'ready', 'failed'
ALTER TABLE pro_automation ADD COLUMN updated_at INTEGER;

-- Create index on provisioned_at for reporting
CREATE INDEX IF NOT EXISTS idx_tenants_provisioned_at ON tenants(provisioned_at);

-- Create feed_posts table for default content
CREATE TABLE IF NOT EXISTS feed_posts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  image_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_tenant ON feed_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at DESC);
