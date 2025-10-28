import { google, youtube_v3 } from 'googleapis';
import type { Readable } from 'node:stream';

export interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  quotaBudget?: number;
}

export interface UploadVideoOptions {
  title: string;
  description: string;
  privacyStatus: 'public' | 'private' | 'unlisted';
  body: Readable | NodeJS.ReadableStream;
  tags?: string[];
  notifySubscribers?: boolean;
  requestBody?: youtube_v3.Schema$Video;
}

export interface UploadResult {
  videoId: string;
  quotaCost: number;
}

export interface PlaylistOptions {
  playlistId: string;
  videoId: string;
  position?: number;
}

const INSERT_QUOTA_COST = 1600;
const PLAYLIST_INSERT_COST = 50;

function getDefaultConfig(): YouTubeConfig {
  const clientId = process.env.YT_CLIENT_ID;
  const clientSecret = process.env.YT_CLIENT_SECRET;
  const refreshToken = process.env.YT_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('YouTube OAuth env vars are missing. Set YT_CLIENT_ID, YT_CLIENT_SECRET, and YT_REFRESH_TOKEN.');
  }
  return { clientId, clientSecret, refreshToken };
}

function createOAuthClient(config: YouTubeConfig) {
  const oauth2 = new google.auth.OAuth2({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });
  oauth2.setCredentials({ refresh_token: config.refreshToken });
  return oauth2;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 500): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const status = error?.code || error?.response?.status;
      const isQuota = status === 403;
      const delay = baseDelayMs * 2 ** attempt;
      if (attempt === attempts - 1 || !isQuota) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export async function uploadVideo(options: UploadVideoOptions, config: YouTubeConfig = getDefaultConfig()): Promise<UploadResult> {
  const oauth2 = createOAuthClient(config);
  const youtube = google.youtube({ version: 'v3', auth: oauth2 });
  await oauth2.getAccessToken();
  const bodyStream = options.body as Readable;

  const response = await withRetry(() =>
    youtube.videos.insert({
      part: ['snippet', 'status'],
      notifySubscribers: options.notifySubscribers ?? false,
      requestBody: {
        snippet: {
          title: options.title,
          description: options.description,
          tags: options.tags,
        },
        status: {
          privacyStatus: options.privacyStatus,
        },
        ...options.requestBody,
      },
      media: {
        body: bodyStream,
      },
    })
  );

  const videoId = response.data.id;
  if (!videoId) {
    throw new Error('YouTube upload succeeded but no video id was returned');
  }
  return { videoId, quotaCost: INSERT_QUOTA_COST };
}

export async function addToPlaylist(options: PlaylistOptions, config: YouTubeConfig = getDefaultConfig()): Promise<{ quotaCost: number }>
{
  const oauth2 = createOAuthClient(config);
  const youtube = google.youtube({ version: 'v3', auth: oauth2 });
  await oauth2.getAccessToken();

  await withRetry(() =>
    youtube.playlistItems.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          playlistId: options.playlistId,
          position: options.position ?? 0,
          resourceId: {
            kind: 'youtube#video',
            videoId: options.videoId,
          },
        },
      },
    })
  );

  return { quotaCost: PLAYLIST_INSERT_COST };
}
