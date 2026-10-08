import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Modal, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS } from '../config';
import { useClub, useClubName, useTracksAssists } from '../context/ClubContext';
import { useMatchDay } from '../context/MatchDayContext';
import { apiErrorMessage, fixturesApi, lineupApi, liveApi, motmApi, squadApi, type Lineup } from '../services/api';
import FullTimeMotmSheet from '../components/motm/FullTimeMotmSheet';
import { activeSinBins, newClientEventId, sentOffIds, sinBinMinutes, type LiveEvent, type LiveEventType, type LiveMatchView, type NewLiveEvent, type SocialPost } from '../utils/liveMatch';
import { shareGraphic } from '../utils/postGraphic';
import LineupEditor from '../components/live/LineupEditor';
import MatchScoreboard from '../components/matchCentre/MatchScoreboard';
import PhaseBar from '../components/matchCentre/PhaseBar';
import ActionTile from '../components/matchCentre/ActionTile';
import MatchPrompts from '../components/matchCentre/MatchPrompts';
import Crest from '../components/home/Crest';
import { nextPhase } from '../components/matchCentre/phase';
import { FONTS } from '../theme/brandFonts';
import { useTheme } from '../theme/useTheme';
import LiveTimeline from '../components/live/LiveTimeline';
import PlayerPicker, { type PickablePlayer } from '../components/live/PlayerPicker';
import StreamLinkCard from '../components/live/StreamLinkCard';
import { afterFailure, dequeue, enqueue, queuedKickOff, tapLabel, waitingLine, withQueued, type QueuedTap } from '../utils/liveOutbox';
import { loadOutbox, saveOutbox } from '../services/liveOutbox';

interface FixtureOption { id: string; opponent: string; date: string; time: string | null }

const HALF_LENGTHS = [20, 25, 30, 35, 40, 45];
const DAY_MS = 24 * 3600_000;

/** A two-step pick: goal then optional assist (if the club records them), or player on then player off. */
type PickStep = { at: number } & (
  | { kind: 'goal' }
  | { kind: 'assist'; scorerId: string }
  | { kind: 'yellow' }
  | { kind: 'red' }
  | { kind: 'sin_bin' }
  | { kind: 'sub_on' }
  | { kind: 'sub_off'; onId: string });

/**
 * Match Centre (staff): run a match from the touchline. Every tap is timed
 * when the button is first pressed (not after picking the scorer), shows
 * straight away, and is sent through a queue saved on the phone
 * (utils/liveOutbox.ts): with no signal, taps wait and go in order as soon as
 * there's signal, keeping their times, and are never counted twice.
 */
