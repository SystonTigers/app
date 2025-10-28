import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import type { Clip, SceneBoundary, SceneDetectOptions } from './types';

function parseTimecode(value: string): number {
  const parts = value.split(':');
  if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    return Number(hh) * 3600 + Number(mm) * 60 + Number(ss);
  }
  if (parts.length === 2) {
    const [mm, ss] = parts;
    return Number(mm) * 60 + Number(ss);
  }
  return Number(value);
}

async function runSceneDetect(videoPath: string, options: SceneDetectOptions = {}): Promise<SceneBoundary[]> {
  if (!options.enabled) {
    return [];
  }
  const python = options.pythonExecutable ?? 'python3';
  const workingDir = options.workingDirectory ?? join(tmpdir(), `scenedetect-${randomUUID()}`);
  await fs.mkdir(workingDir, { recursive: true });
  const csvPath = join(workingDir, 'scenes.csv');

  const args = [
    '-m',
    'scenedetect',
    '--input',
    videoPath,
    'detect-content',
    `--threshold=${options.threshold ?? 27}`,
    `--min-scene-len=${options.minSceneLen ?? 1.0}`,
    'list-scenes',
    `--output=${workingDir}`,
    '--quiet',
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(python, args, { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`PySceneDetect exited with status ${code}`));
      }
    });
  });

  const csv = await fs.readFile(csvPath, 'utf8');
  const lines = csv.trim().split(/\r?\n/).slice(1); // skip header
  const scenes: SceneBoundary[] = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const start = parseTimecode(parts[0]);
    const end = parseTimecode(parts[2]);
    scenes.push({ start, end });
  }
  return scenes.sort((a, b) => a.start - b.start);
}

function snapToScenes(clip: Clip, scenes: SceneBoundary[]): Clip {
  if (!scenes.length) return clip;
  const startScene = scenes.find((scene) => scene.start <= clip.startS && scene.end >= clip.startS);
  const endScene = scenes.find((scene) => scene.start <= clip.endS && scene.end >= clip.endS);
  const adjustedStart = startScene ? startScene.start : clip.startS;
  const adjustedEnd = endScene ? endScene.end : clip.endS;
  return { ...clip, startS: adjustedStart, endS: Math.max(adjustedEnd, adjustedStart + 1) };
}

export async function applySceneDetection(
  clips: Clip[],
  videoPath: string,
  options: SceneDetectOptions = {}
): Promise<{ clips: Clip[]; scenes: SceneBoundary[] }> {
  if (!options.enabled) {
    return { clips, scenes: [] };
  }
  const scenes = await runSceneDetect(videoPath, options);
  const snapped = clips.map((clip) => snapToScenes(clip, scenes));
  return { clips: snapped, scenes };
}
