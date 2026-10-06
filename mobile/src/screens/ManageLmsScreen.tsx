import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, IconButton, Modal, Portal, TextInput } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { apiErrorMessage, lmsAdminApi } from '../services/api';
import { talkTime } from '../utils/teamTalk';
import {
  ENTRY_STATUS, ROUND_STATUS, picksClose, processedText, roundFixtures, roundResults, teamsUsed,
  type LmsEntry, type LmsGame, type LmsRound,
} from '../utils/lms';

const blankRows = () => [{ home: '', away: '' }, { home: '', away: '' }, { home: '', away: '' }];

/**
 * Staff: run Last Man Standing (the website's Admin → Last Man Standing).
 * Make a game, add each round's matches, then enter the scores: anyone
 * whose team didn't win is out. Members play on the Predictions screen.
 */
export default function ManageLmsScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const [games, setGames] = useState<LmsGame[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ game: LmsGame; standings: LmsEntry[]; currentRound: LmsRound | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<null | 'game' | 'round' | 'results'>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [gameForm, setGameForm] = useState({ name: '', competition: '' });
  const [roundForm, setRoundForm] = useState({ name: '', date: '', time: '', rows: blankRows() });
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});

  const loadGames = useCallback(async () => {
    setError('');
    try {
      const list = await lmsAdminApi.games();
      setGames(list);
      setSelected((cur) => cur ?? list.find((g) => g.status === 'active')?.id ?? list[0]?.id ?? null);
    } catch (err) {
      setError(apiErrorMessage(err, "Games didn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    try { setDetail(await lmsAdminApi.game(id)); } catch (err) { setError(apiErrorMessage(err, "That game didn't load. Please try again.")); }
  }, []);
  useEffect(() => { loadGames(); }, [loadGames]);
  useEffect(() => { if (selected) loadDetail(selected); else setDetail(null); }, [selected, loadDetail]);

  const refresh = () => { setRefreshing(true); loadGames(); if (selected) loadDetail(selected); };
  const open = (d: 'game' | 'round' | 'results') => { setFormError(''); setNotice(''); setDialog(d); };

  const createGame = async () => {
    if (!gameForm.name.trim()) { setFormError('Give the game a name.'); return; }
    setBusy(true); setFormError('');
    try {
      const res = await lmsAdminApi.create(gameForm.name.trim(), gameForm.competition.trim());
      setDialog(null);
      setNotice(`${gameForm.name.trim()} made. Add the first round's matches.`);
      setGameForm({ name: '', competition: '' });
      if (res?.game?.id) setSelected(res.game.id);
      loadGames();
    } catch (err) { setFormError(apiErrorMessage(err, "The game wasn't made. Please try again.")); } finally { setBusy(false); }
  };

  const createRound = async () => {
    if (!detail) return;
    const fixtures = roundFixtures(roundForm.rows);
    if (typeof fixtures === 'string') { setFormError(fixtures); return; }
    const deadline = picksClose(roundForm.date, roundForm.time);
    if (typeof deadline === 'string') { setFormError(deadline); return; }
    setBusy(true); setFormError('');
    try {
      await lmsAdminApi.newRound(detail.game.id, { name: roundForm.name.trim() || undefined, ...(deadline ? { deadline } : {}), fixtures });
      setDialog(null);
      setRoundForm({ name: '', date: '', time: '', rows: blankRows() });
      setNotice('Round added. Members can make their picks.');
      loadDetail(detail.game.id); loadGames();
    } catch (err) { setFormError(apiErrorMessage(err, "The round wasn't added. Please try again.")); } finally { setBusy(false); }
  };

  const enterResults = async () => {
    const round = detail?.currentRound;
    if (!round || !detail) return;
    const results = roundResults(round.fixtures, scores);
    if (typeof results === 'string') { setFormError(results); return; }
    setBusy(true); setFormError('');
    try {
      const res = await lmsAdminApi.process(round.id, results);
      setDialog(null);
      setNotice(processedText(res?.summary ?? {}));
      loadDetail(detail.game.id); loadGames();
    } catch (err) { setFormError(apiErrorMessage(err, "The results weren't saved. Please try again.")); } finally { setBusy(false); }
  };

  const reset = () => detail && Alert.alert('Start this game again?', 'All its rounds and picks are deleted and everyone is back in.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Start again', style: 'destructive', onPress: async () => {
      try { await lmsAdminApi.reset(detail.game.id); setNotice('Game started again.'); loadDetail(detail.game.id); loadGames(); }
      catch (err) { setError(apiErrorMessage(err, "The game wasn't reset. Please try again.")); }
    } },
  ]);

  const round = detail?.currentRound ?? null;
  const setRow = (i: number, key: 'home' | 'away', v: string) => setRoundForm((f) => ({ ...f, rows: f.rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)) }));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
        <Text style={styles.intro}>A club fundraiser game: each round, members pick a team to win. Pick a loser and you&apos;re out. Members play on the Predictions screen.</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <Button mode="contained" icon="plus" onPress={() => open('game')}>New game</Button>

        {loading ? <ActivityIndicator color={c.primary} style={styles.loading} /> : games.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>NO GAMES YET</Text>
            <Text style={styles.body}>Make a game, add the first round&apos;s matches and members join in the app.</Text>
          </View>
        ) : (
          <>
            {games.length > 1 ? (
              <View style={styles.chips}>
                {games.map((g) => {
                  const on = selected === g.id;
                  return (
                    <Pressable key={g.id} onPress={() => setSelected(g.id)} style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                      <Text style={[styles.chipText, on ? { color: c.onPrimary } : null]}>{g.name}{g.status === 'completed' ? ' · Finished' : ''}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {!detail ? <ActivityIndicator color={c.primary} /> : (
              <>
                <View style={styles.card}>
                  <Text style={styles.big}>{detail.game.name}</Text>
                  <Text style={styles.meta}>
                    {detail.game.competition || 'No competition set'} · {detail.game.status === 'completed' ? (detail.game.winner_name ? `Won by ${detail.game.winner_name}` : 'Finished') : `Round ${detail.game.round_number} · ${detail.standings.filter((e) => e.status === 'alive').length} of ${detail.standings.length} still in`}
                  </Text>
                  <View style={styles.row}>
                    {detail.game.status === 'active' && round && round.status !== 'processed' ? (
                      <Button mode="contained" onPress={() => { setScores(Object.fromEntries(round.fixtures.map((f) => [f.id, { home: '', away: '' }]))); open('results'); }}>Enter results</Button>
                    ) : null}
                    {detail.game.status === 'active' && (!round || round.status === 'processed') ? <Button mode="contained" icon="plus" onPress={() => open('round')}>New round</Button> : null}
                    <Button mode="text" textColor={c.error} onPress={reset}>Start again</Button>
                  </View>
                </View>

                {round ? (
                  <View style={styles.card}>
                    <View style={styles.row}>
                      <Text style={[styles.cardTitle, styles.flex]}>{(round.name || `Round ${round.round_number}`).toUpperCase()}</Text>
                      <Text style={[styles.status, { color: round.status === 'open' ? c.primary : c.textLight }]}>{ROUND_STATUS[round.status].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.meta}>Picks close {talkTime(round.deadline)}</Text>
                    {round.fixtures.map((f) => (
                      <View key={f.id} style={styles.fixture}>
                        <Text style={[styles.body, styles.flex, styles.right]} numberOfLines={1}>{f.home}</Text>
                        <Text style={styles.vs}>{f.homeScore != null ? `${f.homeScore}–${f.awayScore}` : 'v'}</Text>
                        <Text style={[styles.body, styles.flex]} numberOfLines={1}>{f.away}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>WHO&apos;S PLAYING ({detail.standings.length})</Text>
                  {detail.standings.length === 0 ? <Text style={styles.meta}>Nobody has joined yet. Members join on the Predictions screen.</Text> : detail.standings.map((e) => (
                    <View key={e.id} style={styles.entry}>
                      <View style={styles.flex}>
                        <Text style={styles.strong}>{e.user_name}</Text>
                        {teamsUsed(e).length ? <Text style={styles.meta} numberOfLines={2}>Picked: {teamsUsed(e).join(', ')}</Text> : null}
                      </View>
                      <Text style={[styles.status, { color: e.status === 'eliminated' ? c.textLight : c.primary }]}>{ENTRY_STATUS[e.status].toUpperCase()}{e.status === 'eliminated' && e.eliminated_round ? ` R${e.eliminated_round}` : ''}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <Portal>
        <Modal visible={dialog === 'game'} onDismiss={() => setDialog(null)} contentContainerStyle={styles.modal}>
          <View style={styles.modalBody}>
            <Text style={styles.cardTitle}>NEW GAME</Text>
            <TextInput mode="outlined" label="Name" placeholder="e.g. Premier League LMS 2026" value={gameForm.name} maxLength={80} onChangeText={(name) => setGameForm({ ...gameForm, name })} />
            <TextInput mode="outlined" label="Competition (optional)" placeholder="e.g. Premier League" value={gameForm.competition} maxLength={60} onChangeText={(competition) => setGameForm({ ...gameForm, competition })} />
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button mode="contained" onPress={createGame} loading={busy} disabled={busy}>Make game</Button>
            <Button mode="text" onPress={() => setDialog(null)} disabled={busy}>Cancel</Button>
          </View>
        </Modal>
        <Modal visible={dialog === 'round'} onDismiss={() => setDialog(null)} contentContainerStyle={styles.modal}>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.cardTitle}>NEW ROUND</Text>
            <TextInput mode="outlined" label="Name (optional)" placeholder={`Round ${(detail?.game.round_number ?? 0) + 1}`} value={roundForm.name} maxLength={60} onChangeText={(name) => setRoundForm({ ...roundForm, name })} />
            <View style={styles.row}>
              <TextInput mode="outlined" label="Picks close (date)" placeholder="31/10/2026" value={roundForm.date} onChangeText={(date) => setRoundForm({ ...roundForm, date })} style={styles.flex} />
              <TextInput mode="outlined" label="Time" placeholder="15:00" value={roundForm.time} onChangeText={(time) => setRoundForm({ ...roundForm, time })} style={styles.time} />
            </View>
            <Text style={styles.meta}>Leave the date empty and picks close a week from now.</Text>
            <Text style={styles.label}>Matches</Text>
            {roundForm.rows.map((r, i) => (
              <View key={i} style={styles.row}>
                <TextInput mode="outlined" dense label="Home" value={r.home} onChangeText={(v) => setRow(i, 'home', v)} style={styles.flex} />
                <Text style={styles.vs}>v</Text>
                <TextInput mode="outlined" dense label="Away" value={r.away} onChangeText={(v) => setRow(i, 'away', v)} style={styles.flex} />
                {roundForm.rows.length > 1 ? <IconButton icon="close" size={18} onPress={() => setRoundForm((f) => ({ ...f, rows: f.rows.filter((_, j) => j !== i) }))} accessibilityLabel="Remove this match" /> : null}
              </View>
            ))}
            <Button mode="text" icon="plus" style={styles.start} onPress={() => setRoundForm((f) => ({ ...f, rows: [...f.rows, { home: '', away: '' }] }))}>Add a match</Button>
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button mode="contained" onPress={createRound} loading={busy} disabled={busy}>Add round</Button>
            <Button mode="text" onPress={() => setDialog(null)} disabled={busy}>Cancel</Button>
          </ScrollView>
        </Modal>
        <Modal visible={dialog === 'results'} onDismiss={() => setDialog(null)} contentContainerStyle={styles.modal}>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.cardTitle}>ENTER RESULTS</Text>
            <Text style={styles.meta}>Anyone whose team didn&apos;t win (or who didn&apos;t pick) is out. This can&apos;t be undone.</Text>
            {(round?.fixtures ?? []).map((f) => (
              <View key={f.id} style={styles.row}>
                <Text style={[styles.body, styles.flex, styles.right]} numberOfLines={2}>{f.home}</Text>
                <TextInput mode="outlined" dense keyboardType="number-pad" value={scores[f.id]?.home ?? ''} maxLength={2} onChangeText={(v) => setScores((s) => ({ ...s, [f.id]: { home: v, away: s[f.id]?.away ?? '' } }))} style={styles.score} accessibilityLabel={`${f.home} score`} />
                <Text style={styles.vs}>–</Text>
                <TextInput mode="outlined" dense keyboardType="number-pad" value={scores[f.id]?.away ?? ''} maxLength={2} onChangeText={(v) => setScores((s) => ({ ...s, [f.id]: { home: s[f.id]?.home ?? '', away: v } }))} style={styles.score} accessibilityLabel={`${f.away} score`} />
                <Text style={[styles.body, styles.flex]} numberOfLines={2}>{f.away}</Text>
              </View>
            ))}
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button mode="contained" onPress={enterResults} loading={busy} disabled={busy}>Save results</Button>
            <Button mode="text" onPress={() => setDialog(null)} disabled={busy}>Cancel</Button>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  intro: { color: c.textLight, lineHeight: 20 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  loading: { marginTop: 24 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 8 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  big: { color: c.text, fontFamily: FONTS.display, fontSize: 28, lineHeight: 30 },
  body: { color: c.text, lineHeight: 21 },
  strong: { color: c.text, fontWeight: '800' },
  meta: { color: c.textLight, fontSize: 12 },
  label: { color: c.text, fontWeight: '700', marginTop: 4 },
  status: { fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 1.2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1 },
  right: { textAlign: 'right' },
  start: { alignSelf: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  chipText: { color: c.text, fontWeight: '700', fontSize: 13 },
  fixture: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surfaceRaised, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  vs: { color: c.textLight, fontFamily: FONTS.display, fontSize: 18, paddingHorizontal: 2 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 8 },
  time: { width: 100 },
  score: { width: 56, textAlign: 'center' },
  modal: { backgroundColor: c.surface, margin: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, maxHeight: '90%' },
  modalBody: { padding: 18, gap: 10 },
}));
