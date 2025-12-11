-- Delete Syston tenant (reset to fresh state)
DELETE FROM tenants WHERE id = 'tenant_syston_2024';
DELETE FROM tenant_brand WHERE tenant_id = 'tenant_syston_2024';
DELETE FROM auth_users WHERE tenant_id = 'tenant_syston_2024';

-- Also delete the user from new 'users' table if they exist (just in case I tested before)
DELETE FROM users WHERE email = 'systontowntigersfc@gmail.com';
