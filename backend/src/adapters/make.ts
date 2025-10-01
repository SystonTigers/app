export async function publishViaMake(env: any, tenant: any, template: string, data: Record<string, unknown>) {
  const url = tenant.makeWebhookUrl || env.MAKE_WEBHOOK_BASE;
  if (!url) throw new Error("Make webhook not configured");

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ template, data, tenant: tenant.id })
  });

  if (!res.ok) throw new Error(`Make failed ${res.status}`);
  try { return await res.json(); } catch { return { ok: true }; }
}
