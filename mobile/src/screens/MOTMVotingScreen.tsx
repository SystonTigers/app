import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/ui/Card';
import { COLORS } from '../config';
import { apiErrorMessage, motmApi, type MotmVote } from '../services/api';

/** "Sat 27 Sep" */
function shortDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Sat 27 Sep, 18:00" */
function closingTime(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${shortDate(value)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function scoreLine(vote: MotmVote): string {
  const m = vote.match;
  if (!m) return 'Man of the Match';
  const score = m.ourScore != null && m.theirScore != null ? ` (${m.ourScore}-${m.theirScore})` : '';
  return `vs ${m.opponent}${score}`;
}

/**
 * Parents and players vote for Man of the Match after a game, and see the
 * latest winners. Managers open votes from "Manage MOTM".
 */
export default function MOTMVotingScreen() {
  const [open, setOpen] = useState<MotmVote[]>([]);
  const [recent, setRecent] = useState<MotmVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ matchId: string; text: string; error: boolean } | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await motmApi.listOpen();
      setOpen(res.data.open);
      setRecent(res.data.recent);
      setLoadError('');
    } catch (err) {
      setLoadError(apiErrorMessage(err, "We couldn't load Man of the Match. Pull down to try again."));
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

  const vote = async (matchId: string, playerId: string, name: string) => {
    setSaving(`${matchId}:${playerId}`);
    setMessage(null);
    try {
      await motmApi.castVote(matchId, playerId);
      setOpen((votes) => votes.map((v) => (v.matchId === matchId ? { ...v, userVote: playerId } : v)));
      setMessage({ matchId, text: `You voted for ${name}. You can change your vote until voting closes.`, error: false });
    } catch (err) {
      setMessage({ matchId, text: apiErrorMessage(err, "Your vote didn't go through. Please try again."), error: true });
      load();
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
    >
      {loadError ? <Text style={styles.errorText} accessibilityRole="alert">{loadError}</Text> : null}

      {open.map((v) => (
        <Card key={v.matchId} inset style={styles.card}>
          <Text style={styles.kicker}>VOTE NOW</Text>
          <Text style={styles.title}>{scoreLine(v)}</Text>
          <Text style={styles.meta}>
            {shortDate(v.match?.date)}{v.closesAt ? ` · Voting closes ${closingTime(v.closesAt)}` : ''}
          </Text>

          {v.nominees.map((n) => {
            const chosen = v.userVote === n.playerId;
            const busy = saving === `${v.matchId}:${n.playerId}`;
            return (
              <Pressable
                key={n.playerId}
                onPress={() => vote(v.matchId, n.playerId, n.name)}
                disabled={saving !== null}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen, disabled: saving !== null }}
                accessibilityLabel={`Vote for ${n.name}`}
                style={({ pressed }) => [styles.nominee, chosen && styles.nomineeChosen, pressed && styles.nomineePressed]}
              >
                <Text style={styles.number}>{n.number ?? ''}</Text>
                <Text style={[styles.nomineeName, chosen && styles.nomineeNameChosen]}>{n.name}</Text>
                {busy ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <MaterialCommunityIcons
                    name={chosen ? 'check-circle' : 'circle-outline'}
                    size={22}
                    color={chosen ? COLORS.primary : COLORS.textLight}
                  />
                )}
              </Pressable>
            );
          })}

          {message?.matchId === v.matchId ? (
            <Text style={message.error ? styles.errorText : styles.okText} accessibilityRole={message.error ? 'alert' : undefined}>
              {message.text}
            </Text>
          ) : (
            <Text style={styles.hint}>
              {v.userVote ? 'Tap another player to change your vote.' : 'Tap a player to vote. Results are shown when voting closes.'}
            </Text>
          )}
        </Card>
      ))}

      {open.length === 0 && !loadError ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="star-circle-outline" size={56} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No vote open right now</Text>
          <Text style={styles.emptyText}>Your manager opens the Man of the Match vote after the final whistle.</Text>
        </View>
      ) : null}

      {recent.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Recent winners</Text>
          {recent.map((v) => (
            <Card key={v.matchId} inset style={styles.card}>
              <View style={styles.winnerRow}>
                <MaterialCommunityIcons name="star" size={28} color={COLORS.warning} />
                <View style={styles.winnerText}>
                  <Text style={styles.winnerName}>{v.winners.map((w) => w.name).join(' & ')}</Text>
                  <Text style={styles.meta}>{scoreLine(v)} · {shortDate(v.match?.date)}</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { justifyContent: 'center', alignItems: 'center' },
  card: { marginBottom: 16 },
  kicker: { color: COLORS.primary, fontWeight: '900', fontSize: 12, letterSpacing: 1, marginBottom: 4 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' },
  meta: { color: COLORS.textLight, fontSize: 13, marginTop: 4 },
  nominee: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192,192,192,0.25)',
  },
  nomineeChosen: { borderColor: COLORS.primary, backgroundColor: 'rgba(0,255,255,0.08)' },
  nomineePressed: { opacity: 0.7 },
  number: { color: COLORS.textLight, width: 32, fontWeight: '700', fontSize: 16 },
  nomineeName: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '600' },
  nomineeNameChosen: { color: COLORS.primary },
  hint: { color: COLORS.textLight, fontSize: 13, marginTop: 12 },
  okText: { color: COLORS.primary, fontSize: 14, marginTop: 12 },
  errorText: { color: COLORS.error, fontSize: 14, marginTop: 12, marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: 'bold', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptyText: { color: COLORS.textLight, fontSize: 14, textAlign: 'center' },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '900', textTransform: 'uppercase', marginTop: 8, marginBottom: 12 },
  winnerRow: { flexDirection: 'row', alignItems: 'center' },
  winnerText: { marginLeft: 12, flex: 1 },
  winnerName: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
});
