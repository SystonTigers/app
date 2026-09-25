import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, FAB, Modal, Paragraph, Portal, Text, Title } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../config';
import {
  apiErrorMessage,
  fixturesApi,
  lineupApi,
  motmApi,
  squadApi,
  type MotmSessionSummary,
  type MotmVote,
} from '../services/api';

interface MatchOption {
  id: string;
  opponent: string;
  date: string;
}

interface SquadPlayer {
  id: string;
  name: string;
  number: number | null;
}

const VOTING_LENGTHS = [
  { label: '24 hours', hours: 24 },
  { label: '2 days', hours: 48 },
  { label: '3 days', hours: 72 },
];
const MIN_NOMINEES = 2;
const MAX_NOMINEES = 25;
const DAY_MS = 24 * 3600_000;

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : `${formatDate(value)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Managers run Man of the Match: pick a match and 2-15 nominees, open the
 * vote for parents and players, watch the tally, then close it to announce
 * the winner (shown in the app and on the club's web page).
 */
export default function ManageMOTMScreen() {
  const [sessions, setSessions] = useState<MotmSessionSummary[]>([]);
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  // New vote
  const [creating, setCreating] = useState(false);
  const [matchId, setMatchId] = useState('');
  const [nominees, setNominees] = useState<string[]>([]);
  const [hours, setHours] = useState(48);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);

  // Vote detail
  const [detail, setDetail] = useState<MotmVote | null>(null);
  const [detailSummary, setDetailSummary] = useState<MotmSessionSummary | null>(null);
  const [detailError, setDetailError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sessionsRes, fixturesRes, resultsRes, squadRes] = await Promise.all([
        motmApi.listSessions(),
        fixturesApi.getFixtures().catch(() => ({ data: [] })),
        fixturesApi.getResults().catch(() => ({ data: [] })),
        squadApi.getSquad().catch(() => ({ data: [] })),
      ]);
      const list = sessionsRes.data || [];
      const used = new Set(list.map((s) => s.match_id));
      const cutoff = Date.now() + DAY_MS; // today's game counts
      const byId = new Map<string, MatchOption>();
      for (const m of [...(resultsRes.data || []), ...(fixturesRes.data || [])] as Array<{ id: string | number; opponent: string; date: string }>) {
        const id = String(m.id);
        if (id && !used.has(id) && !byId.has(id) && Date.parse(m.date) <= cutoff) byId.set(id, { id, opponent: m.opponent, date: m.date });
      }
      const options = [...byId.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 10);
      setSessions(list);
      setMatches(options);
      setPlayers((squadRes.data || []).map((p: { id: string; name: string; number?: number | null }) => ({ id: p.id, name: p.name, number: p.number ?? null })));
      setLoadError('');
    } catch (err) {
      setLoadError(apiErrorMessage(err, "We couldn't load Man of the Match votes. Pull down to try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /** Nominate everyone in the match's line-up (the manager can untick anyone). */
  const chooseMatch = async (id: string) => {
    setMatchId(id);
    setNominees([]);
    try {
      const res = await lineupApi.get(id);
      setNominees([...res.data.starters, ...res.data.subs].map((p) => p.playerId).slice(0, MAX_NOMINEES));
    } catch {
      // No line-up: the manager picks nominees by hand
    }
  };

  const startCreate = () => {
    if (matches[0]) chooseMatch(matches[0].id); else setMatchId('');
    setNominees([]);
    setHours(48);
    setCreateError('');
    setCreating(true);
  };

  const toggleNominee = (id: string) => {
    setNominees((current) =>
      current.includes(id) ? current.filter((n) => n !== id) : current.length >= MAX_NOMINEES ? current : [...current, id],
    );
  };

  const openVote = async () => {
    if (!matchId) return setCreateError('Choose the match.');
    if (nominees.length < MIN_NOMINEES) return setCreateError(`Pick at least ${MIN_NOMINEES} nominees.`);
    setSaving(true);
    setCreateError('');
    try {
      const start = new Date();
      const end = new Date(start.getTime() + hours * 3600_000);
      await motmApi.openVoting(matchId, {
        nominees,
        votingWindow: { start: start.toISOString(), end: end.toISOString() },
        status: 'active',
      });
      setCreating(false);
      Alert.alert('Vote open', `Parents and players can vote in the app until ${formatDateTime(end.toISOString())}.`);
      load();
    } catch (err) {
      setCreateError(apiErrorMessage(err, "We couldn't open the vote. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const showDetail = async (summary: MotmSessionSummary) => {
    setDetailSummary(summary);
    setDetail(null);
    setDetailError('');
    try {
      const res = await motmApi.getVote(summary.match_id);
      setDetail(res.data);
    } catch (err) {
      setDetailError(apiErrorMessage(err, "We couldn't load this vote."));
    }
  };

  const closeVote = (summary: MotmSessionSummary) => {
    Alert.alert('Close the vote?', 'Voting ends now and the winner is announced in the app and on your club page.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close vote',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const res = await motmApi.closeVoting(summary.match_id);
            const names = res.data.winners.map((w) => w.name).join(' & ');
            setDetailSummary(null);
            Alert.alert('Vote closed', names ? `Man of the Match: ${names}` : 'Nobody voted, so there is no winner this time.');
            load();
          } catch (err) {
            setDetailError(apiErrorMessage(err, "We couldn't close the vote. Please try again."));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const activateDraft = async (summary: MotmSessionSummary) => {
    setBusy(true);
    try {
      await motmApi.openVoting(summary.match_id, { status: 'active' });
      setDetailSummary(null);
      load();
    } catch (err) {
      setDetailError(apiErrorMessage(err, "We couldn't open the vote. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const groups: Array<{ title: string; items: MotmSessionSummary[] }> = [
    { title: 'Open now', items: sessions.filter((s) => s.votingOpen) },
    { title: 'Drafts', items: sessions.filter((s) => s.status === 'draft') },
    { title: 'Finished', items: sessions.filter((s) => s.status === 'closed') },
  ];

  const statusLine = (s: MotmSessionSummary) => {
    if (s.status === 'closed') return s.winners.length ? `Winner: ${s.winners.join(' & ')}` : 'No votes cast';
    if (s.status === 'draft') return `${s.nominee_count} nominees · not open yet`;
    return `${s.vote_count} vote${s.vote_count === 1 ? '' : 's'} · closes ${formatDateTime(s.voting_end_at)}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {groups.map((group) =>
          group.items.length ? (
            <View key={group.title}>
              <Title style={styles.sectionTitle}>{group.title}</Title>
              {group.items.map((s) => (
                <Card key={s.match_id} style={styles.card} onPress={() => showDetail(s)}>
                  <Card.Content>
                    <Title style={styles.cardTitle}>vs {s.opponent ?? 'Unknown match'}</Title>
                    <Paragraph style={styles.meta}>{formatDate(s.date)}</Paragraph>
                    <Paragraph style={styles.status}>{statusLine(s)}</Paragraph>
                  </Card.Content>
                </Card>
              ))}
            </View>
          ) : null,
        )}

        {sessions.length === 0 && !loadError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Man of the Match votes yet</Text>
            <Paragraph style={styles.emptyText}>After a game, tap "New vote", pick your nominees and parents can vote in the app.</Paragraph>
          </View>
        ) : null}
      </ScrollView>

      <FAB icon="star-plus" label="New vote" style={styles.fab} color={COLORS.background} onPress={startCreate} />

      <Portal>
        <Modal visible={creating} onDismiss={() => setCreating(false)} contentContainerStyle={styles.modal}>
          <ScrollView>
            <Title style={styles.modalTitle}>New Man of the Match vote</Title>

            <Text style={styles.label}>Match</Text>
            {matches.length ? (
              <View style={styles.chips}>
                {matches.map((m) => (
                  <Chip key={m.id} selected={matchId === m.id} onPress={() => chooseMatch(m.id)} style={styles.chip}>
                    vs {m.opponent} · {formatDate(m.date)}
                  </Chip>
                ))}
              </View>
            ) : (
              <Paragraph style={styles.help}>No recent matches without a vote. Add the fixture or result first.</Paragraph>
            )}

            <Text style={styles.label}>Nominees ({nominees.length} picked, {MIN_NOMINEES}-{MAX_NOMINEES})</Text>
            {players.length ? (
              <View style={styles.chips}>
                {players.map((p) => (
                  <Chip key={p.id} selected={nominees.includes(p.id)} onPress={() => toggleNominee(p.id)} style={styles.chip}>
                    {p.number != null ? `${p.number} ` : ''}{p.name}
                  </Chip>
                ))}
              </View>
            ) : (
              <Paragraph style={styles.help}>Add players to your squad first.</Paragraph>
            )}

            <Text style={styles.label}>Voting closes after</Text>
            <View style={styles.chips}>
              {VOTING_LENGTHS.map((v) => (
                <Chip key={v.hours} selected={hours === v.hours} onPress={() => setHours(v.hours)} style={styles.chip}>
                  {v.label}
                </Chip>
              ))}
            </View>

            {createError ? <Text style={styles.errorText}>{createError}</Text> : null}

            <View style={styles.buttons}>
              <Button mode="outlined" onPress={() => setCreating(false)} style={styles.button}>Cancel</Button>
              <Button mode="contained" onPress={openVote} loading={saving} disabled={saving} buttonColor={COLORS.primary} textColor={COLORS.background} style={styles.button}>
                Open vote
              </Button>
            </View>
          </ScrollView>
        </Modal>

        <Modal visible={!!detailSummary} onDismiss={() => setDetailSummary(null)} contentContainerStyle={styles.modal}>
          {detailSummary ? (
            <ScrollView>
              <Title style={styles.modalTitle}>vs {detailSummary.opponent ?? 'Unknown match'}</Title>
              <Paragraph style={styles.meta}>{statusLine(detailSummary)}</Paragraph>

              {!detail && !detailError ? <ActivityIndicator style={styles.spinner} color={COLORS.primary} /> : null}

              {detail ? (
                <View>
                  <Text style={styles.label}>Votes ({detail.totalVotes ?? 0})</Text>
                  {detail.nominees.map((n) => {
                    const count = detail.results?.find((r) => r.player_id === n.playerId)?.vote_count ?? 0;
                    const share = detail.totalVotes ? count / detail.totalVotes : 0;
                    return (
                      <View key={n.playerId} style={styles.tallyRow}>
                        <View style={styles.tallyText}>
                          <Text>{n.number != null ? `${n.number}  ` : ''}{n.name}</Text>
                          <Text style={styles.tallyCount}>{count}</Text>
                        </View>
                        <View style={styles.bar}>
                          <View style={[styles.barFill, { width: `${Math.round(share * 100)}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {detailError ? <Text style={styles.errorText}>{detailError}</Text> : null}

              <View style={styles.buttons}>
                <Button onPress={() => setDetailSummary(null)} style={styles.button}>Done</Button>
                {detailSummary.status === 'draft' ? (
                  <Button mode="contained" onPress={() => activateDraft(detailSummary)} loading={busy} disabled={busy} style={styles.button}>
                    Open vote
                  </Button>
                ) : null}
                {detailSummary.status === 'active' ? (
                  <Button mode="contained" buttonColor={COLORS.error} onPress={() => closeVote(detailSummary)} loading={busy} disabled={busy} style={styles.button}>
                    Close & announce
                  </Button>
                ) : null}
              </View>
            </ScrollView>
          ) : null}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  card: { marginBottom: 10, borderRadius: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  meta: { fontSize: 13, opacity: 0.7 },
  status: { fontSize: 14, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  emptyText: { color: COLORS.textLight, textAlign: 'center' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: COLORS.primary },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  label: { fontWeight: 'bold', marginTop: 16, marginBottom: 6 },
  help: { opacity: 0.7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { margin: 4 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 20 },
  button: { marginLeft: 8, marginTop: 8 },
  errorText: { color: COLORS.error, marginTop: 12 },
  spinner: { marginVertical: 20 },
  tallyRow: { marginVertical: 6 },
  tallyText: { flexDirection: 'row', justifyContent: 'space-between' },
  tallyCount: { fontWeight: 'bold' },
  bar: { height: 6, backgroundColor: '#eee', borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: COLORS.primary },
});
