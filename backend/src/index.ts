// src/index.ts

import { z } from "zod";
import { SignJWT } from "jose";
import { Router } from "itty-router";
import { PostReqSchema, json, readIdempotencyKey } from "./services/util";
import { requireJWT, hasRole, requireAdmin } from "./services/auth";
import { ensureIdempotent, setFinalIdempotent } from "./services/idempotency";
import {
  ensureTenant,
  setMakeWebhook,
  updateFlags,
  putTenantConfig,
  getTenantConfig,
  setTenantFlags,
  setChannelWebhook,
  setYouTubeBYOGoogle,
  isAllowedWebhookHost
} from "./services/tenantConfig";
import { issueTenantAdminJWT } from "./services/jwt";
import type { TenantConfig, PostJob } from "./types";
import queueWorker from "./queue-consumer";
import {
  putEvent,
  getEvent,
  deleteEvent,
  listEvents,
  setRsvp,
  getRsvp,
  addCheckin,
  listCheckins
} from "./services/events";
import { registerDevice, sendToUser } from "./services/push";
import * as Invites from "./services/invites";
import * as Teams from "./services/teams";
import * as ChatKV from "./services/chatKV";
import * as GalleryKV from "./services/galleryKV";
import { provisionTenant } from "./services/provisioning";
import { withSecurity } from "./middleware/securityHeaders";
import { corsHeaders, isPreflight } from "./middleware/cors";
import { rateLimit } from "./middleware/rateLimit";
import { newRequestId, logJSON } from "./lib/log";
import { parse, isValidationError } from "./lib/validate";
import { healthz, readyz } from "./routes/health";

// --- Self-serve signup / usage / admin (Phase 3) ---
import {
  signupStart,
  signupBrand,
  signupStarterMake,
  signupProConfirm
} from "./routes/signup";
import { handleMagicStart, handleMagicVerify } from "./routes/magic";
import {
  handleProvisionQueue,
  handleProvisionStatus,
  handleTenantOverview,
  handleProvisionRetry
} from "./routes/provisioning";
import { registerTenantRoutes } from "./routes/tenants";
import {
  handleDevAdminJWT,
  handleDevMagicLink,
  handleDevInfo
} from "./routes/devAuth";
import {
  getAdminStats,
  listTenants,
  getTenant,
  updateTenant,
  deactivateTenant,
  deleteTenant,
  listPromoCodes,
  createPromoCode,
  deactivatePromoCode,
  listUsers
} from "./routes/admin";

// Auth routes (from other branch)
import { handleAuthRegister, handleAuthLogin } from "./routes/auth";

declare const APP_VERSION: string;

const router = Router();
registerTenantRoutes(router);

const DEV_DEFAULT_CORS = new Set([
  "https://localhost:5173",
  "http://localhost:5173",
  "https://localhost:3000",
  "http://localhost:3000",
  "capacitor://localhost",
]);

const SignupSchema = z.object({
  clubName: z.string().min(1, "clubName required"),
  clubShortName: z.string().min(1, "clubShortName required"),
  contactEmail: z.string().email("valid email required"),
  contactName: z.string().min(1, "contactName required"),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  plan: z.enum(["free", "managed", "enterprise"]).optional(),
  makeWebhookUrl: z.string().url().optional(),
  promoCode: z.string().optional()
});

const PostEventSchema = z.object({
  event_type: z.string().min(1, "event_type required"),
  data: z.record(z.unknown()),
  channels: z.array(z.enum(["yt", "fb", "ig", "tiktok", "x"])).optional(),
  template: z.string().optional()
});

const ValidFixtureStatuses = new Set([
  "scheduled",
  "live",
  "completed",
  "postponed",
  "cancelled"
]);

const FixtureSyncItemSchema = z.object({
  date: z.string().min(1, "date required"),
  homeTeam: z.string().min(1, "homeTeam required"),
  awayTeam: z.string().min(1, "awayTeam required"),
  opponent: z.string().min(1).optional(),
  venue: z.string().optional(),
  competition: z.string().optional(),
  time: z.string().optional(),
  status: z.enum([
    "scheduled",
    "live",
    "completed",
    "postponed",
    "cancelled"
  ]).optional(),
  source: z.string().optional(),
  homeScore: z.union([z.number(), z.string()]).nullable().optional(),
  awayScore: z.union([z.number(), z.string()]).nullable().optional()
});

export const FixtureSyncSchema = z
  .object({
    tenantId: z.string().min(1).optional(),
    tenantSlug: z.string().min(1).optional(),
    fixtures: z.array(FixtureSyncItemSchema)
  })
  .superRefine((value, ctx) => {
    if (!value.tenantId && !value.tenantSlug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "tenantId or tenantSlug is required"
      });
    }
  })
  .transform((value) => ({
    tenantId: value.tenantId ?? value.tenantSlug!,
    fixtures: value.fixtures
  }));

function normalizeFixtureStatus(status?: string | null) {
  const candidate = String(status || "")
    .toLowerCase()
    .trim();
  return ValidFixtureStatuses.has(candidate) ? candidate : "scheduled";
}

function toScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? Math.trunc(asNumber) : null;
}

function parseScorersField(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
      }
    } catch (err) {
      // Ignore JSON parse errors and fall back to string splitting
    }
    return trimmed
      .split(/[,;\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export function normalizeFixtureRow(row: any) {
  const status = normalizeFixtureStatus(row.status ?? row.match_status);
  const homeScore = toScore(row.homeScore ?? row.home_score);
  const awayScore = toScore(row.awayScore ?? row.away_score);

  return {
    id: String(row.id),
    date: String(row.date ?? row.fixture_date ?? ""),
    time: row.time ?? row.kickOffTime ?? row.kick_off_time || undefined,
    venue: row.venue || undefined,
    competition: row.competition || undefined,
    status,
    homeTeam: String(row.homeTeam ?? row.home_team ?? ""),
    awayTeam: String(row.awayTeam ?? row.away_team ?? ""),
    homeScore: homeScore ?? undefined,
    awayScore: awayScore ?? undefined,
    source: row.source || undefined
  };
}

export function normalizeResultRow(row: any) {
  const homeScore = toScore(row.homeScore ?? row.home_score) ?? 0;
  const awayScore = toScore(row.awayScore ?? row.away_score) ?? 0;
  const combinedScorers = [
    ...parseScorersField(row.home_scorers),
    ...parseScorersField(row.away_scorers)
  ];
  const legacyScorers = parseScorersField(row.scorers);
  const scorers = combinedScorers.length ? combinedScorers : legacyScorers;

  return {
    id: String(row.id),
    homeTeam: String(row.homeTeam ?? row.home_team ?? ""),
    awayTeam: String(row.awayTeam ?? row.away_team ?? ""),
    date: String(row.date ?? row.match_date ?? ""),
    venue: row.venue || undefined,
    competition: row.competition || undefined,
    status: "completed" as const,
    homeScore,
    awayScore,
    scorers: scorers.length ? scorers : undefined
  };
}

function buildRateLimitScope(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return "root";
  return segments.slice(0, 3).join(":");
}

function buildCorsHeaders(origin: string | null, env: any, requestId: string, release: string) {
  // Use the enhanced CORS middleware with env-aware origin checking
  const headers = corsHeaders(origin, env);

  // Add additional allowed headers for S3/R2 uploads
  const existingHeaders = headers.get("Access-Control-Allow-Headers") || "";
  const allowHeaders = new Set(
    existingHeaders
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
  );

  // Add S3/R2 specific headers and idempotency
  for (const hdr of [
    "Idempotency-Key",
    "idempotency-key",
    "x-amz-content-sha256",
    "x-amz-date",
    "x-amz-acl",
    "x-amz-meta-*",
  ]) {
    if (hdr) allowHeaders.add(hdr);
  }

  headers.set("Access-Control-Allow-Headers", Array.from(allowHeaders).join(","));
  headers.set("Access-Control-Expose-Headers", "X-Request-Id, X-Release");
  headers.set("X-Request-Id", requestId);
  headers.set("X-Release", release);
  return headers;
}

function mergeHeaders(base: Headers, extra?: HeadersInit) {
  const merged = new Headers(base);
  if (extra) {
    const addition = new Headers(extra);
    addition.forEach((value, key) => merged.set(key, value));
  }
  return merged;
}

function respondWithCors(res: Response, base: Headers) {
  const headers = mergeHeaders(base, res.headers);
  return new Response(res.body, withSecurity({ status: res.status, headers }));
}

type TenantRow = { id: string; slug: string; name?: string | null };
type PublicFixture = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time?: string;
  venue?: string | null;
  competition?: string | null;
  status: "scheduled" | "live" | "completed" | "postponed" | "cancelled";
  homeScore?: number;
  awayScore?: number;
};
type PublicResult = PublicFixture & {
  status: "completed";
  homeScore: number;
  awayScore: number;
  scorers?: string[];
};
type PublicFeedPost = {
  id: string;
  content: string;
  author?: string | null;
  timestamp: string;
  media?: string[];
  channels?: Record<string, boolean>;
};
type PublicTeamStats = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets?: number;
};
type PublicPlayer = {
  id: string;
  name: string;
  number?: number;
  position?: string;
  photo?: string;
  stats?: Record<string, number>;
};

async function resolveTenantRecord(env: any, tenantSlugOrId: string): Promise<TenantRow | null> {
  const lookup = tenantSlugOrId.trim();
  if (!lookup) return null;

  const bySlug = await env.DB.prepare<
    TenantRow
  >(`SELECT id, slug, name FROM tenants WHERE LOWER(slug) = LOWER(?) LIMIT 1`)
    .bind(lookup)
    .first();
  if (bySlug) return bySlug;

  const byId = await env.DB.prepare<TenantRow>(
    `SELECT id, slug, name FROM tenants WHERE id = ? LIMIT 1`
  )
    .bind(lookup)
    .first();
  if (byId) return byId;

  try {
    const cfgRaw = await env.KV_IDEMP.get(`tenant:${lookup}`);
    if (cfgRaw) {
      const parsed = JSON.parse(cfgRaw);
      if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
        return {
          id: parsed.id,
          slug: typeof parsed.slug === "string" ? parsed.slug : lookup,
          name: typeof parsed.name === "string" ? parsed.name : parsed.clubName || null,
        };
      }
    }
  } catch (err) {
    console.warn("TENANT_RESOLVE_KV_FAIL", { tenant: lookup, error: String(err) });
  }

  return null;
}

