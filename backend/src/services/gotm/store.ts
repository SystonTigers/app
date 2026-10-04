/**
 * Goal of the Month in the database: the month's goals staff can nominate,
 * the vote members see (with the goal's match, minute and clip), one vote per
 * person, and closing with a winner.
 *
 * Tables: gotm_voting (one per vote), gotm_candidates (the nominated goals,
 * `event_id` = the goal), gotm_votes (unique per vote and person).
 */
import { hasAnyRole, STAFF_ROLES, type TenantClaims } from "../auth";
import { publicPhotoSql } from "../consent";
import { linkedPlayerIds } from "../playerPrivacy";
import { fixtureGoalClips, type GoalClip } from "../playerProfile/clips";
import { monthLabel, monthRange, MONTHS, winnersOf, type NewVote } from "./rules";

type Env = { DB: D1Database };

/** A goal from the month that staff can nominate. */
export interface GoalOption {
  eventId: string;
  playerId: string;
  playerName: string;
  fixtureId: string;
  opponent: string;
  date: string;
  minute: number | null;
  hasClip: boolean;
}

export interface CandidateView {
  id: string;
  playerId: string;
  playerName: string;
  fixtureId: string | null;
  opponent: string | null;
  date: string | null;
  minute: number | null;
  description: string | null;
  /** The match video clip, when there is one and the player's family agreed to video */
  clip: GoalClip | null;
  videoUrl: string | null;
  /** Staff see counts while voting is open; everyone sees them once it's closed */
  votes: number | null;
}

export interface VoteView {
  id: string;
  label: string;
  status: "open" | "closed";
  candidates: CandidateView[];
  /** The candidate I voted for */
  myVote: string | null;
  /** Candidate ids with the most votes, once closed */
  winners: string[];
}

interface VotingRow { id: string; month: string; year: number; status: string; created_at: number }
interface CandidateRow { id: string; voting_id: string; player_id: string; match_id: string | null; event_id: string | null; description: string | null; video_url: string | null; votes: number }

/** Who is voting: the account id (older tokens only have `sub`). */
export function voterId(claims: TenantClaims): string {
  return claims.userId ?? claims.sub ?? "";
}

const marks = (n: number) => Array.from({ length: n }, () => "?").join(",");

