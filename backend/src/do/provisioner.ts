// backend/src/do/provisioner.ts
// Cloudflare Durable Object for tenant provisioning (idempotent, checkpointed)

import type { Env } from '../types';
import { sendMagicLinkEmail, sendWelcomeEmail } from '../lib/email';

type StepStatus = 'pending'|'running'|'completed'|'failed';
export type ProvisioningStep =
  | 'seedDefaultContent'
  | 'configureRouting'
  | 'validateWebhook'   // Starter
  | 'deployAutomations' // Pro
  | 'deployAppsScript'  // Pro
  | 'sendOwnerEmails'
  | 'markReady';

export interface ProvisioningCheckpoint {
  step: ProvisioningStep;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount?: number;
}

export interface ProvisioningState {
  tenantId: string;
  plan: 'starter'|'pro';
  currentStep: ProvisioningStep|null;
  checkpoints: Record<ProvisioningStep, ProvisioningCheckpoint>;
  status: 'idle'|'running'|'completed'|'failed';
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

const COMMON: ProvisioningStep[] = ['seedDefaultContent','configureRouting'];
const ORDER_STARTER: ProvisioningStep[] = [...COMMON,'validateWebhook','sendOwnerEmails','markReady'];
const ORDER_PRO:     ProvisioningStep[] = [...COMMON,'deployAutomations','deployAppsScript','sendOwnerEmails','markReady'];

export class Provisioner {
  private storage: DurableObjectStorage;
  private env: Env;
  private stateCache: ProvisioningState | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.storage = state.storage;
    this.env = env;
  }

  // ---- persistence helpers ----
  private async loadState(tenantId: string, plan: 'starter'|'pro') {
    if (this.stateCache) return;
    const stored = await this.storage.get<ProvisioningState>('state');
    if (stored) {
      this.stateCache = stored;
      return;
    }
    const order = plan === 'starter' ? ORDER_STARTER : ORDER_PRO;
    const checkpoints = {} as Record<ProvisioningStep, ProvisioningCheckpoint>;
    for (const step of order) checkpoints[step] = { step, status: 'pending' };
    this.stateCache = { tenantId, plan, currentStep: null, checkpoints, status: 'idle' };
    await this.saveState();
  }
  private async saveState() { if (this.stateCache) await this.storage.put('state', this.stateCache); }
  private get order() { return this.stateCache!.plan === 'starter' ? ORDER_STARTER : ORDER_PRO; }
  private nextStep(): ProvisioningStep | null {
    for (const s of this.order) if (this.stateCache!.checkpoints[s].status !== 'completed') return s;
    return null;
  }
  private async markStart(step: ProvisioningStep) {
    this.stateCache!.currentStep = step;
    const cp = this.stateCache!.checkpoints[step];
    this.stateCache!.checkpoints[step] = { ...cp, status: 'running', startedAt: Date.now() };
    await this.saveState();
  }
  private async markDone(step: ProvisioningStep) {
    const cp = this.stateCache!.checkpoints[step];
    this.stateCache!.checkpoints[step] = { ...cp, status: 'completed', completedAt: Date.now() };
    await this.saveState();
  }
  private async markFail(step: ProvisioningStep, err: string) {
    const cp = this.stateCache!.checkpoints[step];
    this.stateCache!.checkpoints[step] = { ...cp, status: 'failed', error: err, retryCount: (cp.retryCount ?? 0) + 1 };
    await this.saveState();
  }

