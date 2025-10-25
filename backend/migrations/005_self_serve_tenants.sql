-- Migration 005: Self-Serve Signup System
-- Adds multi-tenant support with Starter vs Pro plans, usage caps, promo codes, and owner console

-- ============================================================
-- TENANTS TABLE: Core tenant/organization data
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,  -- UUID
  slug TEXT NOT NULL UNIQUE,  -- URL-safe identifier (e.g., "syston-tigers")
  name TEXT NOT NULL,  -- Full club name (e.g., "Syston Tigers U16")
  email TEXT NOT NULL,  -- Owner contact email
  plan TEXT NOT NULL CHECK(plan IN ('starter', 'pro')),  -- Pricing tier
  status TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('trial', 'active', 'suspended', 'cancelled')),
  comped INTEGER NOT NULL DEFAULT 0,  -- 1 = free Pro features, bypass usage caps
  stripe_customer_id TEXT,  -- Stripe customer ID (nullable until payment setup)
  stripe_subscription_id TEXT,  -- Stripe subscription ID
  trial_ends_at INTEGER,  -- Unix timestamp (14 days from signup)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- ============================================================
-- TENANT BRAND: Visual identity (colors, badge)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_brand (
  tenant_id TEXT PRIMARY KEY,  -- 1:1 with tenants
  primary_color TEXT NOT NULL DEFAULT '#FFD700',  -- Hex color
  secondary_color TEXT NOT NULL DEFAULT '#000000',  -- Hex color
  badge_url TEXT,  -- R2 URL to uploaded badge/logo
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ============================================================
-- USAGE COUNTERS: Monthly action tracking for Starter plan
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_counters (
  id TEXT PRIMARY KEY,  -- UUID
  tenant_id TEXT NOT NULL,
  month TEXT NOT NULL,  -- Format: "YYYY-MM"
  action_count INTEGER NOT NULL DEFAULT 0,  -- Incremented on each automation action
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, month)  -- One counter per tenant per month
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant_month ON usage_counters(tenant_id, month);

-- ============================================================
-- PROMO CODES: Discount codes for signup
-- ============================================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,  -- UUID
  code TEXT NOT NULL UNIQUE,  -- e.g., "SYSTON100", "LAUNCH50"
  discount_percent INTEGER NOT NULL CHECK(discount_percent >= 0 AND discount_percent <= 100),
  max_uses INTEGER,  -- NULL = unlimited
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_until INTEGER,  -- Unix timestamp (NULL = never expires)
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_valid_until ON promo_codes(valid_until);

-- ============================================================
-- PROMO REDEMPTIONS: Track which tenants used which promos
-- ============================================================
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id TEXT PRIMARY KEY,  -- UUID
  tenant_id TEXT NOT NULL,
  promo_code_id TEXT NOT NULL,
  redeemed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, promo_code_id)  -- Can't redeem same promo twice
);

CREATE INDEX IF NOT EXISTS idx_redemption_tenant ON promo_redemptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_redemption_promo ON promo_redemptions(promo_code_id);

-- ============================================================
-- MAKE CONNECTIONS: Starter plan Make.com webhook setup
-- ============================================================
CREATE TABLE IF NOT EXISTS make_connections (
  id TEXT PRIMARY KEY,  -- UUID
  tenant_id TEXT NOT NULL UNIQUE,  -- 1:1 with Starter plan tenants
  webhook_url TEXT NOT NULL,  -- Make.com webhook endpoint
  webhook_secret TEXT NOT NULL,  -- For validating webhook signatures
  scenario_id TEXT,  -- Optional Make.com scenario ID for reference
  last_synced_at INTEGER,  -- Unix timestamp of last successful sync
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_make_tenant ON make_connections(tenant_id);

-- ============================================================
-- PRO AUTOMATION: Pro plan Cloudflare-native Apps Script setup
-- ============================================================
CREATE TABLE IF NOT EXISTS pro_automation (
  id TEXT PRIMARY KEY,  -- UUID
  tenant_id TEXT NOT NULL UNIQUE,  -- 1:1 with Pro plan tenants
  apps_script_id TEXT,  -- Google Apps Script deployment ID
  service_account_email TEXT,  -- For Google API access
  last_synced_at INTEGER,  -- Unix timestamp of last successful sync
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pro_tenant ON pro_automation(tenant_id);

-- ============================================================
-- SEED DATA: Initial promo codes for launch
-- ============================================================

-- SYSTON100: 100% off for Syston Tigers (permanent)
INSERT OR IGNORE INTO promo_codes (id, code, discount_percent, max_uses, valid_until)
VALUES (
  'promo_syston_100',
  'SYSTON100',
  100,
  1,  -- Single use
  NULL  -- Never expires
);

-- LAUNCH50: 50% off first 3 months for early adopters
INSERT OR IGNORE INTO promo_codes (id, code, discount_percent, max_uses, valid_until)
VALUES (
  'promo_launch_50',
  'LAUNCH50',
  50,
  100,  -- First 100 signups
  unixepoch('2025-12-31 23:59:59')  -- Valid through end of 2025
);
