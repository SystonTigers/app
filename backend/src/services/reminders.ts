import { sendEventReminderEmail } from '../lib/email';

export async function sendEventReminders(env: any, tenantId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = Math.floor(tomorrow.setHours(0, 0, 0, 0) / 1000);
  const tomorrowEnd = Math.floor(tomorrow.setHours(23, 59, 59, 999) / 1000);

  // 1. Matches
  const { results: matches } = await env.DB.prepare(`
    SELECT * FROM matches 
    WHERE team_id = ? AND date_utc BETWEEN ? AND ? 
    AND status = 'scheduled'
  `).bind(tenantId, tomorrowStart, tomorrowEnd).all();

  // 2. Events
  const { results: events } = await env.DB.prepare(`
    SELECT * FROM events 
    WHERE tenant_id = ? AND start_time BETWEEN ? AND ? 
  `).bind(tenantId, tomorrowStart, tomorrowEnd).all();

  console.log(`[Reminders] Found ${matches?.length || 0} matches and ${events?.length || 0} events for tomorrow`);

  const allItems = [...(matches || []).map((m: any) => ({ ...m, type: 'match' })), ...(events || []).map((e: any) => ({ ...e, type: 'event' }))];

  for (const item of allItems) {
    // Get Attendees
    const table = item.type === 'match' ? 'match_squad' : 'event_attendees';
    const idCol = item.type === 'match' ? 'match_id' : 'event_id';

    const { results: attendees } = await env.DB.prepare(`
        SELECT p.parent_email, p.name 
        FROM ${table} a
        JOIN players p ON a.player_id = p.id
        WHERE a.${idCol} = ? AND a.status IN ('selected', 'going', 'maybe')
      `).bind(item.id).all();

    if (attendees && attendees.length > 0) {
      for (const attendee of attendees) {
        if (attendee.parent_email) {
          await sendEventReminderEmail(
            attendee.parent_email,
            `Parent of ${attendee.name}`,
            item.type === 'match' ? `Match vs ${item.opponent}` : item.title,
            new Date((item.date_utc || item.start_time) * 1000).toLocaleString(),
            item.venue || 'TBC',
            item.tenant_id, // TODO: resolve club name better
            env
          );
        }
      }
    }
  }

  return { ok: true, sent: allItems.length };
}
