-- Platform owners (Boost Huddle staff), who sign in to the owner panel on the
-- website. Created with `npm run owner:create[:prod]`; the password is hashed
-- with bcrypt on the laptop and only the hash is stored.
CREATE TABLE IF NOT EXISTS platform_owners (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
);

-- What owners changed (trial extended, club suspended...), newest first in the panel.
CREATE TABLE IF NOT EXISTS owner_audit (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    owner_email TEXT,
    tenant_id TEXT,
    action TEXT NOT NULL,
    detail TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_owner_audit_time ON owner_audit(created_at);

-- When each member last signed in (for "last active" in the owner panel)
ALTER TABLE auth_users ADD COLUMN last_login_at INTEGER;
