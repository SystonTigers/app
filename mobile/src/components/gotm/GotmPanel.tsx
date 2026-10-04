import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { Button, Portal, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ClipPlayer from '../highlights/ClipPlayer';
import SectionTitle from '../home/SectionTitle';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { withOpacity } from '../../theme/utils';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, gotmApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isStaffRole } from '../../utils/roles';
import { goalLine, totalVotes, votesText, watchable, winnerNames, type GotmCandidate, type GotmData } from '../../utils/gotm';

/**
 * Goal of the Month: watch the nominated goals, vote once, and see past
 * winners. Staff start and close votes on the website (Admin → Goal of the
 * Month); they also see the counts while voting is open.
 */
export default function GotmPanel() {
  const c = useBrandColors();
  const styles = useStyles();
  const { user } = useAuth();
  const staff = isStaffRole(user?.role);
  const [data, setData] = useState<GotmData | null>(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const [voting, setVoting] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await gotmApi.get());
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't load Goal of the Month. Check your signal and try again."));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const castVote = async (votingId: string, candidate: GotmCandidate) => {
    setVoting(candidate.id);
    try {
      setData(await gotmApi.castVote(votingId, candidate.id));
      setMessage(`Vote saved for ${candidate.playerName}'s goal.`);
    } catch (err) {
      setMessage(apiErrorMessage(err, "Your vote didn't save. Please try again."));
      void load();
    } finally {
      setVoting(null);
    }
  };

  const watch = (candidate: GotmCandidate) => {
    const how = watchable(candidate);
    if (how === 'clip' && candidate.clip) {
      if (!candidate.clip.embeddable) void Linking.openURL(candidate.clip.watchUrl);
      else setPlaying((p) => (p === candidate.id ? null : candidate.id));
    } else if (how === 'link' && candidate.videoUrl) {
      void Linking.openURL(candidate.videoUrl);
    }
  };

  if (error) {
    return (
      <View style={styles.state}>
        <MaterialCommunityIcons name="wifi-off" size={40} color={c.textLight} />
        <Text style={styles.stateText} accessibilityRole="alert">{error}</Text>
        <Button mode="contained" onPress={load}>Try again</Button>
      </View>
    );
  }
  if (!data) return <View style={styles.state}><ActivityIndicator color={c.primary} size="large" /></View>;

  const { vote, past } = data;
  const total = vote ? totalVotes(vote) : null;

  return (
    <View style={styles.wrap}>
      {vote ? (
        <>
          <View style={[styles.hero, { borderColor: withOpacity(c.primary, 0.5) }]}>
            <MaterialCommunityIcons name="trophy" size={28} color={c.primary} />
            <Text style={styles.eyebrow}>GOAL OF THE MONTH</Text>
            <Text style={styles.month}>{vote.label.toUpperCase()}</Text>
            <Text style={styles.heroText}>
              {vote.myVote
                ? 'Thanks for voting. The winner is announced when voting closes.'
                : 'Watch the goals, then vote for your favourite. One vote each.'}
            </Text>
            {staff && total !== null ? <Text style={[styles.heroCount, { color: c.primary }]}>{votesText(total)} so far (only staff see this)</Text> : null}
          </View>

          {vote.candidates.map((cand) => {
            const mine = vote.myVote === cand.id;
            const how = watchable(cand);
            const line = goalLine(cand);
            return (
              <View key={cand.id} style={[styles.card, mine ? { borderColor: c.primary } : null]}>
                {playing === cand.id && cand.clip ? (
                  <View style={styles.player}>
                    <ClipPlayer videoId={cand.clip.videoId} clip={{ start: cand.clip.start, end: cand.clip.end }} onEnded={() => setPlaying(null)} />
                  </View>
                ) : null}
                <View style={styles.cardTop}>
                  <View style={styles.flex}>
                    <Text style={styles.name}>{cand.playerName.toUpperCase()}</Text>
                    {line ? <Text style={styles.line}>{line}</Text> : null}
                    {cand.description ? <Text style={styles.desc}>{cand.description}</Text> : null}
                  </View>
                  {cand.votes !== null ? (
                    <View style={styles.count} accessible accessibilityLabel={votesText(cand.votes)}>
                      <Text style={[styles.countNum, { color: c.primary }]}>{cand.votes}</Text>
                      <Text style={styles.countLabel}>{cand.votes === 1 ? 'VOTE' : 'VOTES'}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  {how ? (
                    <Button
                      mode="outlined"
                      icon={how === 'clip' ? (playing === cand.id ? 'stop' : 'play') : 'open-in-new'}
                      onPress={() => watch(cand)}
                      accessibilityLabel={`Watch ${cand.playerName}'s goal`}
                    >
                      {playing === cand.id ? 'Stop' : 'Watch'}
                    </Button>
                  ) : null}
                  {mine ? (
                    <View style={[styles.mine, { backgroundColor: withOpacity(c.primary, 0.15) }]}>
                      <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} />
                      <Text style={[styles.mineText, { color: c.primary }]}>Your vote</Text>
                    </View>
                  ) : !vote.myVote ? (
                    <Button
                      mode="contained"
                      icon="vote"
                      loading={voting === cand.id}
                      disabled={!!voting}
                      onPress={() => castVote(vote.id, cand)}
                      accessibilityLabel={`Vote for ${cand.playerName}'s goal`}
                    >
                      Vote
                    </Button>
                  ) : null}
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <View style={styles.state}>
          <MaterialCommunityIcons name="trophy-outline" size={44} color={c.textLight} />
          <Text style={styles.stateText}>No Goal of the Month vote is open right now.</Text>
          <Text style={styles.hint}>
            {staff
              ? 'Start one on the website: Admin → Goal of the Month. Pick goals from the month and everyone at the club can vote.'
              : "When the club opens a vote, the month's best goals will be here to watch and vote on."}
          </Text>
        </View>
      )}

      {past.length ? (
        <View style={styles.past}>
          <SectionTitle title="PAST WINNERS" color={c.primary} />
          {past.map((v) => {
            const winners = v.candidates.filter((x) => v.winners.includes(x.id));
            const first = winners[0];
            const line = winners.length === 1 && first ? goalLine(first) : '';
            return (
              <View
                key={v.id}
                style={styles.pastRow}
                accessible
                accessibilityLabel={`${v.label}: ${winnerNames(v)}${first?.votes ? `, ${votesText(first.votes)}` : ''}`}
              >
                <View style={[styles.medal, { backgroundColor: withOpacity(c.primary, 0.16) }]}>
                  <MaterialCommunityIcons name="trophy" size={20} color={c.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.pastMonth}>{v.label}</Text>
                  <Text style={styles.pastName}>{winnerNames(v)}</Text>
                  {line ? <Text style={styles.line}>{line}</Text> : null}
                </View>
                {first?.votes ? <Text style={styles.pastVotes}>{votesText(first.votes)}</Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <Portal>
        <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3500}>{message}</Snackbar>
      </Portal>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  wrap: { padding: 16, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' },
  state: { alignItems: 'center', gap: 12, padding: 32 },
  stateText: { color: c.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  hint: { color: c.textLight, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  hero: { alignItems: 'center', padding: 18, borderRadius: 18, borderWidth: 1, backgroundColor: c.surface, gap: 4 },
  eyebrow: { color: c.textLight, fontSize: 12, fontWeight: '900', letterSpacing: 1.6, marginTop: 4 },
  month: { color: c.text, fontFamily: FONTS.display, fontSize: 32, lineHeight: 34, letterSpacing: 0.5 },
  heroText: { color: c.textLight, fontSize: 14, textAlign: 'center', marginTop: 4, lineHeight: 20 },
  heroCount: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: 12 },
  player: { borderRadius: 12, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
  name: { color: c.text, fontFamily: FONTS.display, fontSize: 22, lineHeight: 24 },
  line: { color: c.textLight, fontSize: 13, marginTop: 3 },
  desc: { color: c.text, fontSize: 14, marginTop: 6, lineHeight: 20 },
  count: { alignItems: 'center', minWidth: 48 },
  countNum: { fontFamily: FONTS.display, fontSize: 28, lineHeight: 30 },
  countLabel: { color: c.textLight, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  mine: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  mineText: { fontWeight: '800' },
  past: { marginTop: 12 },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  medal: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pastMonth: { color: c.textLight, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  pastName: { color: c.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
  pastVotes: { color: c.textLight, fontSize: 13 },
}));
