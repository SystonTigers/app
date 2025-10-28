import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pLimit from 'p-limit';
import { applySceneDetection } from './timeline/scenedetect';
import { buildClipCommand, buildFullMatchCommand } from './ffmpeg/build-command';
import type { Clip } from './timeline/types';

interface RenderPayload {
  matchId: string;
  sourceKey: string;
  teams: { home: string; away: string };
  kickoff?: string;
  events: Array<{ type: string; minute: number; scorer?: string; assister?: string; homeScore?: number; awayScore?: number; notes?: string }>;
  clips: Clip[];
  overlays: {
    scorebarKey: string;
    sponsorKey: string;
    fontKey: string;
  };
  r2: {
    bucket: string;
    publicBase?: string;
  };
  youtube: {
    highlightsPlaylistId?: string;
  };
  options?: {
    runSceneDetect?: boolean;
  };
  uploaderUrl: string;
}

function parsePayload(): RenderPayload {
  const payloadRaw = process.env.PAYLOAD || fs.readFileSync('payload.json', 'utf8');
  const payload = JSON.parse(payloadRaw);
  if (!payload.payloadKey) {
    throw new Error('payloadKey missing in workflow payload');
  }
  const jobJson = fs.readFileSync('job.json', 'utf8');
  const data = JSON.parse(jobJson) as RenderPayload;
  return data;
}

async function downloadJsonFromR2(s3: S3Client, bucket: string, key: string) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await response.Body?.transformToString();
  if (!body) throw new Error(`Empty R2 payload for ${key}`);
  await fs.writeFile('job.json', body);
}

async function downloadToFile(s3: S3Client, bucket: string, key: string): Promise<string> {
  const target = join(tmpdir(), `${key.split('/').pop() ?? randomUUID()}`);
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error(`Missing R2 body for ${key}`);
  await pipeline(response.Body, createWriteStream(target));
  return target;
}

async function ensureLocalAsset(s3: S3Client, bucket: string, key: string, label: string) {
  console.log(`Downloading ${label}: ${key}`);
  return downloadToFile(s3, bucket, key);
}

function runFfmpeg(args: string[], label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`ffmpeg ${label}: ffmpeg ${args.join(' ')}`);
    const proc = spawn('ffmpeg', args, { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function uploadFile(s3: S3Client, bucket: string, key: string, filePath: string, contentType: string) {
  const file = createReadStream(filePath);
  const uploader = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    },
  });
  await uploader.done();
}

function buildClipTitle(clip: Clip, payload: RenderPayload) {
  const label = clip.label;
  const minute = clip.meta?.minute != null ? `${clip.meta.minute}'` : '';
  return `${payload.teams.home} vs ${payload.teams.away} — ${label} — ${minute}`.replace(/\s+—\s+$/, '');
}

function buildClipDescription(clip: Clip, payload: RenderPayload) {
  const lines = [
    `${payload.teams.home} vs ${payload.teams.away}`,
    clip.meta?.scorer ? `Scorer: ${clip.meta.scorer}` : undefined,
    clip.meta?.assister ? `Assist: ${clip.meta.assister}` : undefined,
    clip.meta?.notes,
    payload.kickoff ? `Kick-off: ${payload.kickoff}` : undefined,
  ].filter(Boolean) as string[];
  return lines.join('\n');
}

function buildFullMatchDescription(clips: Clip[], payload: RenderPayload) {
  const chapterLines = clips.map((clip) => {
    const hours = Math.floor(clip.startS / 3600);
    const minutes = Math.floor((clip.startS % 3600) / 60);
    const seconds = Math.floor(clip.startS % 60);
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    const scorer = clip.meta?.scorer ? ` — ${clip.meta.scorer}` : '';
    return `${hh}:${mm}:${ss} ${clip.label}${scorer}`;
  });
  const header = `${payload.teams.home} vs ${payload.teams.away} — Full Match`;
  return [header, '', ...chapterLines].join('\n');
}

