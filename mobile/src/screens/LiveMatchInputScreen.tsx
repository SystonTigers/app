import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip, Modal, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS } from '../config';
import { useClubName } from '../context/ClubContext';
import { apiErrorMessage, fixturesApi, lineupApi, liveApi, squadApi, type Lineup } from '../services/api';
import { newClientEventId, type LiveEvent, type LiveEventType, type LiveMatchView, type NewLiveEvent, type SocialPost } from '../utils/liveMatch';
import { sendGraphic, shareGraphic } from '../utils/postGraphic';
import LineupEditor from '../components/live/LineupEditor';
import ScoreHeader from '../components/live/ScoreHeader';
import LiveTimeline from '../components/live/LiveTimeline';
import PlayerPicker, { type PickablePlayer } from '../components/live/PlayerPicker';

interface FixtureOption { id: string; opponent: string; date: string; time: string | null }

const HALF_LENGTHS = [20, 25, 30, 35, 40, 45];
const DAY_MS = 24 * 3600_000;

/** A two-step pick: goal then optional assist, or player on then player off. */
type PickStep =
  | { kind: 'goal' }
  | { kind: 'assist'; scorerId: string }
  | { kind: 'yellow' }
  | { kind: 'red' }
  | { kind: 'sub_on' }
  | { kind: 'sub_off'; onId: string };

/**
 * Match Centre (staff): run a match from the touchline. Every tap is sent
 * straight away and can be undone. If the signal drops, the update is kept and
 * can be sent again without being counted twice.
 */
