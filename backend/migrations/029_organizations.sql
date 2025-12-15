-- Migration 029: Organizations for Multi-Team Subscriptions
-- Allows clubs to manage multiple teams under one subscription

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    plan TEXT NOT NULL CHECK(plan IN ('essentials', 'team', 'club', 'club_pro')),
    status TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
    billing_interval TEXT DEFAULT 'monthly' CHECK(billing_interval IN ('monthly', 'annual')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'trialing',
    max_teams INTEGER DEFAULT 1,
    trial_ends_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_email);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Link tenants to organizations
ALTER TABLE tenants ADD COLUMN organization_id TEXT REFERENCES organizations(id);

-- Create index for organization lookup
CREATE INDEX IF NOT EXISTS idx_tenants_organization ON tenants(organization_id);

-- Plan limits reference table
CREATE TABLE IF NOT EXISTS plan_limits (
    plan TEXT PRIMARY KEY,
    max_teams INTEGER NOT NULL,
    monthly_price_gbp INTEGER NOT NULL,  -- in pence
    annual_price_gbp INTEGER NOT NULL,   -- in pence (20% discount)
    features TEXT NOT NULL  -- JSON array of feature flags
);

-- Insert plan limits
INSERT OR REPLACE INTO plan_limits (plan, max_teams, monthly_price_gbp, annual_price_gbp, features) VALUES
    ('essentials', 1, 799, 7670, '["squad","fixtures","reports","chat"]'),
    ('team', 1, 1499, 14390, '["squad","fixtures","reports","chat","stats","social","video"]'),
    ('club', 5, 4999, 47990, '["squad","fixtures","reports","chat","stats","social","video"]'),
    ('club_pro', 999, 8999, 86390, '["squad","fixtures","reports","chat","stats","social","video","ai_coaching","merch"]');

-- Organization members (users who can manage the organization)
CREATE TABLE IF NOT EXISTS organization_members (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON organization_members(user_email);
