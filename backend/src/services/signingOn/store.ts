/**
 * Signing on: reading and saving forms and entries. Each season's entry is
 * per child; submitting also updates the squad's date of birth, emergency
 * contacts and photo/video consent so the rest of the app stays current.
 */
import { hasAnyRole, STAFF_ROLES, type TenantClaims } from "../auth";
import { linkedPlayerIds } from "../playerPrivacy";
import { resolveSeason, type SeasonOption } from "../seasons/range";
import { logJSON } from "../../lib/log";
import { SigningOnError, type EmergencyContact, type SigningOnAnswers, type SigningOnDetails, type SigningOnForm } from "./rules";

type DB = { DB: D1Database };

export interface SigningOnEntry {
  playerId: string;
  details: SigningOnDetails;
  contacts: EmergencyContact[];
  photos: boolean;
  video: boolean;
  conductAgreed: boolean;
  submittedAt: number;
  paid: boolean;
  paidAt: number | null;
}

export interface SquadStatus {
  playerId: string;
  name: string;
  number: number | null;
  signedOn: boolean;
  submittedAt: number | null;
  paid: boolean;
  linkedParents: number;
}

interface EntryRow {
  player_id: string; details: string; contacts: string; photo_consent: number; video_consent: number;
  conduct_agreed: number; submitted_at: number; paid_at: number | null;
}

const isStaff = (claims: TenantClaims) => hasAnyRole(claims, STAFF_ROLES);

function parse<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function toEntry(r: EntryRow): SigningOnEntry {
  return {
    playerId: r.player_id,
    details: parse<SigningOnDetails>(r.details, { dob: null, address: null, school: null, medical: null, allergies: null }),
    contacts: parse<EmergencyContact[]>(r.contacts, []),
    photos: r.photo_consent === 1,
    video: r.video_consent === 1,
    conductAgreed: r.conduct_agreed === 1,
    submittedAt: r.submitted_at,
    paid: r.paid_at !== null,
    paidAt: r.paid_at,
  };
}

/** The season people are signing on for: the current one. */
export async function signingOnSeason(env: DB, tenantId: string, now = new Date()): Promise<SeasonOption> {
  const season = await resolveSeason(env, tenantId, null, now);
  if (!season) throw new SigningOnError(409, "NO_SEASON", "There's no season to sign on for yet.");
  return season;
}

export async function getForm(env: DB, tenantId: string, seasonId: string): Promise<SigningOnForm> {
  const row = await env.DB.prepare(`SELECT fee_pence, fee_note, conduct FROM signing_on_forms WHERE tenant_id = ? AND season_id = ?`)
    .bind(tenantId, seasonId).first<{ fee_pence: number | null; fee_note: string | null; conduct: string | null }>();
  return { feeAmount: row?.fee_pence == null ? null : row.fee_pence / 100, feeNote: row?.fee_note ?? null, conduct: row?.conduct ?? null };
}

export async function saveForm(env: DB, claims: TenantClaims, seasonId: string, form: SigningOnForm, now = Date.now()): Promise<SigningOnForm> {
  await env.DB.prepare(
    `INSERT INTO signing_on_forms (tenant_id, season_id, fee_pence, fee_note, conduct, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tenant_id, season_id) DO UPDATE SET fee_pence = excluded.fee_pence, fee_note = excluded.fee_note,
       conduct = excluded.conduct, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
  ).bind(claims.tenantId, seasonId, form.feeAmount === null ? null : Math.round(form.feeAmount * 100), form.feeNote, form.conduct, claims.userId ?? null, now).run();
  return form;
}

/** The children this person can sign on (their linked children; staff: none here, they use the squad list). */
export async function myChildren(env: DB, claims: TenantClaims, seasonId: string): Promise<Array<{ playerId: string; name: string; entry: SigningOnEntry | null }>> {
  const ids = [...(await linkedPlayerIds(env, claims))];
  if (!ids.length) return [];
  const marks = ids.map(() => "?").join(", ");
  const [players, entries] = await Promise.all([
    env.DB.prepare(`SELECT id, name FROM squad WHERE tenant_id = ? AND id IN (${marks}) ORDER BY name`).bind(claims.tenantId, ...ids).all<{ id: string; name: string }>(),
    env.DB.prepare(`SELECT * FROM signing_on_entries WHERE tenant_id = ? AND season_id = ? AND player_id IN (${marks})`).bind(claims.tenantId, seasonId, ...ids).all<EntryRow>(),
  ]);
  const byPlayer = new Map((entries.results || []).map((e) => [e.player_id, toEntry(e)]));
  return (players.results || []).map((p) => ({ playerId: p.id, name: p.name, entry: byPlayer.get(p.id) ?? null }));
}

/** Staff: everyone in the squad and whether they've signed on and paid this season. */
export async function squadStatus(env: DB, tenantId: string, seasonId: string): Promise<SquadStatus[]> {
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.name, s.number, e.submitted_at, e.paid_at,
            (SELECT COUNT(*) FROM auth_user_players l WHERE l.tenant_id = s.tenant_id AND l.player_id = s.id) AS linked
     FROM squad s
     LEFT JOIN signing_on_entries e ON e.tenant_id = s.tenant_id AND e.player_id = s.id AND e.season_id = ?
     WHERE s.tenant_id = ?
     ORDER BY s.name`,
  ).bind(seasonId, tenantId).all<{ id: string; name: string; number: number | null; submitted_at: number | null; paid_at: number | null; linked: number }>();
  return (results || []).map((r) => ({
    playerId: r.id, name: r.name, number: r.number, signedOn: r.submitted_at !== null, submittedAt: r.submitted_at, paid: r.paid_at !== null, linkedParents: r.linked,
  }));
}

