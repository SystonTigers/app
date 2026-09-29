/**
 * Making a highlights video file from the camera's recording of the match,
 * on the manager's own phone or laptop (nothing is uploaded, so it's free).
 *
 * The chosen moments are copied straight out of the recording and joined:
 * no re-encoding, so it's quick and keeps the camera's quality. Each clip
 * starts at the key frame just before its start (a second or so earlier),
 * which is where a video can be cut without re-encoding.
 *
 * With the scoreboard and captions on, every frame is drawn again with the
 * overlay and re-encoded on the device (WebCodecs), which takes longer.
 */
import {
  ALL_FORMATS, BlobSource, BufferTarget, CanvasSource, canEncodeVideo, EncodedAudioPacketSource, EncodedPacketSink, EncodedVideoPacketSource, Input,
  Mp4OutputFormat, Output, QUALITY_HIGH, VideoSampleSink,
  type EncodedPacket, type InputAudioTrack, type Source, type VideoCodec,
} from 'mediabunny';
import { drawOverlay, drawTitleCard, TITLE_SECONDS, type OverlayMatch, type OverlaySpan } from './highlightsOverlay';

export { overlaySpans } from './highlightsOverlay';

export interface Span {
  /** Seconds into the recording */
  start: number;
  end: number;
}

/** Sort clips and join ones that overlap, so no moment is shown twice. */
export function mergeSpans(spans: Span[]): Span[] {
  const sorted = spans.filter((s) => s.end > s.start).map((s) => ({ start: Math.max(0, s.start), end: s.end })).sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else out.push({ ...s });
  }
  return out;
}

/**
 * Where each moment is in the recording: the clips come as seconds from
 * kick-off, and the manager told us where kick-off is in the recording.
 */
export function spansInRecording(clips: Array<{ fromKickOff: { start: number; end: number } }>, kickoffInRecording: number, duration: number): Span[] {
  return mergeSpans(clips.map((c) => ({
    start: Math.max(0, kickoffInRecording + c.fromKickOff.start),
    end: Math.min(duration, kickoffInRecording + c.fromKickOff.end),
  })));
}

export class HighlightsVideoError extends Error {}

/** A picked file as a source (read in pieces, never all at once). Loaded with this module so the app's main bundle stays small. */
export function fileSource(file: Blob): Source {
  return new BlobSource(file);
}

/**
 * Cut `spans` out of the recording in `source` and join them into one MP4.
 * `onProgress` gets 0..1. Throws HighlightsVideoError with a friendly message.
 */
export async function makeHighlightsVideo(source: Source, spans: Span[], onProgress?: (done: number) => void, signal?: { cancelled: boolean }): Promise<Uint8Array> {
  const input = new Input({ source, formats: ALL_FORMATS });
  const video = await input.getPrimaryVideoTrack();
  if (!video) throw new HighlightsVideoError("That file doesn't have any video in it.");
  const audio = await input.getPrimaryAudioTrack();
  const videoCodec = await video.getCodec();
  if (!videoCodec) throw new HighlightsVideoError("We can't read this video's format. Try the MP4 the camera saved.");
  const audioCodec = audio ? await audio.getCodec() : null;

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const videoOut = new EncodedVideoPacketSource(videoCodec);
  output.addVideoTrack(videoOut, { rotation: await video.getRotation() });
  const audioOut = audio && audioCodec ? new EncodedAudioPacketSource(audioCodec) : null;
  if (audioOut) output.addAudioTrack(audioOut);
  await output.start();

  const videoSink = new EncodedPacketSink(video);
  const audioSink = audio && audioOut ? new EncodedPacketSink(audio) : null;
  const videoConfig = await video.getDecoderConfig();
  const audioConfig = audio && audioOut ? await audio.getDecoderConfig() : null;
  let firstVideo = true;
  let firstAudio = true;
  let outTime = 0;
  const total = spans.reduce((sum, s) => sum + (s.end - s.start), 0) || 1;
  let done = 0;

  for (const span of spans) {
    if (signal?.cancelled) throw new HighlightsVideoError('Cancelled.');
    const key = (await videoSink.getKeyPacket(span.start)) ?? (await videoSink.getFirstPacket());
    if (!key) continue;
    const from = key.timestamp;
    let lastEnd = from;
    for await (const packet of videoSink.packets(key)) {
      if (packet.timestamp >= span.end && packet.type === 'key') break;
      if (packet.timestamp >= span.end + 2) break; // B-frames can run slightly past; stop soon after
      await videoOut.add(shift(packet, outTime - from), firstVideo && videoConfig ? { decoderConfig: videoConfig } : undefined);
      firstVideo = false;
      lastEnd = Math.max(lastEnd, packet.timestamp + packet.duration);
      onProgress?.(Math.min(0.99, (done + Math.max(0, packet.timestamp - from)) / total));
    }
    if (audioSink && audioOut) {
      const firstAudioPacket = (await audioSink.getPacket(from)) ?? (await audioSink.getFirstPacket());
      if (firstAudioPacket) {
        for await (const packet of audioSink.packets(firstAudioPacket)) {
          if (packet.timestamp >= lastEnd) break;
          if (packet.timestamp < from) continue;
          await audioOut.add(shift(packet, outTime - from), firstAudio && audioConfig ? { decoderConfig: audioConfig } : undefined);
          firstAudio = false;
        }
      }
    }
    outTime += lastEnd - from;
    done += span.end - span.start;
  }

  if (firstVideo) throw new HighlightsVideoError("None of the moments are inside this recording. Check where kick-off is.");
  await output.finalize();
  onProgress?.(1);
  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new HighlightsVideoError('Making the video failed. Please try again.');
  return new Uint8Array(buffer);
}

