import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Checkbox, IconButton, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import PlayerPicker, { type PickablePlayer } from '../components/live/PlayerPicker';
import { apiErrorMessage, gotmApi, squadApi } from '../services/api';
import {
  MAX_GOALS, goalSummary, monthLabel, newVoteBody, newVoteProblem, recentMonths, votesText,
  type GoalOption, type GotmData, type GotmVote, type ManualGoal,
} from '../utils/gotm';

/**
 * Staff: Goal of the Month. Pick the month's best goals (from Match Centre
 * and match reports, or typed in), open the vote, watch the count, and close
 * it to post the winner. Everyone votes under Highlights → Goal of the Month.
 */
export default function ManageGotmScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const [data, setData] = useState<GotmData | null>(null);
  const [squad, setSquad] = useState<PickablePlayer[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [gotm, sq] = await Promise.all([gotmApi.get(), squadApi.getSquad().catch(() => null)]);
      setData(gotm);
      setSquad(((sq?.data ?? []) as Array<{ id: string; name: string; number?: number | null }>).map((p) => ({ id: String(p.id), name: p.name, number: p.number ?? null })));
    } catch (err) {
      setError(apiErrorMessage(err, "Goal of the Month didn't load. Check your signal and pull to refresh."));
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const close = (vote: GotmVote) => Alert.alert(`Close voting for ${vote.label}?`, 'The winner is posted for you.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Close and post winner',
      onPress: async () => {
        setBusy(true); setNotice(''); setError('');
        try {
          const out = await gotmApi.close(vote.id);
          const names = (out.winners ?? []).map((w) => w.name).join(' & ');
          setNotice(names ? `Voting closed. ${names} won with ${votesText(out.votes ?? 0)}${out.posted ? '. The winner post is on its way.' : '.'}` : 'Voting closed. Nobody voted, so there is no winner this time.');
          load();
        } catch (err) {
          setError(apiErrorMessage(err, "Voting didn't close. Please try again."));
        } finally {
          setBusy(false);
        }
      },
    },
  ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
      <Text style={styles.intro}>Pick the month&apos;s best goals and everyone at the club votes in the app. Closing the vote posts the winner.</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {!data && !error ? <ActivityIndicator color={c.primary} style={styles.loading} /> : null}
      {data?.vote ? <OpenVote vote={data.vote} busy={busy} onClose={() => close(data.vote!)} /> : null}
      {data && !data.vote ? <NewVote squad={squad} onOpened={(label) => { setNotice(`Voting for ${label} is open. Everyone votes under Highlights.`); load(); }} /> : null}
      {data?.past.length ? (
        <>
          <Text style={styles.section}>PAST WINNERS</Text>
          {data.past.map((v) => {
            const winners = v.candidates.filter((w) => v.winners.includes(w.id));
            return (
              <View key={v.id} style={styles.card}>
                <Text style={styles.meta}>{v.label.toUpperCase()}</Text>
                <Text style={styles.strong}>{winners.map((w) => w.playerName).join(' & ') || 'No winner'}</Text>
                {winners.length === 1 ? <Text style={styles.meta}>{goalSummary(winners[0])}{winners[0].votes != null ? ` · ${votesText(winners[0].votes)}` : ''}</Text> : null}
              </View>
            );
          })}
        </>
      ) : null}
    </ScrollView>
  );
}

