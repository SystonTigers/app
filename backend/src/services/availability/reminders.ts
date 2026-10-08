/**
 * Availability reminders, by push notification:
 * - automatic: once an unanswered match, training session or event is two
 *   days away, each family with a child who hasn't answered gets one
 *   notification covering everything they still need to answer (5-minute
 *   cron, 9am to 7pm UK);
 * - from a coach: "Remind families" on an item, at most every 12 hours.
 * Each family and item is claimed in availability_reminders before sending,
 * so an overlapping run or a double tap never sends it twice. Families who
 * switched reminders off in their notification settings aren't sent any.
 */
import { deliver, type PushEnv } from "../push/delivery";
import { isReminderHour } from "../consentReminders";
import { AvailabilityError, MANUAL_GAP_MS, REMINDER_DAYS, reminderMessage, ukDate, type ItemType, type ReminderItem } from "./rules";
import { getItem, OPEN_FIXTURE_SQL } from "./store";

const PER_RUN = 300;

interface Waiting { tenant_id: string; item_type: ItemType; item_id: string; title: string; d: string; user_id: string; child: string }

/** A family can be reminded: has a device and hasn't switched reminders off. */
const WANTS_REMINDERS = `EXISTS (SELECT 1 FROM devices dv WHERE dv.user_id = l.user_id AND dv.tenant_id = l.tenant_id)
  AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = l.user_id AND u.alert_prefs IS NOT NULL AND instr(u.alert_prefs, '"reminders"') > 0)`;

const UNANSWERED = `NOT EXISTS (SELECT 1 FROM player_availability a WHERE a.tenant_id = i.tenant_id AND a.item_type = i.item_type AND a.item_id = i.item_id AND a.player_id = l.player_id)`;

async function devicesOf(env: PushEnv, tenantId: string, userId: string): Promise<string[]> {
  const { results } = await env.DB.prepare(`SELECT token FROM devices WHERE tenant_id = ? AND user_id = ?`).bind(tenantId, userId).all<{ token: string }>();
  return (results ?? []).map((d) => d.token);
}

/** Group rows into one message per family. */
function byFamily(rows: Waiting[]): Map<string, { tenantId: string; userId: string; children: Set<string>; items: Map<string, ReminderItem & { id: string }> }> {
  const out = new Map<string, { tenantId: string; userId: string; children: Set<string>; items: Map<string, ReminderItem & { id: string }> }>();
  for (const r of rows) {
    const k = `${r.tenant_id}|${r.user_id}`;
    const fam = out.get(k) ?? { tenantId: r.tenant_id, userId: r.user_id, children: new Set<string>(), items: new Map() };
    fam.children.add(r.child);
    fam.items.set(`${r.item_type}:${r.item_id}`, { type: r.item_type, id: r.item_id, title: r.title, date: r.d });
    out.set(k, fam);
  }
  return out;
}

