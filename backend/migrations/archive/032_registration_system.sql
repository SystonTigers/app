-- Migration 032: Club Registration System
-- Recurring payments, registration fees, documents, e-signatures, headshots, coach discounts

-- Recurring subscription plans (auto-collect monthly)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,                 -- "Monthly Training Subs"
    description TEXT,
    amount_gbp INTEGER NOT NULL,        -- Amount in pence
    frequency TEXT DEFAULT 'monthly' CHECK(frequency IN ('monthly', 'termly', 'annual')),
    billing_day INTEGER DEFAULT 1,      -- Day of month to charge (1-28)
    start_date INTEGER,                 -- Unix timestamp
    end_date INTEGER,                   -- Unix timestamp (null = ongoing)
    applies_to TEXT DEFAULT 'all',      -- 'all' or comma-separated player types
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled')),
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_tenant ON subscription_plans(tenant_id);

-- Player subscriptions (which players are on which plan)
CREATE TABLE IF NOT EXISTS player_subscriptions (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled', 'pending')),
    discount_id TEXT,                   -- Applied discount
    next_billing_date INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    cancelled_at INTEGER,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_player_subscriptions_player ON player_subscriptions(player_id);

-- One-off registration/signing fees
CREATE TABLE IF NOT EXISTS registration_fees (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,                 -- "Season Registration 2024-25"
    description TEXT,
    amount_gbp INTEGER NOT NULL,        -- Amount in pence
    season TEXT,                        -- "2024-25"
    is_mandatory INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Track which players have paid registration
CREATE TABLE IF NOT EXISTS player_registrations (
    id TEXT PRIMARY KEY,
    fee_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    paid_amount INTEGER,
    stripe_payment_id TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'waived')),
    paid_at INTEGER,
    FOREIGN KEY (fee_id) REFERENCES registration_fees(id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Club documents (rules, code of conduct, policies)
CREATE TABLE IF NOT EXISTS club_documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,                -- "Code of Conduct"
    description TEXT,
    content TEXT,                       -- Markdown/HTML content
    file_url TEXT,                      -- Or uploaded PDF URL
    requires_signature INTEGER DEFAULT 0,
    required_for_registration INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_club_documents_tenant ON club_documents(tenant_id);

-- Player/parent agreements (e-signatures)
CREATE TABLE IF NOT EXISTS player_agreements (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    signed_by_name TEXT NOT NULL,       -- "John Smith"
    signed_by_email TEXT NOT NULL,
    relationship TEXT DEFAULT 'parent', -- 'parent', 'guardian', 'self'
    signature_data TEXT,                -- Base64 signature image OR typed name
    signature_type TEXT DEFAULT 'drawn' CHECK(signature_type IN ('drawn', 'typed')),
    ip_address TEXT,
    user_agent TEXT,
    signed_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (document_id) REFERENCES club_documents(id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_player_agreements_player ON player_agreements(player_id);
CREATE INDEX IF NOT EXISTS idx_player_agreements_document ON player_agreements(document_id);

-- Discount rules for coaches, volunteers, etc.
CREATE TABLE IF NOT EXISTS discount_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,                 -- "Coach Child Discount"
    description TEXT,
    discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed', 'free')),
    discount_value INTEGER,             -- 50 = 50% or 500 = £5.00
    applies_to TEXT NOT NULL,           -- 'coach_children', 'volunteer_children', 'siblings', 'all'
    max_children INTEGER,               -- Max children discount applies to (null = unlimited)
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Link coaches/volunteers to their children
CREATE TABLE IF NOT EXISTS staff_children (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    staff_user_id TEXT NOT NULL,        -- User ID of coach/volunteer
    staff_email TEXT NOT NULL,
    player_id TEXT NOT NULL,
    relationship TEXT DEFAULT 'parent' CHECK(relationship IN ('parent', 'guardian', 'sibling')),
    verified INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_children_staff ON staff_children(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_children_player ON staff_children(player_id);

-- Add headshot URL to players if not exists
-- Note: Run separately if column already exists
-- ALTER TABLE players ADD COLUMN headshot_url TEXT;
