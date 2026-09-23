import { sendEventReminderEmail } from '../lib/email';

type Row = Record<string, any>;

/** YYYY-MM-DD for tomorrow (UTC). Fixture and event dates are stored as ISO text. */
function tomorrowIsoDate(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Email reminders for tomorrow's fixtures and calendar events.
 * - Fixtures: every squad member's parent email on file.
 * - Calendar events: members who RSVP'd yes/maybe.
 * Runs from the daily cron; one tenant per call.
 */
export async function sendEventReminders(env: any, tenantId: string, now: Date = new Date()) {
  const day = tomorrowIsoDate(now);

  const tenant = await env.DB.prepare('SELECT name FROM tenants WHERE id = ?').bind(tenantId).first() as Row | null;
  const clubName: string = tenant?.name || 'Your club';

  const { results: fixtures } = await env.DB.prepare(`
    SELECT id, opponent, fixture_date, kick_off_time, venue
    FROM fixtures
    WHERE tenant_id = ? AND fixture_date = ? AND status = 'scheduled'
  `).bind(tenantId, day).all();

  const { results: events } = await env.DB.prepare(`
    SELECT id, title, start_time, location
    FROM calendar_events
    WHERE tenant_id = ? AND substr(start_time, 1, 10) = ?
  `).bind(tenantId, day).all();

  let sent = 0;

  if ((fixtures || []).length > 0) {
    const { results: parents } = await env.DB.prepare(`
      SELECT DISTINCT parent_email, name
      FROM squad
      WHERE tenant_id = ? AND parent_email IS NOT NULL AND parent_email != ''
    `).bind(tenantId).all();

    for (const fixture of fixtures as Row[]) {
      const when = `${fixture.fixture_date}${fixture.kick_off_time ? ` ${fixture.kick_off_time}` : ''}`;
      for (const p of (parents || []) as Row[]) {
        await sendEventReminderEmail(p.parent_email, `Parent of ${p.name}`, `Match vs ${fixture.opponent}`, when, fixture.venue || 'TBC', clubName, env);
        sent++;
      }
    }
  }

  for (const event of (events || []) as Row[]) {
    const { results: attendees } = await env.DB.prepare(`
      SELECT u.email
      FROM event_rsvps r
      JOIN auth_users u ON u.id = r.user_id
      WHERE r.event_id = ? AND r.status IN ('yes', 'maybe')
    `).bind(event.id).all();

    for (const a of (attendees || []) as Row[]) {
      if (!a.email) { continue; }
      await sendEventReminderEmail(a.email, a.email, event.title, event.start_time, event.location || 'TBC', clubName, env);
      sent++;
    }
  }

  console.log(JSON.stringify({ level: 'info', msg: 'reminders_sent', tenant: tenantId, day, fixtures: fixtures?.length || 0, events: events?.length || 0, sent }));
  return { ok: true, sent };
}
