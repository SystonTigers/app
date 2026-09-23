-- Migration 017: Add tenant_id to results table
-- This adds multi-tenant isolation to match results
-- Run with: wrangler d1 migrations apply syston-db --remote

-- Add tenant_id column to results table
ALTER TABLE results ADD COLUMN tenant_id TEXT;

-- Create index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_results_tenant ON results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_results_tenant_date ON results(tenant_id, match_date DESC);

-- Update unique constraint to include tenant_id
-- Note: SQLite doesn't support modifying constraints directly
-- We need to recreate the table for proper constraint

-- For now, add a partial index for the new constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_results_tenant_match
ON results(tenant_id, match_date, opponent) WHERE tenant_id IS NOT NULL;
