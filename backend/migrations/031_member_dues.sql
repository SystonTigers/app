-- Migration 031: Member Dues Collection System
-- Enables clubs to collect payments from parents (match fees, subs, kit, etc.)

-- Payment requests created by club admins
CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,                -- "March Training Subs", "Match Fee vs Tigers"
    description TEXT,                   -- Optional details
    amount_gbp INTEGER NOT NULL,        -- Amount in pence (e.g., 2500 = £25.00)
    due_date INTEGER,                   -- Unix timestamp, optional
    applies_to TEXT DEFAULT 'all',      -- 'all', 'players', or comma-separated player IDs
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed', 'cancelled')),
    reminder_count INTEGER DEFAULT 0,
    created_by TEXT,                    -- Admin email who created
    created_at INTEGER DEFAULT (unixepoch()),
    closed_at INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_tenant ON payment_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);

-- Individual payments from members/parents
CREATE TABLE IF NOT EXISTS member_payments (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    player_id TEXT,                     -- Which player this is for (optional)
    payer_name TEXT,                    -- Name of person paying
    payer_email TEXT NOT NULL,          -- Email of payer
    amount_requested INTEGER NOT NULL,  -- Original amount in pence
    amount_paid INTEGER NOT NULL,       -- Amount paid (may differ if fees added)
    platform_fee INTEGER NOT NULL,      -- Your cut in pence
    stripe_fee INTEGER NOT NULL,        -- Stripe's actual fee in pence
    net_to_club INTEGER NOT NULL,       -- What club receives after all fees
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
    paid_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (request_id) REFERENCES payment_requests(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_member_payments_request ON member_payments(request_id);
CREATE INDEX IF NOT EXISTS idx_member_payments_tenant ON member_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_payments_status ON member_payments(status);
CREATE INDEX IF NOT EXISTS idx_member_payments_payer ON member_payments(payer_email);

-- Add organization settings
ALTER TABLE organizations ADD COLUMN pass_fees_to_payer INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN stripe_connected_account_id TEXT;

-- Add tenant settings for teams not in organizations
ALTER TABLE tenants ADD COLUMN pass_fees_to_payer INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN stripe_connected_account_id TEXT;

-- Fee tiers by plan (for reference, applied in code)
-- Essentials: 3.0% + 20p
-- Team: 2.9% + 20p  
-- Club: 2.5% + 20p
-- Club Pro: 2.0% + 18p

-- Updated plan pricing (reference only - applied in billing.ts)
-- Essentials: £5.99/mo, £57.50/yr
-- Team: £12.99/mo, £124.70/yr
-- Club: £39.99/mo, £383.90/yr
-- Club Pro: £79.99/mo, £767.90/yr
