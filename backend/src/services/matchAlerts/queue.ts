/**
 * Match notifications ("alerts"): queued when staff record an update or the
 * live stream starts, sent by the once-a-minute cron to everyone in the club
 * with notifications on, except people at the match (match_attendance) and
 * whoever recorded the update.
 *
 * Match updates wait for the club's undo window (same as automatic posts), so
 * an undone mistake never reaches anyone. One row per source, so queuing twice
 * is harmless; each row is claimed before sending, so it's sent at most once.
 */
import { groupForKind, groupToken, wantsGroupSql } from "../alertPrefs";
import { buildAlert, EVENT_ALERT_KINDS, motmAlert, type AlertInput, type AlertKind } from "./content";
import { computeState, type LiveEvent } from "../liveMatchState";
import { scorersText, type LiveFixture } from "../liveMatch";
import { getPublicNamePolicy, publicName, type PublicNamePolicy } from "../publicNames";
import { deliver, type PushEnv } from "../push/delivery";

export type AlertsEnv = PushEnv;

const UNDO_WINDOW_MS = 60_000;
/** Don't send a score that's this far out of date (e.g. after an outage) */
const STALE_MS = 20 * 60_000;
const BATCH = 10;

interface Club { name: string; undoWindow: boolean; policy: PublicNamePolicy }

async function loadClub(env: AlertsEnv, tenantId: string): Promise<Club> {
  const [row, policy] = await Promise.all([
    env.DB.prepare(`SELECT name, social_undo_window FROM tenants WHERE id = ?`).bind(tenantId).first<{ name: string; social_undo_window: number | null }>(),
    getPublicNamePolicy(env, tenantId),
  ]);
  return { name: row?.name ?? "Our club", undoWindow: row?.social_undo_window !== 0, policy };
}

function baseInput(club: Club, fixture: LiveFixture, events: LiveEvent[], kind: AlertKind): AlertInput {
  const state = computeState(events);
  return { kind, clubName: club.name, opponent: fixture.opponent, homeAway: fixture.homeAway, ourScore: state.ourScore, theirScore: state.theirScore };
}

async function insertAlert(env: AlertsEnv, row: { tenantId: string; fixtureId: string; sourceId: string; kind: AlertKind; title: string; body: string; skipUserId: string | null; sendAfter: number }): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO match_alerts (id, tenant_id, fixture_id, source_id, kind, title, body, skip_user_id, send_after, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).bind(crypto.randomUUID(), row.tenantId, row.fixtureId, row.sourceId, row.kind, row.title, row.body, row.skipUserId, row.sendAfter, now, now).run();
}

/**
 * Queue the notification for a newly recorded live update (if that kind of
 * update notifies). `events` are the match's events including this one.
 */
export async function queueEventAlert(env: AlertsEnv, tenantId: string, fixture: LiveFixture, events: LiveEvent[], event: LiveEvent, recordedBy: string | null): Promise<boolean> {
  if (!EVENT_ALERT_KINDS.includes(event.type)) return false;
  const club = await loadClub(env, tenantId);
  const upTo = events.slice(0, events.findIndex((e) => e.id === event.id) + 1);
  const input = baseInput(club, fixture, upTo, event.type as AlertKind);
  input.minute = event.minute;
  if (event.playerName) input.player = publicName(club.policy, event.playerName);
  if (event.type === "goal") input.goalNumber = upTo.filter((e) => e.type === "goal" && event.playerId && e.playerId === event.playerId).length || 1;
  if (event.type === "full_time") {
    const goals = upTo.filter((e) => e.type === "goal").map((e) => ({ ...e, playerName: e.playerName ? publicName(club.policy, e.playerName) : e.playerName }));
    input.scorers = scorersText(goals);
  }
  const text = buildAlert(input);
  await insertAlert(env, {
    tenantId, fixtureId: fixture.id, sourceId: event.id, kind: input.kind, ...text,
    skipUserId: recordedBy, sendAfter: Date.now() + (club.undoWindow ? UNDO_WINDOW_MS : 0),
  });
  return true;
}

/**
 * "We're live": sent straight away, once per match (a stream that drops and
 * restarts as a new video doesn't notify everyone again).
 */
export async function queueStreamAlert(env: AlertsEnv, tenantId: string, fixture: LiveFixture, events: LiveEvent[]): Promise<void> {
  const club = await loadClub(env, tenantId);
  const text = buildAlert(baseInput(club, fixture, events, "stream"));
  await insertAlert(env, { tenantId, fixtureId: fixture.id, sourceId: `stream:${fixture.id}`, kind: "stream", ...text, skipUserId: null, sendAfter: Date.now() });
}

/**
 * An update was undone: stop its notification. If it had already gone out and
 * changed the score or match state, queue a correction with the right score.
 */
