-- Migration 007: Add helpful indices for performance
-- Run with: npx wrangler d1 migrations apply syston-db --remote

-- Create helpful indices if they don't exist
CREATE INDEX IF NOT EXISTS idx_feed_posts_tenant ON feed_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_make_connections_tenant ON make_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_make_connections_validated ON make_connections(tenant_id, validated_at);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON feed_posts(tenant_id, created_at DESC);
