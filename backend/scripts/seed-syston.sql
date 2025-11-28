-- Seed Syston tenant for local/production development
-- Run with: npx wrangler d1 execute DB --local --file=./scripts/seed-syston.sql
-- Or for production: npx wrangler d1 execute DB --remote --file=./scripts/seed-syston.sql

BEGIN TRANSACTION;

-- 1. Upsert Syston tenant
INSERT OR REPLACE INTO tenants (
  id, slug, name, email, plan, status, comped, billing_tier, promo_code_used,
  route_ready, provisioned_at, provision_state, created_at, updated_at
) VALUES (
  'tenant_syston_2024',
  'syston-tigers',
  'Syston Tigers U16',
  'systontowntigersfc@gmail.com',
  'pro',
  'active',
  1,
  'lifetime',
  'SYSTON100',
  1,
  unixepoch(),
  'complete',
  unixepoch(),
  unixepoch()
);

-- 2. Upsert tenant branding
INSERT OR REPLACE INTO tenant_brand (
  tenant_id, primary_color, secondary_color, badge_url, created_at, updated_at
) VALUES (
  'tenant_syston_2024',
  '#FFD700',
  '#000000',
  'https://systontigers.co.uk/badge.png',
  unixepoch(),
  unixepoch()
);

-- 3. Upsert admin user
-- Password: SystonAdmin2024!
-- Hash generated with: node -e "console.log(require('bcryptjs').hashSync('SystonAdmin2024!', 10))"
-- IMPORTANT: Change this password after first login!
INSERT OR REPLACE INTO auth_users (
  id, tenant_id, email, password_hash, roles, profile, created_at, updated_at
) VALUES (
  'user_syston_admin_1',
  'tenant_syston_2024',
  'systontowntigersfc@gmail.com',
  '$2a$10$rZ9YhcKQqJ3wUqVmJp5p9OQx4Kf2vXwGzQvHmYuZqL5tXwPqLmY3W',
  '["admin","tenant_admin","platform_admin"]',
  NULL,
  unixepoch(),
  unixepoch()
);

-- 4. Ensure promo code SYSTON100 exists
INSERT OR REPLACE INTO promo_codes (
  id, code, plan, lifetime, discount_percent, max_uses, used_count,
  active, tenant_slug_whitelist, notes, created_at
) VALUES (
  'promo_syston_100',
  'SYSTON100',
  'pro',
  1,
  100,
  NULL,
  0,
  1,
  'syston-tigers,syston,stt',
  'Syston lifetime (whitelisted)',
  unixepoch()
);

-- 5. Record promo redemption
INSERT OR IGNORE INTO promo_redemptions (
  id, tenant_id, promo_code_id, redeemed_at
) VALUES (
  'redemption_syston_1',
  'tenant_syston_2024',
  'promo_syston_100',
  unixepoch()
);

-- 6. Add welcome feed post
INSERT OR IGNORE INTO feed_posts (
  id, tenant_id, title, content, author, image_url, created_at, updated_at
) VALUES (
  'post_syston_welcome',
  'tenant_syston_2024',
  'Welcome to Syston Tigers',
  'Welcome to the official Syston Tigers U16 team platform! 🦁⚽',
  'Syston Tigers',
  NULL,
  unixepoch(),
  unixepoch()
);

COMMIT;

-- Done! Syston tenant seeded.
-- Admin email: systontowntigersfc@gmail.com
-- Admin password: SystonAdmin2024! (CHANGE THIS!)
-- Plan: Pro · Lifetime
-- Promo: SYSTON100