export async function cancelEventAlert(env: AlertsEnv, tenantId: string, fixture: LiveFixture | null, remaining: LiveEvent[], undone: LiveEvent): Promise<{ cancelled: boolean; corrected: boolean }> {
  const row = await env.DB.prepare(`SELECT id, status FROM match_alerts WHERE tenant_id = ? AND source_id = ?`)
    .bind(tenantId, undone.id).first<{ id: string; status: string }>();
  if (!row) return { cancelled: false, corrected: false };
  if (row.status === "pending") {
    const res = await env.DB.prepare(`UPDATE match_alerts SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'pending'`).bind(Date.now(), row.id).run();
    if ((res.meta?.changes ?? 0) > 0) return { cancelled: true, corrected: false };
  }
  if (!fixture || !["goal", "opp_goal", "yellow", "red", "half_time", "full_time"].includes(undone.type)) return { cancelled: false, corrected: false };
  const club = await loadClub(env, tenantId);
  const text = buildAlert(baseInput(club, fixture, remaining, "correction"));
  await insertAlert(env, { tenantId, fixtureId: fixture.id, sourceId: `correction:${undone.id}`, kind: "correction", ...text, skipUserId: null, sendAfter: Date.now() });
  return { cancelled: false, corrected: true };
}

interface DueRow { id: string; tenant_id: string; fixture_id: string; kind: string; title: string; body: string; skip_user_id: string | null; send_after: number }

/**
 * Tell everyone a Man of the Match vote has opened (people at the match too:
 * they're the ones who saw it). One alert per opening, so re-sending the same
 * request is harmless; re-opening with a new closing time tells people again.
 */
export async function queueMotmAlert(env: AlertsEnv, tenantId: string, matchId: string, opponent: string | null, closesAt: string, openedBy: string | null): Promise<void> {
  const club = await loadClub(env, tenantId);
  const text = motmAlert(club.name, opponent, closesAt);
  await insertAlert(env, { tenantId, fixtureId: matchId, sourceId: `motm:${matchId}:${closesAt}`, kind: "motm", ...text, skipUserId: openedBy, sendAfter: Date.now() });
}

/** Device tokens for the club, minus people at this match (not for MOTM votes) and the person who recorded the update. */
export async function recipientTokens(env: AlertsEnv, tenantId: string, fixtureId: string, skipUserId: string | null, kind = "match"): Promise<string[]> {
  const { results } = await env.DB.prepare(
    `SELECT d.token FROM devices d
     LEFT JOIN auth_users u ON u.id = d.user_id
     WHERE d.tenant_id = ?
       AND (? IS NULL OR d.user_id != ?)
       AND ${wantsGroupSql("u")}
       AND (? = 'motm' OR NOT EXISTS (SELECT 1 FROM match_attendance a
                       WHERE a.tenant_id = d.tenant_id AND a.fixture_id = ? AND a.user_id = d.user_id AND a.at_venue = 1))`,
  ).bind(tenantId, skipUserId, skipUserId, groupToken(groupForKind(kind)), kind, fixtureId).all<{ token: string }>();
  return (results || []).map((r) => r.token);
}

/** Send every alert that's due. Called each minute by the cron (and straight away for "we're live"). */
export async function processDueAlerts(env: AlertsEnv, now = Date.now()): Promise<number> {
  // Anything left far behind (the cron was down) is out of date: don't send it
  await env.DB.prepare(`UPDATE match_alerts SET status = 'cancelled', updated_at = ? WHERE status = 'pending' AND send_after < ?`).bind(now, now - STALE_MS).run();

  const { results } = await env.DB.prepare(
    `SELECT id, tenant_id, fixture_id, kind, title, body, skip_user_id, send_after FROM match_alerts
     WHERE status = 'pending' AND send_after <= ? ORDER BY send_after LIMIT ${BATCH}`,
  ).bind(now).all<DueRow>();

  let sent = 0;
  for (const alert of results || []) {
    const claim = await env.DB.prepare(`UPDATE match_alerts SET status = 'sending', updated_at = ? WHERE id = ? AND status = 'pending'`).bind(now, alert.id).run();
    if ((claim.meta?.changes ?? 0) === 0) continue; // another run took it
    try {
      const tokens = await recipientTokens(env, alert.tenant_id, alert.fixture_id, alert.skip_user_id, alert.kind);
      const result = tokens.length
        ? await deliver(env, tokens, {
          title: alert.title,
          body: alert.body,
          data: { screen: alert.kind === "motm" ? "MOTMVoting" : "LiveMatch", fixtureId: alert.fixture_id, kind: alert.kind },
          topic: alert.kind === "stream" ? undefined : `${alert.kind === "motm" ? "v" : "m"}${alert.fixture_id.replace(/[^A-Za-z0-9]/g, "").slice(0, 30)}`,
        })
        : { sent: 0, failed: 0, removed: 0, skipped: 0 };
      await env.DB.prepare(`UPDATE match_alerts SET status = 'sent', sent_count = ?, updated_at = ? WHERE id = ?`).bind(result.sent, Date.now(), alert.id).run();
      sent += result.sent;
      console.log(JSON.stringify({ event: "match_alert", outcome: "sent", id: alert.id, tenant: alert.tenant_id, kind: alert.kind, devices: tokens.length, ...result }));
    } catch (err) {
      // Left as 'sending' on purpose: never risk telling everyone twice
      console.error(JSON.stringify({ event: "match_alert", outcome: "failed", id: alert.id, tenant: alert.tenant_id, error: err instanceof Error ? err.message : String(err) }));
    }
  }
  return sent;
}