  // ---- steps ----
  private async step_seedDefaultContent() {
    const t = this.stateCache!.tenantId;
    // Welcome post
    await this.env.DB.prepare(
      `INSERT INTO feed_posts (id, tenant_id, title, content, author, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(`post_${crypto.randomUUID()}`, t, 'Welcome to Your Club Platform! 🎉',
      'Your platform is ready. Start by adding fixtures and news.',
      'System', Date.now(), Date.now()).run();

    // Example fixture in 7 days
    const nextWeek = Date.now() + 7*24*3600*1000;
    await this.env.DB.prepare(
      `INSERT INTO fixtures (id, tenant_id, home_team, away_team, venue, kick_off, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(`fixture_${crypto.randomUUID()}`, t, 'Home Team', 'Away Team', 'Home Ground',
      nextWeek, 'scheduled', Date.now()).run();
  }

  private async step_configureRouting() {
    const t = this.stateCache!.tenantId;
    await this.env.DB.prepare(`UPDATE tenants SET route_ready = 1, updated_at = ? WHERE id = ?`)
      .bind(Date.now(), t).run();
  }

  private async step_validateWebhook() {
    const t = this.stateCache!.tenantId;
    const row = await this.env.DB.prepare(
      `SELECT webhook_url, webhook_secret FROM make_connections WHERE tenant_id = ?`
    ).bind(t).first<{ webhook_url: string; webhook_secret: string }>();
    if (!row) throw new Error('Make.com connection not found');

    const ts = Date.now().toString();
    const sig = await this.hmac(row.webhook_secret, `HEAD:${ts}`);
    const res = await fetch(row.webhook_url, { method: 'HEAD', headers: { 'X-Signature': sig, 'X-Timestamp': ts }});
    if (!res.ok && res.status !== 405) throw new Error(`Webhook validation status ${res.status}`);

    await this.env.DB.prepare(
      `UPDATE make_connections SET validated_at = ?, updated_at = ? WHERE tenant_id = ?`
    ).bind(Date.now(), Date.now(), t).run();
  }

  private async step_deployAutomations() {
    const t = this.stateCache!.tenantId;
    const kvNamespace = `tenant_${t.replace(/^tenant_/, '')}`;
    await this.env.DB.prepare(
      `UPDATE pro_automation SET kv_namespace = ?, cron_schedule = ?, updated_at = ? WHERE tenant_id = ?`
    ).bind(kvNamespace, '0 */6 * * *', Date.now(), t).run();
  }

  private async step_deployAppsScript() {
    if (this.env.APPS_SCRIPT_AUTO_DEPLOY !== 'true') return;
    const t = this.stateCache!.tenantId;
    const job = `deploy_${crypto.randomUUID()}`;
    await this.env.DB.prepare(
      `UPDATE pro_automation
         SET apps_script_deploy_job_id = ?, apps_script_deploy_status = ?, updated_at = ?
       WHERE tenant_id = ?`
    ).bind(job, 'ready', Date.now(), t).run();
  }

  private async step_sendOwnerEmails() {
    const t = this.stateCache!.tenantId;
    const tenant = await this.env.DB.prepare(
      `SELECT id, slug, name, email FROM tenants WHERE id = ?`
    ).bind(t).first<{ id:string; slug:string; name:string; email:string }>();
    if (!tenant) throw new Error('Tenant not found');

    const token = await this.magicToken(t, tenant.email);
    const link = `${this.env.ADMIN_CONSOLE_URL}/admin/onboard?token=${token}`;

    // Send magic link email
    const emailResult = await sendMagicLinkEmail(tenant.email, link, tenant.name, this.env);

    if (emailResult.success) {
      console.log(`[Provisioner] Magic link sent to ${tenant.email} (messageId: ${emailResult.messageId})`);
    } else {
      console.error(`[Provisioner] Email send failed for ${tenant.email}:`, emailResult.error);
      // Don't fail provisioning - link is still logged and can be manually shared
    }

    // Record timestamp regardless of email success
    await this.env.DB.prepare(`UPDATE tenants SET owner_email_sent_at = ?, updated_at = ? WHERE id = ?`)
      .bind(Date.now(), Date.now(), t).run();
  }

  private async step_markReady() {
    const t = this.stateCache!.tenantId;
    await this.env.DB.prepare(
      `UPDATE tenants SET status = 'active', provisioned_at = ?, updated_at = ? WHERE id = ?`
    ).bind(Date.now(), Date.now(), t).run();
  }

  // ---- runner ----
  private async runAll() {
    this.stateCache!.status = 'running';
    this.stateCache!.startedAt ??= Date.now();
    await this.saveState();

    try {
      let step = this.nextStep();
      while (step) {
        await this.markStart(step);
        try {
          switch (step) {
            case 'seedDefaultContent':  await this.step_seedDefaultContent(); break;
            case 'configureRouting':    await this.step_configureRouting();   break;
            case 'validateWebhook':     await this.step_validateWebhook();    break;
            case 'deployAutomations':   await this.step_deployAutomations();  break;
            case 'deployAppsScript':    await this.step_deployAppsScript();   break;
            case 'sendOwnerEmails':     await this.step_sendOwnerEmails();    break;
            case 'markReady':           await this.step_markReady();          break;
          }
          await this.markDone(step);
        } catch (e:any) {
          await this.markFail(step, e?.message ?? String(e));
          throw e;
        }
        step = this.nextStep();
      }
      this.stateCache!.status = 'completed';
      this.stateCache!.completedAt = Date.now();
      this.stateCache!.currentStep = null;
      await this.saveState();
    } catch (e) {
      this.stateCache!.status = 'failed';
      this.stateCache!.error = (e as any)?.message ?? String(e);
      await this.saveState();
      throw e;
    }
  }

  // ---- crypto helpers ----
  private async hmac(secret: string, data: string) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2,'0')).join('');
  }

  private async magicToken(tenantId: string, email: string) {
    const enc = new TextEncoder();
    const header  = btoa(JSON.stringify({ alg:'HS256', typ:'JWT' })).replace(/=+$/,'');
    const payload = btoa(JSON.stringify({
      iss: this.env.JWT_ISSUER || 'syston.app',
      aud: this.env.JWT_AUDIENCE || 'syston-admin',
      sub: email, tenantId, type:'magic_link', roles:['owner','admin'],
      iat: Math.floor(Date.now()/1000),
      exp: Math.floor(Date.now()/1000) + 24*3600
    })).replace(/=+$/,'');
    const data = `${header}.${payload}`;
    const key = await crypto.subtle.importKey('raw', enc.encode(this.env.JWT_SECRET), {name:'HMAC', hash:'SHA-256'}, false,['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    const b64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    return `${data}.${b64}`;
  }

  // ---- HTTP endpoints on the DO ----
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/queue') {
      const { tenantId, plan } = await req.json() as { tenantId: string; plan: 'starter'|'pro' };
      await this.loadState(tenantId, plan);
      // if already running/completed, just return state
      return Response.json({ success:true, state: this.stateCache });
    }

    if (req.method === 'POST' && url.pathname === '/run') {
      const { tenantId, plan } = await req.json() as { tenantId: string; plan: 'starter'|'pro' };
      await this.loadState(tenantId, plan);
      // fire and forget
      (async () => { await this.runAll(); })();
      return Response.json({ success:true, state: this.stateCache });
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      if (!this.stateCache) return Response.json({ success:true, state:null });
      return Response.json({ success:true, state: this.stateCache });
    }

    if (req.method === 'POST' && url.pathname === '/retry') {
      const { tenantId, plan } = await req.json() as { tenantId: string; plan: 'starter'|'pro' };
      await this.loadState(tenantId, plan);
      // reset failed steps to pending
      for (const s of this.order) if (this.stateCache!.checkpoints[s].status === 'failed') {
        this.stateCache!.checkpoints[s].status = 'pending';
        this.stateCache!.checkpoints[s].error = undefined;
      }
      this.stateCache!.status = 'idle';
      await this.saveState();
      return Response.json({ success:true, state:this.stateCache });
    }

    return new Response('Not found', { status: 404 });
  }
}
