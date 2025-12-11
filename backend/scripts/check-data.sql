-- Check if tenant exists
SELECT * FROM tenants WHERE id = 'tenant_syston_2024';

-- Check if user exists  
SELECT email, tenant_id FROM auth_users WHERE email = 'systontowntigersfc@gmail.com';
