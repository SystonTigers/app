-- Delete existing user and recreate with known working hash
DELETE FROM auth_users WHERE email = 'systontowntigersfc@gmail.com';

-- Insert with password 'password123' (hash generated with bcrypt.hashSync('password123', 10))
INSERT INTO auth_users (id, tenant_id, email, password_hash, roles, created_at, updated_at) 
VALUES (
  'user_syston_admin_1',
  'tenant_syston_2024',
  'systontowntigersfc@gmail.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.EuJxfXXnYGy3M0TU0S',
  '["admin","tenant_admin"]',
  1733940000,
  1733940000
);