export default function LiveMatchInputScreen() {
  const clubName = useClubName();
  const { club } = useClub();
  const assists = useTracksAssists();
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
  // Taps waiting to be sent (no signal), oldest first; kept on the phone
  const [queue, setQueue] = useState<QueuedTap[]>([]);
  const queueRef = useRef<QueuedTap[]>([]);
  const flushing = useRef(false);
  const [offline, setOffline] = useState(false);
  // A moment's pause after a phase tap, so a double tap can't skip a phase
  const [phaseLock, setPhaseLock] = useState(false);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  // Loading the match failed (no signal): cleared as soon as anything gets through
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [lineupFor, setLineupFor] = useState<FixtureOption | null>(null);
  // Full time: the Man of the Match pop-up, and what happened with it
  const [motmSheet, setMotmSheet] = useState(false);
  const [motmMessage, setMotmMessage] = useState('');
  const matchRef = useRef<LiveMatchView | null>(null);
  matchRef.current = match;
  const names = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players]);
  // A kick-off still waiting to send (no signal): carry on with the match anyway
  const pendingStart = !match ? fixtures.map((f) => queuedKickOff(f, queue)).find((v) => v !== null) ?? null : null;
  // What's shown: the server's view of the match with any queued taps on top
  const view = match ? withQueued(match, queue, names) : pendingStart;

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
      setLoadError('');
    } catch (err) {
      setLoadError(apiErrorMessage(err, "We couldn't load the match. Pull down to try again."));
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
        setLoadError('');
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

  /** At full time, pop up Man of the Match unless a vote is already set up for this match */
  const offerMotm = async (fixtureId: string) => {
    try {
      const vote = await motmApi.getVote(fixtureId);
      if (vote.data.status === 'draft') setMotmSheet(true);
      else setMotmMessage('Man of the Match voting is already set up for this match.');
    } catch {
      setMotmSheet(true);
    }
  };

  const updateQueue = (next: QueuedTap[]) => {
    queueRef.current = next;
    setQueue(next);
    saveOutbox(next);
  };

  /** Send what's queued, in order. Stops at the first tap that can't get through (no signal). */
  const flush = async () => {
    if (flushing.current) return;
    flushing.current = true;
    setSending(true);
    try {
      while (queueRef.current.length) {
        const item = queueRef.current[0];
        try {
          const res = await liveApi.record(item.fixtureId, item.event);
          updateQueue(dequeue(queueRef.current, item.event.clientEventId));
          setOffline(false);
          setLoadError('');
          if (!matchRef.current || matchRef.current.fixture.id === item.fixtureId) setMatch(res.data);
          if (item.event.type === 'full_time' && res.data.status === 'full_time') offerMotm(item.fixtureId);
          refreshAfterDrawing(item.fixtureId, res.data.newPost);
        } catch (err) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (afterFailure(status) === 'retry') { setOffline(true); break; }
          // The server said no (e.g. already full time): drop it so the rest can go
          updateQueue(dequeue(queueRef.current, item.event.clientEventId));
          setMessage(`${item.label} wasn't saved: ${apiErrorMessage(err, 'it was refused.')}`);
        }
      }
    } finally {
      flushing.current = false;
      setSending(false);
    }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Taps left from before (the app was closed with no signal) go when it opens
  useEffect(() => {
    loadOutbox().then((saved) => {
      if (!saved.length) return;
      updateQueue(saved.reduce(enqueue, queueRef.current));
      flushRef.current();
    });
  }, []);

  // While anything is waiting: try again every 8 seconds, and as soon as the phone is back online
  useEffect(() => {
    if (!queue.length) return;
    const timer = setInterval(() => flushRef.current(), 8000);
    const online = () => flushRef.current();
    const win = typeof window !== 'undefined' && typeof window.addEventListener === 'function' ? window : null;
    win?.addEventListener('online', online);
    return () => { clearInterval(timer); win?.removeEventListener('online', online); };
  }, [queue.length > 0]);

  const nameOf = (id?: string) => (id ? players.find((p) => p.id === id)?.name ?? null : null);

  /** Queue a tap (timed `at`, when the button was first pressed) and send it. */
  const queueTap = (fixtureId: string, event: Omit<NewLiveEvent, 'clientEventId' | 'occurredAt'>, at: number) => {
    setMessage('');
    const full: NewLiveEvent = { ...event, clientEventId: newClientEventId(), occurredAt: at };
    updateQueue(enqueue(queueRef.current, { fixtureId, event: full, label: tapLabel(full.type, nameOf(full.playerId)) }));
    if (['kick_off', 'half_time', 'second_half', 'full_time'].includes(full.type)) {
      setPhaseLock(true);
      setTimeout(() => setPhaseLock(false), 2000);
    }
    flushRef.current();
  };

  const record = (type: LiveEventType, extra: Partial<NewLiveEvent> = {}, at = Date.now()) => {
    const fixtureId = matchRef.current?.fixture.id ?? pendingStart?.fixture.id;
    if (!fixtureId) return;
    queueTap(fixtureId, { type, ...extra }, at);
  };

  const kickOff = (fixture: FixtureOption) => {
    setMotmMessage('');
    queueTap(fixture.id, { type: 'kick_off', halfLength }, Date.now());
  };

  // The goal counts even if nobody is picked: the scorer or assist is just left empty
  const goalWithoutScorer = () => { const at = pick?.at; setPick(null); record('goal', {}, at); };
  const goalWithoutAssist = () => {
    if (pick?.kind !== 'assist') return;
    const scorer = pick.scorerId;
    const at = pick.at;
    setPick(null);
    record('goal', { playerId: scorer }, at);
  };

  const onPick = (player: PickablePlayer) => {
    if (!pick) return;
    switch (pick.kind) {
      case 'goal':
        // Clubs that don't record assists: the scorer is all we need
        if (!assists) { setPick(null); record('goal', { playerId: player.id }, pick.at); return; }
        setPick({ kind: 'assist', scorerId: player.id, at: pick.at });
        return;
      case 'assist': setPick(null); record('goal', { playerId: pick.scorerId, player2Id: player.id }, pick.at); return;
      case 'yellow': setPick(null); record('yellow', { playerId: player.id }, pick.at); return;
      case 'red': setPick(null); record('red', { playerId: player.id }, pick.at); return;
      case 'sin_bin': setPick(null); record('sin_bin', { playerId: player.id }, pick.at); return;
      case 'sub_on': setPick({ kind: 'sub_off', onId: player.id, at: pick.at }); return;
      case 'sub_off': setPick(null); record('sub', { playerId: pick.onId, player2Id: player.id }, pick.at); return;
    }
  };

  const undo = async (event: LiveEvent) => {
    // Still waiting to send: just take it off the queue (unless it's going right now)
    if (queueRef.current.some((q) => q.event.clientEventId === event.id)) {
      if (flushing.current && queueRef.current[0]?.event.clientEventId === event.id) {
        setMessage("That's sending right now. Undo it again in a moment.");
        return;
      }
      updateQueue(dequeue(queueRef.current, event.id));
      return;
    }
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

  // Sent-off players can't be picked again; someone already in the sin bin can't go in twice
  const pickable = useMemo(() => {
    if (!view || !pick) return players;
    const off = sentOffIds(view.events);
    const binned = pick.kind === 'sin_bin' ? new Set(activeSinBins(view, Date.now()).map((b) => b.playerId)) : new Set<string | null>();
    return players.filter((p) => !off.has(p.id) && !binned.has(p.id));
  }, [players, view, pick]);

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={color} /></View>;
  }

  const pickTitle = pick ? {
    goal: 'Who scored?', assist: 'Who made the assist?', yellow: 'Yellow card for…', red: 'Red card for…', sin_bin: `Sin bin (${sinBinMinutes(view?.halfLength ?? 40)} min) for…`, sub_on: 'Who is coming on?', sub_off: 'Who is going off?',
  }[pick.kind] : '';
  const next = view ? nextPhase(view.status, view.period) : 'kick_off';
  const playing = view?.status === 'live';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={color} />}>
        {queue.length && (offline || queue.length > 1) ? (
          <View style={styles.retry} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Text style={styles.retryText}>{offline ? 'No signal. ' : ''}{waitingLine(queue)}</Text>
            {queue.slice(0, 6).map((q) => <Text key={q.event.clientEventId} style={styles.retryItem}>• {q.label}</Text>)}
            <Pressable onPress={() => flushRef.current()} disabled={sending} accessibilityRole="button" style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{sending ? 'Sending…' : 'Send now'}</Text>
            </Pressable>
          </View>
        ) : null}
        {message ? <Text style={styles.error} accessibilityRole="alert">{message}</Text> : null}
        {loadError && !queue.length ? <Text style={styles.error} accessibilityRole="alert">{loadError}</Text> : null}
        {notice ? <Text style={[styles.notice, { color }]} accessibilityRole="alert" onPress={() => setNotice('')}>{notice}</Text> : null}

        {!view ? (
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
                <Pressable onPress={() => kickOff(f)} disabled={phaseLock} accessibilityRole="button" accessibilityLabel={`Kick off against ${f.opponent}`}
                  style={({ pressed }) => [styles.kickOff, { backgroundColor: color }, pressed ? styles.pressed : null, phaseLock ? styles.disabled : null]}>
                  <MaterialCommunityIcons name="whistle" size={22} color="#06080B" />
                  <Text style={styles.kickOffText}>KICK OFF</Text>
                </Pressable>
              </View>
            ))}
            {!fixtures.length ? <Text style={styles.help}>No fixtures in the next two days. Add one in Manage Fixtures.</Text> : null}
          </>
        ) : (
          <>
            <MatchScoreboard match={view} clubName={clubName} color={color} badgeUrl={club?.badgeUrl} />
            <PhaseBar
              next={next}
              color={color}
              disabled={phaseLock}
              onPress={(step) => record(step)}
              onEndEarly={() => record('full_time')}
            />
            <MatchPrompts match={view} color={color} disabled={phaseLock} onFullTime={() => record('full_time')} />

            {view.status === 'full_time' ? (
              <View style={styles.finished}>
                <Text style={styles.finishedTitle}>FULL TIME</Text>
                <Text style={styles.finishedText}>Result saved to your results, league table and player stats.</Text>
                {motmMessage ? <Text style={styles.finishedText}>{motmMessage}</Text> : null}
                <Pressable
                  onPress={() => (motmMessage ? navigation.navigate('ManageMOTM') : offerMotm(view.fixture.id))}
                  accessibilityRole="button"
                  style={[styles.kickOff, { backgroundColor: color }]}
                >
                  <MaterialCommunityIcons name="star-circle" size={22} color="#06080B" />
                  <Text style={styles.kickOffText}>{motmMessage ? 'MAN OF THE MATCH VOTE' : 'START MOTM VOTE'}</Text>
                </Pressable>
                <Pressable onPress={() => navigation.navigate('MatchHighlights', { fixtureId: view.fixture.id })} accessibilityRole="button" style={[styles.outline, { borderColor: color }]}>
                  <MaterialCommunityIcons name="play-box-multiple" size={20} color={color} />
                  <Text style={[styles.outlineText, { color }]}>Highlights: line up the video and check the clips</Text>
                </Pressable>
                <Pressable onPress={() => { setMatch(null); setMotmMessage(''); load(); }} accessibilityRole="button" style={styles.linkButton}>
                  <Text style={styles.linkText}>Back to fixtures</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.section}>GOALS</Text>
                <View style={styles.grid}>
                  <ActionTile hero wide icon="soccer" label="WE SCORED" color={color} onPress={() => setPick({ kind: 'goal', at: Date.now() })} disabled={!playing} />
                  <ActionTile wide icon="soccer" label="They scored" color="#8E99A4" iconColor="#C9D1D8" onPress={() => record('opp_goal')} disabled={!playing} />
                </View>
                <Text style={styles.section}>CARDS</Text>
                <View style={styles.grid}>
                  <ActionTile quarter icon="card" label="Our yellow" color={color} iconColor={YELLOW} onPress={() => setPick({ kind: 'yellow', at: Date.now() })} />
                  <ActionTile quarter icon="card" label="Our red" color={color} iconColor={RED} onPress={() => setPick({ kind: 'red', at: Date.now() })} />
                  <ActionTile quarter icon="card" label="Their yellow" color={color} iconColor={YELLOW} onPress={() => record('opp_yellow')} />
                  <ActionTile quarter icon="card" label="Their red" color={color} iconColor={RED} onPress={() => record('opp_red')} />
                </View>
                <Text style={styles.section}>TEAM</Text>
                <View style={styles.grid}>
                  <ActionTile icon="swap-horizontal" label="Sub" color={color} onPress={() => setPick({ kind: 'sub_on', at: Date.now() })} />
                  <ActionTile icon="timer-sand" label="Sin bin" color={color} iconColor={YELLOW} onPress={() => setPick({ kind: 'sin_bin', at: Date.now() })} />
                  <ActionTile icon="message-text-outline" label="Post an update" color={color} onPress={() => setNoteOpen(true)} />
                </View>
                {/* One tap marks the moment for the highlights video; nothing is posted */}
                <Text style={styles.section}>MARK FOR HIGHLIGHTS</Text>
                <View style={styles.grid}>
                  <ActionTile icon="target" label="Chance" color={color} onPress={() => record('chance')} disabled={!playing} />
                  <ActionTile icon="hand-back-left" label="Save" color={color} onPress={() => record('save')} disabled={!playing} />
                  <ActionTile icon="star-outline" label="Great play" color={color} onPress={() => record('skill')} disabled={!playing} />
                </View>
              </>
            )}

            {(() => {
              const today = view.status !== 'full_time' ? day?.fixtures.find((f) => f.id === view.fixture.id) : undefined;
              return today ? <><Text style={styles.section}>LIVE VIDEO</Text><StreamLinkCard fixture={today} onChanged={refreshDay} /></> : null;
            })()}
            <Text style={styles.section}>TIMELINE</Text>
            <LiveTimeline events={view.events} opponent={view.fixture.opponent} onUndo={undo} busyId={undoing} posts={view.posts} onShare={share} />
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
        players={pickable}
        excludeId={pick?.kind === 'assist' ? pick.scorerId : pick?.kind === 'sub_off' ? pick.onId : null}
        onPick={onPick}
        onCancel={() => setPick(null)}
        cancelLabel={pick?.kind === 'assist' ? 'Cancel goal' : 'Cancel'}
        onDismiss={pick?.kind === 'assist' ? goalWithoutAssist : undefined}
        onSkip={pick?.kind === 'goal' ? goalWithoutScorer : pick?.kind === 'assist' ? goalWithoutAssist : undefined}
        skipLabel={pick?.kind === 'goal' ? 'Own goal / not sure' : 'No assist'}
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
      <FullTimeMotmSheet
        visible={motmSheet}
        matchId={view?.fixture.id ?? null}
        opponent={view?.fixture.opponent ?? ''}
        players={players}
        onClose={() => setMotmSheet(false)}
        onOpened={(text) => { setMotmSheet(false); setMotmMessage(text); }}
      />
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
  retryItem: { color: '#F2F5F7', fontSize: 13, marginBottom: 2 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: COLORS.warning, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  retryButtonText: { color: '#06080B', fontWeight: '900' },
  error: { color: COLORS.error, marginBottom: 12, fontSize: 14 },
  noteModal: { backgroundColor: '#14181C', margin: 16, borderRadius: 16, padding: 16 },
  noteActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12 },
});
