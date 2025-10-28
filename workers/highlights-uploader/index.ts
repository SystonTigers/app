import { Readable } from 'node:stream';
import { uploadVideo, addToPlaylist } from '../../packages/sdk/youtube';

type R2Bucket = any;
type KVNamespace = any;

interface Env {
  R2_VIDEO: R2Bucket;
  KV_IDEMP: KVNamespace;
  YT_CLIENT_ID: string;
  YT_CLIENT_SECRET: string;
  YT_REFRESH_TOKEN: string;
  R2_BUCKET: string;
  R2_PUBLIC_BASE?: string;
  YT_HIGHLIGHTS_PLAYLIST_ID?: string;
}

interface UploadRequest {
  key: string;
  bucket?: string;
  title: string;
  description: string;
  privacy: 'public' | 'private' | 'unlisted';
  playlistId?: string;
  matchId?: string;
  clipId?: string;
  type?: 'clip' | 'full';
  publicUrl?: string;
}

async function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function hash(body: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function ok(data: unknown) {
  return { success: true, data };
}

function error(message: string) {
  return { success: false, error: message };
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/api/video/upload') {
      const rawBody = await request.text();
      let parsed: UploadRequest;
      try {
        parsed = JSON.parse(rawBody) as UploadRequest;
      } catch (err) {
        return jsonResponse(error('Invalid JSON payload'), 400);
      }
      if (!parsed.key || !parsed.title || !parsed.description || !parsed.privacy) {
        return jsonResponse(error('key, title, description and privacy are required'), 422);
      }
      const idemKey = request.headers.get('idempotency-key') || (await hash(rawBody));
      const existing = await env.KV_IDEMP.get(idemKey, 'json');
      if (existing) {
        return jsonResponse(ok(existing));
      }

      const bucket = parsed.bucket || env.R2_BUCKET;
      const object = await env.R2_VIDEO.get(parsed.key);
      if (!object || !object.body) {
        return jsonResponse(error(`R2 object not found: ${parsed.key}`), 404);
      }

      const nodeStream = Readable.fromWeb(object.body as any);
      const ytConfig = {
        clientId: env.YT_CLIENT_ID,
        clientSecret: env.YT_CLIENT_SECRET,
        refreshToken: env.YT_REFRESH_TOKEN,
      };

      const uploadResult = await uploadVideo(
        {
          title: parsed.title,
          description: parsed.description,
          privacyStatus: parsed.privacy,
          body: nodeStream,
          notifySubscribers: parsed.type === 'full',
        },
        ytConfig
      );
      console.log('YouTube upload complete', {
        key: parsed.key,
        videoId: uploadResult.videoId,
        quotaCost: uploadResult.quotaCost,
      });

      if (parsed.privacy === 'private') {
        console.log('Clip uploaded private as requested');
      }

      const playlistId = parsed.playlistId || env.YT_HIGHLIGHTS_PLAYLIST_ID;
      if (playlistId && parsed.privacy !== 'public') {
        await addToPlaylist(
          { playlistId, videoId: uploadResult.videoId },
          ytConfig
        );
        console.log('Added video to playlist', { playlistId });
      }

      const responseData = {
        videoId: uploadResult.videoId,
        quota: {
          videosInsert: uploadResult.quotaCost,
          playlistInsert: playlistId ? 50 : 0,
        },
        publicUrl: parsed.publicUrl,
      };

      await env.KV_IDEMP.put(idemKey, JSON.stringify(responseData), { expirationTtl: 60 * 60 * 24 });

      return jsonResponse(ok(responseData));
    }

    if (url.pathname === '/healthz') {
      return jsonResponse({ ok: true });
    }

    return jsonResponse(error('Not found'), 404);
  },
};
