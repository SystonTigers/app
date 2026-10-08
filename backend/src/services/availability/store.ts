/**
 * Availability: families say whether each child can make the coming
 * matches, training sessions and club events (yes / no / maybe, with an
 * optional note for the coaches). Staff see the whole squad's answers for
 * each item and can answer for a child (a text from a parent, say).
 *
 * Families only ever see their own children's answers; the squad view and
 * the notes are for staff. Reminders are in reminders.ts.
 */
import { hasAnyRole, STAFF_ROLES, type TenantClaims } from "../auth";
import { linkedPlayerIds } from "../playerPrivacy";
import { AvailabilityError, LOOKAHEAD_DAYS, matchTitle, timeOf, ukDate, type Answer, type ItemType } from "./rules";

type DB = { DB: D1Database };

/** Fixtures that still need players (not played, called off or moved). */
export const OPEN_FIXTURE_SQL = `COALESCE(status, 'scheduled') NOT IN ('completed', 'cancelled', 'postponed')`;

export interface Item {
  type: ItemType;
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, or null when no time is set */
  time: string | null;
  place: string | null;
  /** Matches only */
  homeAway?: "home" | "away";
}

export interface ChildAnswer {
  playerId: string;
  name: string;
  status: Answer | null;
  note: string | null;
}

export interface Counts { yes: number; no: number; maybe: number; waiting: number }

export interface OverviewItem extends Item {
  /** My linked children (families), with their answers */
  children: ChildAnswer[];
  /** Staff only: the whole squad's answers */
  counts?: Counts;
}

export interface SquadAnswer extends ChildAnswer {
  number: number | null;
  /** Answered by staff rather than the family */
  byStaff: boolean;
  /** How many family accounts are linked (0 = nobody can answer but staff) */
  linkedFamilies: number;
}

interface FixtureRow { id: string; fixture_date: string; kick_off_time: string | null; opponent: string; home_team: string | null; away_team: string | null; venue: string | null; competition: string | null }
interface PlanRow { id: string; title: string | null; scheduled_date: string; start_time: string | null; location: string | null }
interface EventRow { id: string; title: string; event_type: string | null; start_time: string; location: string | null }

function fromFixture(f: FixtureRow): Item {
  const away = Boolean(f.home_team && f.home_team === f.opponent && f.away_team !== f.opponent);
  return {
    type: "match", id: f.id, title: matchTitle(f.opponent, f.competition), date: f.fixture_date.slice(0, 10),
    time: timeOf(f.kick_off_time) ?? timeOf(f.fixture_date), place: f.venue || null, homeAway: away ? "away" : "home",
  };
}

function fromPlan(p: PlanRow): Item {
  const focus = p.title?.trim();
  return { type: "training", id: p.id, title: focus && !/^training$/i.test(focus) ? `Training: ${focus}` : "Training", date: p.scheduled_date.slice(0, 10), time: timeOf(p.start_time), place: p.location || null };
}

function fromEvent(e: EventRow): Item {
  return { type: "event", id: e.id, title: e.title, date: e.start_time.slice(0, 10), time: timeOf(e.start_time), place: e.location || null };
}

const byWhen = (a: Item, b: Item) => (a.date + (a.time ?? "99")).localeCompare(b.date + (b.time ?? "99"));

/** Matches, training and events between two UK dates (inclusive), soonest first. */
export async function itemsBetween(env: DB, tenantId: string, from: string, to: string): Promise<Item[]> {
  const [fixtures, plans, events] = await Promise.all([
    env.DB.prepare(
      `SELECT id, fixture_date, kick_off_time, opponent, home_team, away_team, venue, competition FROM fixtures
       WHERE tenant_id = ? AND substr(fixture_date, 1, 10) BETWEEN ? AND ? AND ${OPEN_FIXTURE_SQL}`,
    ).bind(tenantId, from, to).all<FixtureRow>(),
    env.DB.prepare(`SELECT id, title, scheduled_date, start_time, location FROM training_plans WHERE tenant_id = ? AND substr(scheduled_date, 1, 10) BETWEEN ? AND ?`)
      .bind(tenantId, from, to).all<PlanRow>(),
    env.DB.prepare(`SELECT id, title, event_type, start_time, location FROM calendar_events WHERE tenant_id = ? AND substr(start_time, 1, 10) BETWEEN ? AND ?`)
      .bind(tenantId, from, to).all<EventRow>(),
  ]);
  return [
    ...(fixtures.results ?? []).map(fromFixture),
    ...(plans.results ?? []).map(fromPlan),
    ...(events.results ?? []).map(fromEvent),
  ].sort(byWhen);
}

