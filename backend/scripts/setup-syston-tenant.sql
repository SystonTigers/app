-- Setup script for Syston Tigers tenant
-- Run this to ensure Syston tenant exists with correct data

-- Upsert Syston tenant
INSERT OR REPLACE INTO tenants (
  id, slug, name, email, plan, status, comped, billing_tier, promo_code_used,
  trial_ends_at, route_ready, provisioned_at, created_at, updated_at
) VALUES (
  'tenant_syston_2024',
  'syston-tigers',
  'Syston Tigers U16',
  'systontowntigersfc@gmail.com',
  'pro',
  'active',
  1,  -- comped = free
  'lifetime',
  'SYSTON100',
  NULL,  -- no trial end (lifetime)
  1,  -- route ready
  unixepoch(),  -- provisioned now
  unixepoch(),
  unixepoch()
);

-- Upsert tenant branding
INSERT OR REPLACE INTO tenant_brand (
  tenant_id, primary_color, secondary_color, badge_url, created_at, updated_at
) VALUES (
  'tenant_syston_2024',
  '#FFD700',  -- Gold
  '#000000',  -- Black
  'https://example.com/syston-badge.png',  -- Placeholder
  unixepoch(),
  unixepoch()
);

-- Ensure admin user exists (password is NOT set here)
-- A fresh user gets an unusable hash ('!'), so it can't log in until you run:
--   SYSTON_ADMIN_PASSWORD='...' node scripts/set-admin-password.mjs [--remote]
-- Existing users keep their current password.
INSERT OR IGNORE INTO auth_users (
  id, tenant_id, email, password_hash, roles, profile, created_at, updated_at
) VALUES (
  'user_syston_admin_1',
  'tenant_syston_2024',
  'systontowntigersfc@gmail.com',
  '!',
  '["tenant_admin"]',
  NULL,
  unixepoch(),
  unixepoch()
);
UPDATE auth_users SET roles = '["tenant_admin"]', updated_at = unixepoch()
WHERE email = 'systontowntigersfc@gmail.com';

-- Ensure promo code redemption is recorded
INSERT OR IGNORE INTO promo_redemptions (
  id, tenant_id, promo_code_id, redeemed_at
) VALUES (
  'redemption_syston_1',
  'tenant_syston_2024',
  'promo_syston_100',
  unixepoch()
);

-- Add some default feed posts for demo
INSERT OR IGNORE INTO feed_posts (
  id, tenant_id, title, content, author, image_url, created_at, updated_at
) VALUES (
  'post_syston_welcome',
  'tenant_syston_2024',
  'Welcome to Syston Tigers',
  'Welcome to the official Syston Tigers U16 team platform!',
  'Syston Tigers',
  NULL,
  unixepoch(),
  unixepoch()
);
