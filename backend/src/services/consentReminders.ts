/**
 * Nudges parents who haven't answered photo/video consent for their child:
 * one push notification, then a reminder a week later, and no more. Runs on
 * the 5-minute cron, only in the daytime (UK), and each reminder is claimed
 * in consent_reminders before sending, so a second run never repeats it.
 */
import { deliver, type PushEnv } from "./push/delivery";

export const REMINDER_GAP_MS = 7 * 86_400_000;
const PER_RUN = 100;

interface Waiting { tenant_id: string; user_id: string; children: string; club: string; round1: number | null; round2: number | null }

/** 9am to 7pm in the UK: nobody gets woken up. */
export function isReminderHour(now: Date): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }).format(now));
  return hour >= 9 && hour < 19;
}

/** "Sam" / "Sam and Jo" (first names only) */
function firstNames(list: string): string {
  const names = [...new Set(list.split("\u001f").map((n) => n.trim().split(/\s+/)[0]).filter(Boolean))];
  return names.length <= 1 ? names[0] ?? "your child" : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function reminderMessage(club: string, children: string, round: 1 | 2): { title: string; body: string } {
  const who = firstNames(children);
  return round === 1
    ? { title: "Photo & video consent", body: `Can ${club} use ${who}'s photo and video on social media and match highlights? Tap to answer; it takes a few seconds.` }
    : { title: "Reminder: photo & video consent", body: `We still need your answer for ${who}. Until then ${who === "your child" ? "they" : who} won't appear in the club's photos. Tap to answer.` };
}

/** Send the reminders that are due. Returns how many parents were sent one. */
export async function sendConsentReminders(env: PushEnv, now = new Date()): Promise<number> {
  if (!isReminderHour(now)) return 0;
  const ms = now.getTime();
  // Parents linked to a child with an unanswered question, who have a device for notifications
  const { results } = await env.DB.prepare(
    `SELECT l.tenant_id, l.user_id, group_concat(s.name, char(31)) AS children, COALESCE(t.name, 'the club') AS club,
            (SELECT sent_at FROM consent_reminders r WHERE r.tenant_id = l.tenant_id AND r.user_id = l.user_id AND r.round = 1) AS round1,
            (SELECT sent_at FROM consent_reminders r WHERE r.tenant_id = l.tenant_id AND r.user_id = l.user_id AND r.round = 2) AS round2
     FROM auth_user_players l
     JOIN squad s ON s.id = l.player_id AND s.tenant_id = l.tenant_id
     JOIN tenants t ON t.id = l.tenant_id
     WHERE (s.photo_consent IS NULL OR s.video_consent IS NULL)
       AND EXISTS (SELECT 1 FROM devices d WHERE d.user_id = l.user_id AND d.tenant_id = l.tenant_id)
       -- Not for parents who switched reminders off
       AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = l.user_id AND u.alert_prefs IS NOT NULL AND instr(u.alert_prefs, '"reminders"') > 0)
       -- Not finished (two reminders) and not reminded in the last week
       AND NOT EXISTS (SELECT 1 FROM consent_reminders r WHERE r.tenant_id = l.tenant_id AND r.user_id = l.user_id AND (r.round = 2 OR r.sent_at > ?))
     GROUP BY l.tenant_id, l.user_id
     LIMIT ${PER_RUN}`,
  ).bind(ms - REMINDER_GAP_MS).all<Waiting>();

  let sent = 0;
  for (const row of results ?? []) {
    if (sent >= PER_RUN) break;
    const round: 1 | 2 | null = row.round1 === null ? 1 : row.round2 === null && row.round1 <= ms - REMINDER_GAP_MS ? 2 : null;
    if (!round) continue;
    // Claim it first: a run that overlaps this one can't send it again
    const claim = await env.DB.prepare(`INSERT OR IGNORE INTO consent_reminders (tenant_id, user_id, round, sent_at) VALUES (?, ?, ?, ?)`)
      .bind(row.tenant_id, row.user_id, round, ms).run();
    if ((claim.meta?.changes ?? 0) === 0) continue;
    const { results: devices } = await env.DB.prepare(`SELECT token FROM devices WHERE tenant_id = ? AND user_id = ?`).bind(row.tenant_id, row.user_id).all<{ token: string }>();
    const msg = reminderMessage(row.club, row.children, round);
    try {
      const result = await deliver(env, (devices ?? []).map((d) => d.token), { ...msg, data: { screen: "MediaConsent" }, topic: "consent" });
      console.log(JSON.stringify({ level: "info", msg: "consent_reminder", tenantId: row.tenant_id, round, sent: result.sent, failed: result.failed }));
      sent++;
    } catch (err) {
      console.error(JSON.stringify({ level: "error", msg: "consent_reminder_failed", tenantId: row.tenant_id, error: err instanceof Error ? err.message : String(err) }));
    }
  }
  return sent;
}