/** Goals our players scored in a month (Match Centre and match reports), oldest first. */
export async function monthGoals(env: Env, tenantId: string, month: number, year: number): Promise<GoalOption[]> {
  const { from, to } = monthRange(month, year);
  type Row = { id: string; player_id: string; minute: number | null; fixture_id: string; opponent: string; fixture_date: string; name: string };
  const [live, reports] = await Promise.all([
    env.DB.prepare(
      `SELECT e.id, e.player_id, e.minute, e.fixture_id, f.opponent, f.fixture_date, s.name
       FROM live_match_events e
         JOIN fixtures f ON f.id = e.fixture_id AND f.tenant_id = e.tenant_id
         JOIN squad s ON s.id = e.player_id AND s.tenant_id = e.tenant_id
       WHERE e.tenant_id = ? AND e.type = 'goal' AND e.deleted_at IS NULL AND substr(f.fixture_date, 1, 10) BETWEEN ? AND ?`,
    ).bind(tenantId, from, to).all<Row>(),
    // Match reports and results with scorers picked (Match Centre's own copies start "live-")
    env.DB.prepare(
      `SELECT m.id, m.player_id, m.minute, m.fixture_id, f.opponent, f.fixture_date, s.name
       FROM match_events m
         JOIN fixtures f ON f.id = m.fixture_id AND f.tenant_id = m.tenant_id
         JOIN squad s ON s.id = m.player_id AND s.tenant_id = m.tenant_id
       WHERE m.tenant_id = ? AND m.event_type = 'goal' AND m.id NOT LIKE 'live-%' AND substr(f.fixture_date, 1, 10) BETWEEN ? AND ?`,
    ).bind(tenantId, from, to).all<Row>(),
  ]);
  const rows = [...(live.results ?? []), ...(reports.results ?? [])];
  const withVideo = new Set<string>();
  for (const fixtureId of new Set((live.results ?? []).map((r) => r.fixture_id))) {
    for (const eventId of (await fixtureGoalClips(env, tenantId, fixtureId)).keys()) withVideo.add(eventId);
  }
  return rows
    .map((r) => ({
      eventId: r.id, playerId: r.player_id, playerName: r.name, fixtureId: r.fixture_id, opponent: r.opponent,
      date: r.fixture_date.slice(0, 10), minute: r.minute, hasClip: withVideo.has(r.id),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.minute ?? 999) - (b.minute ?? 999));
}

/** Opens a vote. Returns its id, or why it can't open. */
export async function openVote(env: Env, tenantId: string, vote: NewVote, now = Date.now()): Promise<{ id: string } | { problem: string }> {
  const open = await env.DB.prepare(`SELECT id FROM gotm_voting WHERE tenant_id = ? AND status = 'open' LIMIT 1`).bind(tenantId).first();
  if (open) return { problem: "A vote is already open. Close it before starting another." };

  const playerIds = [...new Set(vote.goals.map((g) => g.playerId))];
  const players = await env.DB.prepare(`SELECT id FROM squad WHERE tenant_id = ? AND id IN (${marks(playerIds.length)})`)
    .bind(tenantId, ...playerIds).all<{ id: string }>();
  if ((players.results?.length ?? 0) !== playerIds.length) return { problem: "One of those players isn't in your squad." };

  const fixtureIds = [...new Set(vote.goals.map((g) => g.fixtureId).filter((f): f is string => !!f))];
  if (fixtureIds.length) {
    const found = await env.DB.prepare(`SELECT id FROM fixtures WHERE tenant_id = ? AND id IN (${marks(fixtureIds.length)})`)
      .bind(tenantId, ...fixtureIds).all<{ id: string }>();
    if ((found.results?.length ?? 0) !== fixtureIds.length) return { problem: "One of those matches isn't in your fixtures." };
  }

  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO gotm_voting (id, tenant_id, month, year, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)`)
      .bind(id, tenantId, MONTHS[vote.month - 1], vote.year, now),
    ...vote.goals.map((g) => env.DB.prepare(
      `INSERT INTO gotm_candidates (id, voting_id, tenant_id, player_id, match_id, event_id, description, video_url, votes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    ).bind(crypto.randomUUID(), id, tenantId, g.playerId, g.fixtureId, g.eventId, g.description, g.videoUrl)),
  ]);
  return { id };
}

export type VoteOutcome = "voted" | "already_voted" | "closed" | "not_found";

/** One vote per person: the unique index means two taps at once still count once. */
export async function castVote(env: Env, tenantId: string, userId: string, votingId: string, candidateId: string, now = Date.now()): Promise<VoteOutcome> {
  const voting = await env.DB.prepare(`SELECT status FROM gotm_voting WHERE id = ? AND tenant_id = ?`).bind(votingId, tenantId).first<{ status: string }>();
  if (!voting) return "not_found";
  if (voting.status !== "open") return "closed";
  const candidate = await env.DB.prepare(`SELECT id FROM gotm_candidates WHERE id = ? AND voting_id = ? AND tenant_id = ?`)
    .bind(candidateId, votingId, tenantId).first();
  if (!candidate) return "not_found";
  const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO gotm_votes (id, voting_id, candidate_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), votingId, candidateId, userId, now).run();
  if (!inserted.meta.changes) return "already_voted";
  await env.DB.prepare(`UPDATE gotm_candidates SET votes = votes + 1 WHERE id = ? AND tenant_id = ?`).bind(candidateId, tenantId).run();
  return "voted";
}