export default function LiveMatchInputScreen() {
  const clubName = useClubName();
  const navigation = useNavigation<any>();
  const [match, setMatch] = useState<LiveMatchView | null>(null);
  const [fixtures, setFixtures] = useState<FixtureOption[]>([]);
  const [players, setPlayers] = useState<PickablePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [halfLength, setHalfLength] = useState(40);
  const [pick, setPick] = useState<PickStep | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<{ fixtureId: string; event: NewLiveEvent; message: string } | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [lineupFor, setLineupFor] = useState<FixtureOption | null>(null);
  const [motmOpened, setMotmOpened] = useState(false);
  const matchRef = useRef<LiveMatchView | null>(null);
  matchRef.current = match;

  const load = useCallback(async () => {
    try {
      const [liveRes, fixturesRes, squadRes] = await Promise.all([
        liveApi.list(),
        fixturesApi.getFixtures().catch(() => ({ data: [] })),
        squadApi.getSquad().catch(() => ({ data: [] })),
      ]);
      // Carry on with a match that's still going, or show the one that just finished
      const current = matchRef.current
        ? liveRes.data.find((m) => m.fixture.id === matchRef.current!.fixture.id)
        : liveRes.data.find((m) => m.status !== 'full_time') ?? null;
      setMatch(current ?? matchRef.current);
      const soon = Date.now() + 2 * DAY_MS;
      const recent = Date.now() - 2 * DAY_MS;
      setFixtures(
        ((fixturesRes.data || []) as Array<{ id: string; opponent: string; date: string; time?: string | null; status?: string }>)
          .filter((f) => f.status !== 'completed' && Date.parse(f.date) <= soon && Date.parse(f.date) >= recent)
          .map((f) => ({ id: String(f.id), opponent: f.opponent, date: f.date, time: f.time ?? null })),
      );
      setPlayers(((squadRes.data || []) as Array<{ id: string; name: string; number?: number | null }>).map((p) => ({ id: p.id, name: p.name, number: p.number ?? null })));
      setMessage('');
    } catch (err) {
      setMessage(apiErrorMessage(err, "We couldn't load the match. Pull down to try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Pick up updates from other staff every 15 seconds while the match is on
  useEffect(() => {
    if (!match || match.status === 'full_time') return;
    const timer = setInterval(async () => {
      try {
        const res = await liveApi.get(match.fixture.id);
        setMatch(res.data);
      } catch {
        // Keep showing what we have; the next tick will try again
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [match?.fixture.id, match?.status]);

  /** Draw and send the post's graphic, then refresh so the post status shows. */
  const attachGraphic = async (fixtureId: string | null, post: SocialPost | null | undefined) => {
    if (!post) return;
    await sendGraphic(post);
    if (!fixtureId) return;
    try {
      const res = await liveApi.get(fixtureId);
      if (matchRef.current?.fixture.id === fixtureId) setMatch(res.data);
    } catch {
      // The 15-second refresh will catch up
    }
  };

  const send = async (fixtureId: string, event: NewLiveEvent) => {
    setSending(true);
    setMessage('');
    try {
      const res = await liveApi.record(fixtureId, event);
      setMatch(res.data);
      setFailed(null);
      if (res.data.motmOpened) setMotmOpened(true);
      attachGraphic(fixtureId, res.data.newPost);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const text = apiErrorMessage(err, "That didn't send. Check your signal and tap Send again.");
      // Only network problems are worth retrying; a refused update needs a different action
      if (!status) setFailed({ fixtureId, event, message: text });
      else setMessage(text);
    } finally {
      setSending(false);
    }
  };

  const record = (type: LiveEventType, extra: Partial<NewLiveEvent> = {}) => {
    const fixtureId = match?.fixture.id;
    if (!fixtureId) return;
    // The tap time goes with it, so a slow connection doesn't shift the clock or footage timings
    send(fixtureId, { type, clientEventId: newClientEventId(), occurredAt: Date.now(), ...extra });
  };

  const kickOff = (fixture: FixtureOption) => {
    setMotmOpened(false);
    send(fixture.id, { type: 'kick_off', clientEventId: newClientEventId(), occurredAt: Date.now(), halfLength });
  };

  const onPick = (player: PickablePlayer) => {
    if (!pick) return;
    switch (pick.kind) {
      case 'goal': setPick({ kind: 'assist', scorerId: player.id }); return;
      case 'assist': setPick(null); record('goal', { playerId: pick.scorerId, player2Id: player.id }); return;
      case 'yellow': setPick(null); record('yellow', { playerId: player.id }); return;
      case 'red': setPick(null); record('red', { playerId: player.id }); return;
      case 'sub_on': setPick({ kind: 'sub_off', onId: player.id }); return;
      case 'sub_off': setPick(null); record('sub', { playerId: pick.onId, player2Id: player.id }); return;
    }
  };

  const undo = async (event: LiveEvent) => {
    if (!match) return;
    setUndoing(event.id);
    setMessage('');
    try {
      const res = await liveApi.undo(match.fixture.id, event.id);
      setMatch(res.data);
      if (res.data.undonePost?.instagramLeftUp) {
        Alert.alert('Removed from the app and Facebook', "Instagram doesn't let apps delete posts, so please delete it in the Instagram app.");
      }
    } catch (err) {
      setMessage(apiErrorMessage(err, "We couldn't undo that. Please try again."));
    } finally {
      setUndoing(null);
    }
  };

  const share = async (post: SocialPost) => {
    const outcome = await shareGraphic(post);
    if (outcome === 'downloaded') setNotice('Picture saved. Open TikTok and post it from your photos.');
    if (outcome === 'unavailable') setNotice("This phone can't make the picture. Try the web app in Chrome or Safari.");
  };

  const lineupSaved = async (lineup: Lineup, publish: boolean) => {
    const fixture = lineupFor;
    setLineupFor(null);
    if (!fixture) return;
    if (!publish) {
      setNotice(`Team saved: ${lineup.starters.length} starting, ${lineup.subs.length} subs.`);
      return;
    }
    try {
      const res = await lineupApi.publish(fixture.id);
      setNotice('Team news posted.');
      attachGraphic(null, res.data.newPost);
    } catch (err) {
      setMessage(apiErrorMessage(err, "The team was saved but we couldn't post it. Try again."));
    }
  };

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const pickTitle = pick ? {
    goal: 'Who scored?', assist: 'Who made the assist?', yellow: 'Yellow card for…', red: 'Red card for…', sub_on: 'Who is coming on?', sub_off: 'Who is going off?',
  }[pick.kind] : '';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
        {failed ? (
          <View style={styles.retry} accessibilityRole="alert">
            <Text style={styles.retryText}>{failed.message}</Text>
            <Pressable onPress={() => send(failed.fixtureId, failed.event)} disabled={sending} accessibilityRole="button" style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{sending ? 'Sending…' : 'Send again'}</Text>
            </Pressable>
          </View>
        ) : null}
        {message ? <Text style={styles.error} accessibilityRole="alert">{message}</Text> : null}
        {notice ? <Text style={styles.notice} accessibilityRole="alert" onPress={() => setNotice('')}>{notice}</Text> : null}

        {!match ? (
          <>
            <Text style={styles.heading}>Start a match</Text>
            <Text style={styles.help}>Pick your team, post the team news, then tap Kick off when the referee blows.</Text>
            <Text style={styles.label}>Each half lasts</Text>
            <View style={styles.chips}>
              {HALF_LENGTHS.map((m) => (
                <Chip key={m} selected={halfLength === m} onPress={() => setHalfLength(m)} style={styles.chip}>{m} min</Chip>
              ))}
            </View>
            {fixtures.map((f) => (
              <View key={f.id} style={styles.fixture}>
                <View style={styles.fixtureText}>
                  <Text style={styles.fixtureTitle}>vs {f.opponent}</Text>
                  <Text style={styles.help}>{new Date(f.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}{f.time ? ` · ${f.time}` : ''}</Text>
                </View>
                <Pressable onPress={() => setLineupFor(f)} accessibilityRole="button" style={styles.pickTeam}>
                  <Text style={styles.pickTeamText}>Team</Text>
                </Pressable>
                <Pressable onPress={() => kickOff(f)} disabled={sending} accessibilityRole="button" style={styles.kickOff}>
                  <Text style={styles.kickOffText}>Kick off</Text>
                </Pressable>
              </View>
            ))}
            {!fixtures.length ? <Text style={styles.help}>No fixtures in the next two days. Add one in Manage Fixtures.</Text> : null}
          </>
        ) : (
          <>
            <ScoreHeader match={match} clubName={clubName} />

            {match.status === 'full_time' ? (
              <View style={styles.finished}>
                <Text style={styles.finishedText}>Result saved to your results, league table and player stats.</Text>
                {motmOpened ? (
                  <Text style={styles.finishedText}>Man of the Match voting is open for parents and players, with everyone who played nominated.</Text>
                ) : null}
                <Pressable onPress={() => navigation.navigate('ManageMOTM')} accessibilityRole="button" style={styles.kickOff}>
                  <Text style={styles.kickOffText}>{motmOpened ? 'See the Man of the Match vote' : 'Start Man of the Match vote'}</Text>
                </Pressable>
                <Pressable onPress={() => { setMatch(null); setMotmOpened(false); load(); }} accessibilityRole="button" style={styles.linkButton}>
                  <Text style={styles.linkText}>Back to fixtures</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.grid}>
                  <Action icon="soccer" label="We scored" primary onPress={() => setPick({ kind: 'goal' })} disabled={sending || match.status === 'half_time'} />
                  <Action icon="soccer" label="They scored" onPress={() => record('opp_goal')} disabled={sending || match.status === 'half_time'} />
                  <Action icon="card" label="Yellow" onPress={() => setPick({ kind: 'yellow' })} disabled={sending} color="#F5C400" />
                  <Action icon="card" label="Red" onPress={() => setPick({ kind: 'red' })} disabled={sending} color={COLORS.error} />
                  <Action icon="swap-horizontal" label="Sub" onPress={() => setPick({ kind: 'sub_on' })} disabled={sending} />
                  <Action icon="message-text-outline" label="Update" onPress={() => setNoteOpen(true)} disabled={sending} />
                </View>
                <View style={styles.phaseRow}>
                  {match.status === 'live' && match.period === 1 ? <Phase label="Half time" onPress={() => record('half_time')} disabled={sending} /> : null}
                  {match.status === 'half_time' ? <Phase label="Start 2nd half" onPress={() => record('second_half')} disabled={sending} /> : null}
                  <Phase label="Full time" danger onPress={() => record('full_time')} disabled={sending} />
                </View>
              </>
            )}

            <Text style={styles.label}>Timeline</Text>
            <LiveTimeline events={match.events} opponent={match.fixture.opponent} onUndo={undo} busyId={undoing} posts={match.posts} onShare={share} />
          </>
        )}
      </ScrollView>

      <LineupEditor
        visible={!!lineupFor}
        fixtureId={lineupFor?.id ?? null}
        opponent={lineupFor?.opponent ?? ''}
        players={players}
        onClose={() => setLineupFor(null)}
        onSaved={lineupSaved}
      />

      <PlayerPicker
        visible={!!pick}
        title={pickTitle}
        players={players}
        excludeId={pick?.kind === 'assist' ? pick.scorerId : pick?.kind === 'sub_off' ? pick.onId : null}
        onPick={onPick}
        onCancel={() => setPick(null)}
        onSkip={pick?.kind === 'assist' ? () => { const scorer = pick.scorerId; setPick(null); record('goal', { playerId: scorer }); } : undefined}
        skipLabel="No assist"
      />

      <Portal>
        <Modal visible={noteOpen} onDismiss={() => setNoteOpen(false)} contentContainerStyle={styles.noteModal}>
          <Text style={styles.heading}>Post an update</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Great save from our keeper"
            multiline
            maxLength={280}
            mode="outlined"
            accessibilityLabel="Update text"
          />
          <View style={styles.noteActions}>
            <Pressable onPress={() => setNoteOpen(false)} accessibilityRole="button" style={styles.linkButton}><Text style={styles.linkText}>Cancel</Text></Pressable>
            <Pressable
              onPress={() => { if (note.trim()) { record('note', { text: note.trim() }); setNote(''); setNoteOpen(false); } }}
              accessibilityRole="button"
              style={styles.kickOff}
            >
              <Text style={styles.kickOffText}>Post</Text>
            </Pressable>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

function Action({ icon, label, onPress, disabled, primary, color }: { icon: string; label: string; onPress: () => void; disabled?: boolean; primary?: boolean; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, primary ? styles.actionPrimary : null, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}
    >
      <MaterialCommunityIcons name={icon as any} size={28} color={primary ? COLORS.background : color ?? COLORS.text} />
      <Text style={[styles.actionText, primary ? styles.actionTextPrimary : null]}>{label}</Text>
    </Pressable>
  );
}

function Phase({ label, onPress, disabled, danger }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={[styles.phase, danger ? styles.phaseDanger : null, disabled ? styles.disabled : null]}>
      <Text style={[styles.phaseText, danger ? styles.phaseTextDanger : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  heading: { color: COLORS.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 6 },
  help: { color: COLORS.textLight, fontSize: 14 },
  label: { color: COLORS.text, fontWeight: '800', marginTop: 20, marginBottom: 8, textTransform: 'uppercase', fontSize: 13, letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { margin: 4 },
  fixture: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(192,192,192,0.25)' },
  fixtureText: { flex: 1 },
  fixtureTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  pickTeam: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginRight: 8 },
  pickTeamText: { color: COLORS.primary, fontWeight: '900', fontSize: 15 },
  notice: { color: COLORS.primary, marginBottom: 12, fontSize: 14 },
  kickOff: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center' },
  kickOffText: { color: COLORS.background, fontWeight: '900', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  action: { width: '31%', minHeight: 84, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(192,192,192,0.35)', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  actionPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  actionText: { color: COLORS.text, fontWeight: '800', marginTop: 6, fontSize: 13 },
  actionTextPrimary: { color: COLORS.background },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  phaseRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  phase: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, paddingVertical: 14, alignItems: 'center' },
  phaseDanger: { borderColor: COLORS.error },
  phaseText: { color: COLORS.primary, fontWeight: '900' },
  phaseTextDanger: { color: COLORS.error },
  finished: { alignItems: 'stretch', gap: 12 },
  finishedText: { color: COLORS.text, textAlign: 'center', fontSize: 15 },
  linkButton: { paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  linkText: { color: COLORS.textLight, fontWeight: '700', textDecorationLine: 'underline' },
  retry: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 10, padding: 12, marginBottom: 12 },
  retryText: { color: COLORS.text, marginBottom: 8 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: COLORS.warning, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  retryButtonText: { color: COLORS.background, fontWeight: '900' },
  error: { color: COLORS.error, marginBottom: 12, fontSize: 14 },
  noteModal: { backgroundColor: '#14181C', margin: 16, borderRadius: 12, padding: 16 },
  noteActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12 },
});
