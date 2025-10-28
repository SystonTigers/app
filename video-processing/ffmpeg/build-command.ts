import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Clip } from '../timeline/types';
import { getOverlayPreset, type AspectRatio, type DrawTextPreset } from './overlay-presets';

export interface OverlayAssets {
  scorebarPath: string;
  sponsorPath: string;
  fontPath: string;
}

export interface CommandBuildOptions {
  inputPath: string;
  outputPath: string;
  clip: Clip;
  assets: OverlayAssets;
  aspect?: AspectRatio;
  threads?: number;
  audioCodec?: string;
  videoCodec?: string;
  sceneDescription?: string;
}

export interface CommandPlan {
  args: string[];
  scorelineFile: string;
  detailFile: string;
}

function createTempFileName(prefix: string) {
  return join(tmpdir(), `${prefix}-${randomUUID()}.txt`);
}

function buildTextFile(path: string, lines: string[]) {
  writeFileSync(path, `${lines.join('\n')}`);
}

function buildDrawTextFilter(fontPath: string, textFilePath: string, preset: DrawTextPreset): string {
  const boxColor = `${preset.boxColor}@${preset.boxOpacity}`;
  return `drawtext=fontfile=${fontPath}:textfile=${textFilePath}:fontsize=${preset.fontSize}:fontcolor=${preset.fontColor}:x=${preset.x}:y=${preset.y}:box=1:boxcolor=${boxColor}:boxborderw=${preset.boxBorder}`;
}

export function buildClipCommand(options: CommandBuildOptions): CommandPlan {
  const aspect = options.aspect ?? '16:9';
  const preset = getOverlayPreset(aspect);
  const duration = Math.max(0, options.clip.endS - options.clip.startS);
  if (duration <= 0) {
    throw new Error('Clip duration must be positive');
  }
  const scorelineFile = createTempFileName('scoreline');
  const detailFile = createTempFileName('detail');
  const minuteFragment = options.clip.meta?.minute != null ? `${options.clip.meta.minute}'` : undefined;
  const scorelineParts = [options.clip.meta?.score, minuteFragment, options.clip.label].filter(Boolean);
  const scoreline = scorelineParts.join(' — ');
  const detailLines = [
    options.clip.meta?.scorer ? `${options.clip.label}: ${options.clip.meta.scorer}` : undefined,
    options.clip.meta?.assister ? `Ast: ${options.clip.meta.assister}` : undefined,
    options.clip.meta?.notes,
  ].filter(Boolean) as string[];
  if (detailLines.length === 0) {
    detailLines.push(options.clip.label);
  }
  buildTextFile(scorelineFile, [scoreline]);
  buildTextFile(detailFile, detailLines);

  const scorelineFilter = buildDrawTextFilter(options.assets.fontPath, scorelineFile, preset.scoreline);
  const detailFilter = buildDrawTextFilter(options.assets.fontPath, detailFile, preset.detail);
  const filterComplex = [
    `[1:v]scale=-1:-1[scorebar]`,
    `[2:v]scale=-1:-1[sponsor]`,
    `[0:v][scorebar]overlay=${preset.scorebar.x}:${preset.scorebar.y}:format=auto[base0]`,
    `[base0]${scorelineFilter}[base1]`,
    `[base1]${detailFilter}[base2]`,
    `[base2][sponsor]overlay=${preset.sponsor.x}:${preset.sponsor.y}:format=auto[base]`,
  ].join(';');

  const args = [
    '-y',
    '-threads',
    String(options.threads ?? 2),
    '-ss',
    options.clip.startS.toFixed(2),
    '-i',
    options.inputPath,
    '-loop',
    '1',
    '-i',
    options.assets.scorebarPath,
    '-loop',
    '1',
    '-i',
    options.assets.sponsorPath,
    '-t',
    duration.toFixed(2),
    '-filter_complex',
    filterComplex,
    '-map',
    '[base]',
    '-map',
    '0:a?',
    '-c:v',
    options.videoCodec ?? 'libx264',
    '-c:a',
    options.audioCodec ?? 'aac',
    '-crf',
    '20',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
    options.outputPath,
  ];

  return { args, scorelineFile, detailFile };
}

export function buildFullMatchCommand(options: CommandBuildOptions & { chaptersFile?: string }): CommandPlan {
  const aspect = options.aspect ?? '16:9';
  const preset = getOverlayPreset(aspect);
  const scorelineFile = createTempFileName('full-scoreline');
  const detailFile = createTempFileName('full-detail');
  const scoreline = `${options.sceneDescription ?? ''}`.trim() || 'Full Match';
  const detailLines = [options.clip.meta?.notes ?? 'Presented by Syston Tigers'];
  buildTextFile(scorelineFile, [scoreline]);
  buildTextFile(detailFile, detailLines);

  const scorelineFilter = buildDrawTextFilter(options.assets.fontPath, scorelineFile, preset.scoreline);
  const detailFilter = buildDrawTextFilter(options.assets.fontPath, detailFile, preset.detail);
  const filterComplex = [
    `[1:v]scale=-1:-1[scorebar]`,
    `[2:v]scale=-1:-1[sponsor]`,
    `[0:v][scorebar]overlay=${preset.scorebar.x}:${preset.scorebar.y}:format=auto[base0]`,
    `[base0]${scorelineFilter}[base1]`,
    `[base1]${detailFilter}[base2]`,
    `[base2][sponsor]overlay=${preset.sponsor.x}:${preset.sponsor.y}:format=auto[base]`,
  ].join(';');

  const args = [
    '-y',
    '-threads',
    String(options.threads ?? 2),
    '-i',
    options.inputPath,
    '-loop',
    '1',
    '-i',
    options.assets.scorebarPath,
    '-loop',
    '1',
    '-i',
    options.assets.sponsorPath,
    '-filter_complex',
    filterComplex,
    '-map',
    '[base]',
    '-map',
    '0:a?',
    '-c:v',
    options.videoCodec ?? 'libx264',
    '-c:a',
    options.audioCodec ?? 'aac',
    '-crf',
    '20',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
    options.outputPath,
  ];

  return { args, scorelineFile, detailFile };
}
