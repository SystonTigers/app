// backend/src/do/provisioner.ts
// Cloudflare Durable Object for tenant provisioning (idempotent, checkpointed)

import type { Env } from '../types';
import { sendMagicLinkEmail } from '../lib/email';

// ====================================================================================
// TYPES & CONSTANTS
// ====================================================================================

const now = () => new Date().toISOString();

const log = (level: 'info' | 'warn' | 'error', msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ ts: now(), feature: 'provision', level, msg, ...extra }));

// ====================================================================================
// STATE MANAGEMENT
// ====================================================================================

async function setStatus(
  db: any,
  tenantId: string,
  state: 'pending' | 'processing' | 'complete' | 'failed',
  reason?: string
) {
  await db
    .prepare(
      `UPDATE tenants SET provision_state = ?, provision_reason = ?, provision_updated_at = ? WHERE id = ?`
    )
    .bind(state, reason ?? null, now(), tenantId)
    .run();
  log('info', 'State transition', { tenantId, state, reason });
}

// ====================================================================================
// WEBHOOK VALIDATION (with DRY_RUN and fallback cascade)
// ====================================================================================

async function validateWebhook(
  url: string,
  env: Env
): Promise<{ ok: boolean; status?: number; reason?: string }> {
  // In preview/DRY_RUN mode, skip actual validation
  if (env.DRY_RUN === 'true') {
    log('warn', 'DRY_RUN enabled: skipping webhook validation', { url });
    return { ok: true, reason: 'dry_run' };
  }

  // Try HEAD -> GET -> OPTIONS cascade (some services 404 on HEAD)
  const tryFetch = async (method: string) => {
    try {
      const r = await fetch(url, { method, signal: AbortSignal.timeout(5000) });
      return { ok: r.ok, status: r.status };
    } catch (e) {
      return { ok: false, status: 0, reason: String(e) };
    }
  };

  let res = await tryFetch('HEAD');
  if (!res.ok) res = await tryFetch('GET');
  if (!res.ok) res = await tryFetch('OPTIONS');

  // If strict mode, require 2xx; otherwise allow 401/403/404/405 as "exists but restricted"
  const strict = env.MAKE_VALIDATE_STRICT === 'true';
  if (res.ok) return res;

  const permissible = [401, 403, 404, 405];
  if (!strict && res.status && permissible.includes(res.status)) {
    log('warn', 'Non-2xx webhook response accepted in non-strict mode', { status: res.status, url });
    return { ok: true, status: res.status };
  }

  return { ok: false, status: res.status, reason: 'webhook_unreachable' };
}

// ====================================================================================
// PROVISIONING STEPS
// ====================================================================================

