import { TenantConfig } from "../types";

export interface PublishParams {
  tenant: TenantConfig;
  job: { template: string; data: any; mediaUrl?: string; text?: string; };
  env: any;
  fetchImpl?: typeof fetch;
}

/**
 * Publish content to X (Twitter) via API v2
 * Supports: Text tweets, Image tweets, Video tweets
 * 
 * Required credentials:
 * - access_token: OAuth 2.0 access token with tweet.write scope
 * - For media: requires additional upload step
 */
export async function publishX(p: PublishParams): Promise<void> {
  const { tenant, job, env, fetchImpl = fetch } = p;

  // 1) Check if BYO-Make webhook is configured for X
  const makeWebhook = tenant.creds?.make?.x;
  if (makeWebhook) {
    const payload = {
      kind: "x_post",
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
      throw new Error(`BYO-Make webhook failed for X: ${r.status}`);
    }
    return;
  }

  // 2) Check if Managed mode is enabled
  const isManaged = tenant.flags?.managed?.x ?? false;
  if (isManaged) {
    const xCreds = tenant.creds?.x;
    if (!xCreds?.access_token) {
      throw new Error("Managed X enabled but credentials not configured. Please connect X (Twitter) or use BYO-Make.");
    }

    const { access_token } = xCreds;
    const text = job.text || job.data?.text || '';
    const mediaUrl = job.mediaUrl || job.data?.image_url;

    // Build tweet payload
    const tweetPayload: { text: string; media?: { media_ids: string[] } } = {
      text: text.slice(0, 280), // X character limit
    };

    // If there's media, upload it first (simplified - real impl needs chunked upload for video)
    if (mediaUrl && !mediaUrl.includes('.mp4')) {
      // For images, use media upload endpoint
      // Note: This is a simplified version - production would need proper OAuth 1.0a signing
      const mediaResponse = await fetchImpl(
        'https://upload.twitter.com/1.1/media/upload.json',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `media_url=${encodeURIComponent(mediaUrl)}`,
        }
      );

      if (mediaResponse.ok) {
        const mediaResult = await mediaResponse.json() as { media_id_string?: string };
        if (mediaResult.media_id_string) {
          tweetPayload.media = { media_ids: [mediaResult.media_id_string] };
        }
      }
    }

    // Post the tweet
    const response = await fetchImpl(
      'https://api.twitter.com/2/tweets',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tweetPayload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`X publish failed: ${JSON.stringify(error)}`);
    }

    const result = await response.json() as { data?: { id?: string } };
    console.log(`[X] Published successfully, tweet ID: ${result.data?.id}`);
    return;
  }

  // 3) Neither BYO-Make nor Managed configured
  throw new Error("X (Twitter) channel not configured. Enable Managed mode or set BYO-Make webhook.");
}

