/**
 * What each person wants to be told about on their phone. Stored per account
 * as the groups they've switched off (auth_users.alert_prefs); nothing stored
 * means everything is on. Match alerts and consent reminders check this
 * before sending.
 */
export const ALERT_GROUPS = ["match", "goals", "cards", "video", "reminders"] as const;
export type AlertGroup = (typeof ALERT_GROUPS)[number];

/** Which group a match alert kind belongs to. */
export function groupForKind(kind: string): AlertGroup {
  switch (kind) {
    case "goal":
    case "opp_goal":
      return "goals";
    case "yellow":
    case "red":
      return "cards";
    case "stream":
      return "video";
    default:
      return "match"; // kick-off, half time, full time, corrections
  }
}

export function parseOff(raw: string | null | undefined): AlertGroup[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? ALERT_GROUPS.filter((g) => v.includes(g)) : [];
  } catch {
    return [];
  }
}

/** SQL condition (on an auth_users alias) that the user hasn't switched this group off. */
export function wantsGroupSql(alias: string): string {
  return `(${alias}.alert_prefs IS NULL OR instr(${alias}.alert_prefs, ?) = 0)`;
}

/** The value to bind for wantsGroupSql. */
export const groupToken = (g: AlertGroup) => `"${g}"`;

export async function getAlertPrefs(env: { DB: D1Database }, tenantId: string, userId: string): Promise<AlertGroup[]> {
  const row = await env.DB.prepare(`SELECT alert_prefs FROM auth_users WHERE id = ? AND tenant_id = ?`).bind(userId, tenantId).first<{ alert_prefs: string | null }>();
  return parseOff(row?.alert_prefs);
}

export async function setAlertPrefs(env: { DB: D1Database }, tenantId: string, userId: string, off: unknown): Promise<AlertGroup[]> {
  const clean = Array.isArray(off) ? ALERT_GROUPS.filter((g) => off.includes(g)) : [];
  await env.DB.prepare(`UPDATE auth_users SET alert_prefs = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
    .bind(clean.length ? JSON.stringify(clean) : null, Date.now(), userId, tenantId).run();
  return clean;
}
