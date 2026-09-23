CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  roles TEXT NOT NULL,
  profile TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_auth_users_tenant ON auth_users(tenant_id);