function toIsoDate(dateValue: any, timeValue?: any): string {
  if (typeof dateValue === "number") {
    const d = new Date(dateValue);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (typeof dateValue === "string" && dateValue) {
    if (/^\d{13}$/.test(dateValue)) {
      const d = new Date(Number(dateValue));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    if (dateValue.includes("T")) {
      const d = new Date(dateValue);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    const normalizedTime = typeof timeValue === "string" && timeValue
      ? timeValue.length === 5
        ? `${timeValue}:00`
        : timeValue
      : "00:00:00";
    for (const suffix of ["", "Z"]) {
      const candidate = `${dateValue}T${normalizedTime}${suffix}`;
      const d = new Date(candidate);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  const fallback = new Date();
  return fallback.toISOString();
}

function normaliseStatus(raw?: string | null): PublicFixture["status"] {
  const value = (raw || "").toString().toLowerCase();
  if (["ft", "full-time", "finished", "final", "completed"].includes(value)) return "completed";
  if (["live", "in_progress", "in-play", "ongoing"].includes(value)) return "live";
  if (["postponed", "delayed"].includes(value)) return "postponed";
  if (["cancelled", "canceled", "abandoned"].includes(value)) return "cancelled";
  return "scheduled";
}

function mapFixtureRow(row: any, tenantName?: string | null): PublicFixture {
  const iso = toIsoDate(row.fixture_date ?? row.date ?? row.kickoffIso ?? row.kickoff ?? row.match_date, row.kick_off_time ?? row.kickOffTime ?? row.time);
  const status = normaliseStatus(row.match_status ?? row.matchStatus ?? row.status);
  const homeTeam =
    row.home_team ??
    row.homeTeam ??
    (status === "completed" && typeof row.home_score === "number" && typeof row.away_score === "number"
      ? tenantName ?? "Home"
      : tenantName ?? "Home");
  const awayTeam = row.away_team ?? row.awayTeam ?? row.opponent ?? "Opponent";
  const result: PublicFixture = {
    id: String(row.id ?? row.uuid ?? crypto.randomUUID()),
    homeTeam,
    awayTeam,
    date: iso,
    venue: row.venue ?? null,
    competition: row.competition ?? null,
    status,
  };
  const timeValue = row.kick_off_time ?? row.kickOffTime ?? row.time ?? null;
  if (timeValue) result.time = String(timeValue);
  const homeScore = row.home_score ?? row.homeScore ?? row.our_score ?? row.ourScore;
  const awayScore = row.away_score ?? row.awayScore ?? row.their_score ?? row.theirScore;
  if (homeScore !== undefined && homeScore !== null && !Number.isNaN(Number(homeScore))) {
    result.homeScore = Number(homeScore);
  }
  if (awayScore !== undefined && awayScore !== null && !Number.isNaN(Number(awayScore))) {
    result.awayScore = Number(awayScore);
  }
  if (result.homeScore !== undefined || result.awayScore !== undefined) {
    result.status = "completed";
  }
  return result;
}

function mapResultRow(row: any, tenantName?: string | null): PublicResult {
  const base = mapFixtureRow(
    {
      ...row,
      fixture_date: row.match_date ?? row.date,
      kick_off_time: row.kick_off_time ?? row.time,
      home_team: tenantName ?? row.home_team,
      away_team: row.away_team ?? row.opponent,
      home_score: row.our_score ?? row.home_score,
      away_score: row.their_score ?? row.away_score,
      status: "completed",
      match_status: "completed",
    },
    tenantName
  );

  const scorersRaw = row.scorers ?? row.goal_scorers ?? null;
  const scorers = typeof scorersRaw === "string"
    ? scorersRaw
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : Array.isArray(scorersRaw)
    ? scorersRaw.filter(Boolean).map((s) => String(s))
    : undefined;

  return {
    ...base,
    status: "completed",
    homeScore: base.homeScore ?? Number(row.our_score ?? 0),
    awayScore: base.awayScore ?? Number(row.their_score ?? 0),
    ...(scorers && scorers.length ? { scorers } : {}),
  };
}

function mapFeedRow(row: any): PublicFeedPost {
  const timestamp = toIsoDate(row.created_at ?? row.createdAt ?? Date.now(), null);
  const mediaSource = row.image_url ?? row.media_url ?? row.media;
  let media: string[] | undefined;
  if (Array.isArray(mediaSource)) {
    media = mediaSource.map((m) => String(m));
  } else if (typeof mediaSource === "string" && mediaSource.trim()) {
    media = [mediaSource.trim()];
  }
  return {
    id: String(row.id ?? row.uuid ?? crypto.randomUUID()),
    content: String(row.content ?? row.title ?? ""),
    author: row.author ?? row.created_by ?? null,
    timestamp,
    media,
    channels: row.channels && typeof row.channels === "object" ? row.channels : undefined,
  };
}

function buildTeamStats(rows: any[]): PublicTeamStats {
  const stats: PublicTeamStats = {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    cleanSheets: 0,
  };

  for (const row of rows) {
    const our = Number(row.our_score ?? row.home_score ?? row.homeScore ?? 0);
    const their = Number(row.their_score ?? row.away_score ?? row.awayScore ?? 0);
    if (Number.isNaN(our) || Number.isNaN(their)) continue;
    stats.played += 1;
    stats.goalsFor += our;
    stats.goalsAgainst += their;
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
    if (our > their) stats.won += 1;
    else if (our === their) stats.drawn += 1;
    else stats.lost += 1;
    if (their === 0) stats.cleanSheets = (stats.cleanSheets ?? 0) + 1;
  }

  return stats;
}

function mapSquadPlayers(raw: any[]): PublicPlayer[] {
  return raw
    .map((player) => {
      if (!player) return null;
      const stats: Record<string, number> = {};
      for (const key of ["appearances", "goals", "assists", "yellowCards", "redCards"]) {
        if (player[key] !== undefined && player[key] !== null && !Number.isNaN(Number(player[key]))) {
          stats[key] = Number(player[key]);
        }
      }
      return {
        id: String(player.id ?? player.player_id ?? crypto.randomUUID()),
        name: String(player.name ?? player.fullName ?? "Player"),
        number: player.number !== undefined && player.number !== null ? Number(player.number) : undefined,
        position: player.position ?? player.role ?? undefined,
        photo: player.photo ?? player.image_url ?? undefined,
        stats: Object.keys(stats).length ? stats : undefined,
      } as PublicPlayer;
    })
    .filter(Boolean) as PublicPlayer[];
}

async function handlePublicTenantRequest(
  req: Request,
  env: any,
  url: URL,
  corsHdrs: Headers,
  requestId: string
): Promise<Response | null> {
  if (req.method !== "GET") return null;
  if (!url.pathname.startsWith("/public/")) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return json({ success: false, error: { code: "NOT_FOUND", message: "Invalid public route" } }, 404, corsHdrs);
  }

  const tenantSlug = decodeURIComponent(segments[1]);
  let tenant: TenantRow | null = null;
  try {
    tenant = await resolveTenantRecord(env, tenantSlug);
  } catch (err) {
    logJSON("error", requestId, { message: "TENANT_RESOLVE_FAIL", tenant: tenantSlug, error: String(err) });
    return json({ success: false, error: { code: "INTERNAL", message: "Failed to resolve tenant" } }, 500, corsHdrs);
  }

  if (!tenant) {
    return json({ success: false, error: { code: "TENANT_NOT_FOUND", message: "Unknown tenant" } }, 404, corsHdrs);
  }

  const resource = segments[2] || "fixtures";

  try {
    if (resource === "fixtures" && segments[3] === "next") {
      const row = await env.DB.prepare(
        `SELECT
            id,
            fixture_date,
            opponent,
            venue,
            competition,
            kick_off_time,
            status,
            match_status,
            home_team,
            away_team,
            home_score,
            away_score
         FROM fixtures
         WHERE tenant_id = ?
           AND fixture_date >= DATE('now')
           AND (status IS NULL OR status != 'postponed')
         ORDER BY fixture_date ASC, COALESCE(kick_off_time, '23:59') ASC
         LIMIT 1`
      )
        .bind(tenant.id)
        .first();

      const fixture = row ? mapFixtureRow(row, tenant.name ?? tenant.slug) : null;
      return json({ success: true, data: fixture }, 200, corsHdrs);
    }

    if (resource === "fixtures") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 50);
      const statusParam = (url.searchParams.get("status") || url.searchParams.get("type") || "").toLowerCase();

      if (["completed", "result", "results"].includes(statusParam)) {
        const results = await env.DB.prepare(
          `SELECT id, tenant_id, match_date, competition, opponent, venue, our_score, their_score, scorers
             FROM team_results
             WHERE tenant_id = ?
             ORDER BY match_date DESC
             LIMIT ?`
        )
          .bind(tenant.id, limit)
          .all();

        const mapped = (results.results || []).map((row: any) => mapResultRow(row, tenant.name ?? tenant.slug));
        return json({ success: true, data: mapped }, 200, corsHdrs);
      }

      const rows = await env.DB.prepare(
        `SELECT
            id,
            fixture_date,
            opponent,
            venue,
            competition,
            kick_off_time,
            status,
            match_status,
            home_team,
            away_team,
            home_score,
            away_score
         FROM fixtures
         WHERE tenant_id = ?
           AND fixture_date >= DATE('now', '-7 days')
         ORDER BY fixture_date ASC, COALESCE(kick_off_time, '23:59') ASC
         LIMIT ?`
      )
        .bind(tenant.id, limit)
        .all();

      const fixtures = (rows.results || []).map((row: any) => mapFixtureRow(row, tenant.name ?? tenant.slug));
      return json({ success: true, data: fixtures }, 200, corsHdrs);
    }

    if (resource === "feed") {
      const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
      const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || url.searchParams.get("limit") || "10", 10) || 10, 50);
      const offset = (page - 1) * pageSize;
      const rows = await env.DB.prepare(
        `SELECT id, tenant_id, title, content, author, image_url, created_at
           FROM feed_posts
           WHERE tenant_id = ?
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?`
      )
        .bind(tenant.id, pageSize, offset)
        .all();

      const posts = (rows.results || []).map((row: any) => mapFeedRow(row));
      return json({ success: true, data: posts }, 200, corsHdrs);
    }

    if (resource === "table") {
      const competition = url.searchParams.get("competition");
      const stmt = competition
        ? env.DB.prepare(
            `SELECT position, team_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points
               FROM league_standings
               WHERE tenant_id = ? AND competition = ?
               ORDER BY position ASC`
          ).bind(tenant.id, competition)
        : env.DB.prepare(
            `SELECT position, team_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points
               FROM league_standings
               WHERE tenant_id = ?
               ORDER BY competition ASC, position ASC`
          ).bind(tenant.id);

      const rows = await stmt.all();
      const table = (rows.results || []).map((row: any) => ({
        position: Number(row.position ?? 0),
        team: String(row.team_name ?? row.team ?? ""),
        played: Number(row.played ?? 0),
        won: Number(row.won ?? 0),
        drawn: Number(row.drawn ?? 0),
        lost: Number(row.lost ?? 0),
        goalsFor: Number(row.goals_for ?? 0),
        goalsAgainst: Number(row.goals_against ?? 0),
        goalDifference: Number(row.goal_difference ?? (row.goals_for ?? 0) - (row.goals_against ?? 0)),
        points: Number(row.points ?? 0),
      }));
      return json({ success: true, data: table }, 200, corsHdrs);
    }

    if (resource === "stats") {
      const rows = await env.DB.prepare(
        `SELECT tenant_id, match_date, our_score, their_score
           FROM team_results
           WHERE tenant_id = ?
           ORDER BY match_date DESC
           LIMIT 100`
      )
        .bind(tenant.id)
        .all();

      const stats = buildTeamStats(rows.results || []);
      return json({ success: true, data: stats }, 200, corsHdrs);
    }

    if (resource === "squad") {
      const raw = (await env.KV_IDEMP.get(`squad:${tenant.id}:list`, "json")) as any[] | null;
      const squad = raw ? mapSquadPlayers(raw) : [];
      return json({ success: true, data: squad }, 200, corsHdrs);
    }

    return json({ success: false, error: { code: "NOT_FOUND", message: "Unknown public resource" } }, 404, corsHdrs);
  } catch (err) {
    logJSON("error", requestId, {
      message: "PUBLIC_ROUTE_FAIL",
      tenant: tenant.id,
      resource,
      error: String(err),
    });
    return json({ success: false, error: { code: "INTERNAL", message: "Failed to load tenant data" } }, 500, corsHdrs);
  }
}

// Export the Durable Object classes so the binding works
export { TenantRateLimiter } from "./do/rateLimiter";
export { VotingRoom } from "./do/votingRoom";
export { MatchRoom } from "./do/matchRoom";
export { ChatRoom } from "./do/chatRoom";
export { GeoFenceManager } from "./do/geoFenceManager";
export { Provisioner } from "./do/provisioner";

