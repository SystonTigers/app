/**
 * YouTube Video Upload Routes
 * Allows managers to upload match videos to their team's YouTube channel
 */

import { json } from '../services/util';
import { uploadVideoToYouTube, getYouTubeUploadUrl, YouTubeVideoUpload } from '../adapters/youtube';

// ===========================================
// POST /api/v1/youtube/upload - Get upload URL for video
// ===========================================
export async function handleYouTubeGetUploadUrl(req: Request, env: any, corsHdrs: Headers) {
    try {
        const body = await req.json() as any;
        const { tenant_id, title, description, privacy, content_type, content_length, tags } = body;

        if (!tenant_id || !title || !content_type || !content_length) {
            return json({
                success: false,
                error: { message: 'tenant_id, title, content_type, and content_length required' }
            }, 400, corsHdrs);
        }

        const options: YouTubeVideoUpload = {
            title,
            description: description || '',
            privacy: privacy || 'unlisted',
            tags: tags || ['football', 'match', 'highlights']
        };

        const result = await getYouTubeUploadUrl(env, tenant_id, options, content_type, content_length);

        if (!result.success) {
            return json({
                success: false,
                error: { message: result.error }
            }, 400, corsHdrs);
        }

        return json({
            success: true,
            data: {
                upload_url: result.uploadUrl,
                instructions: 'PUT your video file to this URL with Content-Type header'
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        console.error('[YouTube Route] Get upload URL error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// POST /api/v1/youtube/upload-complete - Backend video upload
// For small videos or when frontend can't upload directly
// ===========================================
export async function handleYouTubeUpload(req: Request, env: any, corsHdrs: Headers) {
    try {
        const formData = await req.formData();
        const file = formData.get('video') as File | null;
        const tenantId = formData.get('tenant_id') as string | null;
        const title = formData.get('title') as string | null;
        const description = formData.get('description') as string | null;
        const privacy = formData.get('privacy') as string | null;

        if (!file || !tenantId || !title) {
            return json({
                success: false,
                error: { message: 'video file, tenant_id, and title required' }
            }, 400, corsHdrs);
        }

        // Check file size (limit to 100MB for direct upload)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            return json({
                success: false,
                error: { message: 'File too large. Use the resumable upload URL for files over 100MB.' }
            }, 400, corsHdrs);
        }

        const videoBuffer = await file.arrayBuffer();
        const options: YouTubeVideoUpload = {
            title,
            description: description || '',
            privacy: (privacy as any) || 'unlisted'
        };

        const result = await uploadVideoToYouTube(env, tenantId, videoBuffer, file.type, options);

        if (!result.success) {
            return json({
                success: false,
                error: { message: result.error }
            }, 400, corsHdrs);
        }

        return json({
            success: true,
            data: {
                video_id: result.videoId,
                watch_url: result.watchUrl
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        console.error('[YouTube Route] Upload error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// GET /api/v1/youtube/status - Check if YouTube is configured
// ===========================================
export async function handleYouTubeStatus(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        const tenantId = url.searchParams.get('tenant_id');

        if (!tenantId) {
            return json({ success: false, error: { message: 'tenant_id required' } }, 400, corsHdrs);
        }

        const creds = await env.KV_IDEMP.get(`yt:${tenantId}`);

        return json({
            success: true,
            data: {
                configured: !!creds,
                message: creds
                    ? 'YouTube is configured for this team'
                    : 'YouTube needs to be connected. Go to Settings > Integrations'
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        console.error('[YouTube Route] Status error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}