function OpenVote({ vote, busy, onClose }: { vote: GotmVote; busy: boolean; onClose: () => void }) {
  const c = useBrandColors();
  const styles = useStyles();
  const total = vote.candidates.reduce((n, x) => n + (x.votes ?? 0), 0);
  const ranked = [...vote.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  return (
    <View style={[styles.card, { borderColor: c.primary }]}>
      <Text style={[styles.eyebrow, { color: c.primary }]}>VOTING OPEN · {votesText(total).toUpperCase()} SO FAR</Text>
      <Text style={styles.big}>{vote.label}</Text>
      {ranked.map((x, i) => {
        const watch = x.clip?.watchUrl ?? x.videoUrl;
        return (
          <View key={x.id} style={styles.candidate}>
            <Text style={styles.rank}>{i + 1}</Text>
            <View style={styles.flex}>
              <Text style={styles.strong}>{x.playerName}</Text>
              <Text style={styles.meta}>{[goalSummary(x), x.description].filter(Boolean).join(' · ')}</Text>
              {watch ? <Text style={[styles.link, { color: c.primary }]} onPress={() => Linking.openURL(watch)} accessibilityRole="link">▶ Watch</Text> : null}
            </View>
            <Text style={[styles.votes, { color: c.primary }]}>{x.votes ?? 0}</Text>
          </View>
        );
      })}
      <Button mode="contained" icon="trophy" onPress={onClose} loading={busy} disabled={busy}>Close and post winner</Button>
    </View>
  );
}

function NewVote({ squad, onOpened }: { squad: PickablePlayer[]; onOpened: (label: string) => void }) {
  const c = useBrandColors();
  const styles = useStyles();
  const months = useMemo(() => recentMonths(), []);
  const [month, setMonth] = useState(months[0]);
  const [goals, setGoals] = useState<GoalOption[] | null>(null);
  const [goalsError, setGoalsError] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<ManualGoal[]>([]);
  const [draft, setDraft] = useState({ description: '', videoUrl: '' });
  const [picking, setPicking] = useState(false);
  const [problem, setProblem] = useState('');
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setGoals(null); setGoalsError(''); setPicked(new Set());
    gotmApi.goals(month)
      .then((g) => { if (!cancelled) setGoals(g); })
      .catch((err) => { if (!cancelled) { setGoals([]); setGoalsError(apiErrorMessage(err, "That month's goals didn't load.")); } });
    return () => { cancelled = true; };
  }, [month]);

  const count = picked.size + manual.length;
  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else if (next.size + manual.length < MAX_GOALS) next.add(id);
    return next;
  });

  const open = async () => {
    const why = newVoteProblem(month, count);
    if (why) { setProblem(why); return; }
    setProblem(''); setOpening(true);
    try {
      await gotmApi.start(newVoteBody(month, (goals ?? []).filter((g) => picked.has(g.eventId)), manual));
      onOpened(monthLabel(month));
    } catch (err) {
      setProblem(apiErrorMessage(err, "Voting didn't open. Please try again."));
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>START A VOTE</Text>
      <Text style={styles.meta}>Pick 2 to {MAX_GOALS} goals. Goals with a match clip can be watched in the app.</Text>
      <Text style={styles.label}>Goals scored in</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {months.map((m) => (
          <Pressable key={m} onPress={() => setMonth(m)} style={[styles.chip, m === month ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="button" accessibilityState={{ selected: m === month }}>
            <Text style={[styles.chipText, m === month ? { color: c.onPrimary } : null]}>{monthLabel(m)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>From Match Centre and match reports</Text>
      {goals === null ? <ActivityIndicator color={c.primary} /> : goalsError ? <Text style={styles.error}>{goalsError}</Text> : goals.length === 0 ? (
        <Text style={styles.meta}>No goals were recorded that month. Add goals by hand below.</Text>
      ) : goals.map((g) => {
        const on = picked.has(g.eventId);
        return (
          <Pressable key={g.eventId} onPress={() => toggle(g.eventId)} style={[styles.goal, on ? { borderColor: c.primary, backgroundColor: c.primarySoft } : null]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
            <Checkbox status={on ? 'checked' : 'unchecked'} onPress={() => toggle(g.eventId)} />
            <View style={styles.flex}>
              <Text style={styles.strong}>{g.playerName}</Text>
              <Text style={styles.meta}>{goalSummary(g)}{g.hasClip ? ' · Clip' : ''}</Text>
            </View>
          </Pressable>
        );
      })}

      <Text style={styles.label}>Add a goal by hand</Text>
      <Text style={styles.meta}>For goals that weren&apos;t recorded, e.g. from a friendly. Paste a video link if you have one.</Text>
      <TextInput mode="outlined" label="The goal (e.g. Volley v Birstall)" value={draft.description} maxLength={120} onChangeText={(description) => setDraft({ ...draft, description })} />
      <TextInput mode="outlined" label="Video link (optional)" value={draft.videoUrl} keyboardType="url" autoCapitalize="none" onChangeText={(videoUrl) => setDraft({ ...draft, videoUrl })} />
      <Button mode="outlined" icon="account-plus" onPress={() => setPicking(true)} disabled={!draft.description.trim() || count >= MAX_GOALS}>Pick the scorer and add</Button>
      {manual.map((g, i) => (
        <View key={`${g.playerId}-${i}`} style={styles.manual}>
          <Text style={styles.flex}><Text style={styles.strong}>{g.playerName}</Text><Text style={styles.meta}> · {g.description}</Text></Text>
          <IconButton icon="close" size={18} onPress={() => setManual(manual.filter((_, j) => j !== i))} accessibilityLabel={`Remove ${g.playerName}'s goal`} />
        </View>
      ))}

      {problem ? <Text style={styles.error} accessibilityRole="alert">{problem}</Text> : null}
      <Text style={styles.meta}>{count} of {MAX_GOALS} goals picked</Text>
      <Button mode="contained" icon="vote" onPress={open} loading={opening} disabled={opening || count === 0}>Open voting</Button>
      <PlayerPicker
        visible={picking}
        title="Who scored it?"
        players={squad}
        onPick={(p) => { setManual([...manual, { playerId: p.id, playerName: p.name, description: draft.description.trim(), videoUrl: draft.videoUrl.trim() }]); setDraft({ description: '', videoUrl: '' }); setPicking(false); }}
        onCancel={() => setPicking(false)}
        onDismiss={() => setPicking(false)}
      />
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
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 16, gap: 10 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 22, letterSpacing: 1 },
  eyebrow: { fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 1.5 },
  big: { color: c.text, fontFamily: FONTS.display, fontSize: 30 },
  section: { color: c.text, fontFamily: FONTS.displaySemi, fontSize: 15, letterSpacing: 1.5, marginTop: 8 },
  label: { color: c.text, fontFamily: FONTS.displaySemi, fontSize: 14, letterSpacing: 1, marginTop: 6, textTransform: 'uppercase' },
  meta: { color: c.textLight, fontSize: 12, lineHeight: 17 },
  strong: { color: c.text, fontWeight: '800' },
  flex: { flex: 1 },
  link: { fontWeight: '800', marginTop: 2, paddingVertical: 4 },
  chips: { gap: 8 },
  chip: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  chipText: { color: c.text, fontWeight: '700', fontSize: 13 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, borderRadius: 14, paddingRight: 10, minHeight: 52 },
  manual: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, borderRadius: 12, paddingLeft: 12 },
  candidate: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  rank: { color: c.textLight, fontFamily: FONTS.display, fontSize: 26, width: 24 },
  votes: { fontFamily: FONTS.display, fontSize: 28, fontVariant: ['tabular-nums'] },
}));
