-- First ensure the tenant exists
INSERT OR REPLACE INTO tenants (
  id, slug, name, email, plan, status, comped, billing_tier, 
  route_ready, provision_state, created_at, updated_at
) VALUES (
  'tenant_syston_2024',
  'syston-tigers',
  'Syston Tigers',
  'systontowntigersfc@gmail.com',
  'pro',
  'active',
  1,
  'lifetime',
  1,
  'complete',
  1733940000,
  1733940000
);

-- Delete and recreate the user
DELETE FROM auth_users WHERE email = 'systontowntigersfc@gmail.com';

-- Insert with password 'password123' - using a verified working hash
INSERT INTO auth_users (id, tenant_id, email, password_hash, roles, created_at, updated_at) 
VALUES (
  'user_syston_admin_1',
  'tenant_syston_2024',
  'systontowntigersfc@gmail.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  '["admin","tenant_admin"]',
  1733940000,
  1733940000
);
