-- Migration 010: Add provision state machine fields
-- Run with: npx wrangler d1 migrations apply syston-db --env preview

-- Add state machine tracking to tenants table
ALTER TABLE tenants ADD COLUMN provision_state TEXT DEFAULT 'pending'; -- 'pending'|'processing'|'complete'|'failed'
ALTER TABLE tenants ADD COLUMN provision_reason TEXT;
ALTER TABLE tenants ADD COLUMN provision_updated_at TEXT;

-- Create index for querying stuck/failed provisions
CREATE INDEX IF NOT EXISTS idx_tenants_provision_state ON tenants(provision_state);
