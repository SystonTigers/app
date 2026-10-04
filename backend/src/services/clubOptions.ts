/**
 * Club-wide options kept on the `tenants` row that change what the app records
 * and shows. Read where they matter; they default to on.
 */

type Env = { DB: D1Database };

/** Whether the club records assists (off = top goalscorers only). */
export async function tracksAssists(env: Env, tenantId: string): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT track_assists FROM tenants WHERE id = ?`).bind(tenantId).first<{ track_assists: number | null }>();
  return row?.track_assists !== 0;
}

/** Rows with assists hidden when the club doesn't record them. */
export function hideAssists<T extends { assists: number }>(rows: T[], tracked: boolean): T[] {
  return tracked ? rows : rows.map((r) => ({ ...r, assists: 0 }));
}