/** One item, or a 404. Past items can't be answered any more. */
export async function getItem(env: DB, tenantId: string, type: ItemType, id: string): Promise<Item> {
  let item: Item | null = null;
  if (type === "match") {
    const row = await env.DB.prepare(`SELECT id, fixture_date, kick_off_time, opponent, home_team, away_team, venue, competition FROM fixtures WHERE tenant_id = ? AND id = ? AND ${OPEN_FIXTURE_SQL}`)
      .bind(tenantId, id).first<FixtureRow>();
    item = row ? fromFixture(row) : null;
  } else if (type === "training") {
    const row = await env.DB.prepare(`SELECT id, title, scheduled_date, start_time, location FROM training_plans WHERE tenant_id = ? AND id = ?`).bind(tenantId, id).first<PlanRow>();
    item = row ? fromPlan(row) : null;
  } else {
    const row = await env.DB.prepare(`SELECT id, title, event_type, start_time, location FROM calendar_events WHERE tenant_id = ? AND id = ?`).bind(tenantId, id).first<EventRow>();
    item = row ? fromEvent(row) : null;
  }
  if (!item) throw new AvailabilityError(404, "NOT_FOUND", "That isn't on the calendar any more.");
  return item;
}

const isStaff = (claims: TenantClaims) => hasAnyRole(claims, STAFF_ROLES);
const key = (type: string, id: string) => `${type}:${id}`;

interface AnswerRow { item_type: string; item_id: string; player_id: string; status: Answer; note: string | null; set_by_staff: number }

async function answersFor(env: DB, tenantId: string, items: Item[], playerIds?: string[]): Promise<AnswerRow[]> {
  if (!items.length || (playerIds && !playerIds.length)) return [];
  // Grouped by type so the IN lists stay short
  const out: AnswerRow[] = [];
  for (const type of ["match", "training", "event"] as const) {
    const ids = items.filter((i) => i.type === type).map((i) => i.id);
    if (!ids.length) continue;
    const players = playerIds ? ` AND player_id IN (${playerIds.map(() => "?").join(",")})` : "";
    const { results } = await env.DB.prepare(
      `SELECT item_type, item_id, player_id, status, note, set_by_staff FROM player_availability
       WHERE tenant_id = ? AND item_type = ? AND item_id IN (${ids.map(() => "?").join(",")})${players}`,
    ).bind(tenantId, type, ...ids, ...(playerIds ?? [])).all<AnswerRow>();
    out.push(...(results ?? []));
  }
  return out;
}

