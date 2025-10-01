type YTCreds = { client_id: string; client_secret: string; refresh_token: string; channel_id?: string|null };

export async function publishYouTube(env: any, tenant: any, template: string, data: Record<string,unknown>) {
  const creds = await getTenantYouTubeCreds(env, tenant.id);
  if (!creds) throw new Error("YouTube not configured for tenant");

  const accessToken = await getGoogleAccessToken(creds);
  const privacy = (String((data.privacy||"unlisted")) as "public"|"unlisted"|"private");
  const startTime = String(data.start_iso || new Date(Date.now()+10*60e3).toISOString());
  const title = String(data.title || "Match Live");
  const description = String(data.description || "Live stream");

  const broadcast = await createLiveBroadcast(accessToken, { title, description, scheduledStartTime: startTime, privacyStatus: privacy });
  const stream = await createLiveStream(accessToken, { title: `${title} Stream` });
  await bindBroadcast(accessToken, broadcast.id, stream.id);

  return { ok: true, watch_url: `https://www.youtube.com/watch?v=${broadcast.id}`, broadcast_id: broadcast.id, stream_id: stream.id, start_iso: startTime };
}

async function getTenantYouTubeCreds(env:any, tenantId:string): Promise<YTCreds|null> {
  const raw = await env.KV_IDEMP.get(`yt:${tenantId}`);
  return raw ? JSON.parse(raw) as YTCreds : null;
}

async function getGoogleAccessToken(creds:YTCreds): Promise<string> {
  const params = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: creds.refresh_token,
    grant_type: "refresh_token"
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST", headers:{ "content-type":"application/x-www-form-urlencoded" }, body: params.toString()
  });
  if (!res.ok) throw new Error(`OAuth token refresh failed ${res.status}`);
  const json:any = await res.json(); if (!json.access_token) throw new Error("No access_token");
  return json.access_token;
}

async function createLiveBroadcast(accessToken:string, o:{ title:string; description:string; scheduledStartTime:string; privacyStatus:"public"|"unlisted"|"private" }) {
  const body = { snippet: { title: o.title, description: o.description, scheduledStartTime: o.scheduledStartTime }, status: { privacyStatus: o.privacyStatus }, contentDetails: { enableAutoStart: true, enableAutoStop: true } };
  const res = await fetch("https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,contentDetails,status", {
    method: "POST", headers: { "authorization": `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`createLiveBroadcast failed ${res.status}`);
  return await res.json() as { id:string };
}

async function createLiveStream(accessToken:string, o:{ title:string }) {
  const body = { snippet: { title: o.title }, cdn: { format: "1080p", ingestionType: "rtmp" } };
  const res = await fetch("https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,status", {
    method: "POST", headers: { "authorization": `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`createLiveStream failed ${res.status}`);
  return await res.json() as { id:string };
}

async function bindBroadcast(accessToken:string, broadcastId:string, streamId:string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/liveBroadcasts/bind");
  url.searchParams.set("id", broadcastId);
  url.searchParams.set("part", "id,contentDetails");
  url.searchParams.set("streamId", streamId);
  const res = await fetch(url.toString(), { method:"POST", headers: { "authorization": `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`bindBroadcast failed ${res.status}`);
  return await res.json();
}
