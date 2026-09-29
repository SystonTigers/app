/**
 * Making a highlights video file from the camera's recording of the match,
 * on the manager's own phone or laptop (nothing is uploaded, so it's free).
 *
 * The chosen moments are copied straight out of the recording and joined:
 * no re-encoding, so it's quick and keeps the camera's quality. Each clip
 * starts at the key frame just before its start (a second or so earlier),
 * which is where a video can be cut without re-encoding.
 */
import {
  ALL_FORMATS, BlobSource, BufferTarget, EncodedAudioPacketSource, EncodedPacketSink, EncodedVideoPacketSource, Input, Mp4OutputFormat, Output,
  type EncodedPacket, type Source,
} from 'mediabunny';

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
