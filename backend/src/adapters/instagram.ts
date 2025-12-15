import { TenantConfig } from "../types";

export interface PublishParams {
  tenant: TenantConfig;
  job: { template: string; data: any; mediaUrl?: string; text?: string; };
  env: any;
  fetchImpl?: typeof fetch;
}

/**
 * Publish content to Instagram via Graph API
 * Supports: Image posts, Carousel posts, Reels
 * 
 * Required credentials:
 * - ig_user_id: Instagram Business Account ID
 * - access_token: Long-lived access token with instagram_content_publish permission
 */
export async function publishInstagram(p: PublishParams): Promise<void> {
  const { tenant, job, env, fetchImpl = fetch } = p;

  // 1) Check if BYO-Make webhook is configured for IG
  const makeWebhook = tenant.creds?.make?.ig;
  if (makeWebhook) {
    const payload = {
      kind: "instagram_post",
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
      throw new Error(`BYO-Make webhook failed for IG: ${r.status}`);
    }
    return;
  }

  // 2) Check if Managed mode is enabled
  const isManaged = tenant.flags?.managed?.ig ?? false;
  if (isManaged) {
    const igCreds = tenant.creds?.ig;
    if (!igCreds?.ig_user_id || !igCreds?.access_token) {
      throw new Error("Managed IG enabled but credentials not configured. Please connect Instagram or use BYO-Make.");
    }

    // Instagram Graph API publishing
    const { ig_user_id, access_token } = igCreds;
    const caption = job.text || job.data?.caption || '';
    const mediaUrl = job.mediaUrl || job.data?.image_url;

    if (!mediaUrl) {
      throw new Error("Instagram requires media (image or video URL)");
    }

    // Step 1: Create media container
    const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video');
    const mediaType = isVideo ? 'REELS' : 'IMAGE';

    const containerParams = new URLSearchParams({
      access_token,
      caption,
      ...(isVideo
        ? { video_url: mediaUrl, media_type: 'REELS' }
        : { image_url: mediaUrl }
      ),
    });

    const containerRes = await fetchImpl(
      `https://graph.facebook.com/v18.0/${ig_user_id}/media?${containerParams}`,
      { method: 'POST' }
    );

    if (!containerRes.ok) {
      const error = await containerRes.json();
      throw new Error(`Instagram container creation failed: ${JSON.stringify(error)}`);
    }

    const containerData = await containerRes.json() as { id: string };

    const containerId = containerData.id;

    // Step 2: For video, wait for processing
    if (isVideo) {
      let status = 'IN_PROGRESS';
      let attempts = 0;
      const maxAttempts = 30; // Wait up to 5 minutes

      while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds

        const statusRes = await fetchImpl(
          `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${access_token}`
        );
        const statusData = await statusRes.json() as { status_code: string };
        status = statusData.status_code;
        attempts++;
      }

      if (status !== 'FINISHED') {
        throw new Error(`Instagram video processing failed with status: ${status}`);
      }
    }

    // Step 3: Publish the container
    const publishParams = new URLSearchParams({
      access_token,
      creation_id: containerId,
    });

    const publishRes = await fetchImpl(
      `https://graph.facebook.com/v18.0/${ig_user_id}/media_publish?${publishParams}`,
      { method: 'POST' }
    );

    if (!publishRes.ok) {
      const error = await publishRes.json();
      throw new Error(`Instagram publish failed: ${JSON.stringify(error)}`);
    }

    const publishData = await publishRes.json() as { id: string };
    console.log(`[Instagram] Published successfully, media ID: ${publishData.id}`);
    return;
  }

  // 3) Neither BYO-Make nor Managed configured
  throw new Error("Instagram channel not configured. Enable Managed mode or set BYO-Make webhook.");
}

