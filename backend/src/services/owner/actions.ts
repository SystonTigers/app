/**
 * What an owner can change on a club from the owner panel. Every change is
 * written to owner_audit so the club's history shows who did what.
 */
import { PLANS } from "../../routes/billing";
import { PACKS } from "../graphics/packs";
import { revokeAllTenantTokens, unrevokeTenantTokens } from "../jwtRevocation";

type DB = { DB: D1Database; KV_IDEMP?: KVNamespace };

/** Suspended clubs stay signed out for as long as this (their sessions last 30 days) */
const SUSPEND_BLOCK_SECONDS = 400 * 86400;

export type OwnerAction =
  | { action: "extend_trial"; days: number }
  | { action: "set_plan"; plan: string }
  | { action: "comp"; on: boolean }
  | { action: "suspend" }
  | { action: "reactivate" }
  | { action: "graphics"; pack: string; on: boolean };

export class OwnerActionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Check an action from the request body. */
export function parseAction(body: Record<string, unknown>): OwnerAction {
  switch (body.action) {
    case "extend_trial": {
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > 90) throw new OwnerActionError(400, "Extend by 1 to 90 days.");
      return { action: "extend_trial", days };
    }
    case "set_plan":
      if (typeof body.plan !== "string" || !(body.plan in PLANS)) throw new OwnerActionError(400, "Choose Starter or Pro.");
      return { action: "set_plan", plan: body.plan };
    case "comp":
      return { action: "comp", on: body.on === true };
    case "suspend":
    case "reactivate":
      return { action: body.action };
    case "graphics":
      if (typeof body.pack !== "string" || !PACKS.some((p) => p.id === body.pack && p.premium)) throw new OwnerActionError(400, "That isn't a premium graphics pack.");
      return { action: "graphics", pack: body.pack, on: body.on === true };
    default:
      throw new OwnerActionError(400, "Unknown action.");
  }
}

/** Apply it and record it. Returns a short description for the history. */
export async function applyAction(env: DB, tenantId: string, a: OwnerAction, owner: { id: string; email: string | null }, now = Date.now()): Promise<string> {
  const club = await env.DB.prepare(`SELECT status, trial_ends_at FROM tenants WHERE id = ?`).bind(tenantId).first<{ status: string; trial_ends_at: number | null }>();
  if (!club) throw new OwnerActionError(404, "Club not found.");
  const nowSec = Math.floor(now / 1000);
  let detail: string;
  switch (a.action) {
    case "extend_trial": {
      // trial_ends_at is in seconds; extend from today if it had already run out.
      // A suspended club stays suspended: only "reactivate" lets it back in.
      const current = club.trial_ends_at ? (club.trial_ends_at > 100000000000 ? Math.floor(club.trial_ends_at / 1000) : club.trial_ends_at) : nowSec;
      const until = Math.max(current, nowSec) + a.days * 86400;
      await env.DB.prepare(`UPDATE tenants SET trial_ends_at = ?, status = CASE WHEN status = 'cancelled' THEN 'trial' ELSE status END, updated_at = ? WHERE id = ?`)
        .bind(until, nowSec, tenantId).run();
      detail = `Trial extended by ${a.days} days (to ${new Date(until * 1000).toISOString().slice(0, 10)})`;
      break;
    }
    case "set_plan":
      await env.DB.prepare(`UPDATE tenants SET plan = ?, updated_at = ? WHERE id = ?`).bind(a.plan, nowSec, tenantId).run();
      detail = `Plan set to ${PLANS[a.plan as keyof typeof PLANS].name}`;
      break;
    case "comp":
      await env.DB.prepare(`UPDATE tenants SET comped = ?, status = CASE WHEN ? = 1 AND status = 'trial' THEN 'active' ELSE status END, updated_at = ? WHERE id = ?`)
        .bind(a.on ? 1 : 0, a.on ? 1 : 0, nowSec, tenantId).run();
      detail = a.on ? "Free access given" : "Free access removed";
      break;
    case "suspend":
      await env.DB.prepare(`UPDATE tenants SET status = 'suspended', updated_at = ? WHERE id = ?`).bind(nowSec, tenantId).run();
      // Everyone at the club is signed out straight away
      await revokeAllTenantTokens(env as never, tenantId, "suspended_by_owner", SUSPEND_BLOCK_SECONDS);
      detail = "Club suspended";
      break;
    case "reactivate":
      await env.DB.prepare(`UPDATE tenants SET status = CASE WHEN comped = 1 OR subscription_status = 'active' THEN 'active' ELSE 'trial' END,
        trial_ends_at = CASE WHEN comped = 1 OR subscription_status = 'active' THEN trial_ends_at ELSE MAX(COALESCE(trial_ends_at, 0), ?) END, updated_at = ? WHERE id = ?`)
        .bind(nowSec + 7 * 86400, nowSec, tenantId).run();
      await unrevokeTenantTokens(env as never, tenantId);
      detail = "Club reactivated";
      break;
    case "graphics":
      if (a.on) {
        await env.DB.prepare(`INSERT INTO graphics_unlocks (tenant_id, pack_id, source, unlocked_by, unlocked_at) VALUES (?, ?, 'owner', ?, ?) ON CONFLICT(tenant_id, pack_id) DO NOTHING`)
          .bind(tenantId, a.pack, owner.email ?? owner.id, now).run();
      } else {
        await env.DB.prepare(`DELETE FROM graphics_unlocks WHERE tenant_id = ? AND pack_id = ?`).bind(tenantId, a.pack).run();
      }
      detail = `${PACKS.find((p) => p.id === a.pack)?.name ?? a.pack} graphics ${a.on ? "unlocked" : "locked"}`;
      break;
  }
  await env.DB.prepare(`INSERT INTO owner_audit (id, owner_id, owner_email, tenant_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), owner.id, owner.email, tenantId, a.action, detail, now).run();
  console.log(JSON.stringify({ level: "info", msg: "owner_action", tenantId, action: a.action }));
  return detail;
}
