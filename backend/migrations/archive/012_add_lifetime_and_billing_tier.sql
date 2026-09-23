-- Migration 012: Add lifetime promo features and billing tier
-- Adds support for lifetime promos and billing tier tracking

-- Add billing_tier to tenants (e.g., 'monthly', 'annual', 'lifetime')
ALTER TABLE tenants ADD COLUMN billing_tier TEXT;
ALTER TABLE tenants ADD COLUMN promo_code_used TEXT;

-- Add lifetime and advanced promo features to promo_codes
ALTER TABLE promo_codes ADD COLUMN lifetime INTEGER DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN plan TEXT;  -- 'starter', 'pro', or NULL for any
ALTER TABLE promo_codes ADD COLUMN tenant_slug_whitelist TEXT;  -- CSV of allowed slugs
ALTER TABLE promo_codes ADD COLUMN starts_at TEXT;  -- ISO date string
ALTER TABLE promo_codes ADD COLUMN notes TEXT;

-- Update SYSTON100 promo to be lifetime + Pro
UPDATE promo_codes SET
  lifetime = 1,
  plan = 'pro',
  tenant_slug_whitelist = 'syston,syston-tigers,syston-town-tigers',
  notes = 'Lifetime Pro for Syston Tigers'
WHERE code = 'SYSTON100';

-- Create indices
CREATE INDEX IF NOT EXISTS idx_tenants_billing_tier ON tenants(billing_tier);
CREATE INDEX IF NOT EXISTS idx_promo_lifetime ON promo_codes(lifetime);
