// backend/src/services/invites.ts
import { nanoid, kvGetJSON, kvPutJSON, nowMs, expMs, assert, badReq } from "./util";
import type { Env } from "../types";

export type InviteRole =
  | "club_admin"
  | `team_manager:${string}`
  | `coach:${string}`
  | "parent"
  | "player"
  | "volunteer";

export interface Invite {
  token: string;
  tenantId: string;
  teamId?: string;
  role: InviteRole;
  maxUses: number;
  used: number;
  exp: number;
  createdBy: string;
  createdAt: number;
}

const INVITES = (token: string) => `invites/${token}`;

export async function createInvite(
  env: Env,
  args: {
    tenant: string;
    teamId?: string;
    role: InviteRole | "team_manager" | "coach"; // allow simple values then normalize
    maxUses?: number;
    ttl_minutes?: number;
    createdBy: string;
  }
) {
  assert(args.tenant, "tenant required");
  assert(args.role, "role required");

  let normalizedRole: InviteRole = args.role as InviteRole;
  if (args.role === "team_manager") {
    assert(args.teamId, "teamId required for team_manager role");
    normalizedRole = `team_manager:${args.teamId}` as InviteRole;
  }
  if (args.role === "coach") {
    assert(args.teamId, "teamId required for coach role");
    normalizedRole = `coach:${args.teamId}` as InviteRole;
  }

  const token = nanoid(24);
  const invite: Invite = {
    token,
    tenantId: args.tenant,
    teamId: args.teamId,
    role: normalizedRole,
    maxUses: Math.max(1, args.maxUses ?? 50),
    used: 0,
    exp: expMs(args.ttl_minutes ?? 60 * 24 * 7), // default 7 days
    createdBy: args.createdBy,
    createdAt: nowMs(),
  };

  await env.KV_IDEMP.put(INVITES(token), JSON.stringify(invite), {
    expirationTtl: Math.ceil((invite.exp - nowMs()) / 1000),
  });

  const inviteUrl = `${env.SETUP_URL.replace(/\/$/, "")}/join?token=${encodeURIComponent(token)}`;
  return { ok: true as const, token, inviteUrl, invite };
}

export async function getInvite(env: Env, token: string) {
  const invite = await kvGetJSON<Invite>(env.KV_IDEMP, INVITES(token));
  if (!invite) throw badReq("invite not found");
  return invite;
}

// IMPORTANT: this function must be atomic enough for maxUses
// In KV we do: read → check → update. Good enough for low contention.
// If you later move to D1, enforce transactionally.
export async function consumeInvite(env: Env, token: string) {
  const key = INVITES(token);
  const invite = await kvGetJSON<Invite>(env.KV_IDEMP, key);
  if (!invite) throw badReq("invalid token");
  if (invite.exp < nowMs()) throw badReq("token expired");
  if (invite.used >= invite.maxUses) throw badReq("token fully used");

  invite.used += 1;
  await kvPutJSON(env.KV_IDEMP, key, invite);
  return invite;
}