export default {
  async fetch(req: Request, env: any, _ctx: ExecutionContext): Promise<Response> {
    const t0 = Date.now();
    const requestId = newRequestId();
    const origin = req.headers.get("Origin");
    const release = typeof APP_VERSION === "string" ? APP_VERSION : "unknown";
    const corsHdrs = buildCorsHeaders(origin, env, requestId, release);
    let url: URL | null = null;

    if (isPreflight(req)) {
      return new Response(null, withSecurity({ status: 204, headers: mergeHeaders(corsHdrs) }));
    }

    try {
      url = new URL(req.url);

      if (req.method === "GET" && url.pathname === "/healthz") {
        const res = await healthz();
        return respondWithCors(res, corsHdrs);
      }
      if (req.method === "GET" && url.pathname === "/readyz") {
        const res = await readyz(env);
        return respondWithCors(res, corsHdrs);
      }

      if (req.method === "GET" && url.pathname.startsWith("/public/")) {
        const res = await handlePublicTenantRequest(req, env, url, corsHdrs, requestId);
        if (res) return res;
      }

      const routed = await router
        .handle(req, env, corsHdrs, requestId)
        .catch((err: unknown) => {
          if (err instanceof Response) return err;
          throw err;
        });
      if (routed instanceof Response) {
        return respondWithCors(routed, corsHdrs);
      }

      // Introspection endpoint for debugging
      if (url.pathname === '/__meta/ping') {
        return new Response(JSON.stringify({
          ok: true,
          method: req.method,
          pathname: url.pathname,
          search: url.search,
          fullUrl: url.href,
          apiVersion: env.API_VERSION || "v1"
        }), {
          status: 200,
          headers: { 'content-type': 'application/json', ...corsHdrs }
        });
      }

      // -------- DEV-ONLY: Admin Token Minting --------
      // POST /internal/dev/admin-token - Mint admin JWT for development
      if (url.pathname === '/internal/dev/admin-token' && req.method === 'POST') {
        const environment = env.ENVIRONMENT || 'development';

        // Block in production
        if (environment === 'production') {
          return json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'This endpoint is disabled in production' }
          }, 403, corsHdrs);
        }

        try {
          const body = await req.json().catch(() => ({}));
          const schema = z.object({
            email: z.string().email()
          });
          const data = schema.parse(body);

          // Mint JWT with owner role
          const secret = new TextEncoder().encode(env.JWT_SECRET || '');
          if (!env.JWT_SECRET) {
            throw new Error('JWT_SECRET not configured');
          }

          const now = Math.floor(Date.now() / 1000);
          const exp = now + (7 * 24 * 60 * 60); // 7 days

          const token = await new SignJWT({
            sub: data.email,
            roles: ['admin']
          })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuer(env.JWT_ISSUER || 'syston.app')
            .setAudience(env.JWT_AUDIENCE || 'syston-mobile')
            .setIssuedAt(now)
            .setExpirationTime(exp)
            .sign(secret);

          return json({
            success: true,
            token,
            expiresAt: new Date(exp * 1000).toISOString()
          }, 200, corsHdrs);
        } catch (err: any) {
          if (err.errors) {
            return json({
              success: false,
              error: { code: 'VALIDATION', details: err.errors }
            }, 400, corsHdrs);
          }
          return json({
            success: false,
            error: { code: 'TOKEN_MINT_FAILED', message: String(err?.message || err) }
          }, 500, corsHdrs);
        }
      }

      const v = env.API_VERSION || "v1";

      const method = req.method.toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        const scope = buildRateLimitScope(url.pathname);
        const limitResult = await rateLimit(req, env, {
          scope,
          requestId,
          path: url.pathname
        });

        if (!limitResult.ok) {
          const headers = new Headers(corsHdrs);
          if (typeof limitResult.retryAfter === "number") {
            headers.set("Retry-After", String(limitResult.retryAfter));
          }
          if (typeof limitResult.limit === "number") {
            headers.set("X-RateLimit-Limit", String(limitResult.limit));
          }
          headers.set("X-RateLimit-Remaining", "0");
          return json({
            success: false,
            error: { code: "RATE_LIMITED", message: "Too many requests" }
          }, 429, headers);
        }

        if (typeof limitResult.limit === "number") {
          corsHdrs.set("X-RateLimit-Limit", String(limitResult.limit));
        }
        if (typeof limitResult.remaining === "number") {
          corsHdrs.set("X-RateLimit-Remaining", String(Math.max(limitResult.remaining, 0)));
        }
      }

      if (url.pathname === `/api/${v}/auth/register` && req.method === "POST") {
        return await handleAuthRegister(req, env, corsHdrs);
      }

      if (url.pathname === `/api/${v}/auth/login` && req.method === "POST") {
        return await handleAuthLogin(req, env, corsHdrs);
      }

    // -------- Public signup endpoint --------

    // POST /api/v1/signup - Automated tenant provisioning
    if (url.pathname === `/api/${v}/signup` && req.method === "POST") {
      try {
        const body = await req.json().catch(() => ({}));
        const data = parse(SignupSchema, body);
        const result = await provisionTenant(env, data);

        if (result.success) {
          return json({ success: true, data: result.tenant }, 200, corsHdrs);
        } else {
          return json({ success: false, error: result.error }, 400, corsHdrs);
        }
      } catch (err: any) {
        if (isValidationError(err)) {
          return json({
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Validation failed",
              issues: err.issues
            }
          }, err.status, corsHdrs);
        }
        return json({ success: false, error: { code: "SIGNUP_FAILED", message: err.message } }, 500, corsHdrs);
      }
    }
    // -------- Phase 3: Self-Serve Signup (Public) --------

    // POST /public/signup/start - Create new tenant account
    if (url.pathname === `/public/signup/start` && req.method === "POST") {
      return await signupStart(req, env, requestId, corsHdrs);
    }

    // POST /public/signup/brand - Customize brand colors
    if (url.pathname === `/public/signup/brand` && req.method === "POST") {
      return await signupBrand(req, env, requestId, corsHdrs);
    }

    // POST /public/signup/starter/make - Configure Make.com webhook (Starter plan)
    if (url.pathname === `/public/signup/starter/make` && req.method === "POST") {
      return await signupStarterMake(req, env, requestId, corsHdrs);
    }

    // POST /public/signup/pro/confirm - Confirm Pro plan setup
    if (url.pathname === `/public/signup/pro/confirm` && req.method === "POST") {
      return await signupProConfirm(req, env, requestId, corsHdrs);
    }

    // -------- Magic Link Authentication --------
    // POST /auth/magic/start - Send magic link email
    if (url.pathname === '/auth/magic/start' && req.method === 'POST') {
      return await handleMagicStart(req, env, corsHdrs);
    }

    // GET /auth/magic/verify - Verify magic link token
    if (url.pathname === '/auth/magic/verify' && req.method === 'GET') {
      return await handleMagicVerify(req, env, corsHdrs);
    }

    // -------- Dev Authentication (Development Only) --------
    // POST /dev/auth/admin-jwt - Generate admin JWT for testing
    if (url.pathname === '/dev/auth/admin-jwt' && req.method === 'POST') {
      return await handleDevAdminJWT(req, env);
    }

    // POST /dev/auth/magic-link - Generate magic link for testing
    if (url.pathname === '/dev/auth/magic-link' && req.method === 'POST') {
      return await handleDevMagicLink(req, env);
    }

    // GET /dev/info - Get development environment info
    if (url.pathname === '/dev/info' && req.method === 'GET') {
      return await handleDevInfo(req, env);
    }

    // -------- Provisioning Routes (Internal) --------
    // POST /internal/provision/queue - Queue provisioning
    if (url.pathname === '/internal/provision/queue' && req.method === 'POST') {
      return await handleProvisionQueue(req, env);
    }

    // POST /internal/provision/retry - Retry failed provisioning
    if (url.pathname === '/internal/provision/retry' && req.method === 'POST') {
      return await handleProvisionRetry(req, env);
    }

    // GET /api/v1/tenants/:id/provision-status - Get provisioning status
    const provisionStatusMatch = url.pathname.match(/^\/api\/v1\/tenants\/([^/]+)\/provision-status$/);
    if (provisionStatusMatch && req.method === 'GET') {
      const tenantId = provisionStatusMatch[1];
      // TODO: Add auth check for owner session or admin
      return await handleProvisionStatus(req, env, tenantId);
    }

    // GET /api/v1/tenants/:id/overview - Get tenant overview
    const overviewMatch = url.pathname.match(/^\/api\/v1\/tenants\/([^/]+)\/overview$/);
    if (overviewMatch && req.method === 'GET') {
      const tenantId = overviewMatch[1];
      // TODO: Add auth check for owner session or admin
      return await handleTenantOverview(req, env, tenantId);
    }

    // -------- Phase 3: Usage Tracking --------
    // Simple monthly counters in KV: key = usage:<tenant>:<YYYY-MM>

    // GET /api/v1/usage
    if (url.pathname === `/api/${v}/usage` && req.method === "GET") {
      const tenant = (req.headers.get("x-tenant") || url.searchParams.get("tenant") || "default").toString();
      const now = new Date();
      const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
      const kvKey = `usage:${tenant}:${ym}`;
      const value = (await env.KV_IDEMP.get(kvKey, "json")) as any || { count: 0, month: ym };
      return json({ success:true, data:{ tenant, month: ym, count: Number(value.count||0) } }, 200, corsHdrs);
    }

    // POST /api/v1/usage/increment
    if (url.pathname === `/api/${v}/usage/increment` && req.method === "POST") {
      const tenant = (req.headers.get("x-tenant") || "default").toString();
      const now = new Date();
      const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
      const kvKey = `usage:${tenant}:${ym}`;
      const planKey = `tenant:${tenant}:plan`; // optional hint; fallback to cap if not present

      // Read current
      const current = (await env.KV_IDEMP.get(kvKey, "json")) as any || { count: 0, month: ym };
      let count = Number(current.count || 0) + 1;

      // Enforce 1,000/mo cap for Starter (non-managed) unless comped
      // We infer "managed" from flags (managed.yt = true => Pro)
      const cfg = await ensureTenant(env, tenant);
      const isPro = !!cfg?.flags?.managed?.yt;
      const comped = !!cfg?.flags?.comped;

      if (!isPro && !comped && count > 1000) {
        // do not increment beyond the cap
        return json({ success:false, error:{ code:'USAGE_CAP', message:'Monthly cap reached (1,000).' }, data:{ tenant, month: ym, count: count-1 } }, 402, corsHdrs);
      }

      await env.KV_IDEMP.put(kvKey, JSON.stringify({ count, month: ym }));
      return json({ success:true, data:{ tenant, month: ym, count } }, 200, corsHdrs);
    }

    // -------- Apps Script Integration --------

    // POST /api/v1/post - Receive events from Apps Script
    if (url.pathname === `/api/${v}/post` && req.method === "POST") {
      try {
        // Require authentication (automationJWT)
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenant_id || claims.tenantId;

        if (!tenantId) {
          return json({ success: false, error: "tenant_id required in JWT" }, 400, corsHdrs);
        }

        const body = await req.json().catch(() => ({}));
        const { event_type, data, channels, template } = parse(PostEventSchema, body);

        // Idempotency check
        const idemHeader = readIdempotencyKey(req);
        const idem = await ensureIdempotent(env, tenantId, body, idemHeader || undefined);
        if (idem.hit) {
          return json(idem.response, 200, corsHdrs);
        }

        // Create post job
        const job: PostJob = {
          tenant: tenantId,
          template: template || event_type,
          channels: channels || ["yt", "fb", "ig"],
          data: {
            ...data,
            event_type,
            timestamp: new Date().toISOString()
          },
          createdAt: Date.now(),
          idemKey: idem.key
        };

        // Queue the job
        await env.POST_QUEUE.send(job);

        const result = {
          success: true,
          queued: true,
          tenant: tenantId,
          event_type,
          job_id: idem.key
        };

        // Store idempotent response
        await idem.store(result);

        return json(result, 200, corsHdrs);

      } catch (err: any) {
        if (err instanceof Response) {
          return respondWithCors(err, corsHdrs);

        }
        if (isValidationError(err)) {
          return json({
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Validation failed",
              issues: err.issues
            }
          }, err.status, corsHdrs);
          
        }
        logJSON({
          level: "error",
          msg: `POST_EVENT_ERROR:${err?.message || "unknown"}`,
          requestId,
          path: url.pathname,
          status: 500,
        });
        return json({
          success: false,
          error: { code: "POST_FAILED", message: err.message }
        }, 500, corsHdrs);
      }
    }

    // Log admin console requests
    if (url.pathname.includes("/admin/")) {
      const fromAdminConsole = req.headers.get("x-admin-console") === "true";
      if (fromAdminConsole) {
        logJSON({
          level: "info",
          msg: "ADMIN_CONSOLE_CALL",
          requestId,
          path: url.pathname,
        });
      }
    }

    // -------- Admin debug endpoint --------

    // GET /api/v1/admin/whoami - Debug endpoint to verify JWT is valid/parsed
    if (url.pathname === `/api/${v}/admin/whoami` && req.method === "GET") {
      try {
        const claims = await requireJWT(req, env); // normalized claims
        return json({ ok: true, claims }, 200, corsHdrs);
      } catch (err: any) {
        // If requireJWT throws a Response object, return it directly
        if (err instanceof Response) {
          return respondWithCors(err, corsHdrs);
        }
        logJSON({
          level: "error",
          msg: `WHOAMI_FAIL:${err?.message || "unknown"}`,
          requestId,
          path: url.pathname,
          status: 401,
        });
        return json({ ok: false, error: String(err?.message || err) }, 401, corsHdrs);
      }
    }

    // -------- Admin endpoints --------

    // GET /api/v1/admin/stats - Dashboard statistics
    if (url.pathname === `/api/${v}/admin/stats` && req.method === "GET") {
      return await getAdminStats(req, env, requestId, corsHdrs);
    }

    // GET /api/v1/admin/users - List all users for a tenant
    if (url.pathname === `/api/${v}/admin/users` && req.method === "GET") {
      return await listUsers(req, env, requestId, corsHdrs);
    }

    // GET /api/v1/admin/tenants - List all tenants
    if (url.pathname === `/api/${v}/admin/tenants` && req.method === "GET") {
      return await listTenants(req, env, requestId, corsHdrs);
    }

    // GET /api/v1/admin/tenants/:id - Get tenant details
    const getTenantMatch = url.pathname.match(new RegExp(`^/api/${v}/admin/tenants/([^/]+)$`));
    if (getTenantMatch && req.method === "GET") {
      const tenantId = getTenantMatch[1];
      return await getTenant(req, env, requestId, corsHdrs, tenantId);
    }

    // PATCH /api/v1/admin/tenants/:id - Update tenant
    const updateTenantMatch = url.pathname.match(new RegExp(`^/api/${v}/admin/tenants/([^/]+)$`));
    if (updateTenantMatch && req.method === "PATCH") {
      const tenantId = updateTenantMatch[1];
      return await updateTenant(req, env, requestId, corsHdrs, tenantId);
    }

    // POST /api/v1/admin/tenants/:id/deactivate - Deactivate tenant
    const deactivateTenantMatch = url.pathname.match(new RegExp(`^/api/${v}/admin/tenants/([^/]+)/deactivate$`));
    if (deactivateTenantMatch && req.method === "POST") {
      const tenantId = deactivateTenantMatch[1];
      return await deactivateTenant(req, env, requestId, corsHdrs, tenantId);
    }

    // DELETE /api/v1/admin/tenants/:id - Delete tenant
    const deleteTenantMatch = url.pathname.match(new RegExp(`^/api/${v}/admin/tenants/([^/]+)$`));
    if (deleteTenantMatch && req.method === "DELETE") {
      const tenantId = deleteTenantMatch[1];
      return await deleteTenant(req, env, requestId, corsHdrs, tenantId);
    }

    // GET /api/v1/admin/promo-codes - List promo codes
    if (url.pathname === `/api/${v}/admin/promo-codes` && req.method === "GET") {
      return await listPromoCodes(req, env, requestId, corsHdrs);
    }

    // POST /api/v1/admin/promo-codes - Create promo code
    if (url.pathname === `/api/${v}/admin/promo-codes` && req.method === "POST") {
      return await createPromoCode(req, env, requestId, corsHdrs);
    }

    // POST /api/v1/admin/promo-codes/:code/deactivate - Deactivate promo code
    const deactivatePromoMatch = url.pathname.match(new RegExp(`^/api/${v}/admin/promo-codes/([^/]+)/deactivate$`));
    if (deactivatePromoMatch && req.method === "POST") {
      const code = deactivatePromoMatch[1];
      return await deactivatePromoCode(req, env, requestId, corsHdrs, code);
    }

    // POST /api/v1/admin/tenant/create
    if (url.pathname === `/api/${v}/admin/tenant/create` && req.method === "POST") {
      await requireAdmin(req, env); // throws 403 Response on failure
      const body = await req.json().catch(() => ({}));
      const schema = z.object({
        id: z.string().min(1, "id required"),
        name: z.string().optional(),
        locale: z.string().optional(),
        tz: z.string().optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const { id, name, locale, tz } = parsed.data;
      const cfg: TenantConfig = {
        id, name, locale, tz,
        flags: { use_make: false, direct_yt: true },
        makeWebhookUrl: null,
      };
      await putTenantConfig(env, cfg);
      return json({ success: true, data: { created: true, tenant: cfg } }, 200, corsHdrs);
    }

    // POST /api/v1/admin/tenant/webhook
    if (url.pathname === `/api/${v}/admin/tenant/webhook` && req.method === "POST") {
      try {
        await requireAdmin(req, env);
        const body = await req.json().catch(() => ({}));

        // Validate input
        const schema = z.object({
          tenant: z.string().min(1),
          make_webhook_url: z.string().url(),
        });
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);
        }

        const { tenant, make_webhook_url } = parsed.data;

        // Parse URL defensively
        let u: URL;
        try {
          u = new URL(make_webhook_url);
        } catch {
          return json({ success: false, error: { code: "VALIDATION", message: "Invalid URL format" } }, 400, corsHdrs);
        }

        // Validate host against allowlist
        const allowedCsv = (env.ALLOWED_WEBHOOK_HOSTS || "") + ",.make.com";
        if (!isAllowedWebhookHost(u.host, allowedCsv)) {
          return json({ success: false, error: { code: "VALIDATION", message: `Host ${u.host} not allowed` } }, 400, corsHdrs);
        }

        // Save webhook
        const updated = await setMakeWebhook(env, tenant, make_webhook_url);
        return json({ success: true, data: { tenant: updated.id, makeWebhookUrl: updated.makeWebhookUrl } }, 200, corsHdrs);
      } catch (e: any) {
        // If auth threw a Response, return it
        if (e instanceof Response) return respondWithCors(e, corsHdrs);

        // Log and return clean 500
        logJSON({
          level: "error",
          msg: `ADMIN_WEBHOOK_SAVE_ERROR:${e?.message || "unknown"}`,
          requestId,
          path: url.pathname,
          status: 500,
        });
        return json({ success: false, error: { code: "INTERNAL", message: "Webhook save failed" } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/admin/fixtures/refresh
    if (url.pathname === `/api/${v}/admin/fixtures/refresh` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const refreshUrl = env.FIXTURES_REFRESH_URL || "";
      if (!refreshUrl) return json({ success: true, data: { pinged: false, note: "No FIXTURES_REFRESH_URL set" } }, 200, corsHdrs);
      const r = await fetch(refreshUrl, { method: "POST" }).catch(() => null);
      const ok = !!r && r.ok;
      return json({ success: ok, data: { pinged: ok } }, ok ? 200 : 502, corsHdrs);
    }

    // -------- Fixtures API (Public) --------

    // POST /api/v1/fixtures/sync - Sync fixtures from Google Apps Script
    if (url.pathname === `/api/${v}/fixtures/sync` && req.method === "POST") {
      try {
        const body = await req.json().catch(() => ({}));
        const parsed = FixtureSyncSchema.safeParse(body);

        if (!parsed.success) {
          return json(
            {
              success: false,
              error: { code: "INVALID_DATA", message: parsed.error.issues[0]?.message || "Invalid payload" }
            },
            400,
            corsHdrs
          );
        }

        const { tenantId, fixtures } = parsed.data;

        if (!fixtures.length) {
          return json({ success: true, synced: 0 }, 200, corsHdrs);
        }

        let synced = 0;
        for (const fixture of fixtures) {
          try {
            const trimmedHome = fixture.homeTeam.trim();
            const trimmedAway = fixture.awayTeam.trim();
            let opponent = fixture.opponent?.trim() || '';
            if (!opponent) {
              opponent = trimmedAway || trimmedHome;
            }

            const status = normalizeFixtureStatus(fixture.status);
            const homeScore = toScore(fixture.homeScore);
            const awayScore = toScore(fixture.awayScore);
            const matchStatus = status === 'completed' ? 'ft' : status === 'live' ? 'live' : status;

            await env.DB.prepare(`
              INSERT INTO fixtures (
                tenant_id,
                fixture_date,
                opponent,
                venue,
                competition,
                kick_off_time,
                status,
                source,
                home_team,
                away_team,
                home_score,
                away_score,
                match_status,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(tenant_id, fixture_date, home_team, away_team)
              DO UPDATE SET
                venue = excluded.venue,
                competition = excluded.competition,
                kick_off_time = excluded.kick_off_time,
                status = excluded.status,
                source = excluded.source,
                home_score = excluded.home_score,
                away_score = excluded.away_score,
                match_status = excluded.match_status,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              tenantId,
              fixture.date,
              opponent,
              fixture.venue || '',
              fixture.competition || '',
              fixture.time || '',
              status,
              fixture.source || 'automation',
              trimmedHome,
              trimmedAway,
              homeScore ?? null,
              awayScore ?? null,
              matchStatus
            ).run();
            synced++;
          } catch (err) {
            logJSON("error", requestId, { message: "Fixture sync error", error: String(err) });
          }
        }

        return json({ success: true, synced }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Fixtures sync failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL", message: "Sync failed" } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/fixtures/upcoming - Get upcoming fixtures
    if (url.pathname === `/api/${v}/fixtures/upcoming` && req.method === "GET") {
      try {
        const tenantId =
          url.searchParams.get('tenant_id') ||
          url.searchParams.get('tenant') ||
          url.searchParams.get('tenantSlug') ||
          'default';

        const result = await env.DB.prepare(`
          SELECT
            id,
            fixture_date,
            kick_off_time,
            venue,
            competition,
            status,
            source,
            home_team,
            away_team,
            home_score,
            away_score
          FROM fixtures
          WHERE tenant_id = ?
            AND fixture_date >= DATE('now')
            AND status != 'postponed'
          ORDER BY fixture_date ASC, COALESCE(kick_off_time, '') ASC
          LIMIT 10
        `)
          .bind(tenantId)
          .all();

        const fixtures = (result.results || []).map((row) =>
          normalizeFixtureRow(row)
        );

        return json({ success: true, data: fixtures }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Get fixtures failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL" } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/fixtures/all - Get all fixtures
    if (url.pathname === `/api/${v}/fixtures/all` && req.method === "GET") {
      try {
        const tenantId =
          url.searchParams.get('tenant_id') ||
          url.searchParams.get('tenant') ||
          url.searchParams.get('tenantSlug') ||
          'default';

        const limitParam = url.searchParams.get('limit') || '50';
        const limit = Number.parseInt(limitParam, 10);
        if (!Number.isFinite(limit) || limit <= 0) {
          return json(
            { success: false, error: { code: "INVALID_LIMIT", message: "limit must be a positive integer" } },
            400,
            corsHdrs
          );
        }

        const statusParam = url.searchParams.get('status');
        let statusFilter: string | null = null;
        if (statusParam) {
          const lowered = statusParam.toLowerCase();
          if (!ValidFixtureStatuses.has(lowered)) {
            return json(
              {
                success: false,
                error: {
                  code: "INVALID_STATUS",
                  message: "status must be one of scheduled, live, completed, postponed, cancelled"
                }
              },
              400,
              corsHdrs
            );
          }
          statusFilter = lowered;
        }

        let query = `
          SELECT
            id,
            fixture_date,
            kick_off_time,
            venue,
            competition,
            status,
            source,
            home_team,
            away_team,
            home_score,
            away_score
          FROM fixtures
          WHERE tenant_id = ?
        `;

        const params: unknown[] = [tenantId];

        if (statusFilter) {
          query += ' AND status = ?';
          params.push(statusFilter);
        }

        query += ' ORDER BY fixture_date DESC, COALESCE(kick_off_time, '') DESC LIMIT ?';
        params.push(limit);

        const result = await env.DB.prepare(query).bind(...params).all();
        const fixtures = (result.results || []).map((row) => normalizeFixtureRow(row));

        return json({ success: true, data: fixtures }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Get all fixtures failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL" } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/fixtures/results - Get recent results
    if (url.pathname === `/api/${v}/fixtures/results` && req.method === "GET") {
      try {
        const tenantId =
          url.searchParams.get('tenant_id') ||
          url.searchParams.get('tenant') ||
          url.searchParams.get('tenantSlug') ||
          'default';

        const limitParam = url.searchParams.get('limit') || '10';
        const limit = Number.parseInt(limitParam, 10);
        if (!Number.isFinite(limit) || limit <= 0) {
          return json(
            { success: false, error: { code: "INVALID_LIMIT", message: "limit must be a positive integer" } },
            400,
            corsHdrs
          );
        }

        const result = await env.DB.prepare(`
          SELECT
            id,
            match_date,
            opponent,
            home_team,
            away_team,
            home_score,
            away_score,
            venue,
            competition,
            scorers,
            home_scorers,
            away_scorers
          FROM results
          WHERE tenant_id = ?
          ORDER BY match_date DESC
          LIMIT ?
        `)
          .bind(tenantId, limit)
          .all();

        const results = (result.results || []).map((row) => normalizeResultRow(row));

        return json({ success: true, data: results }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Get results failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL" } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/fixtures/results - Add a match result
    if (url.pathname === `/api/${v}/fixtures/results` && req.method === "POST") {
      try {
        const payload = await req.json().catch(() => ({}));

        const tenantId = String(payload.tenantId || payload.tenantSlug || '').trim();
        const matchDate = String(payload.date || payload.matchDate || '').trim();
        const homeTeam = String(payload.homeTeam || '').trim();
        const awayTeam = String(payload.awayTeam || '').trim();

        if (!tenantId || !matchDate || !homeTeam || !awayTeam) {
          return json(
            {
              success: false,
              error: {
                code: "INVALID_DATA",
                message: "tenantId, date, homeTeam, and awayTeam are required"
              }
            },
            400,
            corsHdrs
          );
        }

        const opponent = String(payload.opponent || awayTeam || homeTeam).trim();
        const homeScore = toScore(payload.homeScore) ?? 0;
        const awayScore = toScore(payload.awayScore) ?? 0;
        const homeScorersJson = JSON.stringify(parseScorersField(payload.homeScorers));
        const awayScorersJson = JSON.stringify(parseScorersField(payload.awayScorers));
        const combinedLegacy = parseScorersField(payload.scorers);
        if (!combinedLegacy.length) {
          combinedLegacy.push(
            ...parseScorersField(payload.homeScorers),
            ...parseScorersField(payload.awayScorers)
          );
        }
        const scorersText = combinedLegacy.join(', ');

        await env.DB.prepare(`
          INSERT INTO results (
            tenant_id,
            match_date,
            opponent,
            home_team,
            away_team,
            home_score,
            away_score,
            venue,
            competition,
            scorers,
            home_scorers,
            away_scorers,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(tenant_id, match_date, home_team, away_team)
          DO UPDATE SET
            opponent = excluded.opponent,
            home_score = excluded.home_score,
            away_score = excluded.away_score,
            venue = excluded.venue,
            competition = excluded.competition,
            scorers = excluded.scorers,
            home_scorers = excluded.home_scorers,
            away_scorers = excluded.away_scorers,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          tenantId,
          matchDate,
          opponent,
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
          payload.venue || '',
          payload.competition || '',
          scorersText,
          homeScorersJson,
          awayScorersJson
        ).run();

        return json({ success: true }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Add result failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL" } }, 500, corsHdrs);
      }
    }

    // -------- Fixture Settings (Admin/Public) --------

    // GET /api/v1/fixtures/settings - Get fixture sync settings
    if (url.pathname === `/api/${v}/fixtures/settings` && req.method === "GET") {
      try {
        const tenantId = url.searchParams.get('tenant_id') || 'default';

        const result = await env.DB.prepare(`
          SELECT
            tenant_id as tenantId,
            team_name as teamName,
            fa_website_url as faWebsiteUrl,
            fa_snippet_url as faSnippetUrl,
            sync_enabled as syncEnabled,
            sync_interval_minutes as syncIntervalMinutes,
            calendar_id as calendarId
          FROM fixture_settings
          WHERE tenant_id = ?
        `).bind(tenantId).first();

        if (result) {
          return json({ success: true, data: result }, 200, corsHdrs);
        } else {
          return json({ success: false, error: { code: "NOT_FOUND", message: "Settings not found" } }, 404, corsHdrs);
        }
      } catch (err) {
        logJSON("error", requestId, { message: "Get settings failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL" } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/fixtures/settings/config - Public endpoint for Apps Script to fetch config
    if (url.pathname === `/api/${v}/fixtures/settings/config` && req.method === "GET") {
      try {
        const tenantId = url.searchParams.get('tenant_id') || 'default';

        const result = await env.DB.prepare(`
          SELECT
            tenant_id as tenantId,
            team_name as teamName,
            fa_website_url as faWebsiteUrl,
            fa_snippet_url as faSnippetUrl,
            sync_enabled as syncEnabled,
            calendar_id as calendarId
          FROM fixture_settings
          WHERE tenant_id = ?
        `).bind(tenantId).first();

        if (result) {
          return json({ success: true, data: result }, 200, corsHdrs);
        } else {
          // Return default config if not found
          return json({
            success: true,
            data: {
              tenantId: 'default',
              teamName: 'Shepshed Dynamo Youth U16',
              faWebsiteUrl: '',
              faSnippetUrl: '',
              syncEnabled: true,
              calendarId: ''
            }
          }, 200, corsHdrs);
        }
      } catch (err) {
        logJSON("error", requestId, { message: "Get config failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL" } }, 500, corsHdrs);
      }
    }

    // PUT /api/v1/fixtures/settings - Update fixture sync settings (Admin only)
    if (url.pathname === `/api/${v}/fixtures/settings` && req.method === "PUT") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }

      try {
        const body = await req.json().catch(() => ({}));
        const tenantId = body.tenantId || 'default';

        // Update or insert settings
        await env.DB.prepare(`
          INSERT INTO fixture_settings (
            tenant_id,
            team_name,
            fa_website_url,
            fa_snippet_url,
            sync_enabled,
            sync_interval_minutes,
            calendar_id,
            calendar_enabled,
            gmail_search_query,
            gmail_label,
            email_sync_enabled,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(tenant_id)
          DO UPDATE SET
            team_name = excluded.team_name,
            fa_website_url = excluded.fa_website_url,
            fa_snippet_url = excluded.fa_snippet_url,
            sync_enabled = excluded.sync_enabled,
            sync_interval_minutes = excluded.sync_interval_minutes,
            calendar_id = excluded.calendar_id,
            calendar_enabled = excluded.calendar_enabled,
            gmail_search_query = excluded.gmail_search_query,
            gmail_label = excluded.gmail_label,
            email_sync_enabled = excluded.email_sync_enabled,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          tenantId,
          body.teamName || '',
          body.faWebsiteUrl || '',
          body.faSnippetUrl || '',
          body.syncEnabled ? 1 : 0,
          body.syncIntervalMinutes || 5,
          body.calendarId || '',
          body.calendarEnabled ? 1 : 0,
          body.gmailSearchQuery || '',
          body.gmailLabel || '',
          body.emailSyncEnabled ? 1 : 0
        ).run();

        return json({ success: true }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Update settings failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL" } }, 500, corsHdrs);
      }
    }

// Live Match Routes - Insert after line 703 in index.ts

    // -------- Live Match API --------

    // GET /api/v1/fixtures/next - Get next fixture with YouTube livestream metadata
    if (url.pathname === `/api/${v}/fixtures/next` && req.method === "GET") {
      try {
        const result = await env.DB.prepare(`
          SELECT
            id,
            fixture_date || 'T' || COALESCE(kick_off_time, '00:00:00') || 'Z' as kickoffIso,
            COALESCE(home_team, 'Home Team') as homeTeam,
            COALESCE(away_team, opponent) as awayTeam,
            opponent,
            CASE
              WHEN home_team IS NOT NULL THEN 'H'
              ELSE 'A'
            END as homeAway,
            venue,
            competition,
            COALESCE(match_status, status) as status,
            home_score,
            away_score,
            current_minute as minute,
            youtube_live_id as youtubeLiveId,
            youtube_status as youtubeStatus,
            youtube_scheduled_start as youtubeScheduledStart
          FROM fixtures
          WHERE fixture_date >= DATE('now')
            AND status != 'postponed'
          ORDER BY fixture_date ASC, kick_off_time ASC
          LIMIT 1
        `).first();

        if (result) {
          // Transform to NextFixture format
          const nextFixture = {
            id: result.id,
            kickoffIso: result.kickoffIso,
            homeTeam: result.homeTeam,
            awayTeam: result.awayTeam,
            opponent: result.opponent,
            homeAway: result.homeAway,
            venue: result.venue || null,
            competition: result.competition || null,
            status: result.status || 'scheduled',
            score: (result.home_score !== null && result.away_score !== null) ? {
              home: result.home_score,
              away: result.away_score
            } : null,
            minute: result.minute || 0,
            youtubeLiveId: result.youtubeLiveId || null,
            youtubeStatus: result.youtubeStatus || null,
            youtubeScheduledStart: result.youtubeScheduledStart || null,
          };

          return json({ success: true, data: nextFixture }, 200, corsHdrs);
        } else {
          return json({ success: true, data: null }, 200, corsHdrs);
        }
      } catch (err) {
        logJSON("error", requestId, { message: "Get next fixture failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL", message: "Failed to fetch next fixture" } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/live-updates - Get live text updates for a match
    if (url.pathname === `/api/${v}/live-updates` && req.method === "GET") {
      try {
        const matchId = url.searchParams.get('matchId');

        if (!matchId) {
          return json({ success: false, error: { code: "INVALID_REQUEST", message: "matchId parameter required" } }, 400, corsHdrs);
        }

        const result = await env.DB.prepare(`
          SELECT
            id,
            match_id as matchId,
            minute,
            type,
            text,
            scorer,
            assist,
            card,
            player,
            score_so_far as scoreSoFar,
            created_at as createdAt
          FROM live_updates
          WHERE match_id = ?
          ORDER BY created_at ASC
        `).bind(matchId).all();

        return json({ success: true, data: result.results || [] }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Get live updates failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL", message: "Failed to fetch live updates" } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/live-updates - Post a live update (goal, card, sub, info)
    if (url.pathname === `/api/${v}/live-updates` && req.method === "POST") {
      try {
        const body = await req.json().catch(() => ({}));

        // Validate required fields
        if (!body.matchId || typeof body.minute !== 'number' || !body.type || !body.text) {
          return json({
            success: false,
            error: { code: "INVALID_REQUEST", message: "matchId, minute, type, and text are required" }
          }, 400, corsHdrs);
        }

        // Validate type
        const validTypes = ['goal', 'card', 'subs', 'info'];
        if (!validTypes.includes(body.type)) {
          return json({
            success: false,
            error: { code: "INVALID_REQUEST", message: "type must be one of: goal, card, subs, info" }
          }, 400, corsHdrs);
        }

        // Validate card type if present
        if (body.card) {
          const validCards = ['yellow', 'red', 'sinbin'];
          if (!validCards.includes(body.card)) {
            return json({
              success: false,
              error: { code: "INVALID_REQUEST", message: "card must be one of: yellow, red, sinbin" }
            }, 400, corsHdrs);
          }
        }

        // Generate ID
        const updateId = `update-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const createdAt = new Date().toISOString();

        // Insert update
        await env.DB.prepare(`
          INSERT INTO live_updates (
            id, match_id, minute, type, text, scorer, assist, card, player, score_so_far, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          updateId,
          body.matchId,
          body.minute,
          body.type,
          body.text,
          body.scorer || null,
          body.assist || null,
          body.card || null,
          body.player || null,
          body.scoreSoFar || null,
          createdAt
        ).run();

        // Return created update
        const liveUpdate = {
          id: updateId,
          matchId: body.matchId,
          minute: body.minute,
          type: body.type,
          text: body.text,
          scorer: body.scorer || null,
          assist: body.assist || null,
          card: body.card || null,
          player: body.player || null,
          scoreSoFar: body.scoreSoFar || null,
          createdAt,
        };

        logJSON("info", requestId, { message: "Live update posted", updateId, matchId: body.matchId, type: body.type });
        return json({ success: true, data: liveUpdate }, 201, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Post live update failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL", message: "Failed to post live update" } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/matches/:id/state - Set match state (kickoff, halftime, fulltime)
    if (url.pathname.match(new RegExp(`^/api/${v}/matches/([^/]+)/state$`)) && req.method === "POST") {
      try {
        const matchId = url.pathname.split('/').slice(-2, -1)[0];
        const body = await req.json().catch(() => ({}));

        // Validate status
        const validStatuses = ['scheduled', 'live', 'halftime', 'ft'];
        if (!body.status || !validStatuses.includes(body.status)) {
          return json({
            success: false,
            error: { code: "INVALID_REQUEST", message: "status must be one of: scheduled, live, halftime, ft" }
          }, 400, corsHdrs);
        }

        // Build update query
        let query = 'UPDATE fixtures SET match_status = ?, updated_at = CURRENT_TIMESTAMP';
        const params: any[] = [body.status];

        if (typeof body.minute === 'number') {
          query += ', current_minute = ?';
          params.push(body.minute);
        }

        if (body.score && typeof body.score.home === 'number' && typeof body.score.away === 'number') {
          query += ', home_score = ?, away_score = ?';
          params.push(body.score.home, body.score.away);
        }

        query += ' WHERE id = ?';
        params.push(matchId);

        await env.DB.prepare(query).bind(...params).run();

        logJSON("info", requestId, { message: "Match state updated", matchId, status: body.status });
        return json({ success: true, data: { ok: true } }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Set match state failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL", message: "Failed to set match state" } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/live-updates/cleanup - Clean up stale live updates
    if (url.pathname === `/api/${v}/live-updates/cleanup` && req.method === "POST") {
      try {
        const body = await req.json().catch(() => ({}));
        const matchId = body.matchId;

        let removed = 0;

        if (matchId) {
          // Remove all updates for specific match
          const result = await env.DB.prepare('DELETE FROM live_updates WHERE match_id = ?')
            .bind(matchId).run();
          removed = result.meta?.changes || 0;
          logJSON("info", requestId, { message: "Cleaned up match updates", matchId, removed });
        } else {
          // Remove updates older than 90 minutes after FT for completed matches
          const result = await env.DB.prepare(`
            DELETE FROM live_updates
            WHERE match_id IN (
              SELECT id FROM fixtures
              WHERE match_status = 'ft'
                AND updated_at < datetime('now', '-90 minutes')
            )
          `).run();
          removed = result.meta?.changes || 0;
          logJSON("info", requestId, { message: "Cleaned up stale updates", removed });
        }

        return json({ success: true, data: { removed } }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Cleanup failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL", message: "Failed to cleanup live updates" } }, 500, corsHdrs);
      }
    }
    // -------- League Table API --------

    // POST /api/v1/league/sync - Sync league standings from Apps Script
    if (url.pathname === `/api/${v}/league/sync` && req.method === "POST") {
      try {
        const body = await req.json().catch(() => ({}));
        const { tenantId, competition, standings } = body;

        if (!Array.isArray(standings)) {
          return json({ success: false, error: { code: "INVALID_DATA", message: "standings must be an array" } }, 400, corsHdrs);
        }

        // Clear existing standings for this competition
        await env.DB.prepare('DELETE FROM league_standings WHERE tenant_id = ? AND competition = ?')
          .bind(tenantId || 'default', competition || '').run();

        // Insert new standings
        let synced = 0;
        for (const team of standings) {
          try {
            await env.DB.prepare(`
              INSERT INTO league_standings (
                tenant_id, competition, team_name, position,
                played, won, drawn, lost, goals_for, goals_against, goal_difference, points,
                last_updated
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).bind(
              tenantId || 'default',
              competition || '',
              team.teamName,
              team.position,
              team.played,
              team.won,
              team.drawn,
              team.lost,
              team.goalsFor,
              team.goalsAgainst,
              team.goalDifference,
              team.points
            ).run();
            synced++;
          } catch (err) {
            logJSON("error", requestId, { message: "Error syncing team", error: String(err) });
          }
        }

        return json({ success: true, synced }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "League sync failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL" } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/league/table - Get league table
    if (url.pathname === `/api/${v}/league/table` && req.method === "GET") {
      try {
        const tenantId = url.searchParams.get('tenant_id') || 'default';
        const competition = url.searchParams.get('competition');

        let query = `
          SELECT
            position, team_name as teamName, played, won, drawn, lost,
            goals_for as goalsFor, goals_against as goalsAgainst,
            goal_difference as goalDifference, points
          FROM league_standings
          WHERE tenant_id = ?
        `;

        const params: string[] = [tenantId];

        if (competition) {
          query += ' AND competition = ?';
          params.push(competition);
        }

        query += ' ORDER BY position ASC';

        const result = await env.DB.prepare(query).bind(...params).all();

        return json({ success: true, data: result.results || [] }, 200, corsHdrs);
      } catch (err) {
        logJSON("error", requestId, { message: "Get league table failed", error: String(err) });
        return json({ success: false, error: { code: "INTERNAL" } }, 500, corsHdrs);
      }
    }

    // -------- Promo Code Management (Admin) --------

    // POST /api/v1/admin/promo/create
    if (url.pathname === `/api/${v}/admin/promo/create` && req.method === "POST") {
      await requireAdmin(req, env);
      try {
        const body = await req.json().catch(() => ({}));
        const schema = z.object({
          code: z.string().min(1),
          type: z.enum(["percentage_discount", "months_free", "plan_upgrade", "referral_reward"]),
          value: z.union([z.string(), z.number()]),
          durationMonths: z.number().optional(),
          maxUses: z.number().optional(),
          expiresAt: z.string().optional(),
          active: z.boolean().default(true),
          metadata: z.object({
            description: z.string().optional(),
            targetTenant: z.string().optional()
          }).optional()
        });

        const data = schema.parse(body);
        const { PromoCodeService } = await import("./services/promoCodes");
        const promoService = new PromoCodeService(env);

        const result = await promoService.createPromoCode({
          ...data,
          createdBy: "admin"
        });

        if (result.success) {
          return json({ success: true, data: result.code }, 200, corsHdrs);
        } else {
          return json({ success: false, error: { code: "PROMO_CREATE_FAILED", message: result.error } }, 400, corsHdrs);
        }
      } catch (err: any) {
        if (err.errors) {
          return json({ success: false, error: { code: "VALIDATION_ERROR", message: err.errors[0].message } }, 400, corsHdrs);
        }
        return json({ success: false, error: { code: "PROMO_CREATE_FAILED", message: err.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/admin/promo/list
    if (url.pathname === `/api/${v}/admin/promo/list` && req.method === "GET") {
      await requireAdmin(req, env);
      try {
        const { PromoCodeService } = await import("./services/promoCodes");
        const promoService = new PromoCodeService(env);
        const promoCodes = await promoService.listPromoCodes();
        return json({ success: true, data: promoCodes }, 200, corsHdrs);
      } catch (err: any) {
        return json({ success: false, error: { code: "PROMO_LIST_FAILED", message: err.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/admin/promo/:code/deactivate
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/promo/[^/]+/deactivate$`)) && req.method === "POST") {
      await requireAdmin(req, env);
      try {
        const code = url.pathname.split("/")[5];
        const { PromoCodeService } = await import("./services/promoCodes");
        const promoService = new PromoCodeService(env);

        const result = await promoService.deactivatePromoCode(code);

        if (result.success) {
          return json({ success: true }, 200, corsHdrs);
        } else {
          return json({ success: false, error: { code: "PROMO_DEACTIVATE_FAILED", message: result.error } }, 400, corsHdrs);
        }
      } catch (err: any) {
        return json({ success: false, error: { code: "PROMO_DEACTIVATE_FAILED", message: err.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/admin/tenant/invite
    if (url.pathname === `/api/${v}/admin/tenant/invite` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const schema = z.object({ tenant: z.string().min(1), ttl_minutes: z.number().min(5).max(1440).default(60) });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);
      const { tenant, ttl_minutes } = parsed.data;

      const cfg = await ensureTenant(env, tenant);
      const token = await issueTenantAdminJWT(env, { tenant_id: cfg.id, ttlMinutes: ttl_minutes });
      const base = env.SETUP_URL || "https://setup.yourbrand.app";
      const setup_url = `${base}/?token=${encodeURIComponent(token)}`;

      return json({ success: true, data: { setup_url } }, 200, corsHdrs);
    }

    // Set tenant flags (existing route, kept for backward compatibility)
    if (url.pathname === `/api/${v}/admin/tenant/flags` && req.method === "POST") {
      await requireAdmin(req, env);
      const body = await req.json().catch(() => null);
      if (!body?.tenant || typeof body.flags !== "object") {
        return json({ success: false, error: { code: "VALIDATION", message: "tenant + flags required" } }, 400, corsHdrs);
      }
      const updated = await updateFlags(env, body.tenant, body.flags);
      return json({ success: true, data: { updated: true, flags: updated.flags } }, 200, corsHdrs);
    }

    // Store YouTube OAuth creds (existing route)
    if (url.pathname === `/api/${v}/admin/tenant/youtube-token` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => null);
      if (!body?.tenant || !body?.client_id || !body?.client_secret || !body?.refresh_token) {
        return json({ success: false, error: { code: "VALIDATION", message: "tenant, client_id, client_secret, refresh_token" } }, 400, corsHdrs);
      }
      await env.KV_IDEMP.put(
        `yt:${body.tenant}`,
        JSON.stringify({
          client_id: body.client_id,
          client_secret: body.client_secret,
          refresh_token: body.refresh_token,
          channel_id: body.channel_id || null
        })
      );
      return json({ success: true, data: { stored: true } }, 200, corsHdrs);
    }

    // GET /api/v1/admin/yt/start?tenant=club-123
    // Initiates YouTube OAuth flow for managed plans
    if (url.pathname === `/api/${v}/admin/yt/start` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant");
      if (!tenant) return json({ success: false, error: { code: "VALIDATION", message: "tenant required" } }, 400, corsHdrs);

      const cid = env.YT_CLIENT_ID as string;
      const redirect = env.YT_REDIRECT_URL as string;
      if (!cid || !redirect) {
        return json({ success: false, error: { code: "CONFIG", message: "YT_CLIENT_ID or YT_REDIRECT_URL not configured" } }, 500, corsHdrs);
      }

      const scope = encodeURIComponent("https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly");
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(cid)}&redirect_uri=${encodeURIComponent(redirect)}&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(tenant)}`;
      return json({ success: true, data: { url: authUrl } }, 200, corsHdrs);
    }

    // GET /api/v1/admin/yt/callback?code=...&state=tenant
    // OAuth callback endpoint - exchanges code for tokens
    if (url.pathname === `/api/${v}/admin/yt/callback` && req.method === "GET") {
      const code = url.searchParams.get("code");
      const tenant = url.searchParams.get("state") || "";

      if (!code || !tenant) return new Response("Missing code/state", { status: 400 });

      const cid = env.YT_CLIENT_ID as string;
      const cs = env.YT_CLIENT_SECRET as string;
      const redirect = env.YT_REDIRECT_URL as string;

      const body = new URLSearchParams({
        code,
        client_id: cid,
        client_secret: cs,
        redirect_uri: redirect,
        grant_type: "authorization_code"
      });

      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body
      });

      if (!r.ok) return new Response("Token exchange failed", { status: 502 });

      const tok = await r.json() as any;

      // Store into tenant config
      const cfg = await ensureTenant(env, tenant);
      // @ts-ignore
      cfg.youtube = { ...tok };
      await putTenantConfig(env, cfg);

      return new Response("YouTube connected. You can close this window.", { status: 200 });
    }

    // POST /api/v1/admin/tenant/channel/flags
    // Set per-channel managed toggles
    if (url.pathname === `/api/${v}/admin/tenant/channel/flags` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const schema = z.object({
        tenant: z.string().min(1),
        managed: z.record(z.boolean()).optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const { tenant, managed } = parsed.data;
      const updated = await setTenantFlags(env, tenant, { managed });
      return json({ success: true, data: { tenant: updated.id, flags: updated.flags } }, 200, corsHdrs);
    }

    // POST /api/v1/admin/tenant/channel/webhook
    // Set BYO-Make webhook per channel
    if (url.pathname === `/api/${v}/admin/tenant/channel/webhook` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const schema = z.object({
        tenant: z.string().min(1),
        channel: z.enum(["yt", "fb", "ig", "tiktok", "x"]),
        url: z.string().url(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const { tenant, channel, url: webhookUrl } = parsed.data;
      const updated = await setChannelWebhook(env, tenant, channel, webhookUrl);
      return json({ success: true, data: { tenant: updated.id, channel, webhook: webhookUrl } }, 200, corsHdrs);
    }

    // POST /api/v1/admin/tenant/yt/byo-google
    // Set BYO-Google client (YouTube)
    if (url.pathname === `/api/${v}/admin/tenant/yt/byo-google` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const schema = z.object({
        tenant: z.string().min(1),
        client_id: z.string().min(1),
        client_secret: z.string().min(1),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const { tenant, client_id, client_secret } = parsed.data;
      const updated = await setYouTubeBYOGoogle(env, tenant, client_id, client_secret);
      return json({ success: true, data: { tenant: updated.id, byo_google: true } }, 200, corsHdrs);
    }

    // -------- Tenant self-serve endpoints --------

    // GET /api/v1/tenant/self
    if (url.pathname === `/api/${v}/tenant/self` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "tenant_admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenantId = user.tenantId;
      const cfg = await ensureTenant(env, tenantId);
      // Mask webhook
      let masked = null;
      if (cfg.makeWebhookUrl) {
        const end = cfg.makeWebhookUrl.slice(-6);
        masked = `***${end}`;
      }
      return json({ success: true, data: { id: cfg.id, flags: cfg.flags, makeWebhookMasked: masked } }, 200, corsHdrs);
    }

    // POST /api/v1/tenant/self/webhook
    if (url.pathname === `/api/${v}/tenant/self/webhook` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "tenant_admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenantId = user.tenantId;
      const body = await req.json().catch(() => ({}));
      const schema = z.object({ make_webhook_url: z.string().url() });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const u = new URL(parsed.data.make_webhook_url);
      // Add .make.com suffix support globally
      const allowedCsv = (env.ALLOWED_WEBHOOK_HOSTS || "") + ",.make.com";
      if (!isAllowedWebhookHost(u.host, allowedCsv)) {
        return json({ success: false, error: { code: "VALIDATION", message: `Host ${u.host} not allowed` } }, 400, corsHdrs);
      }

      await setMakeWebhook(env, tenantId, u.toString());
      return json({ success: true, data: { saved: true } }, 200, corsHdrs);
    }

    // POST /api/v1/tenant/self/flags
    if (url.pathname === `/api/${v}/tenant/self/flags` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "tenant_admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenantId = user.tenantId;
      const body = await req.json().catch(() => ({}));
      const schema = z.object({ use_make: z.boolean().optional(), direct_yt: z.boolean().optional() });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);
      const updated = await updateFlags(env, tenantId, parsed.data);
      return json({ success: true, data: { flags: updated.flags } }, 200, corsHdrs);
    }

    // POST /api/v1/tenant/self/test-webhook
    if (url.pathname === `/api/${v}/tenant/self/test-webhook` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "tenant_admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenantId = user.tenantId;
      const cfg = await ensureTenant(env, tenantId);

      if (!cfg.flags.use_make || !cfg.makeWebhookUrl) {
        return json({ success: false, error: { code: "INVALID_STATE", message: "Enable BYO-Make and set webhook first" } }, 400, corsHdrs);
      }
      try {
        const r = await fetch(cfg.makeWebhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "test", tenant: tenantId, ts: Date.now() })
        });
        return json({ success: r.ok, data: { status: r.status } }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "UPSTREAM", message: e?.message || "webhook failed" } }, 502, corsHdrs);
      }
    }

    // -------- Stripe Webhook --------
    // POST /api/v1/stripe/webhook
    // Handles Stripe events to update tenant plans
    if (url.pathname === `/api/${v}/stripe/webhook` && req.method === "POST") {
      // Guard: check if Stripe is configured
      if (!env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) {
        return json({ success: false, error: { code: "STRIPE_DISABLED", message: "Stripe not configured" } }, 503, corsHdrs);
      }

      const evt = await req.json().catch(() => null);
      if (!evt) return new Response("bad json", { status: 400 });

      try {
        const type = evt.type;
        // Determine tenant + plan from metadata or customer mapping
        const tenant = evt.data?.object?.metadata?.tenant || evt.data?.object?.metadata?.tenant_id;
        if (!tenant) return new Response("ok", { status: 200 });

        // Simple example mapping
        if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
          const plan = evt.data.object?.plan?.nickname || evt.data.object?.items?.data?.[0]?.price?.nickname || "";
          const managed = /managed|pro|premium/i.test(plan);
          const cfg = await ensureTenant(env, tenant);
          cfg.flags = { use_make: !managed, direct_yt: managed };
          await putTenantConfig(env, cfg);
        }
      } catch (e) {
        // Swallow errors
      }

      return new Response("ok", { status: 200 });
    }

    // -------- MOTM Voting (Admin) --------

    // POST /api/v1/admin/matches/:matchId/motm/open
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/motm/open$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.VotingRoom.idFromName(`${tenant}:${matchId}`);
      const stub = env.VotingRoom.get(id);
      const voteBody = { tenant, matchId, ...body };
      const r = await stub.fetch("https://do/open", { method: "POST", body: JSON.stringify(voteBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // POST /api/v1/admin/matches/:matchId/motm/close
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/motm/close$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.VotingRoom.idFromName(`${tenant}:${matchId}`);
      const stub = env.VotingRoom.get(id);
      const r = await stub.fetch("https://do/close", { method: "POST" });
      return json(await r.json(), r.status, corsHdrs);
    }

    // GET /api/v1/admin/matches/:matchId/motm/tally
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/motm/tally$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const tenant = url.searchParams.get("tenant") || "default";

      const id = env.VotingRoom.idFromName(`${tenant}:${matchId}`);
      const stub = env.VotingRoom.get(id);
      const r = await stub.fetch("https://do/tally");
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- MOTM Voting (App) --------

    // POST /api/v1/matches/:matchId/motm/vote
    if (url.pathname.match(new RegExp(`^/api/${v}/matches/[^/]+/motm/vote$`)) && req.method === "POST") {
      const matchId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      // Simple user hash from IP + User-Agent (anonymous voting)
      const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
      const ua = req.headers.get("user-agent") || "";
      const userHash = `${ip}:${ua}`.substring(0, 64);

      const id = env.VotingRoom.idFromName(`${tenant}:${matchId}`);
      const stub = env.VotingRoom.get(id);
      const voteBody = { candidateId: body.candidateId, userHash };
      const r = await stub.fetch("https://do/vote", { method: "POST", body: JSON.stringify(voteBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- Events (Admin) --------

    // POST /api/v1/admin/events
    if (url.pathname === `/api/${v}/admin/events` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const now = Date.now();
      body.createdAt = body.createdAt || now;
      body.updatedAt = now;
      await putEvent(env, tenant, body);
      return json({ success: true, data: { id: body.id } }, 200, corsHdrs);
    }

    // PATCH /api/v1/admin/events/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/events/[^/]+$`)) && req.method === "PATCH") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const eventId = url.pathname.split("/").pop()!;
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const cur = await getEvent(env, tenant, eventId);
      if (!cur) return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);

      const next = { ...cur, ...body, updatedAt: Date.now() };
      await putEvent(env, tenant, next);
      return json({ success: true, data: { id: eventId } }, 200, corsHdrs);
    }

    // DELETE /api/v1/admin/events/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/events/[^/]+$`)) && req.method === "DELETE") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const eventId = url.pathname.split("/").pop()!;
      const tenant = url.searchParams.get("tenant") || "default";

      await deleteEvent(env, tenant, eventId);
      return json({ success: true }, 200, corsHdrs);
    }

    // -------- Events (App) --------

    // GET /api/v1/events
    if (url.pathname === `/api/${v}/events` && req.method === "GET") {
      const tenant = url.searchParams.get("tenant") || "default";
      const list = await listEvents(env, tenant);
      return json({ success: true, data: list }, 200, corsHdrs);
    }

    // GET /api/v1/events/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/events/[^/]+$`)) && req.method === "GET") {
      const eventId = url.pathname.split("/").pop()!;
      const tenant = url.searchParams.get("tenant") || "default";

      const ev = await getEvent(env, tenant, eventId);
      if (!ev) return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);

      return json({ success: true, data: ev }, 200, corsHdrs);
    }

    // POST /api/v1/events/:id/rsvp
    if (url.pathname.match(new RegExp(`^/api/${v}/events/[^/]+/rsvp$`)) && req.method === "POST") {
      const eventId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const userId = body.userId || "anonymous";
      const rsvp = body.rsvp as "yes" | "no" | "maybe";

      if (!["yes", "no", "maybe"].includes(rsvp)) {
        return json({ success: false, error: { code: "VALIDATION", message: "rsvp must be yes/no/maybe" } }, 400, corsHdrs);
      }

      await setRsvp(env, tenant, eventId, userId, rsvp);
      return json({ success: true }, 200, corsHdrs);
    }

    // POST /api/v1/events/:id/checkin
    if (url.pathname.match(new RegExp(`^/api/${v}/events/[^/]+/checkin$`)) && req.method === "POST") {
      const eventId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const userId = body.userId || "anonymous";

      await addCheckin(env, tenant, eventId, userId);
      return json({ success: true, data: { ts: Date.now() } }, 200, corsHdrs);
    }

    // -------- Device Registration (for Push) --------

    // POST /api/v1/devices/register
    if (url.pathname === `/api/${v}/devices/register` && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const userId = body.userId || "anonymous";
      const platform = body.platform || "unknown";
      const token = body.token;

      if (!token) {
        return json({ success: false, error: { code: "VALIDATION", message: "token required" } }, 400, corsHdrs);
      }

      await registerDevice(env, tenant, userId, platform, token);
      return json({ success: true }, 200, corsHdrs);
    }

    // -------- Push Token Registration (for live updates) --------

    // POST /api/v1/push/register
    if (url.pathname === `/api/${v}/push/register` && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const teamId = body.teamId;
      const token = body.token;

      if (!token) {
        return json({ success: false, error: { code: "VALIDATION", message: "token required" } }, 400, corsHdrs);
      }

      // Global tokens
      const tokensKey = `tenants:${tenant}:push:tokens`;
      const existing = ((await env.KV_IDEMP.get(tokensKey, "json")) as string[]) || [];
      if (!existing.includes(token)) {
        existing.push(token);
        await env.KV_IDEMP.put(tokensKey, JSON.stringify(existing));
      }

      // Team-specific tokens
      if (teamId) {
        const teamKey = `tenants:${tenant}:team:${teamId}:tokens`;
        const teamTokens = ((await env.KV_IDEMP.get(teamKey, "json")) as string[]) || [];
        if (!teamTokens.includes(token)) {
          teamTokens.push(token);
          await env.KV_IDEMP.put(teamKey, JSON.stringify(teamTokens));
        }
      }

      return json({ success: true }, 200, corsHdrs);
    }

    // -------- League Tables & Fixtures --------

    // GET /api/v1/league/:leagueId/table
    if (url.pathname.match(new RegExp(`^/api/${v}/league/[^/]+/table$`)) && req.method === "GET") {
      const leagueId = url.pathname.split("/")[4];
      const season = url.searchParams.get("season") || new Date().getFullYear().toString();

      try {
        const fixturesBase = (env.FIXTURES_REFRESH_URL || "").replace("/refresh", "");
        const upstreamUrl = `${fixturesBase}/table?league=${leagueId}&season=${season}`;
        const r = await fetch(upstreamUrl);
        const data = await r.json();
        if (!r.ok || !data.ok) {
          return json({ success: false, error: { code: "UPSTREAM_ERROR", message: data.message || "Failed" } }, r.status, corsHdrs);
        }
        return json({ success: true, data: data.data }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "FETCH_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/league/:leagueId/fixtures
    if (url.pathname.match(new RegExp(`^/api/${v}/league/[^/]+/fixtures$`)) && req.method === "GET") {
      const leagueId = url.pathname.split("/")[4];
      const season = url.searchParams.get("season") || new Date().getFullYear().toString();

      try {
        const fixturesBase = (env.FIXTURES_REFRESH_URL || "").replace("/refresh", "");
        const upstreamUrl = `${fixturesBase}/fixtures?league=${leagueId}&season=${season}`;
        const r = await fetch(upstreamUrl);
        const data = await r.json();
        if (!r.ok || !data.ok) {
          return json({ success: false, error: { code: "UPSTREAM_ERROR", message: data.message || "Failed" } }, r.status, corsHdrs);
        }
        return json({ success: true, data: data.data }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "FETCH_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/league/:leagueId/results
    if (url.pathname.match(new RegExp(`^/api/${v}/league/[^/]+/results$`)) && req.method === "GET") {
      const leagueId = url.pathname.split("/")[4];
      const season = url.searchParams.get("season") || new Date().getFullYear().toString();

      try {
        const fixturesBase = (env.FIXTURES_REFRESH_URL || "").replace("/refresh", "");
        const upstreamUrl = `${fixturesBase}/results?league=${leagueId}&season=${season}`;
        const r = await fetch(upstreamUrl);
        const data = await r.json();
        if (!r.ok || !data.ok) {
          return json({ success: false, error: { code: "UPSTREAM_ERROR", message: data.message || "Failed" } }, r.status, corsHdrs);
        }
        return json({ success: true, data: data.data }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "FETCH_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/league/:leagueId/seasons
    if (url.pathname.match(new RegExp(`^/api/${v}/league/[^/]+/seasons$`)) && req.method === "GET") {
      const leagueId = url.pathname.split("/")[4];

      try {
        const fixturesBase = (env.FIXTURES_REFRESH_URL || "").replace("/refresh", "");
        const upstreamUrl = `${fixturesBase}/seasons?league=${leagueId}`;
        const r = await fetch(upstreamUrl);
        const data = await r.json();
        if (!r.ok || !data.ok) {
          return json({ success: false, error: { code: "UPSTREAM_ERROR", message: data.message || "Failed" } }, r.status, corsHdrs);
        }
        return json({ success: true, data: data.data }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "FETCH_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Live Match Ticker (Admin) --------

    // POST /api/v1/admin/matches/:matchId/live/open
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/live/open$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.MatchRoom.idFromName(`${tenant}::${matchId}`);
      const stub = env.MatchRoom.get(id);
      const matchBody = { tenant, matchId, ...body };
      const r = await stub.fetch("https://do/open", { method: "POST", body: JSON.stringify(matchBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // POST /api/v1/admin/matches/:matchId/live/event
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/live/event$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.MatchRoom.idFromName(`${tenant}::${matchId}`);
      const stub = env.MatchRoom.get(id);
      const r = await stub.fetch("https://do/event", { method: "POST", body: JSON.stringify(body) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // POST /api/v1/admin/matches/:matchId/live/close
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/live/close$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.MatchRoom.idFromName(`${tenant}::${matchId}`);
      const stub = env.MatchRoom.get(id);
      const r = await stub.fetch("https://do/close", { method: "POST" });
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- Live Match Ticker (App) --------

    // GET /api/v1/matches/:matchId/live
    if (url.pathname.match(new RegExp(`^/api/${v}/matches/[^/]+/live$`)) && req.method === "GET") {
      const matchId = url.pathname.split("/")[4];
      const tenant = url.searchParams.get("tenant") || "default";

      const id = env.MatchRoom.idFromName(`${tenant}::${matchId}`);
      const stub = env.MatchRoom.get(id);
      const r = await stub.fetch("https://do/tally");
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- Push Notifications & Geo-Fencing --------

    // POST /api/v1/push/register - Register push notification token
    if (url.pathname === `/api/${v}/push/register` && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const token = body.token;
      const platform = body.platform; // 'ios' or 'android'

      if (!token) {
        return json({ success: false, error: { code: "MISSING_TOKEN", message: "Push token required" } }, 400, corsHdrs);
      }

      // Store push token in KV
      const tokensKey = `tenants:${tenant}:push:tokens`;
      const tokens = ((await env.KV_IDEMP.get(tokensKey, "json")) as string[]) || [];

      // Add token if not already present
      if (!tokens.includes(token)) {
        tokens.push(token);
        await env.KV_IDEMP.put(tokensKey, JSON.stringify(tokens));
      }

      // Store token metadata
      const tokenMetaKey = `tenants:${tenant}:push:token:${token}`;
      await env.KV_IDEMP.put(tokenMetaKey, JSON.stringify({
        token,
        platform,
        registered: Date.now()
      }));

      return json({ success: true, data: { registered: true } }, 200, corsHdrs);
    }

    // POST /api/v1/push/location - Update user location for geo-fencing
    if (url.pathname === `/api/${v}/push/location` && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const token = body.token;
      const latitude = body.latitude;
      const longitude = body.longitude;
      const timestamp = body.timestamp || Date.now();

      if (!token || latitude === undefined || longitude === undefined) {
        return json({ success: false, error: { code: "MISSING_DATA", message: "Token and location required" } }, 400, corsHdrs);
      }

      // Store location in KV (expires after 30 minutes)
      const locationKey = `tenants:${tenant}:push:location:${token}`;
      await env.KV_IDEMP.put(locationKey, JSON.stringify({
        latitude,
        longitude,
        timestamp
      }), {
        expirationTtl: 1800 // 30 minutes
      });

      return json({ success: true, data: { updated: true } }, 200, corsHdrs);
    }

    // POST /api/v1/geo/:matchId/init - Initialize geo-fence for match
    if (url.pathname.match(new RegExp(`^/api/${v}/geo/[^/]+/init$`)) && req.method === "POST") {
      const matchId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const venueLatitude = body.venueLatitude;
      const venueLongitude = body.venueLongitude;

      const id = env.GeoFenceManager.idFromName(`${tenant}::${matchId}`);
      const stub = env.GeoFenceManager.get(id);
      const geoBody = { tenant, matchId, venueLatitude, venueLongitude };
      const r = await stub.fetch("https://do/init", { method: "POST", body: JSON.stringify(geoBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // POST /api/v1/geo/:matchId/venue - Set venue location
    if (url.pathname.match(new RegExp(`^/api/${v}/geo/[^/]+/venue$`)) && req.method === "POST") {
      const matchId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const latitude = body.latitude;
      const longitude = body.longitude;

      if (latitude === undefined || longitude === undefined) {
        return json({ success: false, error: { code: "MISSING_LOCATION", message: "Latitude and longitude required" } }, 400, corsHdrs);
      }

      const id = env.GeoFenceManager.idFromName(`${tenant}::${matchId}`);
      const stub = env.GeoFenceManager.get(id);
      const geoBody = { latitude, longitude };
      const r = await stub.fetch("https://do/venue", { method: "POST", body: JSON.stringify(geoBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // GET /api/v1/geo/:matchId/tokens - Get notification tokens (excluding users at venue)
    if (url.pathname.match(new RegExp(`^/api/${v}/geo/[^/]+/tokens$`)) && req.method === "GET") {
      const matchId = url.pathname.split("/")[4];
      const tenant = url.searchParams.get("tenant") || "default";

      const id = env.GeoFenceManager.idFromName(`${tenant}::${matchId}`);
      const stub = env.GeoFenceManager.get(id);
      const r = await stub.fetch("https://do/tokens");
      return json(await r.json(), r.status, corsHdrs);
    }

    // GET /api/v1/geo/:matchId/state - Get geo-fence state (debug)
    if (url.pathname.match(new RegExp(`^/api/${v}/geo/[^/]+/state$`)) && req.method === "GET") {
      const matchId = url.pathname.split("/")[4];
      const tenant = url.searchParams.get("tenant") || "default";

      const id = env.GeoFenceManager.idFromName(`${tenant}::${matchId}`);
      const stub = env.GeoFenceManager.get(id);
      const r = await stub.fetch("https://do/state");
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- Video Routes --------

    // POST /api/v1/videos/upload - Upload video from mobile app
    if (url.pathname === `/api/${v}/videos/upload` && req.method === "POST") {
      const formData = await req.formData();
      const tenant = formData.get("tenant") || "default";
      const userId = formData.get("user_id") || "anonymous";
      const videoFile = formData.get("video");

      if (!videoFile || !(videoFile instanceof File)) {
        return json({ success: false, error: { code: "MISSING_VIDEO", message: "Video file required" } }, 400, corsHdrs);
      }

      // Generate video ID
      const videoId = `vid-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Store in R2
      const r2Key = `videos/${tenant}/uploads/${videoId}.mp4`;
      const arrayBuffer = await videoFile.arrayBuffer();
      await env.R2_MEDIA.put(r2Key, arrayBuffer, {
        httpMetadata: {
          contentType: "video/mp4",
        },
        customMetadata: {
          tenant,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Store metadata in KV
      const videoMetadata = {
        id: videoId,
        tenant,
        userId,
        filename: videoFile.name,
        size: videoFile.size,
        r2Key,
        uploadTimestamp: Date.now(),
        status: "uploaded",
        processingProgress: 0,
      };

      await env.KV_IDEMP.put(`video:${tenant}:${videoId}`, JSON.stringify(videoMetadata));

      // Add to tenant's video list
      const videoListKey = `video_list:${tenant}`;
      const videoList = ((await env.KV_IDEMP.get(videoListKey, "json")) as string[]) || [];
      videoList.unshift(videoId);
      await env.KV_IDEMP.put(videoListKey, JSON.stringify(videoList.slice(0, 100))); // Keep last 100

      return json({ success: true, data: { videoId, status: "uploaded" } }, 200, corsHdrs);
    }

    // GET /api/v1/videos - List videos for tenant
    if (url.pathname === `/api/${v}/videos` && req.method === "GET") {
      const tenant = url.searchParams.get("tenant") || "default";
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      const videoListKey = `video_list:${tenant}`;
      const videoList = ((await env.KV_IDEMP.get(videoListKey, "json")) as string[]) || [];

      const videoIds = videoList.slice(offset, offset + limit);
      const videos = [];

      for (const videoId of videoIds) {
        const metadata = await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json");
        if (metadata) {
          videos.push(metadata);
        }
      }

      return json({ success: true, data: { videos, total: videoList.length } }, 200, corsHdrs);
    }

    // GET /api/v1/videos/:id - Get video details
    if (url.pathname.match(new RegExp(`^/api/${v}/videos/[^/]+$`)) && req.method === "GET") {
      const videoId = url.pathname.split("/")[4];
      const tenant = url.searchParams.get("tenant") || "default";

      const metadata = await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json");

      if (!metadata) {
        return json({ success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } }, 404, corsHdrs);
      }

      return json({ success: true, data: metadata }, 200, corsHdrs);
    }

    // GET /api/v1/videos/:id/status - Get processing status
    if (url.pathname.match(new RegExp(`^/api/${v}/videos/[^/]+/status$`)) && req.method === "GET") {
      const videoId = url.pathname.split("/")[4];
      const tenant = url.searchParams.get("tenant") || "default";

      const metadata = await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json") as any;

      if (!metadata) {
        return json({ success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } }, 404, corsHdrs);
      }

      return json({
        success: true,
        data: {
          videoId,
          status: metadata.status || "uploaded",
          progress: metadata.processingProgress || 0,
          clips: metadata.clips || [],
        },
      }, 200, corsHdrs);
    }

    // POST /api/v1/videos/:id/process - Trigger AI processing
    if (url.pathname.match(new RegExp(`^/api/${v}/videos/[^/]+/process$`)) && req.method === "POST") {
      const videoId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const metadata = await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json") as any;

      if (!metadata) {
        return json({ success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } }, 404, corsHdrs);
      }

      // Update status to processing
      metadata.status = "processing";
      metadata.processingProgress = 0;
      await env.KV_IDEMP.put(`video:${tenant}:${videoId}`, JSON.stringify(metadata));

      // TODO: Trigger video processing worker (Queue or Durable Object)
      // For now, just update status

      return json({ success: true, data: { videoId, status: "processing" } }, 200, corsHdrs);
    }

    // DELETE /api/v1/videos/:id - Delete video
    if (url.pathname.match(new RegExp(`^/api/${v}/videos/[^/]+$`)) && req.method === "DELETE") {
      const videoId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const metadata = await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json") as any;

      if (!metadata) {
        return json({ success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } }, 404, corsHdrs);
      }

      // Delete from R2
      await env.R2_MEDIA.delete(metadata.r2Key);

      // Delete metadata
      await env.KV_IDEMP.delete(`video:${tenant}:${videoId}`);

      // Remove from video list
      const videoListKey = `video_list:${tenant}`;
      const videoList = ((await env.KV_IDEMP.get(videoListKey, "json")) as string[]) || [];
      const updatedList = videoList.filter((id) => id !== videoId);
      await env.KV_IDEMP.put(videoListKey, JSON.stringify(updatedList));

      return json({ success: true, data: { deleted: true } }, 200, corsHdrs);
    }

    // GET /api/v1/videos/:id/clips - List generated clips
    if (url.pathname.match(new RegExp(`^/api/${v}/videos/[^/]+/clips$`)) && req.method === "GET") {
      const videoId = url.pathname.split("/")[4];
      const tenant = url.searchParams.get("tenant") || "default";

      const metadata = await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json") as any;

      if (!metadata) {
        return json({ success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } }, 404, corsHdrs);
      }

      return json({ success: true, data: { clips: metadata.clips || [] } }, 200, corsHdrs);
    }

    // -------- Chat Routes --------

    // POST /api/v1/chat/:roomId/send
    if (url.pathname.match(new RegExp(`^/api/${v}/chat/[^/]+/send$`)) && req.method === "POST") {
      const roomId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      // Rate limit: 1 msg/sec per user (using TenantRateLimiter)
      const userId = body.userId || "anonymous";
      const rateLimitKey = `${tenant}:chat:${roomId}:${userId}`;
      const limitId = env.TenantRateLimiter.idFromName(rateLimitKey);
      const limiterStub = env.TenantRateLimiter.get(limitId);
      const limitCheck = await limiterStub.fetch("https://do/check", {
        method: "POST",
        body: JSON.stringify({ key: rateLimitKey, limit: 1, window: 1000 }),
      });
      const limitResult = await limitCheck.json();
      if (!limitResult.allowed) {
        return json({ success: false, error: { code: "RATE_LIMIT", message: "Too many messages" } }, 429, corsHdrs);
      }

      const id = env.ChatRoom.idFromName(`${tenant}::${roomId}`);
      const stub = env.ChatRoom.get(id);
      const chatBody = { tenant, roomId, ...body };
      const r = await stub.fetch("https://do/send", { method: "POST", body: JSON.stringify(chatBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // GET /api/v1/chat/:roomId/history
    if (url.pathname.match(new RegExp(`^/api/${v}/chat/[^/]+/history$`)) && req.method === "GET") {
      const roomId = url.pathname.split("/")[4];
      const tenant = url.searchParams.get("tenant") || "default";
      const cursor = url.searchParams.get("cursor") || undefined;
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);

      const id = env.ChatRoom.idFromName(`${tenant}::${roomId}`);
      const stub = env.ChatRoom.get(id);
      const r = await stub.fetch(`https://do/history?tenant=${tenant}&roomId=${roomId}&cursor=${cursor || ""}&limit=${limit}`);
      return json(await r.json(), r.status, corsHdrs);
    }

    // POST /api/v1/chat/:roomId/typing
    if (url.pathname.match(new RegExp(`^/api/${v}/chat/[^/]+/typing$`)) && req.method === "POST") {
      const roomId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.ChatRoom.idFromName(`${tenant}::${roomId}`);
      const stub = env.ChatRoom.get(id);
      const chatBody = { tenant, roomId, ...body };
      const r = await stub.fetch("https://do/typing", { method: "POST", body: JSON.stringify(chatBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- Photo Gallery (R2) --------

    // POST /api/v1/media/albums
    if (url.pathname === `/api/${v}/media/albums` && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const title = body.title || "Untitled Album";
      const teamId = body.teamId;

      const albumId = `alb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const indexKey = `tenants:${tenant}:albums:index`;
      const existing = ((await env.KV_IDEMP.get(indexKey, "json")) as any[]) || [];
      const row = { albumId, title, teamId, coverKey: null, count: 0, updatedTs: Date.now() };
      const next = [row, ...existing.filter((r) => r.albumId !== albumId)];
      await env.KV_IDEMP.put(indexKey, JSON.stringify(next.slice(0, 500)));

      // Initialize album photos index
      const albumIndexKey = `tenants:${tenant}:albums:${albumId}:index`;
      await env.KV_IDEMP.put(albumIndexKey, JSON.stringify([]));

      return json({ success: true, data: { albumId } }, 200, corsHdrs);
    }

    // GET /api/v1/media/albums (list albums)
    if (url.pathname === `/api/${v}/media/albums` && req.method === "GET") {
      const tenant = url.searchParams.get("tenant") || "default";
      const indexKey = `tenants:${tenant}:albums:index`;
      const albums = ((await env.KV_IDEMP.get(indexKey, "json")) as any[]) || [];
      return json({ success: true, data: albums }, 200, corsHdrs);
    }

    // GET /api/v1/media/albums/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/media/albums/[^/]+$`)) && req.method === "GET") {
      const albumId = url.pathname.split("/").pop()!;
      const tenant = url.searchParams.get("tenant") || "default";

      const indexKey = `tenants:${tenant}:albums:index`;
      const albums = ((await env.KV_IDEMP.get(indexKey, "json")) as any[]) || [];
      const album = albums.find((a) => a.albumId === albumId);
      if (!album) {
        return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);
      }

      const albumIndexKey = `tenants:${tenant}:albums:${albumId}:index`;
      const photos = ((await env.KV_IDEMP.get(albumIndexKey, "json")) as any[]) || [];

      return json({ success: true, data: { ...album, photos: photos.slice(0, 20) } }, 200, corsHdrs);
    }

    // POST /api/v1/media/albums/:id/upload-url
    if (url.pathname.match(new RegExp(`^/api/${v}/media/albums/[^/]+/upload-url$`)) && req.method === "POST") {
      const albumId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const contentType = body.contentType || "image/jpeg";

      const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const objectKey = `tenants/${tenant}/albums/${albumId}/${photoId}.jpg`;

      try {
        const putUrl = await env.R2_MEDIA.createMultipartUpload(objectKey);
        return json({ success: true, data: { putUrl, objectKey } }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "R2_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/media/albums/:id/commit
    if (url.pathname.match(new RegExp(`^/api/${v}/media/albums/[^/]+/commit$`)) && req.method === "POST") {
      const albumId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const objectKey = body.objectKey;
      const caption = body.caption;

      if (!objectKey) {
        return json({ success: false, error: { code: "VALIDATION", message: "objectKey required" } }, 400, corsHdrs);
      }

      // Update album photos index
      const albumIndexKey = `tenants:${tenant}:albums:${albumId}:index`;
      const photos = ((await env.KV_IDEMP.get(albumIndexKey, "json")) as any[]) || [];
      const photo = { key: objectKey, ts: Date.now(), caption };
      photos.push(photo);
      await env.KV_IDEMP.put(albumIndexKey, JSON.stringify(photos));

      // Update album count
      const indexKey = `tenants:${tenant}:albums:index`;
      const albums = ((await env.KV_IDEMP.get(indexKey, "json")) as any[]) || [];
      const album = albums.find((a) => a.albumId === albumId);
      if (album) {
        album.count = photos.length;
        album.updatedTs = Date.now();
        if (!album.coverKey) album.coverKey = objectKey;
        await env.KV_IDEMP.put(indexKey, JSON.stringify(albums));
      }

      return json({ success: true, data: { photoKey: objectKey } }, 200, corsHdrs);
    }

    // GET /api/v1/media/albums/:id/photos
    if (url.pathname.match(new RegExp(`^/api/${v}/media/albums/[^/]+/photos$`)) && req.method === "GET") {
      const albumId = url.pathname.split("/")[5];
      const tenant = url.searchParams.get("tenant") || "default";
      const cursor = url.searchParams.get("cursor") || "0";

      const albumIndexKey = `tenants:${tenant}:albums:${albumId}:index`;
      const photos = ((await env.KV_IDEMP.get(albumIndexKey, "json")) as any[]) || [];

      const offset = parseInt(cursor, 10);
      const limit = 20;
      const page = photos.slice(offset, offset + limit);

      // Generate signed GET URLs (1h TTL)
      const signedPhotos = await Promise.all(
        page.map(async (p: any) => {
          try {
            const obj = await env.R2_MEDIA.get(p.key);
            if (!obj) return { ...p, url: null };
            // Note: R2 doesn't have native presigned URLs yet, use object.createReadableStream() or proxy
            // For now, return the key (client can fetch via a proxy route)
            return { ...p, url: `/api/${v}/media/photo/${encodeURIComponent(p.key)}` };
          } catch (e) {
            return { ...p, url: null };
          }
        })
      );

      const nextCursor = offset + page.length < photos.length ? String(offset + limit) : null;

      return json({ success: true, data: { photos: signedPhotos, nextCursor } }, 200, corsHdrs);
    }

    // DELETE /api/v1/media/photos/:objectKey
    if (url.pathname.match(new RegExp(`^/api/${v}/media/photos/`)) && req.method === "DELETE") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const objectKey = decodeURIComponent(url.pathname.split("/media/photos/")[1]);
      const tenant = url.searchParams.get("tenant") || "default";

      try {
        await env.R2_MEDIA.delete(objectKey);
        // TODO: remove from album index
        return json({ success: true }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "R2_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/media/photo/:objectKey (proxy route for R2 object)
    if (url.pathname.match(new RegExp(`^/api/${v}/media/photo/`)) && req.method === "GET") {
      const objectKey = decodeURIComponent(url.pathname.split("/media/photo/")[1]);

      try {
        const obj = await env.R2_MEDIA.get(objectKey);
        if (!obj) {
          return new Response("Not found", { status: 404 });
        }
        const headers = mergeHeaders(corsHdrs, {
          "content-type": obj.httpMetadata?.contentType || "image/jpeg",
          "cache-control": "public, max-age=3600",
        });
        return new Response(obj.body, withSecurity({ status: 200, headers }));
      } catch (e: any) {
        return json({ success: false, error: { code: "R2_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Invites --------

    // POST /api/v1/admin/invites/create (admin)
    if (url.pathname === `/api/${v}/admin/invites/create` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const { tenant, teamId, role, maxUses, ttl_minutes } = body;
      try {
        const result = await Invites.createInvite(env, {
          tenant,
          teamId,
          role,
          maxUses,
          ttl_minutes,
          createdBy: user.userId || "admin",
        });
        return json(result, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "INVITE_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/admin/invites/:token (admin)
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/invites/[^/]+$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const token = url.pathname.split("/").pop()!;
      try {
        const invite = await Invites.getInvite(env, token);
        return json({ ok: true, invite }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "INVITE_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // POST /api/v1/invites/consume (public)
    if (url.pathname === `/api/${v}/invites/consume` && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { token, email, name } = body;
      try {
        const invite = await Invites.consumeInvite(env, token);
        // TODO: create or find user by email; assign role/team based on invite.role
        // TODO: issue tenant-scoped app JWT
        return json({ ok: true, invite }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "INVITE_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // -------- Teams --------

    // POST /api/v1/admin/teams (admin)
    if (url.pathname === `/api/${v}/admin/teams` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const { tenant, teamId, name, ageGroup } = body;
      try {
        const team = await Teams.createTeam(env, { tenant, teamId, name, ageGroup });
        return json({ ok: true, team }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "TEAM_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/teams (authenticated)
    if (url.pathname === `/api/${v}/teams` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";
      try {
        const teams = await Teams.listTeams(env, tenant);
        return json({ ok: true, teams }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "TEAM_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Chat (KV-backed) --------

    // POST /api/v1/admin/chat/rooms (admin)
    if (url.pathname === `/api/${v}/admin/chat/rooms` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const { tenant, roomId, teamId, type } = body;
      try {
        const room = await ChatKV.createRoom(env, { tenant, roomId, teamId, type });
        return json({ ok: true, room }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CHAT_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/chat/rooms (authenticated)
    if (url.pathname === `/api/${v}/chat/rooms` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";
      const teamId = url.searchParams.get("teamId") || undefined;
      try {
        // TODO: filter based on caller's role/team access
        const rooms = await ChatKV.listRooms(env, tenant, teamId);
        return json({ ok: true, rooms }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CHAT_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/chat/rooms/:roomId/messages (authenticated)
    if (url.pathname.match(new RegExp(`^/api/${v}/chat/rooms/[^/]+/messages$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const roomId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const { tenant, text } = body;
      try {
        // TODO: authZ: ensure caller can write to this room
        const msg = await ChatKV.addMessage(env, { tenant, roomId, userId: user.userId || "anonymous", text });
        return json({ ok: true, msg }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CHAT_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/chat/rooms/:roomId/messages (authenticated)
    if (url.pathname.match(new RegExp(`^/api/${v}/chat/rooms/[^/]+/messages$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const roomId = url.pathname.split("/")[5];
      const tenant = url.searchParams.get("tenant") || "default";
      try {
        const messages = await ChatKV.listMessages(env, { tenant, roomId, limit: 100 });
        return json({ ok: true, messages }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CHAT_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }


    // -------- Export/Backup Endpoints (Admin-only) --------

    // GET /api/v1/admin/export/tenant/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/export/tenant/([^/]+)$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const match = url.pathname.match(new RegExp(`^/api/${v}/admin/export/tenant/([^/]+)$`));
      const tenantId = match ? match[1] : "";
      try {
        const cfg = await getTenantConfig(env, tenantId);
        if (!cfg) {
          return json({ success: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, 404, corsHdrs);
        }
        // Return safe tenant config (no secrets)
        const exportData = {
          id: cfg.id,
          name: cfg.name,
          flags: cfg.flags || {},
          makeWebhookUrl: cfg.makeWebhookUrl ? "***configured***" : undefined,
          createdAt: cfg.createdAt,
        };
        return json({ success: true, data: exportData }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "INTERNAL", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/admin/export/tenant/:id/chat-index
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/export/tenant/([^/]+)/chat-index$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const match = url.pathname.match(new RegExp(`^/api/${v}/admin/export/tenant/([^/]+)/chat-index$`));
      const tenantId = match ? match[1] : "";
      try {
        const rooms = await ChatKV.listRooms(env, tenantId);
        return json({ success: true, data: { tenant: tenantId, rooms } }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "INTERNAL", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/admin/export/tenant/:id/gallery-index
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/export/tenant/([^/]+)/gallery-index$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const match = url.pathname.match(new RegExp(`^/api/${v}/admin/export/tenant/([^/]+)/gallery-index$`));
      const tenantId = match ? match[1] : "";
      try {
        const albums = await GalleryKV.listAlbums(env, tenantId);
        return json({ success: true, data: { tenant: tenantId, albums } }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "INTERNAL", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Gallery (KV-backed) --------

    // POST /api/v1/admin/gallery/albums (admin)
    if (url.pathname === `/api/${v}/admin/gallery/albums` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const { tenant, title, teamId, eventId } = body;
      try {
        const album = await GalleryKV.createAlbum(env, {
          tenant,
          title,
          teamId,
          eventId,
          createdBy: user.userId || "admin",
        });
        return json({ ok: true, album }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "GALLERY_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/gallery/albums (authenticated)
    if (url.pathname === `/api/${v}/gallery/albums` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";
      const teamId = url.searchParams.get("teamId") || undefined;
      try {
        const albums = await GalleryKV.listAlbums(env, tenant, teamId);
        return json({ ok: true, albums }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "GALLERY_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/gallery/albums/:albumId/upload (authenticated, multipart)
    if (url.pathname.match(new RegExp(`^/api/${v}/gallery/albums/[^/]+/upload$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const albumId = url.pathname.split("/")[5];
      const tenant = url.searchParams.get("tenant") || "default";
      const ct = req.headers.get("content-type") || "";
      if (!ct.startsWith("multipart/form-data")) {
        return json({ success: false, error: { code: "VALIDATION", message: "multipart required" } }, 400, corsHdrs);
      }
      try {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
          return json({ success: false, error: { code: "VALIDATION", message: "file missing" } }, 400, corsHdrs);
        }
        const buf = await file.arrayBuffer();
        const { r2Key } = await GalleryKV.uploadBinary(env, { tenant, albumId, file: buf, contentType: file.type });
        return json({ ok: true, r2Key }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "GALLERY_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // POST /api/v1/gallery/albums/:albumId/commit (authenticated)
    if (url.pathname.match(new RegExp(`^/api/${v}/gallery/albums/[^/]+/commit$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const albumId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const { tenant, r2Key, playerTags, consentCheck } = body;
      try {
        const media = await GalleryKV.commitMedia(env, {
          tenant,
          albumId,
          r2Key,
          uploaderId: user.userId || "anonymous",
          playerTags,
          consentCheck,
        });
        return json({ ok: true, media }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "GALLERY_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/gallery/albums/:albumId (authenticated)
    if (url.pathname.match(new RegExp(`^/api/${v}/gallery/albums/[^/]+$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const albumId = url.pathname.split("/")[5];
      const tenant = url.searchParams.get("tenant") || "default";
      try {
        const media = await GalleryKV.listMedia(env, { tenant, albumId, respectConsent: true });
        return json({ ok: true, media }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "GALLERY_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/gallery/file (authenticated, stream from R2)
    if (url.pathname === `/api/${v}/gallery/file` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const key = url.searchParams.get("key");
      if (!key) {
        return json({ success: false, error: { code: "VALIDATION", message: "key required" } }, 400, corsHdrs);
      }
      try {
        const obj = await env.R2_MEDIA.get(key);
        if (!obj) {
          return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);
        }
        const headers = mergeHeaders(corsHdrs, {
          "content-type": obj.httpMetadata?.contentType || "image/jpeg",
          "cache-control": "public, max-age=3600",
        });
        return new Response(obj.body, withSecurity({ status: 200, headers }));
      } catch (e: any) {
        return json({ success: false, error: { code: "R2_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Player Images (Admin) --------

    // POST /api/v1/admin/player-images
    if (url.pathname === `/api/${v}/admin/player-images` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      try {
        const { createPlayerImage } = await import("./services/playerImages");
        const image = await createPlayerImage(env, tenant, {
          playerId: body.playerId,
          playerName: body.playerName,
          type: body.type,
          imageUrl: body.imageUrl,
          r2Key: body.r2Key,
          uploadedBy: user.userId || "admin",
          metadata: body.metadata,
        });
        return json({ success: true, data: image }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "PLAYER_IMAGE_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/admin/player-images (list)
    if (url.pathname === `/api/${v}/admin/player-images` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";
      const playerId = url.searchParams.get("playerId") || undefined;
      const type = url.searchParams.get("type") as "headshot" | "action" | undefined;

      try {
        const { listPlayerImages } = await import("./services/playerImages");
        const images = await listPlayerImages(env, tenant, { playerId, type });
        return json({ success: true, data: images }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "PLAYER_IMAGE_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/admin/player-images/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/player-images/[^/]+$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const imageId = url.pathname.split("/").pop()!;
      const tenant = url.searchParams.get("tenant") || "default";

      try {
        const { getPlayerImage } = await import("./services/playerImages");
        const image = await getPlayerImage(env, tenant, imageId);
        if (!image) {
          return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);
        }
        return json({ success: true, data: image }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "PLAYER_IMAGE_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // PATCH /api/v1/admin/player-images/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/player-images/[^/]+$`)) && req.method === "PATCH") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const imageId = url.pathname.split("/").pop()!;
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      try {
        const { updatePlayerImage } = await import("./services/playerImages");
        const image = await updatePlayerImage(env, tenant, imageId, body);
        if (!image) {
          return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);
        }
        return json({ success: true, data: image }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "PLAYER_IMAGE_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // DELETE /api/v1/admin/player-images/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/player-images/[^/]+$`)) && req.method === "DELETE") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const imageId = url.pathname.split("/").pop()!;
      const tenant = url.searchParams.get("tenant") || "default";

      try {
        const { deletePlayerImage } = await import("./services/playerImages");
        const deleted = await deletePlayerImage(env, tenant, imageId);
        if (!deleted) {
          return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);
        }
        return json({ success: true }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "PLAYER_IMAGE_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Auto-Posts Matrix (Admin) --------

    // GET /api/v1/admin/auto-posts-matrix
    if (url.pathname === `/api/${v}/admin/auto-posts-matrix` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";

      try {
        const { getAutoPostsMatrix } = await import("./services/autoPostsMatrix");
        const matrix = await getAutoPostsMatrix(env, tenant);
        return json({ success: true, data: matrix }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "MATRIX_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // PUT /api/v1/admin/auto-posts-matrix
    if (url.pathname === `/api/${v}/admin/auto-posts-matrix` && req.method === "PUT") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      try {
        const { updateAutoPostsMatrix } = await import("./services/autoPostsMatrix");
        const matrix = await updateAutoPostsMatrix(env, tenant, body.matrix);
        return json({ success: true, data: matrix }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "MATRIX_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/admin/auto-posts-matrix/reset
    if (url.pathname === `/api/${v}/admin/auto-posts-matrix/reset` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      try {
        const { resetAutoPostsMatrix } = await import("./services/autoPostsMatrix");
        const matrix = await resetAutoPostsMatrix(env, tenant);
        return json({ success: true, data: matrix }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "MATRIX_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Brand API (White-Label Multi-Tenant) --------

    // GET /api/v1/brand - Public endpoint for frontends to get brand kit
    if (url.pathname === `/api/${v}/brand` && req.method === "GET") {
      const tenant = url.searchParams.get("tenant") || req.headers.get("x-tenant") || "default";

      try {
        const { getBrand } = await import("./services/brand");
        const brand = await getBrand(env, tenant);
        return json({ success: true, data: brand }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "BRAND_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/brand - Admin endpoint to update brand kit
    if (url.pathname === `/api/${v}/brand` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }

      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || req.headers.get("x-tenant") || url.searchParams.get("tenant") || "default";

      try {
        const { setBrand } = await import("./services/brand");
        const brand = await setBrand(env, tenant, body);
        return json({ success: true, data: brand }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "BRAND_ERROR", message: e.message } }, 400, corsHdrs);
      }
    }

    // -------- Club Config (Admin) --------

    // GET /api/v1/admin/club-config
    if (url.pathname === `/api/${v}/admin/club-config` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";

      try {
        const { getClubConfig } = await import("./services/clubConfig");
        const config = await getClubConfig(env, tenant);
        return json({ success: true, data: config }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CONFIG_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // PUT /api/v1/admin/club-config
    if (url.pathname === `/api/${v}/admin/club-config` && req.method === "PUT") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      try {
        const { updateClubConfig } = await import("./services/clubConfig");
        const config = await updateClubConfig(env, tenant, body.config);
        return json({ success: true, data: config }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CONFIG_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // PATCH /api/v1/admin/club-config/:section
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/club-config/[^/]+$`)) && req.method === "PATCH") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const section = url.pathname.split("/").pop()!;
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      try {
        const { updateClubConfigSection } = await import("./services/clubConfig");
        const config = await updateClubConfigSection(env, tenant, section as any, body.data);
        return json({ success: true, data: config }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CONFIG_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/admin/club-config/upload-badge
    if (url.pathname === `/api/${v}/admin/club-config/upload-badge` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";
      const ct = req.headers.get("content-type") || "";
      if (!ct.startsWith("multipart/form-data")) {
        return json({ success: false, error: { code: "VALIDATION", message: "multipart required" } }, 400, corsHdrs);
      }

      try {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
          return json({ success: false, error: { code: "VALIDATION", message: "file missing" } }, 400, corsHdrs);
        }
        const buf = await file.arrayBuffer();
        const { uploadClubBadge } = await import("./services/clubConfig");
        const result = await uploadClubBadge(env, tenant, buf, file.type);
        return json({ success: true, data: result }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CONFIG_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/admin/club-config/upload-sponsor
    if (url.pathname === `/api/${v}/admin/club-config/upload-sponsor` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";
      const ct = req.headers.get("content-type") || "";
      if (!ct.startsWith("multipart/form-data")) {
        return json({ success: false, error: { code: "VALIDATION", message: "multipart required" } }, 400, corsHdrs);
      }

      try {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
          return json({ success: false, error: { code: "VALIDATION", message: "file missing" } }, 400, corsHdrs);
        }
        const buf = await file.arrayBuffer();
        const { uploadSponsorLogo } = await import("./services/clubConfig");
        const result = await uploadSponsorLogo(env, tenant, buf, file.type);
        return json({ success: true, data: result }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CONFIG_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Post Bus --------
    if (url.pathname === `/api/${v}/post` && req.method === "POST") {
      // 1) Auth
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);

      // 2) Validate body
      const body = await req.json().catch(() => null);
      const parsed = body ? PostReqSchema.safeParse(body) : { success: false, error: { message: "Invalid JSON" } } as const;
      if (!("success" in parsed) || !parsed.success) {
        return json({ success: false, error: { code: "VALIDATION", message: (parsed as any).error?.message || "Invalid" } }, 400, corsHdrs);
      }

      // 3) Idempotency
      const idemHeader = readIdempotencyKey(req);
      const idem = await ensureIdempotent(env, parsed.data.tenant, parsed.data, idemHeader || undefined);
      if (idem.hit) return json(idem.response, 200, corsHdrs);

      // 4) Enqueue to Cloudflare Queues
      await env.POST_QUEUE.send({
        tenant: parsed.data.tenant,
        template: parsed.data.template,
        channels: parsed.data.channels,
        data: parsed.data.data,
        createdAt: Date.now(),
        idemKey: idem.key
      });

      // 5) Store and return "queued"
      const resp = { success: true, data: { queued: true } };
      await idem.store(resp);
      return json(resp, 202, corsHdrs);
    }

    // Fallback - log for debugging
    logJSON("warn", requestId, {
      message: "Route not found",
      method: req.method,
      pathname: url?.pathname,
      search: url?.search
    });
    return json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }, 404, corsHdrs);
    } catch (err: any) {
      const ms = Date.now() - t0;
      if (err instanceof Response) {
        const secured = respondWithCors(err, corsHdrs);
        logJSON({
          level: "error",
          msg: err.statusText || "response_error",
          requestId,
          path: url?.pathname,
          status: secured.status,
          ms,
        });
        return secured;
      }
      logJSON({
        level: "error",
        msg: err?.message || "unhandled",
        requestId,
        path: url?.pathname,
        status: 500,
        ms,
      });
      return json(
        { success: false, error: { code: "INTERNAL", message: "Unexpected error" } },
        500,
        corsHdrs
      );
      
      const headers = mergeHeaders(corsHdrs, { "content-type": "application/json" });
      return new Response(JSON.stringify({ error: { code: "INTERNAL", requestId } }), withSecurity({ status: 500, headers }));
    } finally {
      const ms = Date.now() - t0;
      logJSON({ level: "info", msg: "request_end", requestId, path: url?.pathname, ms });
    }
  },

  // <- This wires the queue consumer to this worker
  queue: queueWorker.queue,

  // <- Cron handler (called by [triggers].crons in wrangler.toml)
  async scheduled(controller: ScheduledController, env: any, ctx: ExecutionContext) {
    logJSON({ level: "info", msg: "cron_tick", path: "scheduled", ms: Date.now() - controller.scheduledTime });

    // OPTIONAL: event reminders (wire later)
    // try {
    //   await sendEventReminders(env);
    // } catch (err) {
    //   console.error("reminders failure", err);
    // }
  }
};
