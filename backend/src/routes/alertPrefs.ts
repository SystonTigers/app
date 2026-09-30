/**
 * The signed-in person's phone alert choices:
 *   GET /api/v1/users/me/alerts            { off: AlertGroup[], groups }
 *   PUT /api/v1/users/me/alerts { off }    groups to switch off (the rest are on)
 */
import { json } from "../services/util";
import { requireTenantJWT } from "../services/auth";
import { ALERT_GROUPS, getAlertPrefs, setAlertPrefs } from "../services/alertPrefs";

type Env = { DB: D1Database; [key: string]: unknown };

export async function handleGetAlertPrefs(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await requireTenantJWT(req, env);
  return json({ success: true, data: { off: await getAlertPrefs(env, claims.tenantId, claims.sub ?? ""), groups: ALERT_GROUPS } }, 200, corsHdrs);
}

export async function handleSetAlertPrefs(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await requireTenantJWT(req, env);
  const body = (await req.json().catch(() => null)) as { off?: unknown } | null;
  if (!body || !Array.isArray(body.off)) {
    return json({ success: false, error: { code: "VALIDATION", message: "Send the alerts to switch off as a list." } }, 400, corsHdrs);
  }
  return json({ success: true, data: { off: await setAlertPrefs(env, claims.tenantId, claims.sub ?? "", body.off), groups: ALERT_GROUPS } }, 200, corsHdrs);
}
