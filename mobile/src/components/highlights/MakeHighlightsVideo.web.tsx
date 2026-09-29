import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../../config';
import { formatClock, parseClock, type HighlightMoment } from '../../utils/highlights';

type Stage = 'pick' | 'lineup' | 'choose' | 'making' | 'done';

/**
 * Web app, staff: make a highlights video file from the camera's recording
 * of the match, on this device. Pick the recording, show where kick-off is,
 * choose the moments, then save the video to post anywhere.
 */
export default function MakeHighlightsVideo({ moments, fileName }: { moments: HighlightMoment[]; fileName: string }) {
  const [stage, setStage] = useState<Stage>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [kickoff, setKickoff] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [chosen, setChosen] = useState<Record<string, boolean>>(() => Object.fromEntries(moments.map((m) => [m.id, !m.hidden])));
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; blob: Blob; size: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cancel = useRef({ cancelled: false });

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
    if (result) URL.revokeObjectURL(result.url);
  }, [url, result]);

  const pickFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/quicktime,video/*';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      setError('');
      setFile(f);
      setUrl(URL.createObjectURL(f));
      setStage('lineup');
    };
    input.click();
  };

  const setKick = (sec: number) => {
    setKickoff(sec);
    setTyped(formatClock(sec));
    setStage('choose');
  };

  const selected = moments.filter((m) => chosen[m.id]);
  const seconds = selected.reduce((sum, m) => sum + (m.end - m.start), 0);

  const make = async () => {
    if (!file || kickoff === null || !selected.length) return;
    setStage('making');
    setProgress(0);
    setError('');
    cancel.current = { cancelled: false };
    try {
      // Only loaded when making a video, so everyone else's app stays quick to open
      const video = await import('../../services/highlightsVideo');
      const spans = video.spansInRecording(selected.map((m) => ({ fromKickOff: { start: m.start, end: m.end } })), kickoff, duration || Infinity);
      const bytes = await video.makeHighlightsVideo(video.fileSource(file), spans, setProgress, cancel.current);
      const blob = new Blob([bytes as BlobPart], { type: 'video/mp4' });
      setResult({ url: URL.createObjectURL(blob), blob, size: blob.size });
      setStage('done');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "We couldn't make the video. Try again, or try on a laptop.");
      setStage('choose');
    }
  };

  const save = async () => {
    if (!result) return;
    const name = `${fileName}.mp4`;
    const shareable = new File([result.blob], name, { type: 'video/mp4' });
    // Phones: the share sheet (save to Photos, post to TikTok/Instagram); otherwise download
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [shareable] })) {
      try {
        await nav.share({ files: [shareable], title: fileName });
        return;
      } catch {
        // Closed the share sheet: fall back to downloading
      }
    }
    const a = document.createElement('a');
    a.href = result.url;
    a.download = name;
    a.click();
  };

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>Make a video to post</Text>
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

      {stage === 'pick' ? (
        <>
          <Text style={styles.help}>
            Uses the camera's own recording of the match (the file the XbotGo saved). It's cut on this device, so nothing is uploaded and it's free. A laptop is quickest.
          </Text>
          <Button label="Choose the match recording" onPress={pickFile} />
        </>
      ) : null}

      {stage === 'lineup' && url ? (
        <>
          <Text style={styles.help}>Play the recording, pause on the kick-off whistle, then tap the button.</Text>
          {React.createElement('video', {
            ref: videoRef,
            src: url,
            controls: true,
            playsInline: true,
            preload: 'metadata',
            onLoadedMetadata: (e: { currentTarget: HTMLVideoElement }) => setDuration(e.currentTarget.duration || 0),
            style: { width: '100%', borderRadius: 12, background: '#000' },
          })}
          <Button label="Kick-off is here" onPress={() => videoRef.current && setKick(Math.round(videoRef.current.currentTime))} />
          <View style={styles.row}>
            <TextInput value={typed} onChangeText={setTyped} placeholder="or type it, e.g. 4:35" placeholderTextColor={COLORS.textLight} style={styles.input} accessibilityLabel="Kick-off time in the recording" />
            <Button small label="Use" onPress={() => { const s = parseClock(typed); if (s === null) setError('Type it like 4:35 (minutes:seconds).'); else setKick(s); }} />
          </View>
          <Link label="Choose a different file" onPress={pickFile} />
        </>
      ) : null}

      {stage === 'choose' || stage === 'making' ? (
        <>
          <Text style={styles.help}>Kick-off at {formatClock(kickoff ?? 0)} in {file?.name}. <Text style={styles.link} onPress={() => setStage('lineup')}>Change</Text></Text>
          {moments.map((m) => (
            <Pressable key={m.id} onPress={() => setChosen((c) => ({ ...c, [m.id]: !c[m.id] }))} disabled={stage === 'making'} accessibilityRole="checkbox" accessibilityState={{ checked: !!chosen[m.id] }} style={styles.check}>
              <Text style={styles.checkBox}>{chosen[m.id] ? '☑' : '☐'}</Text>
              <Text style={styles.checkText}>{m.title}</Text>
              <Text style={styles.checkTime}>{formatClock(m.end - m.start)}</Text>
            </Pressable>
          ))}
          {stage === 'making' ? (
            <>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
              <Text style={styles.help}>Making your video… {Math.round(progress * 100)}%. Keep this page open.</Text>
              <Link label="Cancel" onPress={() => { cancel.current.cancelled = true; }} />
            </>
          ) : (
            <Button label={`Make the video (${selected.length} clips, about ${formatClock(seconds)})`} onPress={make} disabled={!selected.length} />
          )}
        </>
      ) : null}

      {stage === 'done' && result ? (
        <>
          {React.createElement('video', { src: result.url, controls: true, playsInline: true, style: { width: '100%', borderRadius: 12, background: '#000' } })}
          <Text style={styles.help}>Ready: {(result.size / 1_000_000).toFixed(1)} MB.</Text>
          <Button label="Save or share the video" onPress={save} />
          <Link label="Change the clips" onPress={() => setStage('choose')} />
        </>
      ) : null}
    </View>
  );
}

function Button({ label, onPress, disabled, small }: { label: string; onPress: () => void; disabled?: boolean; small?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={[small ? styles.smallButton : styles.button, disabled ? styles.disabled : null]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button"><Text style={styles.link}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  box: { gap: 10, padding: 14, borderRadius: 12, backgroundColor: '#14181C' },
  heading: { color: COLORS.text, fontWeight: '900', fontSize: 16 },
  help: { color: COLORS.textLight },
  error: { color: COLORS.error },
  button: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  smallButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { color: COLORS.background, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  link: { color: COLORS.primary, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.textLight, borderRadius: 8, padding: 10, color: COLORS.text },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkBox: { color: COLORS.primary, fontSize: 20 },
  checkText: { flex: 1, color: COLORS.text },
  checkTime: { color: COLORS.textLight },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#2F3439', overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: COLORS.primary },
});