/** The automatic reminders that are due. Returns how many families were sent one. */
export async function sendAvailabilityReminders(env: PushEnv, now = new Date()): Promise<number> {
  if (!isReminderHour(now)) return 0;
  const from = ukDate(now);
  const to = ukDate(now, REMINDER_DAYS);
  const { results } = await env.DB.prepare(
    `WITH i AS (
       SELECT tenant_id, 'match' AS item_type, id AS item_id, opponent AS a, competition AS b, substr(fixture_date, 1, 10) AS d FROM fixtures
         WHERE substr(fixture_date, 1, 10) BETWEEN ?1 AND ?2 AND ${OPEN_FIXTURE_SQL}
       UNION ALL
       SELECT tenant_id, 'training', id, 'training', NULL, substr(scheduled_date, 1, 10) FROM training_plans
         WHERE substr(scheduled_date, 1, 10) BETWEEN ?1 AND ?2
       UNION ALL
       SELECT tenant_id, 'event', id, title, NULL, substr(start_time, 1, 10) FROM calendar_events
         WHERE substr(start_time, 1, 10) BETWEEN ?1 AND ?2
     )
     SELECT i.tenant_id, i.item_type, i.item_id, i.a, i.b, i.d, l.user_id, s.name AS child
     FROM i
     JOIN auth_user_players l ON l.tenant_id = i.tenant_id
     JOIN squad s ON s.id = l.player_id AND s.tenant_id = l.tenant_id
     JOIN tenants t ON t.id = i.tenant_id AND COALESCE(t.status, 'active') != 'suspended'
     WHERE ${UNANSWERED} AND ${WANTS_REMINDERS}
       AND NOT EXISTS (SELECT 1 FROM availability_reminders r WHERE r.tenant_id = i.tenant_id AND r.item_type = i.item_type AND r.item_id = i.item_id AND r.user_id = l.user_id AND r.kind = 'auto')
     ORDER BY i.d
     LIMIT ${PER_RUN}`,
  ).bind(from, to).all<Omit<Waiting, "title"> & { a: string; b: string | null }>();
  const rows: Waiting[] = (results ?? []).map((r) => ({ ...r, title: r.item_type === "match" ? `the game against ${r.a}` : r.a }));

  let sent = 0;
  for (const fam of byFamily(rows).values()) {
    // Claim each item for this family first; only send what this run claimed
    const claimed: ReminderItem[] = [];
    for (const item of fam.items.values()) {
      const claim = await env.DB.prepare(`INSERT OR IGNORE INTO availability_reminders (tenant_id, item_type, item_id, user_id, kind, sent_at) VALUES (?, ?, ?, ?, 'auto', ?)`)
        .bind(fam.tenantId, item.type, item.id, fam.userId, now.getTime()).run();
      if ((claim.meta?.changes ?? 0) > 0) claimed.push(item);
    }
    if (!claimed.length) continue;
    const msg = reminderMessage([...fam.children], claimed);
    try {
      const result = await deliver(env, await devicesOf(env, fam.tenantId, fam.userId), { ...msg, data: { screen: "Availability" }, topic: "availability" });
      console.log(JSON.stringify({ level: "info", msg: "availability_reminder", tenantId: fam.tenantId, items: claimed.length, sent: result.sent, failed: result.failed }));
      sent++;
    } catch (err) {
      console.error(JSON.stringify({ level: "error", msg: "availability_reminder_failed", tenantId: fam.tenantId, error: err instanceof Error ? err.message : String(err) }));
    }
  }
  return sent;
}

/** A coach's "Remind families" for one item. Returns how many families were sent one. */
export async function remindForItem(env: PushEnv, tenantId: string, type: ItemType, id: string, now = new Date()): Promise<{ families: number }> {
  const item = await getItem(env, tenantId, type, id);
  if (item.date < ukDate(now)) throw new AvailabilityError(409, "PAST", "That's already happened.");
  const slot = Math.floor(now.getTime() / MANUAL_GAP_MS);
  const claim = await env.DB.prepare(`INSERT OR IGNORE INTO availability_reminders (tenant_id, item_type, item_id, user_id, kind, sent_at) VALUES (?, ?, ?, '*', ?, ?)`)
    .bind(tenantId, type, id, `manual:${slot}`, now.getTime()).run();
  if ((claim.meta?.changes ?? 0) === 0) {
    throw new AvailabilityError(429, "RECENTLY_REMINDED", "Families were reminded about this recently. You can send another later today.");
  }
  const { results } = await env.DB.prepare(
    `SELECT l.user_id, s.name AS child
     FROM (SELECT ? AS tenant_id, ? AS item_type, ? AS item_id) i
     JOIN auth_user_players l ON l.tenant_id = i.tenant_id
     JOIN squad s ON s.id = l.player_id AND s.tenant_id = l.tenant_id
     WHERE ${UNANSWERED} AND ${WANTS_REMINDERS}`,
  ).bind(tenantId, type, id).all<{ user_id: string; child: string }>();
  const reminderItem: ReminderItem = { type, date: item.date, title: type === "match" ? item.title.replace(/^(.*: )?v /, "the game against ") : type === "training" ? "training" : item.title };
  const families = new Map<string, string[]>();
  for (const r of results ?? []) families.set(r.user_id, [...(families.get(r.user_id) ?? []), r.child]);

  let sent = 0;
  for (const [userId, children] of families) {
    try {
      await deliver(env, await devicesOf(env, tenantId, userId), { ...reminderMessage(children, [reminderItem], true), data: { screen: "Availability" }, topic: "availability" });
      sent++;
    } catch (err) {
      console.error(JSON.stringify({ level: "error", msg: "availability_nudge_failed", tenantId, error: err instanceof Error ? err.message : String(err) }));
    }
  }
  console.log(JSON.stringify({ level: "info", msg: "availability_nudge", tenantId, type, families: sent }));
  return { families: sent };
}
