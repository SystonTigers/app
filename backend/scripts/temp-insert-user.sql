INSERT OR REPLACE INTO auth_users (
  id, 
  tenant_id, 
  email, 
  password_hash, 
  roles, 
  created_at, 
  updated_at
) VALUES (
  'user_syston_admin_1',
  'tenant_syston_2024',
  'systontowntigersfc@gmail.com',
  '$2a$10$rZ9YhcKQqJ3wUqVmJp5p9OQx4Kf2vXwGzQvHmYuZqL5tXwPqLmY3W',
  '["admin","tenant_admin"]',
  1733940000,
  1733940000
);
