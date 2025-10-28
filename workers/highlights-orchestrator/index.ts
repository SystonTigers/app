import { loadMatchEvents } from '../../packages/sdk/google-sheets';
import { buildClips } from '../../video-processing/timeline/build-clips-from-sheet';
import type { Clip } from '../../video-processing/timeline/types';

type R2Bucket = any;
type KVNamespace = any;

interface Env {
  R2_VIDEO: R2Bucket;
  KV_IDEMP: KVNamespace;
  R2_BUCKET: string;
  R2_PUBLIC_BASE?: string;
  SHEETS_SPREADSHEET_ID: string;
  SHEETS_RANGE: string;
  GOOGLE_SERVICE_ACCOUNT_KEY: string;
  YT_HIGHLIGHTS_PLAYLIST_ID?: string;
  OVERLAY_SCOREBAR_KEY: string;
  OVERLAY_SPONSOR_KEY: string;
  OVERLAY_FONT_KEY: string;
  GH_WORKFLOW_TOKEN: string;
  GH_WORKFLOW_REPO: string;
  GH_WORKFLOW_REF: string;
  UPLOADER_URL: string;
  CLIP_PAD_BEFORE_S?: string;
  CLIP_PAD_AFTER_S?: string;
  CLIP_MIN_LEN_S?: string;
  SCENEDETECT_ENABLED?: string;
}

interface OrchestrateRequestBody {
  sourceKey: string;
  teamHome: string;
  teamAway: string;
  kickoff?: string;
}

async function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

async function hashPayload(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getIdempotencyKey(headers: Headers, bodyString: string) {
  const headerKey = headers.get('idempotency-key');
  if (headerKey) return headerKey;
  return hashPayload(bodyString);
}

function toNumber(envValue: string | undefined, fallback: number) {
  const parsed = envValue ? Number(envValue) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function success(data: unknown) {
  return { success: true, data };
}

function failure(message: string, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

async function dispatchWorkflow(env: Env, payload: Record<string, unknown>) {
  const repo = env.GH_WORKFLOW_REPO;
  const ref = env.GH_WORKFLOW_REF;
  const token = env.GH_WORKFLOW_TOKEN;
  const url = `https://api.github.com/repos/${repo}/actions/workflows/render-highlights.yml/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'syston-highlights-orchestrator',
      authorization: `token ${token}`,
    },
    body: JSON.stringify({
      ref,
      inputs: {
        payload: JSON.stringify(payload),
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`workflow_dispatch failed (${res.status}): ${text}`);
  }
}

async function handleOrchestrate(request: Request, env: Env, matchId: string) {
  const bodyString = await request.text();
  let parsed: OrchestrateRequestBody;
  try {
    parsed = JSON.parse(bodyString) as OrchestrateRequestBody;
  } catch (error) {
    return failure('Invalid JSON payload', 400);
  }
  if (!parsed.sourceKey || !parsed.teamHome || !parsed.teamAway) {
    return failure('sourceKey, teamHome and teamAway are required', 422);
  }

  const idemKey = await getIdempotencyKey(request.headers, bodyString);
  const existing = await env.KV_IDEMP.get(idemKey, 'json');
  if (existing) {
    return jsonResponse(success(existing));
  }

  const events = await loadMatchEvents(matchId, {
    spreadsheetId: env.SHEETS_SPREADSHEET_ID,
    range: env.SHEETS_RANGE,
    credentialsJson: env.GOOGLE_SERVICE_ACCOUNT_KEY,
  });
  const clips = buildClips(events, {
    padBeforeS: toNumber(env.CLIP_PAD_BEFORE_S, 10),
    padAfterS: toNumber(env.CLIP_PAD_AFTER_S, 12),
    minLenS: toNumber(env.CLIP_MIN_LEN_S, 6),
  });

  if (!clips.length) {
    return failure('No highlight events found for this match', 404);
  }

  const payloadKey = `jobs/highlights/${matchId}/${Date.now()}-${crypto.randomUUID()}.json`;
  const jobPayload = {
    matchId,
    sourceKey: parsed.sourceKey,
    teams: { home: parsed.teamHome, away: parsed.teamAway },
    kickoff: parsed.kickoff,
    events,
    clips,
    overlays: {
      scorebarKey: env.OVERLAY_SCOREBAR_KEY,
      sponsorKey: env.OVERLAY_SPONSOR_KEY,
      fontKey: env.OVERLAY_FONT_KEY,
    },
    r2: {
      bucket: env.R2_BUCKET,
      publicBase: env.R2_PUBLIC_BASE,
    },
    youtube: {
      highlightsPlaylistId: env.YT_HIGHLIGHTS_PLAYLIST_ID,
    },
    options: {
      runSceneDetect: env.SCENEDETECT_ENABLED === 'true',
    },
    uploaderUrl: env.UPLOADER_URL,
  } satisfies Record<string, unknown>;

  await env.R2_VIDEO.put(payloadKey, JSON.stringify(jobPayload), {
    httpMetadata: { contentType: 'application/json' },
  });

  const workflowPayload = {
    matchId,
    payloadKey,
    bucket: env.R2_BUCKET,
    sceneDetect: env.SCENEDETECT_ENABLED === 'true',
  };

  await dispatchWorkflow(env, workflowPayload);

  const responseData = {
    matchId,
    payloadKey,
    clips: clips.map((clip: Clip) => ({ id: clip.id, startS: clip.startS, endS: clip.endS, label: clip.label })),
  };

  await env.KV_IDEMP.put(idemKey, JSON.stringify(responseData), { expirationTtl: 60 * 60 * 24 });

  return jsonResponse(success(responseData));
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname.startsWith('/api/video/') && url.pathname.endsWith('/orchestrate')) {
      const parts = url.pathname.split('/');
      const matchId = parts[3];
      if (!matchId) {
        return failure('matchId missing in path', 400);
      }
      try {
        return await handleOrchestrate(request, env, matchId);
      } catch (error: any) {
        console.error('orchestrate failure', error);
        return failure(error?.message ?? 'Internal error', 500);
      }
    }
    if (url.pathname === '/healthz') {
      return jsonResponse({ ok: true });
    }
    return failure('Not found', 404);
  },
};
