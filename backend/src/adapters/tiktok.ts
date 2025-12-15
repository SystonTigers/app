import { TenantConfig } from "../types";

export interface PublishParams {
  tenant: TenantConfig;
  job: { template: string; data: any; mediaUrl?: string; text?: string; };
  env: any;
  fetchImpl?: typeof fetch;
}

/**
 * Publish content to TikTok via Content Posting API
 * Supports: Video posts only (TikTok is video-first)
 * 
 * Required credentials:
 * - open_id: TikTok user ID
 * - access_token: OAuth access token with video.upload scope
 */
export async function publishTikTok(p: PublishParams): Promise<void> {
  const { tenant, job, env, fetchImpl = fetch } = p;

  // 1) Check if BYO-Make webhook is configured for TikTok
  const makeWebhook = tenant.creds?.make?.tiktok;
  if (makeWebhook) {
    const payload = {
      kind: "tiktok_post",
      tenant: tenant.id,
      template: job.template,
      data: job.data,
      ts: Date.now(),
    };

    const r = await fetchImpl(makeWebhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      throw new Error(`BYO-Make webhook failed for TikTok: ${r.status}`);
    }
    return;
  }

  // 2) Check if Managed mode is enabled
  const isManaged = tenant.flags?.managed?.tiktok ?? false;
  if (isManaged) {
    const tiktokCreds = tenant.creds?.tiktok as { access_token?: string; open_id?: string; refresh_token?: string } | undefined;
    if (!tiktokCreds?.access_token || !tiktokCreds?.open_id) {
      throw new Error("Managed TikTok enabled but credentials not configured. Please connect TikTok or use BYO-Make.");
    }

    const { access_token, open_id } = tiktokCreds;
    const videoUrl = job.mediaUrl || job.data?.video_url;
    const caption = job.text || job.data?.caption || '';

    if (!videoUrl) {
      throw new Error("TikTok requires a video URL");
    }

    // TikTok Content Posting API - Initialize video upload
    // Step 1: Create publishing request
    const initResponse = await fetchImpl(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: caption.slice(0, 150), // TikTok caption limit
            privacy_level: 'SELF_ONLY', // Start as private, user can change
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
          },
        }),
      }
    );

    if (!initResponse.ok) {
      const error = await initResponse.json();
      throw new Error(`TikTok init failed: ${JSON.stringify(error)}`);
    }

    const initResult = await initResponse.json() as { error?: { code?: string; message?: string }; data?: { publish_id?: string } };

    if (initResult.error?.code !== 'ok') {
      throw new Error(`TikTok init error: ${initResult.error?.message || 'Unknown error'}`);
    }

    const publishId = initResult.data?.publish_id;
    console.log(`[TikTok] Video upload initiated, publish ID: ${publishId}`);

    // Note: Video will be processed asynchronously by TikTok
    // In production, you would poll the status endpoint
    return;
  }

  // 3) Neither BYO-Make nor Managed configured
  throw new Error("TikTok channel not configured. Enable Managed mode or set BYO-Make webhook.");
}

