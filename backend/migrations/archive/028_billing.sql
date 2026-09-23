-- Migration: 028_billing.sql
-- Add Stripe subscription billing fields to tenants

-- Add Stripe-related columns
ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN subscription_status TEXT DEFAULT 'trialing';
-- subscription_status: 'trialing', 'active', 'past_due', 'canceled', 'expired'

-- Create billing_events table for audit trail
CREATE TABLE IF NOT EXISTS billing_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    stripe_event_id TEXT,
    amount_gbp INTEGER,
    currency TEXT DEFAULT 'gbp',
    description TEXT,
    metadata TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Create subscription_history table
CREATE TABLE IF NOT EXISTS subscription_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    old_plan TEXT,
    new_plan TEXT,
    old_status TEXT,
    new_status TEXT,
    reason TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_billing_events_tenant ON billing_events(tenant_id);