async function mayActFor(env: DB, claims: TenantClaims, playerId: string): Promise<void> {
  const player = await env.DB.prepare(`SELECT id FROM squad WHERE tenant_id = ? AND id = ?`).bind(claims.tenantId, playerId).first();
  if (!player) throw new SigningOnError(404, "NOT_FOUND", "Player not found.");
  if (isStaff(claims)) return;
  if (!(await linkedPlayerIds(env, claims)).has(playerId)) {
    throw new SigningOnError(403, "FORBIDDEN", "Only this player's family or the club's staff can see or sign them on.");
  }
}

/** One child's entry this season (staff, or the child's own family). */
export async function getEntry(env: DB, claims: TenantClaims, playerId: string, seasonId: string): Promise<SigningOnEntry | null> {
  await mayActFor(env, claims, playerId);
  const row = await env.DB.prepare(`SELECT * FROM signing_on_entries WHERE tenant_id = ? AND player_id = ? AND season_id = ?`)
    .bind(claims.tenantId, playerId, seasonId).first<EntryRow>();
  return row ? toEntry(row) : null;
}

/** Sign a child on (or update this season's answers). Keeps the squad's details and consent in step. */
export async function submitEntry(env: DB, claims: TenantClaims, playerId: string, seasonId: string, a: SigningOnAnswers, now = Date.now()): Promise<SigningOnEntry> {
  await mayActFor(env, claims, playerId);
  const c = (i: number) => a.contacts[i] ?? null;
  const contactBinds = [0, 1, 2].flatMap((i) => [c(i)?.relationship ?? null, c(i)?.name ?? null, c(i)?.phone ?? null, c(i)?.email ?? null]);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO signing_on_entries (tenant_id, player_id, season_id, details, contacts, photo_consent, video_consent, conduct_agreed, submitted_by, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, player_id, season_id) DO UPDATE SET details = excluded.details, contacts = excluded.contacts,
         photo_consent = excluded.photo_consent, video_consent = excluded.video_consent, conduct_agreed = excluded.conduct_agreed,
         submitted_by = excluded.submitted_by, submitted_at = excluded.submitted_at`,
    ).bind(claims.tenantId, playerId, seasonId, JSON.stringify(a.details), JSON.stringify(a.contacts), a.photos ? 1 : 0, a.video ? 1 : 0,
      a.agreeConduct ? 1 : 0, claims.userId ?? null, now),
    env.DB.prepare(
      `UPDATE squad SET dob = ?,
         contact1_relationship = ?, contact1_name = ?, contact1_phone = ?, contact1_email = ?,
         contact2_relationship = ?, contact2_name = ?, contact2_phone = ?, contact2_email = ?,
         contact3_relationship = ?, contact3_name = ?, contact3_phone = ?, contact3_email = ?,
         photo_consent = ?, video_consent = ?, consent_source = ?, consent_updated_at = ?
       WHERE tenant_id = ? AND id = ?`,
    ).bind(a.details.dob, ...contactBinds, a.photos ? 1 : 0, a.video ? 1 : 0, isStaff(claims) ? "staff" : "parent", now, claims.tenantId, playerId),
  ]);
  logJSON({ level: "info", msg: "signing_on_submitted", tenantId: claims.tenantId, playerId, seasonId, byStaff: isStaff(claims) });
  return (await getEntry(env, claims, playerId, seasonId))!;
}

/** Staff: mark this season's fee paid or not paid. */
export async function markPaid(env: DB, claims: TenantClaims, playerId: string, seasonId: string, paid: boolean, now = Date.now()): Promise<SigningOnEntry> {
  const res = await env.DB.prepare(
    `UPDATE signing_on_entries SET paid_at = ?, paid_marked_by = ? WHERE tenant_id = ? AND player_id = ? AND season_id = ?`,
  ).bind(paid ? now : null, paid ? claims.userId ?? null : null, claims.tenantId, playerId, seasonId).run();
  if (!res.meta?.changes) throw new SigningOnError(409, "NOT_SIGNED_ON", "They haven't signed on this season yet.");
  return (await getEntry(env, claims, playerId, seasonId))!;
}
