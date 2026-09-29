import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Modal, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS } from '../config';
import { useClub, useClubName } from '../context/ClubContext';
import { useMatchDay } from '../context/MatchDayContext';
import { apiErrorMessage, fixturesApi, lineupApi, liveApi, squadApi, type Lineup } from '../services/api';
import { newClientEventId, type LiveEvent, type LiveEventType, type LiveMatchView, type NewLiveEvent, type SocialPost } from '../utils/liveMatch';
import { shareGraphic } from '../utils/postGraphic';
import LineupEditor from '../components/live/LineupEditor';
import MatchScoreboard from '../components/matchCentre/MatchScoreboard';
import PhaseBar from '../components/matchCentre/PhaseBar';
import ActionTile from '../components/matchCentre/ActionTile';
import Crest from '../components/home/Crest';
import { nextPhase } from '../components/matchCentre/phase';
import { FONTS } from '../theme/brandFonts';
import { useTheme } from '../theme/useTheme';
import LiveTimeline from '../components/live/LiveTimeline';
import PlayerPicker, { type PickablePlayer } from '../components/live/PlayerPicker';
import StreamLinkCard from '../components/live/StreamLinkCard';

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
  const { club } = useClub();
  const { theme } = useTheme();
  const color = theme.colors.primary;
  const navigation = useNavigation<any>();
  const { day, refresh: refreshDay } = useMatchDay();
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

  useFocusEffect(useCallback(() => { load(); refreshDay(); }, [load, refreshDay]));

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

  /** The server draws each post's graphic in a few seconds; refresh then so Share has it. */
  const refreshAfterDrawing = (fixtureId: string, post: SocialPost | null | undefined) => {
    if (!post) return;
    setTimeout(async () => {
      try {
        const res = await liveApi.get(fixtureId);
        if (matchRef.current?.fixture.id === fixtureId) setMatch(res.data);
      } catch {
        // The 15-second refresh will catch up
      }
    }, 5000);
  };

  const send = async (fixtureId: string, event: NewLiveEvent) => {
    setSending(true);
    setMessage('');
    try {
      const res = await liveApi.record(fixtureId, event);
      setMatch(res.data);
      setFailed(null);
      if (res.data.motmOpened) setMotmOpened(true);
      refreshAfterDrawing(fixtureId, res.data.newPost);
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
      const correcting = res.data.correctionPost ? ' A CORRECTION post with the right score is going out too.' : '';
      if (res.data.undonePost?.instagramLeftUp) {
        Alert.alert('Removed from the app and Facebook', `Instagram doesn't let apps delete posts, so please delete it in the Instagram app.${correcting}`);
      } else if (correcting) {
        setNotice(`That update had already been posted.${correcting}`);
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
    if (outcome === 'not_ready') setNotice('The picture is still being made. Try again in a few seconds.');
    if (outcome === 'unavailable') setNotice("We couldn't get the picture. Check your signal and try again.");
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
      setNotice(res.data.newPost ? 'Team news posted.' : 'Team saved.');
    } catch (err) {
      setMessage(apiErrorMessage(err, "The team was saved but we couldn't post it. Try again."));
    }
  };

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={color} /></View>;
  }

  const pickTitle = pick ? {
    goal: 'Who scored?', assist: 'Who made the assist?', yellow: 'Yellow card for…', red: 'Red card for…', sub_on: 'Who is coming on?', sub_off: 'Who is going off?',
  }[pick.kind] : '';
  const next = match ? nextPhase(match.status, match.period) : 'kick_off';
  const playing = match?.status === 'live';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={color} />}>
        {failed ? (
          <View style={styles.retry} accessibilityRole="alert">
            <Text style={styles.retryText}>{failed.message}</Text>
            <Pressable onPress={() => send(failed.fixtureId, failed.event)} disabled={sending} accessibilityRole="button" style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{sending ? 'Sending…' : 'Send again'}</Text>
            </Pressable>
          </View>
        ) : null}
        {message ? <Text style={styles.error} accessibilityRole="alert">{message}</Text> : null}
        {notice ? <Text style={[styles.notice, { color }]} accessibilityRole="alert" onPress={() => setNotice('')}>{notice}</Text> : null}

        {!match ? (
          <>
            {(day?.fixtures ?? []).filter((f) => f.matchStatus !== 'full_time').map((f) => (
              <View key={f.id}>
                <Text style={styles.section}>TODAY VS {f.opponent.toUpperCase()}</Text>
                <StreamLinkCard fixture={f} onChanged={refreshDay} />
              </View>
            ))}
            <Text style={styles.section}>MATCH DAY</Text>
            <PhaseBar next="kick_off" color={color} />
            <Text style={styles.help}>Pick your team, post the team news, then tap Kick off when the referee blows.</Text>
            <Text style={styles.label}>Each half lasts</Text>
            <View style={styles.pills}>
              {HALF_LENGTHS.map((m) => (
                <Pressable key={m} onPress={() => setHalfLength(m)} accessibilityRole="radio" accessibilityState={{ selected: halfLength === m }}
                  style={[styles.pill, halfLength === m ? { backgroundColor: color, borderColor: color } : null]}>
                  <Text style={[styles.pillText, halfLength === m ? styles.pillTextOn : null]}>{m} min</Text>
                </Pressable>
              ))}
            </View>
            {fixtures.map((f) => (
              <View key={f.id} style={styles.fixture}>
                <View style={styles.fixtureTop}>
                  <Crest name={f.opponent} color="#8E99A4" size={44} />
                  <View style={styles.fixtureText}>
                    <Text style={styles.fixtureTitle} numberOfLines={2}>VS {f.opponent.toUpperCase()}</Text>
                    <Text style={styles.help}>{new Date(f.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}{f.time ? ` · ${f.time}` : ''}</Text>
                  </View>
                  <Pressable onPress={() => setLineupFor(f)} accessibilityRole="button" style={[styles.pickTeam, { borderColor: color }]}>
                    <MaterialCommunityIcons name="account-group" size={18} color={color} />
                    <Text style={[styles.pickTeamText, { color }]}>Team</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => kickOff(f)} disabled={sending} accessibilityRole="button" accessibilityLabel={`Kick off against ${f.opponent}`}
                  style={({ pressed }) => [styles.kickOff, { backgroundColor: color }, pressed ? styles.pressed : null, sending ? styles.disabled : null]}>
                  <MaterialCommunityIcons name="whistle" size={22} color="#06080B" />
                  <Text style={styles.kickOffText}>KICK OFF</Text>
                </Pressable>
              </View>
            ))}
            {!fixtures.length ? <Text style={styles.help}>No fixtures in the next two days. Add one in Manage Fixtures.</Text> : null}
          </>
        ) : (
          <>
            <MatchScoreboard match={match} clubName={clubName} color={color} badgeUrl={club?.badgeUrl} />
            <PhaseBar
              next={next}
              color={color}
              disabled={sending}
              onPress={(step) => record(step)}
              onEndEarly={() => record('full_time')}
            />

            {match.status === 'full_time' ? (
              <View style={styles.finished}>
                <Text style={styles.finishedTitle}>FULL TIME</Text>
                <Text style={styles.finishedText}>Result saved to your results, league table and player stats.</Text>
                {motmOpened ? (
                  <Text style={styles.finishedText}>Man of the Match voting is open for parents and players, with everyone who played nominated.</Text>
                ) : null}
                <Pressable onPress={() => navigation.navigate('ManageMOTM')} accessibilityRole="button" style={[styles.kickOff, { backgroundColor: color }]}>
                  <MaterialCommunityIcons name="star-circle" size={22} color="#06080B" />
                  <Text style={styles.kickOffText}>{motmOpened ? 'MAN OF THE MATCH VOTE' : 'START MOTM VOTE'}</Text>
                </Pressable>
                <Pressable onPress={() => navigation.navigate('MatchHighlights', { fixtureId: match.fixture.id })} accessibilityRole="button" style={[styles.outline, { borderColor: color }]}>
                  <MaterialCommunityIcons name="play-box-multiple" size={20} color={color} />
                  <Text style={[styles.outlineText, { color }]}>Highlights: line up the video and check the clips</Text>
                </Pressable>
                <Pressable onPress={() => { setMatch(null); setMotmOpened(false); load(); }} accessibilityRole="button" style={styles.linkButton}>
                  <Text style={styles.linkText}>Back to fixtures</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.section}>GOALS</Text>
                <View style={styles.grid}>
                  <ActionTile hero wide icon="soccer" label="WE SCORED" color={color} onPress={() => setPick({ kind: 'goal' })} disabled={sending || !playing} />
                  <ActionTile wide icon="soccer" label="They scored" color="#8E99A4" iconColor="#C9D1D8" onPress={() => record('opp_goal')} disabled={sending || !playing} />
                </View>
                <Text style={styles.section}>CARDS</Text>
                <View style={styles.grid}>
                  <ActionTile quarter icon="card" label="Our yellow" color={color} iconColor={YELLOW} onPress={() => setPick({ kind: 'yellow' })} disabled={sending} />
                  <ActionTile quarter icon="card" label="Our red" color={color} iconColor={RED} onPress={() => setPick({ kind: 'red' })} disabled={sending} />
                  <ActionTile quarter icon="card" label="Their yellow" color={color} iconColor={YELLOW} onPress={() => record('opp_yellow')} disabled={sending} />
                  <ActionTile quarter icon="card" label="Their red" color={color} iconColor={RED} onPress={() => record('opp_red')} disabled={sending} />
                </View>
                <Text style={styles.section}>TEAM</Text>
                <View style={styles.grid}>
                  <ActionTile icon="swap-horizontal" label="Sub" color={color} onPress={() => setPick({ kind: 'sub_on' })} disabled={sending} />
                  <ActionTile icon="message-text-outline" label="Post an update" color={color} onPress={() => setNoteOpen(true)} disabled={sending} />
                </View>
                {/* One tap marks the moment for the highlights video; nothing is posted */}
                <Text style={styles.section}>MARK FOR HIGHLIGHTS</Text>
                <View style={styles.grid}>
                  <ActionTile icon="target" label="Chance" color={color} onPress={() => record('chance')} disabled={sending || !playing} />
                  <ActionTile icon="hand-back-left" label="Save" color={color} onPress={() => record('save')} disabled={sending || !playing} />
                  <ActionTile icon="star-outline" label="Great play" color={color} onPress={() => record('skill')} disabled={sending || !playing} />
                </View>
              </>
            )}

            {(() => {
              const today = match.status !== 'full_time' ? day?.fixtures.find((f) => f.id === match.fixture.id) : undefined;
              return today ? <><Text style={styles.section}>LIVE VIDEO</Text><StreamLinkCard fixture={today} onChanged={refreshDay} /></> : null;
            })()}
            <Text style={styles.section}>TIMELINE</Text>
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
              style={[styles.kickOff, { backgroundColor: color, paddingHorizontal: 22 }]}
            >
              <Text style={styles.kickOffText}>POST</Text>
            </Pressable>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const YELLOW = '#F5C400';
const RED = '#E5334B';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090C' },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 56 },
  heading: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 24, letterSpacing: 1, marginBottom: 6 },
  section: { color: 'rgba(242,245,247,0.55)', fontFamily: FONTS.displaySemi, fontSize: 14, letterSpacing: 2, marginTop: 22, marginBottom: 10 },
  help: { color: 'rgba(242,245,247,0.65)', fontSize: 14, marginTop: 6 },
  label: { color: '#F2F5F7', fontWeight: '800', marginTop: 18, marginBottom: 8, fontSize: 13, letterSpacing: 0.5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  pill: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { color: '#F2F5F7', fontWeight: '700' },
  pillTextOn: { color: '#06080B', fontWeight: '900' },
  fixture: { marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: '#12161B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  fixtureTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fixtureText: { flex: 1 },
  fixtureTitle: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 22, lineHeight: 23 },
  pickTeam: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  pickTeamText: { fontWeight: '900', fontSize: 14 },
  notice: { marginBottom: 12, fontSize: 14, fontWeight: '700' },
  kickOff: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 15 },
  kickOffText: { color: '#06080B', fontFamily: FONTS.display, fontSize: 22, letterSpacing: 2 },
  outline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 12 },
  outlineText: { fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  finished: { alignItems: 'stretch', gap: 12, marginTop: 18 },
  finishedTitle: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 30, letterSpacing: 2, textAlign: 'center' },
  finishedText: { color: 'rgba(242,245,247,0.8)', textAlign: 'center', fontSize: 15 },
  linkButton: { paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  linkText: { color: 'rgba(242,245,247,0.6)', fontWeight: '700', textDecorationLine: 'underline' },
  retry: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 12, padding: 12, marginBottom: 12 },
  retryText: { color: '#F2F5F7', marginBottom: 8 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: COLORS.warning, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  retryButtonText: { color: '#06080B', fontWeight: '900' },
  error: { color: COLORS.error, marginBottom: 12, fontSize: 14 },
  noteModal: { backgroundColor: '#14181C', margin: 16, borderRadius: 16, padding: 16 },
  noteActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12 },
});
