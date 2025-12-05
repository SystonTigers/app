-- Test fixtures for E2E tests
-- This seeds the test database with a known test tenant
-- Run: npx wrangler d1 execute DB --local --file=./tests/e2e/fixtures/test-seed.sql

BEGIN TRANSACTION;

-- 1. Create test tenant with ID 'syston' for E2E tests
INSERT OR REPLACE INTO tenants (
  id, slug, name, email, plan, status, comped, billing_tier, promo_code_used,
  route_ready, provisioned_at, provision_state, created_at, updated_at
) VALUES (
  'syston',
  'syston-test',
  'Syston Test Team',
  'test@systontigers.co.uk',
  'pro',
  'active',
  1,
  'lifetime',
  'TEST100',
  1,
  unixepoch(),
  'complete',
  unixepoch(),
  unixepoch()
);

-- 2. Tenant branding
INSERT OR REPLACE INTO tenant_brand (
  tenant_id, primary_color, secondary_color, badge_url, created_at, updated_at
) VALUES (
  'syston',
  '#FFD700',
  '#000000',
  'https://example.com/test-badge.png',
  unixepoch(),
  unixepoch()
);

-- 3. Test admin user (password: TestPassword123!)
-- Hash: generated with bcrypt, 10 rounds
INSERT OR REPLACE INTO auth_users (
  id, tenant_id, email, password_hash, roles, profile, created_at, updated_at
) VALUES (
  'test_admin_user',
  'syston',
  'admin@test.com',
  '$2a$10$K4g1Y9gZ8zK5W3.TbP8KVOxqxY7bP9LxV3Q5vW1mR2nS4uH6iO7XC',
  '["admin","tenant_admin"]',
  '{"name": "Test Admin"}',
  unixepoch(),
  unixepoch()
);

-- 4. Test promo code
INSERT OR REPLACE INTO promo_codes (
  id, code, plan, lifetime, discount_percent, max_uses, used_count,
  active, tenant_slug_whitelist, notes, created_at
) VALUES (
  'promo_test_100',
  'TEST100',
  'pro',
  1,
  100,
  NULL,
  0,
  1,
  'syston-test,syston',
  'Test promo code',
  unixepoch()
);

-- 5. Test event for RSVP testing
INSERT OR REPLACE INTO events (
  id, tenant_id, title, description, event_type, start_time, end_time, location, created_at, updated_at
) VALUES (
  'test_event_1',
  'syston',
  'Test Training Session',
  'Weekly training session for testing',
  'training',
  unixepoch() + 86400,
  unixepoch() + 90000,
  'Test Venue',
  unixepoch(),
  unixepoch()
);

-- 6. Test match for match-day testing
INSERT OR REPLACE INTO matches (
  id, tenant_id, opponent, match_date, location, home_score, away_score, status, created_at, updated_at
) VALUES (
  'test_match_1',
  'syston',
  'Test Opponents FC',
  unixepoch() + 172800,
  'Test Stadium',
  0,
  0,
  'scheduled',
  unixepoch(),
  unixepoch()
);

-- 7. Test feed post
INSERT OR REPLACE INTO feed_posts (
  id, tenant_id, title, content, author, image_url, created_at, updated_at
) VALUES (
  'test_post_1',
  'syston',
  'Test Post',
  'This is a test post for E2E testing',
  'Test Author',
  NULL,
  unixepoch(),
  unixepoch()
);

COMMIT;
