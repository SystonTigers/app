import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { clipsLength, formatClock, matchDate, parseClock, type MakeHighlightsVideoProps } from '../../utils/highlights';
import type { OverlayMatch } from '../../services/highlightsOverlay';
import ClipTiming from './ClipTiming';

type Stage = 'pick' | 'lineup' | 'choose' | 'making' | 'done';

const OPPONENT_COLOR = '#9AA3AB';

/**
 * Web app, staff: make a highlights video file from the camera's recording
 * of the match, on this device. Pick the recording (on a phone, straight
 * from Photos where the XbotGo app saves it), show where kick-off is, choose
 * the moments and their timing, then save or share the video.
 */
export default function MakeHighlightsVideo({ moments, fileName, fixture, clubName, clubColor, busy, onTiming }: MakeHighlightsVideoProps) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [stage, setStage] = useState<Stage>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [kickoff, setKickoff] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  // Clips showing a player without video consent start unticked
  const [chosen, setChosen] = useState<Record<string, boolean>>(() => Object.fromEntries(moments.map((m) => [m.id, !m.hidden && !m.noVideoConsent?.length])));
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; blob: Blob; size: number; plain: boolean } | null>(null);
  const [overlays, setOverlays] = useState(true);
  const [timingOpen, setTimingOpen] = useState<string | null>(null);
  // Whether this phone/browser can draw the scoreboard (null while checking)
  const [canOverlay, setCanOverlay] = useState<boolean | null>(null);
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

  useEffect(() => {
    if (stage !== 'choose' || canOverlay !== null) return;
    let cancelled = false;
    import('../../services/highlightsVideo')
      .then((video) => video.canAddOverlays())
      .then((ok) => { if (!cancelled) setCanOverlay(ok); })
      .catch(() => { if (!cancelled) setCanOverlay(false); });
    return () => { cancelled = true; };
  }, [stage, canOverlay]);

  const setKick = (sec: number) => {
    setKickoff(sec);
    setTyped(formatClock(sec));
    setStage('choose');
  };

  const selected = moments.filter((m) => chosen[m.id]);
  const seconds = clipsLength(selected);

  const make = async () => {
    if (!file || kickoff === null || !selected.length) return;
    setStage('making');
    setProgress(0);
    setError('');
    cancel.current = { cancelled: false };
    try {
      // Only loaded when making a video, so everyone else's app stays quick to open
      const video = await import('../../services/highlightsVideo');
      const withOverlays = overlays && (await video.canAddOverlays());
      let bytes: Uint8Array;
      if (withOverlays) {
        const end = duration || Infinity;
        const spans = video.overlaySpans(selected.map((m) => ({
          start: Math.max(0, kickoff + m.start),
          end: Math.min(end, kickoff + m.end),
          moment: { tapAt: kickoff + m.tapAt, title: m.title, detail: m.detail, minute: m.minute, scoreBefore: m.scoreBefore, scoreAfter: m.scoreAfter },
        })));
        bytes = await video.makeHighlightsVideoWithOverlays(video.fileSource(file), spans, overlayMatch(), setProgress, cancel.current);
      } else {
        const spans = video.spansInRecording(selected.map((m) => ({ fromKickOff: { start: m.start, end: m.end } })), kickoff, duration || Infinity);
        bytes = await video.makeHighlightsVideo(video.fileSource(file), spans, setProgress, cancel.current);
      }
      const blob = new Blob([bytes as BlobPart], { type: 'video/mp4' });
      setResult({ url: URL.createObjectURL(blob), blob, size: blob.size, plain: overlays && !withOverlays });
      setStage('done');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "We couldn't make the video. Try again, or try on a laptop.");
      setStage('choose');
    }
  };

  /** Our club and the opponent, home side first, with the final score */
  const overlayMatch = (): OverlayMatch => {
    const us = { name: clubName, color: clubColor };
    const them = { name: fixture.opponent, color: OPPONENT_COLOR };
    const usIsHome = fixture.homeAway !== 'away';
    return {
      home: usIsHome ? us : them,
      away: usIsHome ? them : us,
      usIsHome,
      final: fixture.homeScore !== null && fixture.awayScore !== null ? { home: fixture.homeScore, away: fixture.awayScore } : null,
      date: matchDate(fixture.date),
      clubName,
    };
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
            No laptop needed. On the phone that filmed the match, choose the recording from your Photos (the XbotGo app saves it to the XbotGo album). On a laptop, choose the video file.
          </Text>
          <Text style={styles.help}>It's made on this device, so nothing is uploaded and it's free.</Text>
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
          <Text style={styles.help}>Tick the moments to include. Tap Timing to change how long a clip runs before and after the moment.</Text>
          {moments.map((m) => (
            <View key={m.id} style={styles.moment}>
              <View style={styles.check}>
                <Pressable onPress={() => setChosen((c) => ({ ...c, [m.id]: !c[m.id] }))} disabled={stage === 'making'} accessibilityRole="checkbox" accessibilityState={{ checked: !!chosen[m.id] }} style={styles.checkMain}>
                  <Text style={styles.checkBox}>{chosen[m.id] ? '☑' : '☐'}</Text>
                  <Text style={styles.checkText}>{m.title}</Text>
                </Pressable>
                <Pressable onPress={() => setTimingOpen((id) => (id === m.id ? null : m.id))} disabled={stage === 'making'} accessibilityRole="button" accessibilityLabel={`Timing for ${m.title}`}>
                  <Text style={styles.checkTime}>{m.before}s + {m.after}s <Text style={styles.link}>Timing</Text></Text>
                </Pressable>
              </View>
              {m.noVideoConsent?.length ? (
                <Text style={styles.consent}>No video consent: {m.noVideoConsent.join(', ')}. Only post this clip once their parents say yes.</Text>
              ) : null}
              {timingOpen === m.id ? (
                <ClipTiming before={m.before} after={m.after} disabled={busy || stage === 'making'} onChange={(t) => onTiming(m.id, t)} />
              ) : null}
            </View>
          ))}
          <Pressable onPress={() => setOverlays((o) => !o)} disabled={stage === 'making'} accessibilityRole="checkbox" accessibilityState={{ checked: overlays }} style={styles.checkMain}>
            <Text style={styles.checkBox}>{overlays ? '☑' : '☐'}</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Add the scoreboard and captions</Text>
              <Text style={styles.help}>A title card with the result, the score and minute in the corner, and who scored as each moment starts. Takes longer to make (roughly as long as the video).</Text>
              {canOverlay === false ? (
                <Text style={styles.consent}>This browser can't add the scoreboard, so the video will be made without it. Chrome (on Android or a laptop) or an up-to-date iPhone can add it.</Text>
              ) : null}
            </View>
          </Pressable>
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
          {result.plain ? <Text style={styles.help}>This browser can't add the scoreboard, so this one is without it. Chrome (on a phone or laptop) can add it.</Text> : null}
          <Button label="Save or share the video" onPress={save} />
          <Link label="Change the clips" onPress={() => setStage('choose')} />
        </>
      ) : null}
    </View>
  );
}

function Button({ label, onPress, disabled, small }: { label: string; onPress: () => void; disabled?: boolean; small?: boolean }) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={[small ? styles.smallButton : styles.button, disabled ? styles.disabled : null]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles();
  return <Pressable onPress={onPress} accessibilityRole="button"><Text style={styles.link}>{label}</Text></Pressable>;
}

const useStyles = themedStyles((COLORS) => ({
  box: { gap: 10, padding: 14, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  heading: { color: COLORS.text, fontWeight: '900', fontSize: 16 },
  help: { color: COLORS.textLight },
  error: { color: COLORS.error },
  button: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  smallButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { color: COLORS.onPrimary, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  link: { color: COLORS.primary, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.textLight, borderRadius: 8, padding: 10, color: COLORS.text },
  moment: { paddingVertical: 4 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionTitle: { color: COLORS.text, fontWeight: '800' },
  optionText: { flex: 1 },
  consent: { color: COLORS.warning, fontSize: 12, fontWeight: '700', marginLeft: 30 },
  checkBox: { color: COLORS.primary, fontSize: 20 },
  checkText: { flex: 1, color: COLORS.text },
  checkTime: { color: COLORS.textLight },
  bar: { height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceRaised, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: COLORS.primary },
}));