async function postJson(url: string, body: any, idempotencyKey: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Uploader responded ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  const payloadEnv = process.env.PAYLOAD ? JSON.parse(process.env.PAYLOAD) : {};
  const bucket = payloadEnv.bucket || process.env.R2_BUCKET;
  if (!bucket) throw new Error('R2 bucket missing');
  const payloadKey = payloadEnv.payloadKey;
  if (!payloadKey) throw new Error('payloadKey missing from workflow payload');

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not set');
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  await downloadJsonFromR2(s3, bucket, payloadKey);
  const job = parsePayload();

  const sourcePath = await downloadToFile(s3, bucket, job.sourceKey);
  const scorebarPath = await ensureLocalAsset(s3, bucket, job.overlays.scorebarKey, 'scorebar overlay');
  const sponsorPath = await ensureLocalAsset(s3, bucket, job.overlays.sponsorKey, 'sponsor overlay');
  const fontPath = await ensureLocalAsset(s3, bucket, job.overlays.fontKey, 'font');

  let clips = job.clips;
  if (job.options?.runSceneDetect) {
    console.log('Running PySceneDetect to snap clip windows');
    const sceneResult = await applySceneDetection(clips, sourcePath, { enabled: true });
    clips = sceneResult.clips;
  }

  const limit = pLimit(Number(process.env.FFMPEG_CONCURRENCY || '2'));
  const outputs = await Promise.all(
    clips.map((clip) =>
      limit(async () => {
        const outputPath = join(tmpdir(), `${clip.id}.mp4`);
        const command = buildClipCommand({
          inputPath: sourcePath,
          outputPath,
          clip,
          aspect: '16:9',
          assets: { scorebarPath, sponsorPath, fontPath },
        });
        await runFfmpeg(command.args, `clip:${clip.id}`);
        return { clip, key: `renders/${job.matchId}/${clip.id}.mp4`, path: outputPath };
      })
    )
  );

  const fullMatchPath = join(tmpdir(), `${job.matchId}-full.mp4`);
  const fullCommand = buildFullMatchCommand({
    inputPath: sourcePath,
    outputPath: fullMatchPath,
    clip: {
      id: `${job.matchId}-full`,
      label: 'FULL_MATCH',
      startS: 0,
      endS: clips.at(-1)?.endS ?? 0,
      meta: { notes: 'Full Match' },
    },
    assets: { scorebarPath, sponsorPath, fontPath },
    aspect: '16:9',
    sceneDescription: `${job.teams.home} vs ${job.teams.away}`,
  });
  await runFfmpeg(fullCommand.args, 'full-match');
  const fullMatchKey = `renders/${job.matchId}/full-match.mp4`;

  await Promise.all(
    outputs.map((item) =>
      uploadFile(s3, bucket, item.key, item.path, 'video/mp4').then(() => {
        console.log(`Uploaded clip to r2://${bucket}/${item.key}`);
      })
    )
  );
  await uploadFile(s3, bucket, fullMatchKey, fullMatchPath, 'video/mp4');

  const uploaderUrl = job.uploaderUrl;
  const publicBase = job.r2.publicBase;

  for (const { clip, key } of outputs) {
    const title = buildClipTitle(clip, job);
    const description = buildClipDescription(clip, job);
    const body = {
      key,
      bucket,
      title,
      description,
      privacy: 'private',
      playlistId: job.youtube.highlightsPlaylistId,
      matchId: job.matchId,
      clipId: clip.id,
      publicUrl: publicBase ? `${publicBase.replace(/\/$/, '')}/${key}` : undefined,
      type: 'clip',
    };
    const idem = createHash('sha1').update(`${job.matchId}:${clip.id}:${key}`).digest('hex');
    await postJson(uploaderUrl, body, idem);
  }

  const fullTitle = `${job.teams.home} vs ${job.teams.away} — Full Match`;
  const fullDescription = buildFullMatchDescription(clips, job);
  const fullBody = {
    key: fullMatchKey,
    bucket,
    title: fullTitle,
    description: fullDescription,
    privacy: 'public',
    matchId: job.matchId,
    type: 'full',
    publicUrl: publicBase ? `${publicBase.replace(/\/$/, '')}/${fullMatchKey}` : undefined,
  };
  const fullIdem = createHash('sha1').update(`${job.matchId}:full:${fullMatchKey}`).digest('hex');
  await postJson(uploaderUrl, fullBody, fullIdem);

  console.log('Render pipeline completed successfully');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
