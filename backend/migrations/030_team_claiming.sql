-- Migration 030: Team Claiming & Organization Invites
-- Allows existing Team subscribers to be invited/claimed by Club organizations

-- Invites table for Club admins to invite existing teams
CREATE TABLE IF NOT EXISTS organization_invites (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,  -- The team being invited
    invited_by_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'expired')),
    verification_code TEXT,  -- 6-digit code sent to team admin
    expires_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    responded_at INTEGER,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_tenant ON organization_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_status ON organization_invites(status);

-- Track billing credits when teams are absorbed
CREATE TABLE IF NOT EXISTS billing_credits (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    tenant_id TEXT,  -- Original team that was absorbed
    amount_gbp INTEGER NOT NULL,  -- Credit amount in pence
    reason TEXT NOT NULL,
    applied_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
