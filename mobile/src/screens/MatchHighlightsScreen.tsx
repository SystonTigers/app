import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { COLORS } from '../config';
import { useClubName } from '../context/ClubContext';
import { apiErrorMessage, highlightsApi } from '../services/api';
import ClipPlayer from '../components/highlights/ClipPlayer';
import ClipTiming from '../components/highlights/ClipTiming';
import MakeHighlightsVideo from '../components/highlights/MakeHighlightsVideo';
import { formatClock, matchDate, nextClip, parseClock, type HighlightMoment, type HighlightsView } from '../utils/highlights';
import { fixtureTitle } from '../utils/matchDay';

const ICONS: Record<HighlightMoment['type'], string> = {
  goal: 'soccer', opp_goal: 'soccer', chance: 'target', save: 'hand-back-left', skill: 'star-outline', yellow: 'card', red: 'card',
};

/**
 * Match highlights: each moment tapped in Match Centre, played one after
 * another from the match's YouTube video. Staff line the video up once
 * (where kick-off is) and set how long each clip runs before and after the
 * moment, or hide it.
 */
export default function MatchHighlightsScreen() {
  const route = useRoute<any>();
  const fixtureId: string | undefined = route.params?.fixtureId;
  const clubName = useClubName();
  const [view, setView] = useState<HighlightsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [lineUpOpen, setLineUpOpen] = useState(false);
  const [timingOpen, setTimingOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fixtureId) return;
    setError('');
    try {
      const res = await highlightsApi.get(fixtureId);
      setView(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't load the highlights. Check your signal and try again."));
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => { setLoading(true); setPlaying(-1); load(); }, [load]);

  const save = async (body: Parameters<typeof highlightsApi.update>[1]) => {
    if (!fixtureId) return;
    setBusy(true);
    setError('');
    try {
      const res = await highlightsApi.update(fixtureId, body);
      setView(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (!fixtureId) return <Centered text="Choose a match from Highlights." />;
  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!view) return <Centered text={error || 'Match not found.'} />;

  const title = fixtureTitle(view.fixture, clubName);
  const score = view.fixture.homeScore !== null && view.fixture.awayScore !== null ? `${view.fixture.homeScore}–${view.fixture.awayScore}` : null;
  const moments = view.moments;
  const current = playing >= 0 ? moments[playing] : null;
  const first = nextClip(moments, -1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{[score, matchDate(view.fixture.date)].filter(Boolean).join(' · ')}</Text>
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

      {!view.video ? (
        <Note icon="youtube" text={view.canEdit
          ? 'Add the match\'s YouTube link in Match Centre (or connect your YouTube channel) and the highlights appear here.'
          : 'The highlights appear here once the match video is added.'} />
      ) : !view.video.embeddable ? (
        <Note icon="youtube" text="This video can't play inside other apps. Turn on embedding for it in YouTube Studio." />
      ) : view.kickoffSec === null || lineUpOpen ? (
        view.canEdit ? (
          <LineUp
            videoId={view.video.videoId}
            current={view.kickoffSec}
            busy={busy}
            onSave={async (sec) => { await save({ kickoffSec: sec }); setLineUpOpen(false); setPlaying(-1); }}
            onCancel={view.kickoffSec !== null ? () => setLineUpOpen(false) : undefined}
          />
        ) : (
          <Note icon="clock-outline" text="The highlights appear here once the manager lines up the video." />
        )
      ) : !moments.length ? (
        <Note icon="gesture-tap" text={view.momentsTapped ? 'All the clips are hidden.' : 'No moments were marked in Match Centre for this match. Goals, chances, saves and cards become clips.'} />
      ) : (
        <>
          {current ? (
            <View>
              <ClipPlayer
                videoId={view.video.videoId}
                clip={{ start: current.start, end: current.end }}
                onEnded={() => setPlaying((i) => nextClip(moments, i))}
              />
              <Text style={styles.nowPlaying}>{current.title}{current.detail ? ` · ${current.detail}` : ''}</Text>
            </View>
          ) : (
            <Pressable onPress={() => setPlaying(first)} disabled={first < 0} accessibilityRole="button" style={styles.playAll}>
              <MaterialCommunityIcons name="play-circle" size={40} color={COLORS.background} />
              <Text style={styles.playAllText}>Play the highlights ({moments.filter((m) => !m.hidden).length} clips)</Text>
            </Pressable>
          )}

          <Text style={styles.label}>Moments</Text>
          {moments.map((m, i) => (
            <View key={m.id} style={[styles.moment, i === playing ? styles.momentPlaying : null, m.hidden ? styles.momentHidden : null]}>
              <Pressable onPress={() => setPlaying(i)} accessibilityRole="button" style={styles.momentMain}>
                <MaterialCommunityIcons name={ICONS[m.type] as any} size={22} color={m.type === 'yellow' ? '#F5C400' : m.type === 'red' ? COLORS.error : m.type === 'goal' ? COLORS.primary : COLORS.textLight} />
                <View style={styles.momentText}>
                  <Text style={styles.momentTitle}>{m.title}{m.hidden ? ' (hidden)' : ''}</Text>
                  {m.detail ? <Text style={styles.momentDetail}>{m.detail}</Text> : null}
                </View>
                <Text style={styles.momentTime}>{formatClock(m.end - m.start)}</Text>
              </Pressable>
              {view.canEdit ? (
                <>
                  {timingOpen === m.id ? (
                    <ClipTiming before={m.before} after={m.after} disabled={busy} onChange={(t) => save({ moment: { id: m.id, ...t } })} />
                  ) : null}
                  <View style={styles.tweaks}>
                    <Tweak
                      label={timingOpen === m.id ? 'Done' : `Timing: ${m.before}s before, ${m.after}s after`}
                      onPress={() => setTimingOpen((id) => (id === m.id ? null : m.id))}
                    />
                    <Tweak label={m.hidden ? 'Show this clip' : 'Hide this clip'} onPress={() => save({ moment: { id: m.id, hidden: !m.hidden } })} disabled={busy} />
                  </View>
                </>
              ) : null}
            </View>
          ))}

          {view.canEdit ? (
            <Pressable onPress={() => setLineUpOpen(true)} accessibilityRole="button">
              <Text style={styles.link}>Clips in the wrong place? Line up the video again</Text>
            </Pressable>
          ) : null}
        </>
      )}

      {view.canEdit && view.momentsFromKickOff?.length ? (
        <MakeHighlightsVideo
          moments={view.momentsFromKickOff}
          fileName={`${title} highlights`.replace(/[^\w\s-]/g, '').trim()}
          fixture={view.fixture}
          clubName={view.brand?.clubName || clubName}
          clubColor={view.brand?.primaryColor || COLORS.primary}
          busy={busy}
          onTiming={(id, t) => save({ moment: { id, ...t } })}
        />
      ) : null}

      {view.video ? (
        <Pressable onPress={() => Linking.openURL(view.video!.watchUrl)} accessibilityRole="link">
          <Text style={styles.link}>Watch the whole match on YouTube</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

/** Staff: play the full video, pause at kick-off and save that point (or type the time). */
function LineUp({ videoId, current, busy, onSave, onCancel }: { videoId: string; current: number | null; busy: boolean; onSave: (sec: number) => void; onCancel?: () => void }) {
  const [time, setTime] = useState<number | null>(null);
  const [typed, setTyped] = useState(current !== null ? formatClock(current) : '');
  const [bad, setBad] = useState(false);
  const latest = useRef<number | null>(null);
  return (
    <View>
      <Text style={styles.help}>
        Line the video up once so every clip lands in the right place: play it, pause on the kick-off whistle, then tap the button.
      </Text>
      <ClipPlayer videoId={videoId} clip={null} onTime={(s) => { latest.current = s; setTime(s); }} />
      <Pressable onPress={() => latest.current !== null && onSave(Math.round(latest.current))} disabled={busy || time === null} accessibilityRole="button" style={[styles.playAll, (busy || time === null) ? styles.disabled : null]}>
        <Text style={styles.playAllText}>{time === null ? 'Play the video to find kick-off' : `Kick-off is at ${formatClock(time)}`}</Text>
      </Pressable>
      <Text style={styles.help}>Or type where kick-off is in the video:</Text>
      <View style={styles.row}>
        <TextInput
          value={typed}
          onChangeText={(t) => { setTyped(t); setBad(false); }}
          placeholder="e.g. 4:35"
          placeholderTextColor={COLORS.textLight}
          style={styles.input}
          accessibilityLabel="Kick-off time in the video"
        />
        <Pressable
          onPress={() => { const s = parseClock(typed); if (s === null) setBad(true); else onSave(s); }}
          disabled={busy}
          accessibilityRole="button"
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>Save</Text>
        </Pressable>
      </View>
      {bad ? <Text style={styles.error}>Type it like 4:35 (minutes:seconds).</Text> : null}
      {onCancel ? <Pressable onPress={onCancel} accessibilityRole="button"><Text style={styles.link}>Cancel</Text></Pressable> : null}
    </View>
  );
}

function Tweak({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={[styles.tweak, disabled ? styles.disabled : null]}>
      <Text style={styles.tweakText}>{label}</Text>
    </Pressable>
  );
}

function Note({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.note}>
      <MaterialCommunityIcons name={icon as any} size={36} color={COLORS.textLight} />
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

function Centered({ text }: { text: string }) {
  return <View style={[styles.container, styles.center]}><Text style={styles.noteText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
  sub: { color: COLORS.textLight },
  error: { color: COLORS.error },
  help: { color: COLORS.textLight, marginVertical: 8 },
  label: { color: COLORS.text, fontWeight: '800', marginTop: 8, textTransform: 'uppercase', fontSize: 13, letterSpacing: 1 },
  nowPlaying: { color: COLORS.primary, fontWeight: '800', marginTop: 8 },
  playAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, marginTop: 8 },
  playAllText: { color: COLORS.background, fontWeight: '900', fontSize: 16 },
  moment: { backgroundColor: '#14181C', borderRadius: 12, padding: 12 },
  momentPlaying: { borderWidth: 2, borderColor: COLORS.primary },
  momentHidden: { opacity: 0.5 },
  momentMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  momentText: { flex: 1 },
  momentTitle: { color: COLORS.text, fontWeight: '800' },
  momentDetail: { color: COLORS.textLight, fontSize: 13 },
  momentTime: { color: COLORS.textLight, fontVariant: ['tabular-nums'] },
  tweaks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tweak: { borderWidth: 1, borderColor: COLORS.textLight, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  tweakText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  link: { color: COLORS.primary, fontWeight: '700', marginTop: 12 },
  note: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 16 },
  noteText: { color: COLORS.textLight, textAlign: 'center', fontSize: 15 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.textLight, borderRadius: 8, padding: 10, color: COLORS.text },
  smallButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  smallButtonText: { color: COLORS.background, fontWeight: '900' },
  disabled: { opacity: 0.5 },
});
