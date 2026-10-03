/**
 * Connecting Facebook from the phone app. The website gets its result back in
 * the address it's sent to; the app can't be sent anywhere, so when it starts
 * the connection Facebook lands on a plain "go back to the app" page and the
 * app picks the outcome up from the settings when it comes back into view.
 *
 * Several Pages: the choice waits for the club (15 minutes) under
 * meta_pending:<tenant>, and GET /social/settings offers it to club admins.
 */
import type { MetaPage } from "./meta";

type Kv = Pick<KVNamespace, "get" | "put" | "delete">;

export type ConnectOutcome = "connected" | "cancelled" | "failed" | "no_pages" | "choose";

/** How long a page choice waits, matching meta_pages:<key>. */
export const CHOICE_TTL_SECONDS = 900;

export interface PendingChoice {
  key: string;
  pages: Array<{ id: string; name: string; instagram: string | null }>;
}

const MESSAGES: Record<ConnectOutcome, { title: string; body: string }> = {
  connected: { title: "Facebook is connected", body: "Go back to the app. Match updates now post to your club's Page (and Instagram, if it's linked)." },
  choose: { title: "Nearly there", body: "You run more than one Facebook Page. Go back to the app and choose your club's Page." },
  cancelled: { title: "Connecting was cancelled", body: "Nothing was changed. Go back to the app if you want to try again." },
  no_pages: { title: "No Facebook Page found", body: "That Facebook account doesn't manage any Pages. Go back to the app and connect with the account that runs your club's Page." },
  failed: { title: "We couldn't connect to Facebook", body: "Go back to the app and try again." },
};

/** The page Facebook lands on when the app started connecting. Fixed text only. */
export function appReturnPage(outcome: ConnectOutcome): Response {
  const { title, body } = MESSAGES[outcome];
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#07090C;color:#F2F5F7;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
main{max-width:420px;text-align:center}h1{font-size:24px;margin:0 0 12px}p{color:rgba(242,245,247,.72);line-height:1.5;margin:0}</style></head>
<body><main><h1>${title}</h1><p>${body}</p><p style="margin-top:16px">You can close this page.</p></main></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

/** Remember that this club has a Page to choose (only the newest attempt counts). */
export async function savePendingChoice(kv: Kv, tenantId: string, key: string): Promise<void> {
  await kv.put(`meta_pending:${tenantId}`, key, { expirationTtl: CHOICE_TTL_SECONDS });
}

/** The waiting choice for this club, without tokens, or null once it's used or expired. */
export async function loadPendingChoice(kv: Kv, tenantId: string): Promise<PendingChoice | null> {
  const key = await kv.get(`meta_pending:${tenantId}`);
  if (!key) return null;
  const saved = await kv.get(`meta_pages:${key}`, "json") as { tenantId: string; pages: MetaPage[] } | null;
  if (!saved || saved.tenantId !== tenantId) return null;
  return { key, pages: saved.pages.map((p) => ({ id: p.id, name: p.name, instagram: p.instagram?.username ?? null })) };
}

export async function clearPendingChoice(kv: Kv, tenantId: string): Promise<void> {
  await kv.delete(`meta_pending:${tenantId}`);
}