/** What's coming up in the next four weeks, with my children's answers (and squad totals for staff). */
export async function overview(env: DB, claims: TenantClaims, now = new Date()): Promise<{ items: OverviewItem[]; children: Array<{ playerId: string; name: string }>; staff: boolean }> {
  const staff = isStaff(claims);
  const linked = [...(await linkedPlayerIds(env, claims))];
  const [items, kids] = await Promise.all([
    itemsBetween(env, claims.tenantId, ukDate(now), ukDate(now, LOOKAHEAD_DAYS)),
    linked.length
      ? env.DB.prepare(`SELECT id, name FROM squad WHERE tenant_id = ? AND id IN (${linked.map(() => "?").join(",")}) ORDER BY name`).bind(claims.tenantId, ...linked).all<{ id: string; name: string }>()
      : Promise.resolve({ results: [] as Array<{ id: string; name: string }> }),
  ]);
  const children = (kids.results ?? []).map((k) => ({ playerId: k.id, name: k.name }));
  const mine = await answersFor(env, claims.tenantId, items, children.map((c) => c.playerId));
  const myAnswer = new Map(mine.map((a) => [`${key(a.item_type, a.item_id)}|${a.player_id}`, a]));

  let counts = new Map<string, Counts>();
  if (staff && items.length) {
    const squadSize = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM squad WHERE tenant_id = ?`).bind(claims.tenantId).first<{ n: number }>())?.n ?? 0;
    counts = new Map(items.map((i) => [key(i.type, i.id), { yes: 0, no: 0, maybe: 0, waiting: squadSize }]));
    for (const a of await answersFor(env, claims.tenantId, items)) {
      const c = counts.get(key(a.item_type, a.item_id));
      if (!c) continue;
      c[a.status]++;
      c.waiting = Math.max(0, c.waiting - 1);
    }
  }

  return {
    staff,
    children,
    items: items.map((i) => ({
      ...i,
      children: children.map((c) => {
        const a = myAnswer.get(`${key(i.type, i.id)}|${c.playerId}`);
        return { playerId: c.playerId, name: c.name, status: a?.status ?? null, note: a?.note ?? null };
      }),
      ...(staff ? { counts: counts.get(key(i.type, i.id)) } : {}),
    })),
  };
}

/** Staff: the whole squad's answers for one item. */
export async function squadAnswers(env: DB, tenantId: string, type: ItemType, id: string): Promise<{ item: Item; players: SquadAnswer[] }> {
  const item = await getItem(env, tenantId, type, id);
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.name, s.number, a.status, a.note, a.set_by_staff,
            (SELECT COUNT(*) FROM auth_user_players l WHERE l.tenant_id = s.tenant_id AND l.player_id = s.id) AS linked
     FROM squad s
     LEFT JOIN player_availability a ON a.tenant_id = s.tenant_id AND a.player_id = s.id AND a.item_type = ? AND a.item_id = ?
     WHERE s.tenant_id = ?
     ORDER BY s.number IS NULL, s.number, s.name`,
  ).bind(type, id, tenantId).all<{ id: string; name: string; number: number | null; status: Answer | null; note: string | null; set_by_staff: number | null; linked: number }>();
  return {
    item,
    players: (results ?? []).map((r) => ({
      playerId: r.id, name: r.name, number: typeof r.number === "number" ? r.number : null,
      status: r.status ?? null, note: r.note ?? null, byStaff: r.set_by_staff === 1, linkedFamilies: r.linked,
    })),
  };
}

/** Answer (or clear, with status null) for one child: their family or staff. */
export async function setAnswer(env: DB, claims: TenantClaims, type: ItemType, id: string, playerId: string, answer: { status: Answer | null; note: string | null }, now = new Date()): Promise<ChildAnswer> {
  const item = await getItem(env, claims.tenantId, type, id);
  if (item.date < ukDate(now)) throw new AvailabilityError(409, "PAST", "That's already happened.");
  const player = await env.DB.prepare(`SELECT id, name FROM squad WHERE tenant_id = ? AND id = ?`).bind(claims.tenantId, playerId).first<{ id: string; name: string }>();
  if (!player) throw new AvailabilityError(404, "NOT_FOUND", "That player isn't in the squad.");
  const staff = isStaff(claims);
  if (!staff && !(await linkedPlayerIds(env, claims)).has(playerId)) {
    throw new AvailabilityError(403, "FORBIDDEN", "Only this player's family or the coaches can answer for them.");
  }
  if (answer.status === null) {
    await env.DB.prepare(`DELETE FROM player_availability WHERE tenant_id = ? AND item_type = ? AND item_id = ? AND player_id = ?`)
      .bind(claims.tenantId, type, id, playerId).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO player_availability (tenant_id, item_type, item_id, player_id, status, note, set_by, set_by_staff, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (tenant_id, item_type, item_id, player_id) DO UPDATE SET
         status = excluded.status, note = excluded.note, set_by = excluded.set_by, set_by_staff = excluded.set_by_staff, updated_at = excluded.updated_at`,
    ).bind(claims.tenantId, type, id, playerId, answer.status, answer.note, claims.userId ?? null, staff && !(await linkedPlayerIds(env, claims)).has(playerId) ? 1 : 0, now.getTime()).run();
  }
  return { playerId, name: player.name, status: answer.status, note: answer.note };
}

/** Staff: who said yes for a match (line-up picker hint). */
export async function availabilityForMatch(env: DB, tenantId: string, fixtureId: string): Promise<Record<string, Answer>> {
  const { results } = await env.DB.prepare(`SELECT player_id, status FROM player_availability WHERE tenant_id = ? AND item_type = 'match' AND item_id = ?`)
    .bind(tenantId, fixtureId).all<{ player_id: string; status: Answer }>();
  return Object.fromEntries((results ?? []).map((r) => [r.player_id, r.status]));
}
