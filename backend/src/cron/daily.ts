import type { Env } from '../env';
import { logJSON } from '../lib/log';
import { sendEventReminders } from '../services/reminders';

/**
 * Daily cron job (06:00 UTC): event reminders for every live club.
 * Club posts (birthdays, countdowns, quotes...) are handled by
 * services/social/scheduler.ts on the 5-minute beat.
 */
export const runDaily = async (env: Env) => {
  try {
    const { results } = await env.DB.prepare(`SELECT id FROM tenants WHERE status IN ('trial', 'active')`).all<{ id: string }>();
    for (const { id } of results || []) {
      try {
        await sendEventReminders(env, id);
      } catch (error) {
        logJSON({ level: 'error', msg: 'daily_reminders_failed', tenant: id, error: error instanceof Error ? error.message : String(error) });
      }
    }
    logJSON({ level: 'info', msg: 'daily_cron_completed', tenantCount: results?.length ?? 0 });
  } catch (error) {
    logJSON({ level: 'error', msg: 'daily_cron_error', error: error instanceof Error ? error.message : String(error) });
  }
};