/** Closes an open vote (safe to call twice). The winners, or null if there's no such vote. */
export async function closeVote(env: Env, tenantId: string, votingId: string): Promise<{ label: string; winners: CandidateRow[]; justClosed: boolean } | null> {
  const voting = await env.DB.prepare(`SELECT id, month, year, status, created_at FROM gotm_voting WHERE id = ? AND tenant_id = ?`)
    .bind(votingId, tenantId).first<VotingRow>();
  if (!voting) return null;
  const closed = await env.DB.prepare(`UPDATE gotm_voting SET status = 'closed' WHERE id = ? AND tenant_id = ? AND status = 'open'`).bind(votingId, tenantId).run();
  const { results } = await env.DB.prepare(`SELECT * FROM gotm_candidates WHERE voting_id = ? AND tenant_id = ?`).bind(votingId, tenantId).all<CandidateRow>();
  return { label: monthLabel(voting.month, voting.year), winners: winnersOf(results ?? []), justClosed: !!closed.meta.changes };
}

/** The current vote (or the given one) and the last few winners, as this member sees them. */
export async function loadVotes(env: Env, claims: TenantClaims, votingId: string | null): Promise<{ vote: VoteView | null; past: Array<VoteView & { winners: string[] }> }> {
  const tenantId = claims.tenantId;
  const current = votingId
    ? await env.DB.prepare(`SELECT * FROM gotm_voting WHERE id = ? AND tenant_id = ?`).bind(votingId, tenantId).first<VotingRow>()
    : await env.DB.prepare(`SELECT * FROM gotm_voting WHERE tenant_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1`).bind(tenantId).first<VotingRow>();
  const { results: closed } = await env.DB.prepare(
    `SELECT * FROM gotm_voting WHERE tenant_id = ? AND status = 'closed' AND id != ? ORDER BY created_at DESC LIMIT 6`,
  ).bind(tenantId, current?.id ?? "").all<VotingRow>();
  const votings = [...(current ? [current] : []), ...(closed ?? [])];
  if (!votings.length) return { vote: null, past: [] };

  const { results: rows } = await env.DB.prepare(
    `SELECT * FROM gotm_candidates WHERE tenant_id = ? AND voting_id IN (${marks(votings.length)})`,
  ).bind(tenantId, ...votings.map((v) => v.id)).all<CandidateRow>();
  const candidates = await describeCandidates(env, claims, rows ?? [], !!current);
  const mine = current
    ? await env.DB.prepare(`SELECT candidate_id FROM gotm_votes WHERE voting_id = ? AND user_id = ?`).bind(current.id, voterId(claims)).first<{ candidate_id: string }>()
    : null;

  const staff = hasAnyRole(claims, STAFF_ROLES);
  const view = (v: VotingRow): VoteView => {
    const own = (rows ?? []).filter((r) => r.voting_id === v.id);
    const isClosed = v.status !== "open";
    return {
      id: v.id, label: monthLabel(v.month, v.year), status: isClosed ? "closed" : "open",
      candidates: own.map((r) => ({ ...candidates.get(r.id)!, votes: isClosed || staff ? r.votes : null })),
      myVote: v.id === current?.id ? mine?.candidate_id ?? null : null,
      winners: isClosed ? winnersOf(own).map((r) => r.id) : [],
    };
  };
  return { vote: current ? view(current) : null, past: (closed ?? []).map(view).filter((v) => v.winners.length) };
}

