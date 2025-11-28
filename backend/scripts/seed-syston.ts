// scripts/seed-syston.ts
// Seed Syston tenant for local development

import { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const SYSTON_EMAIL = 'systontowntigersfc@gmail.com';
const SYSTON_SLUG = 'syston-tigers';
const SYSTON_NAME = 'Syston Tigers U16';

// Bcrypt hash for password: "SystonAdmin2024!"
// Generate your own with: node -e "console.log(require('bcryptjs').hashSync('YOUR_PASSWORD', 10))"
const SYSTON_PASSWORD_HASH = '$2a$10$rZ9YhcKQqJ3wUqVmJp5p9OQx4Kf2vXwGzQvHmYuZqL5tXwPqLmY3W';

export async function seedSyston(env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const tenantId = 'tenant_syston_2024';
  const userId = 'user_syston_admin_1';

  console.log('🌱 Seeding Syston tenant...');

  // 1. Upsert tenant
  await env.DB.prepare(`
    INSERT INTO tenants (
      id, slug, name, email, plan, status, comped, billing_tier, promo_code_used,
      route_ready, provisioned_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      name = excluded.name,
      email = excluded.email,
      plan = excluded.plan,
      status = excluded.status,
      comped = excluded.comped,
      billing_tier = excluded.billing_tier,
      promo_code_used = excluded.promo_code_used,
      route_ready = excluded.route_ready,
      provisioned_at = excluded.provisioned_at,
      updated_at = excluded.updated_at
  `).bind(
    tenantId,
    SYSTON_SLUG,
    SYSTON_NAME,
    SYSTON_EMAIL,
    'pro',
    'active',
    1, // comped
    'lifetime',
    'SYSTON100',
    1, // route_ready
    now,
    now,
    now
  ).run();

  console.log('✓ Tenant upserted');

  // 2. Upsert tenant brand
  await env.DB.prepare(`
    INSERT INTO tenant_brand (
      tenant_id, primary_color, secondary_color, badge_url, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id) DO UPDATE SET
      primary_color = excluded.primary_color,
      secondary_color = excluded.secondary_color,
      badge_url = excluded.badge_url,
      updated_at = excluded.updated_at
  `).bind(
    tenantId,
    '#FFD700', // Gold
    '#000000', // Black
    'https://systontigers.co.uk/badge.png',
    now,
    now
  ).run();

  console.log('✓ Brand upserted');

  // 3. Upsert admin user
  await env.DB.prepare(`
    INSERT INTO auth_users (
      id, tenant_id, email, password_hash, roles, profile, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      password_hash = excluded.password_hash,
      roles = excluded.roles,
      updated_at = excluded.updated_at
  `).bind(
    userId,
    tenantId,
    SYSTON_EMAIL,
    SYSTON_PASSWORD_HASH,
    JSON.stringify(['tenant_admin', 'platform_admin']),
    null,
    now,
    now
  ).run();

  console.log('✓ Admin user upserted');

  // 4. Ensure promo code SYSTON100 exists
  const promoId = 'promo_syston_100';
  await env.DB.prepare(`
    INSERT INTO promo_codes (
      id, code, plan, lifetime, discount_percent, max_uses, used_count,
      active, tenant_slug_whitelist, notes, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      plan = excluded.plan,
      lifetime = excluded.lifetime,
      discount_percent = excluded.discount_percent,
      active = excluded.active,
      tenant_slug_whitelist = excluded.tenant_slug_whitelist,
      notes = excluded.notes
  `).bind(
    promoId,
    'SYSTON100',
    'pro',
    1, // lifetime
    100, // 100% discount
    1, // max uses
    0, // used count
    1, // active
    'syston,syston-tigers,syston-town-tigers',
    'Lifetime Pro for Syston Tigers',
    now
  ).run();

  console.log('✓ Promo code SYSTON100 upserted');

  // 5. Add promo redemption record
  const redemptionId = 'redemption_syston_1';
  await env.DB.prepare(`
    INSERT OR IGNORE INTO promo_redemptions (
      id, tenant_id, promo_code_id, redeemed_at
    )
    VALUES (?, ?, ?, ?)
  `).bind(
    redemptionId,
    tenantId,
    promoId,
    now
  ).run();

  console.log('✓ Promo redemption recorded');

  // 6. Add welcome feed post
  const postId = 'post_syston_welcome';
  await env.DB.prepare(`
    INSERT OR IGNORE INTO feed_posts (
      id, tenant_id, title, content, author, image_url, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    postId,
    tenantId,
    'Welcome to Syston Tigers',
    'Welcome to the official Syston Tigers U16 team platform! 🦁⚽',
    'Syston Tigers',
    null,
    now,
    now
  ).run();

  console.log('✓ Welcome post added');
  console.log('');
  console.log('🎉 Syston tenant seeded successfully!');
  console.log(`📧 Admin email: ${SYSTON_EMAIL}`);
  console.log(`🔑 Admin password: SystonAdmin2024! (change this!)`);
  console.log(`🏆 Plan: Pro · Lifetime`);
  console.log(`🎟️ Promo: SYSTON100`);
}

// For use as a Worker endpoint (development only)
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      await seedSyston(env);
      return new Response('Syston tenant seeded!', { status: 200 });
    } catch (err: any) {
      console.error('Seed error:', err);
      return new Response(`Error: ${err.message}`, { status: 500 });
    }
  }
};
