import { TenantConfig } from "../types";

export interface PublishParams {
  tenant: TenantConfig;
  job: { template: string; data: any; mediaUrl?: string; text?: string; };
  env: any;
  fetchImpl?: typeof fetch;
}

/**
 * Publish content to Facebook Page via Graph API
 * Supports: Text posts, Link posts, Photo posts, Video posts
 * 
 * Required credentials:
 * - page_id: Facebook Page ID
 * - page_access_token: Long-lived page access token with pages_manage_posts permission
 */
export async function publishFacebook(p: PublishParams): Promise<void> {
  const { tenant, job, env, fetchImpl = fetch } = p;

  // 1) Check if BYO-Make webhook is configured for FB
  const makeWebhook = tenant.creds?.make?.fb;
  if (makeWebhook) {
    const payload = {
      kind: "facebook_post",
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
      throw new Error(`BYO-Make webhook failed for FB: ${r.status}`);
    }
    return;
  }

  // 2) Check if Managed mode is enabled
  const isManaged = tenant.flags?.managed?.fb ?? false;
  if (isManaged) {
    const fbCreds = tenant.creds?.fb;
    if (!fbCreds?.page_access_token || !fbCreds?.page_id) {
      throw new Error("Managed FB enabled but credentials not configured. Please connect Facebook or use BYO-Make.");
    }

    const { page_id, page_access_token } = fbCreds;
    const message = job.text || job.data?.message || '';
    const mediaUrl = job.mediaUrl || job.data?.image_url;
    const link = job.data?.link;

    let endpoint: string;
    let body: Record<string, string>;

    if (mediaUrl && mediaUrl.includes('.mp4')) {
      // Video post
      endpoint = `https://graph.facebook.com/v18.0/${page_id}/videos`;
      body = {
        access_token: page_access_token,
        file_url: mediaUrl,
        description: message,
      };
    } else if (mediaUrl) {
      // Photo post
      endpoint = `https://graph.facebook.com/v18.0/${page_id}/photos`;
      body = {
        access_token: page_access_token,
        url: mediaUrl,
        caption: message,
      };
    } else if (link) {
      // Link post
      endpoint = `https://graph.facebook.com/v18.0/${page_id}/feed`;
      body = {
        access_token: page_access_token,
        message,
        link,
      };
    } else {
      // Text-only post
      endpoint = `https://graph.facebook.com/v18.0/${page_id}/feed`;
      body = {
        access_token: page_access_token,
        message,
      };
    }

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook publish failed: ${JSON.stringify(error)}`);
    }

    const result = await response.json() as { id?: string; post_id?: string };
    console.log(`[Facebook] Published successfully, post ID: ${result.id || result.post_id}`);
    return;
  }

  // 3) Neither BYO-Make nor Managed configured
  throw new Error("Facebook channel not configured. Enable Managed mode or set BYO-Make webhook.");
}

