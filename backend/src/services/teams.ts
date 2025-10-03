// backend/src/services/teams.ts
import { kvGetJSON, kvPutJSON, kvListJSON, assert } from "./util";
import type { Env } from "../types";

export interface Team {
  tenantId: string;
  teamId: string;
  name: string;
  ageGroup?: string;
  coaches: string[]; // userIds
  createdAt: number;
}

const TEAM_KEY = (tenant: string, teamId: string) => `teams/${tenant}/${teamId}`;
const TEAM_PREFIX = (tenant: string) => `teams/${tenant}/`;

export async function createTeam(
  env: Env,
  args: {
    tenant: string;
    teamId: string;
    name: string;
    ageGroup?: string;
  }
) {
  assert(args.tenant && args.teamId && args.name, "tenant, teamId, name required");

  const key = TEAM_KEY(args.tenant, args.teamId);
  const existing = await kvGetJSON<Team>(env.KV_IDEMP, key);
  if (existing) return existing;

  const team: Team = {
    tenantId: args.tenant,
    teamId: args.teamId,
    name: args.name,
    ageGroup: args.ageGroup,
    coaches: [],
    createdAt: Date.now(),
  };
  await kvPutJSON(env.KV_IDEMP, key, team);
  return team;
}

export async function getTeam(env: Env, tenant: string, teamId: string) {
  return await kvGetJSON<Team>(env.KV_IDEMP, TEAM_KEY(tenant, teamId));
}

export async function listTeams(env: Env, tenant: string) {
  const items = await kvListJSON<Team>(env.KV_IDEMP, TEAM_PREFIX(tenant));
  return items;
}