function shift(packet: EncodedPacket, by: number): EncodedPacket {
  return packet.clone({ timestamp: Math.max(0, packet.timestamp + by) });
}

/** True when this browser can draw the scoreboard onto a video (it needs to encode video itself). */
export async function canAddOverlays(): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined') return false;
  return (await pickCodec(1280, 720)) !== null;
}

async function pickCodec(width: number, height: number): Promise<VideoCodec | null> {
  // H.264 plays everywhere (Instagram, TikTok, WhatsApp, iPhones); VP9 only if that's all the browser has
  for (const codec of ['avc', 'vp9'] as VideoCodec[]) {
    try {
      if (await canEncodeVideo(codec, { width, height, bitrate: QUALITY_HIGH })) return codec;
    } catch {
      // Not supported: try the next one
    }
  }
  return null;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
const TITLE_FPS = 30;

/**
 * Like makeHighlightsVideo, but draws a title card with the result, a
 * scoreboard with the score at each moment, and a caption as each moment
 * starts. Every frame is re-encoded on this device, so it's slower.
 */
export async function makeHighlightsVideoWithOverlays(
  source: Source,
  spans: OverlaySpan[],
  match: OverlayMatch,
  onProgress?: (done: number) => void,
  signal?: { cancelled: boolean },
): Promise<Uint8Array> {
  const input = new Input({ source, formats: ALL_FORMATS });
  const video = await input.getPrimaryVideoTrack();
  if (!video) throw new HighlightsVideoError("That file doesn't have any video in it.");
  if (!(await video.canDecode())) throw new HighlightsVideoError("This browser can't read this video. Try Chrome, or turn off the scoreboard.");
  const audio = await input.getPrimaryAudioTrack();

  // Same shape as the recording (upright), no bigger than 1080p
  const srcW = await video.getDisplayWidth();
  const srcH = await video.getDisplayHeight();
  const scale = Math.min(1, 1920 / Math.max(srcW, srcH), 1080 / Math.min(srcW, srcH));
  const width = even(srcW * scale);
  const height = even(srcH * scale);
  const codec = await pickCodec(width, height);
  if (!codec) throw new HighlightsVideoError("This browser can't add a scoreboard. Try Chrome on a laptop, or turn off the scoreboard.");

  const canvas: OffscreenCanvas | HTMLCanvasElement = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(width, height)
    : Object.assign(document.createElement('canvas'), { width, height });
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new HighlightsVideoError("This browser can't draw the scoreboard. Turn it off and try again.");

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const videoOut = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(videoOut);
  const audioCodec = audio ? await audio.getCodec() : null;
  const audioOut = audio && audioCodec ? new EncodedAudioPacketSource(audioCodec) : null;
  if (audioOut) output.addAudioTrack(audioOut);
  await output.start();

  const total = TITLE_SECONDS + spans.reduce((sum, s) => sum + (s.end - s.start), 0);
  let done = 0;
  const report = () => onProgress?.(Math.min(0.99, done / total));

  // Title card
  drawTitleCard(ctx, width, height, match);
  for (let i = 0; i < TITLE_SECONDS * TITLE_FPS; i++) {
    await videoOut.add(i / TITLE_FPS, 1 / TITLE_FPS);
    done = i / TITLE_FPS;
    report();
  }

  const frames = new VideoSampleSink(video);
  const audioCopy = audio && audioOut ? audioCopier(audio, audioOut) : null;
  let outTime = TITLE_SECONDS;
  let drewAny = false;

  for (const span of spans) {
    if (signal?.cancelled) throw new HighlightsVideoError('Cancelled.');
    let first: number | null = null;
    let last = span.start;
    for await (const sample of frames.samples(span.start, span.end)) {
      try {
        if (signal?.cancelled) throw new HighlightsVideoError('Cancelled.');
        const t = sample.timestamp;
        if (first === null) first = t;
        sample.draw(ctx, 0, 0, width, height);
        drawOverlay(ctx, width, height, match, span, t);
        const duration = sample.duration > 0 ? sample.duration : 1 / 30;
        await videoOut.add(outTime + (t - first), duration);
        last = t + duration;
        drewAny = true;
        done = TITLE_SECONDS + spansBefore(spans, span) + (t - span.start);
        report();
      } finally {
        sample.close();
      }
    }
    if (first === null) continue;
    if (audioCopy) await audioCopy(first, last, outTime - first);
    outTime += last - first;
  }

  if (!drewAny) throw new HighlightsVideoError("None of the moments are inside this recording. Check where kick-off is.");
  await output.finalize();
  onProgress?.(1);
  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new HighlightsVideoError('Making the video failed. Please try again.');
  return new Uint8Array(buffer);
}

function spansBefore(spans: OverlaySpan[], span: OverlaySpan): number {
  let sum = 0;
  for (const s of spans) {
    if (s === span) break;
    sum += s.end - s.start;
  }
  return sum;
}

/** Copies the recording's own sound (no re-encoding) for [from, to), moved by `by` seconds. */
function audioCopier(audio: InputAudioTrack, out: EncodedAudioPacketSource) {
  const sink = new EncodedPacketSink(audio);
  let config: AudioDecoderConfig | null | undefined;
  let first = true;
  return async (from: number, to: number, by: number) => {
    if (config === undefined) config = await audio.getDecoderConfig();
    const start = (await sink.getPacket(from)) ?? (await sink.getFirstPacket());
    if (!start) return;
    for await (const packet of sink.packets(start)) {
      if (packet.timestamp >= to) break;
      if (packet.timestamp < from) continue;
      await out.add(shift(packet, by), first && config ? { decoderConfig: config } : undefined);
      first = false;
    }
  };
}