/** Names, matches, minutes and clips for candidates; clips only for the current vote. */
async function describeCandidates(env: Env, claims: TenantClaims, rows: CandidateRow[], withClips: boolean): Promise<Map<string, CandidateView>> {
  const tenantId = claims.tenantId;
  const out = new Map<string, CandidateView>();
  if (!rows.length) return out;
  const playerIds = [...new Set(rows.map((r) => r.player_id))];
  const fixtureIds = [...new Set(rows.map((r) => r.match_id).filter((f): f is string => !!f))];
  const eventIds = [...new Set(rows.map((r) => r.event_id).filter((e): e is string => !!e))];
  const [players, fixtures, liveMinutes, reportMinutes, family] = await Promise.all([
    env.DB.prepare(`SELECT id, name, video_consent FROM squad WHERE tenant_id = ? AND id IN (${marks(playerIds.length)})`)
      .bind(tenantId, ...playerIds).all<{ id: string; name: string; video_consent: number | null }>(),
    fixtureIds.length
      ? env.DB.prepare(`SELECT id, opponent, fixture_date FROM fixtures WHERE tenant_id = ? AND id IN (${marks(fixtureIds.length)})`)
        .bind(tenantId, ...fixtureIds).all<{ id: string; opponent: string; fixture_date: string }>()
      : Promise.resolve({ results: [] as Array<{ id: string; opponent: string; fixture_date: string }> }),
    eventIds.length
      ? env.DB.prepare(`SELECT id, minute FROM live_match_events WHERE tenant_id = ? AND id IN (${marks(eventIds.length)})`).bind(tenantId, ...eventIds).all<{ id: string; minute: number | null }>()
      : Promise.resolve({ results: [] as Array<{ id: string; minute: number | null }> }),
    eventIds.length
      ? env.DB.prepare(`SELECT id, minute FROM match_events WHERE tenant_id = ? AND id IN (${marks(eventIds.length)})`).bind(tenantId, ...eventIds).all<{ id: string; minute: number | null }>()
      : Promise.resolve({ results: [] as Array<{ id: string; minute: number | null }> }),
    linkedPlayerIds(env, claims),
  ]);
  const player = new Map((players.results ?? []).map((p) => [p.id, p]));
  const fixture = new Map((fixtures.results ?? []).map((f) => [f.id, f]));
  const minute = new Map([...(liveMinutes.results ?? []), ...(reportMinutes.results ?? [])].map((e) => [e.id, e.minute]));
  const staff = hasAnyRole(claims, STAFF_ROLES);

  const clips = new Map<string, GoalClip>();
  if (withClips) {
    for (const fixtureId of new Set(rows.filter((r) => r.event_id && r.match_id).map((r) => r.match_id as string))) {
      for (const [eventId, clip] of await fixtureGoalClips(env, tenantId, fixtureId)) clips.set(eventId, clip);
    }
  }
  for (const r of rows) {
    const p = player.get(r.player_id);
    const f = r.match_id ? fixture.get(r.match_id) : undefined;
    // Video of children: staff and the player's family always, other members only with consent
    const mayShowVideo = staff || family.has(r.player_id) || p?.video_consent === 1;
    out.set(r.id, {
      id: r.id, playerId: r.player_id, playerName: p?.name ?? "Former player", fixtureId: r.match_id,
      opponent: f?.opponent ?? null, date: f?.fixture_date.slice(0, 10) ?? null,
      minute: r.event_id ? minute.get(r.event_id) ?? null : null, description: r.description,
      clip: mayShowVideo && r.event_id ? clips.get(r.event_id) ?? null : null,
      videoUrl: mayShowVideo ? r.video_url : null, votes: r.votes,
    });
  }
  return out;
}

/** What the winner post needs: names, photos (with consent) and "v Rovers, 23'". */
export async function winnerFacts(env: Env, tenantId: string, winners: CandidateRow[]): Promise<Array<{ name: string; photoUrl: string | null; detail: string | null }>> {
  const out = [];
  for (const w of winners) {
    const [p, f, live, report] = await Promise.all([
      env.DB.prepare(`SELECT name, ${publicPhotoSql()} AS photo FROM squad WHERE tenant_id = ? AND id = ?`).bind(tenantId, w.player_id).first<{ name: string; photo: string | null }>(),
      w.match_id ? env.DB.prepare(`SELECT opponent FROM fixtures WHERE tenant_id = ? AND id = ?`).bind(tenantId, w.match_id).first<{ opponent: string }>() : null,
      w.event_id ? env.DB.prepare(`SELECT minute FROM live_match_events WHERE tenant_id = ? AND id = ?`).bind(tenantId, w.event_id).first<{ minute: number | null }>() : null,
      w.event_id ? env.DB.prepare(`SELECT minute FROM match_events WHERE tenant_id = ? AND id = ?`).bind(tenantId, w.event_id).first<{ minute: number | null }>() : null,
    ]);
    if (!p) continue;
    const minute = live?.minute ?? report?.minute ?? null;
    const detail = f ? `v ${f.opponent}${minute !== null ? `, ${minute}'` : ""}` : w.description;
    out.push({ name: p.name, photoUrl: p.photo, detail });
  }
  return out;
}