async function seedDefaults(db: any, tenantId: string) {
  log('info', 'Seeding default content', { tenantId });

  // Welcome post
  await db
    .prepare(
      `INSERT INTO feed_posts (id, tenant_id, title, content, author, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      `post_${crypto.randomUUID()}`,
      tenantId,
      'Welcome to Your Club Platform! 🎉',
      'Your platform is ready. Start by adding fixtures and news.',
      'System',
      Date.now(),
      Date.now()
    )
    .run();

  // Example fixture in 7 days
  const nextWeek = Date.now() + 7 * 24 * 3600 * 1000;
  const fixtureDate = new Date(nextWeek).toISOString().split('T')[0];

  await db
    .prepare(
      `INSERT INTO fixtures (tenant_id, fixture_date, opponent, home_team, away_team, venue, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      tenantId,
      fixtureDate,
      'Sample Opponent',
      'Your Club',
      'Sample Opponent',
      'Home Ground',
      'scheduled'
    )
    .run();

  log('info', 'Seeded default content', { tenantId });
}

async function configureRouting(db: any, tenantId: string) {
  log('info', 'Configuring routing', { tenantId });
  await db
    .prepare(`UPDATE tenants SET route_ready = 1, updated_at = ? WHERE id = ?`)
    .bind(Date.now(), tenantId)
    .run();
  log('info', 'Routing configured', { tenantId });
}

async function getMakeWebhook(db: any, tenantId: string): Promise<string> {
  const row = await db
    .prepare(`SELECT webhook_url FROM make_connections WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ webhook_url: string }>();
  if (!row?.webhook_url) throw new Error('make_webhook_not_found');
  return row.webhook_url;
}

async function deployAutomations(env: Env, tenantId: string) {
  log('info', 'Deploying automations', { tenantId });
  const kvNamespace = `tenant_${tenantId.replace(/^tenant_/, '')}`;
  await env.DB.prepare(
    `UPDATE pro_automation SET kv_namespace = ?, cron_schedule = ?, updated_at = ? WHERE tenant_id = ?`
  )
    .bind(kvNamespace, '0 */6 * * *', Date.now(), tenantId)
    .run();
  log('info', 'Automations deployed', { tenantId });
}

async function deployAppsScript(env: Env, tenantId: string) {
  log('info', 'Deploying Apps Script', { tenantId });
  const job = `deploy_${crypto.randomUUID()}`;
  await env.DB.prepare(
    `UPDATE pro_automation
       SET apps_script_deploy_job_id = ?, apps_script_deploy_status = ?, updated_at = ?
     WHERE tenant_id = ?`
  )
    .bind(job, 'ready', Date.now(), tenantId)
    .run();
  log('info', 'Apps Script deployment queued', { tenantId, job });
}

async function createOwnerUser(env: Env, tenantId: string, email: string) {
  log('info', 'Creating owner user', { tenantId, email });

  // Check if user already exists
  const existing = await env.DB.prepare(
    `SELECT id FROM auth_users WHERE tenant_id = ? AND email = ?`
  ).bind(tenantId, email).first();

  if (existing) {
    log('info', 'Owner user already exists', { tenantId, userId: existing.id });
    return;
  }

  // Create owner user without password (will be set after magic link login)
  const userId = `user_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare(
    `INSERT INTO auth_users (id, tenant_id, email, roles, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    userId,
    tenantId,
    email,
    JSON.stringify(['tenant_admin', 'owner']),
    Date.now(),
    Date.now()
  ).run();

  log('info', 'Owner user created', { tenantId, userId });
}

async function sendOwnerMagicLink(env: Env, tenantId: string, jwtSecret: string) {
  log('info', 'Sending owner magic link', { tenantId });

  const tenant = await env.DB.prepare(`SELECT id, slug, name, email FROM tenants WHERE id = ?`)
    .bind(tenantId)
    .first<{ id: string; slug: string; name: string; email: string }>();

  if (!tenant) throw new Error('tenant_not_found_for_email');

  // Generate magic token
  const token = await generateMagicToken(env, tenantId, tenant.email, jwtSecret);
  const link = `${env.ADMIN_CONSOLE_URL}/admin?token=${token}`;

  // Send email (non-blocking failure)
  const emailResult = await sendMagicLinkEmail(tenant.email, link, tenant.name, env);

  if (emailResult.success) {
    log('info', 'Magic link sent', { tenantId, email: tenant.email, messageId: emailResult.messageId });
  } else {
    log('warn', 'Email send failed (non-critical)', { tenantId, error: emailResult.error });
    // Don't fail provisioning - link can be manually shared
  }

  // Record timestamp
  await env.DB.prepare(`UPDATE tenants SET owner_email_sent_at = ?, updated_at = ? WHERE id = ?`)
    .bind(Date.now(), Date.now(), tenantId)
    .run();
}

async function generateMagicToken(env: Env, tenantId: string, email: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '');
  const payload = btoa(
    JSON.stringify({
      iss: env.JWT_ISSUER || 'syston.app',
      aud: env.JWT_AUDIENCE || 'syston-admin',
      sub: email,
      tenantId,
      type: 'magic_link',
      roles: ['owner', 'admin'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 3600, // 24 hours
    })
  ).replace(/=+$/, '');

  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${data}.${b64}`;
}

// ====================================================================================
// DURABLE OBJECT CLASS
// ====================================================================================

export class Provisioner {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // POST /queue - Initialize provisioning state and schedule alarm
    if (url.pathname === '/queue' && request.method === 'POST') {
      const { tenantId, plan } = (await request.json()) as { tenantId: string; plan: 'starter' | 'pro' };
      log('info', 'Queue request', { tenantId, plan });

      // Mark as processing
      await setStatus(this.env.DB, tenantId, 'processing');

      // Persist work item
      await this.state.storage.put('work', { tenantId, plan, queuedAt: now() });

      // Schedule alarm to run soon (100ms)
      await this.state.storage.setAlarm(Date.now() + 100);

      return Response.json({ success: true }, { status: 202 });
    }

    // POST /run - Manual trigger (for testing or retry)
    if (url.pathname === '/run' && request.method === 'POST') {
      const { tenantId, plan } = (await request.json()) as { tenantId: string; plan: 'starter' | 'pro' };
      log('info', 'Run request (manual)', { tenantId, plan });
      await this.runOnce({ tenantId, plan });
      return Response.json({ success: true }, { status: 200 });
    }

    // GET /status - Get current provisioning status
    if (url.pathname === '/status' && request.method === 'GET') {
      const work = await this.state.storage.get<any>('work');
      return Response.json({ success: true, work }, { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  }

  // Alarm handler - executes queued work
  async alarm() {
    const work = await this.state.storage.get<any>('work');
    if (!work) {
      log('warn', 'Alarm triggered but no work found');
      return;
    }

    log('info', 'Alarm triggered', { tenantId: work.tenantId, plan: work.plan });
    await this.runOnce(work);
    await this.state.storage.delete('work');
  }

  // Execute provisioning steps
  private async runOnce({ tenantId, plan }: { tenantId: string; plan: 'starter' | 'pro' }) {
    const t0 = Date.now();
    try {
      log('info', 'Provision start', { tenantId, plan });

      // 1) Seed defaults
      await seedDefaults(this.env.DB, tenantId);

      // 2) Configure routing
      await configureRouting(this.env.DB, tenantId);

      // 3) Plan-specific steps
      if (plan === 'starter') {
        const webhookUrl = await getMakeWebhook(this.env.DB, tenantId);
        const validationResult = await validateWebhook(webhookUrl, this.env);
        if (!validationResult.ok) {
          throw new Error(`webhook_validation_failed:${validationResult.status || 'unknown'}`);
        }
      } else if (plan === 'pro') {
        await deployAutomations(this.env, tenantId);

        // Deploy Apps Script if enabled
        if (this.env.APPS_SCRIPT_AUTO_DEPLOY === 'true') {
          await deployAppsScript(this.env, tenantId);
        }
      }

      // 4) Create owner user (without password - will be set after magic link login)
      const tenant = await this.env.DB.prepare(`SELECT email FROM tenants WHERE id = ?`)
        .bind(tenantId)
        .first<{ email: string }>();

      if (!tenant) throw new Error('tenant_not_found');

      await createOwnerUser(this.env, tenantId, tenant.email);

      // 5) Send owner magic link email
      if (!this.env.JWT_SECRET) {
        throw new Error('missing_jwt_secret');
      }
      await sendOwnerMagicLink(this.env, tenantId, this.env.JWT_SECRET);

      // 6) Mark complete
      await setStatus(this.env.DB, tenantId, 'complete');

      const duration = Date.now() - t0;
      log('info', 'Provision complete', { tenantId, plan, duration_ms: duration });
    } catch (err) {
      const message = String(err);
      const duration = Date.now() - t0;
      log('error', 'Provision failed', { tenantId, plan, error: message, duration_ms: duration });
      await setStatus(this.env.DB, tenantId, 'failed', message);
    }
  }
}
