import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config';
import { useClubName } from '../context/ClubContext';
import { apiErrorMessage, consentApi, type PlayerConsent } from '../services/api';
import { consentSummary } from '../utils/consent';

type Field = 'photos' | 'video';

/**
 * Photo and video consent. Parents answer for their own children; staff see
 * the whole squad and can record an answer from a paper form. Without a yes,
 * a child's photo is never used publicly and staff are warned about video.
 */
export default function MediaConsentScreen() {
  const clubName = useClubName();
  const [players, setPlayers] = useState<PlayerConsent[]>([]);
  const [staff, setStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await consentApi.get();
      setPlayers(res.data.players);
      setStaff(res.data.canEditAll);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't load this. Check your signal and try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const answer = async (player: PlayerConsent, field: Field, value: boolean) => {
    setSaving(`${player.playerId}:${field}`);
    setError('');
    try {
      const res = await consentApi.set(player.playerId, { [field]: value });
      setPlayers((list) => list.map((p) => (p.playerId === player.playerId ? res.data : p)));
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const summary = consentSummary(players);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
    >
      <Text style={styles.intro}>
        {staff
          ? 'Who can appear in photos and videos the club shares publicly. Parents answer in the app; you can also record an answer from a paper form.'
          : `Can ${clubName} use your child's photo and video? This covers social media posts, the club website and match highlight videos.`}
      </Text>
      <Text style={styles.small}>
        Without a yes, their photo is never shown publicly and the manager is warned before sharing video of them. You can change this at any time.
      </Text>
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

      {staff && players.length ? (
        <View style={styles.summary}>
          <SummaryItem label="Photos: yes" value={`${summary.photosYes}/${players.length}`} />
          <SummaryItem label="Video: yes" value={`${summary.videoYes}/${players.length}`} />
          <SummaryItem label="Not answered" value={String(summary.notAnswered)} warn={summary.notAnswered > 0} />
        </View>
      ) : null}

      {!players.length ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="account-child-outline" size={40} color={COLORS.textLight} />
          <Text style={styles.emptyText}>
            {staff ? 'Add players in Manage Squad first.' : "Your account isn't linked to a player yet. Ask the manager to link you to your child."}
          </Text>
        </View>
      ) : players.map((p) => (
        <View key={p.playerId} style={styles.card}>
          <Text style={styles.name}>{p.number !== null ? `${p.number}. ` : ''}{p.name}</Text>
          <Question label="Photos" value={p.photos} busy={saving === `${p.playerId}:photos`} onAnswer={(v) => answer(p, 'photos', v)} />
          <Question label="Video (live stream and highlights)" value={p.video} busy={saving === `${p.playerId}:video`} onAnswer={(v) => answer(p, 'video', v)} />
          {staff && p.source ? (
            <Text style={styles.small}>{p.source === 'parent' ? 'Answered by a parent in the app' : 'Recorded by club staff'}</Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

function Question({ label, value, busy, onAnswer }: { label: string; value: boolean | null; busy: boolean; onAnswer: (v: boolean) => void }) {
  return (
    <View style={styles.question}>
      <Text style={styles.questionLabel}>{label}</Text>
      <View style={styles.choices}>
        <Choice text="Yes" selected={value === true} onPress={() => onAnswer(true)} disabled={busy} />
        <Choice text="No" selected={value === false} onPress={() => onAnswer(false)} disabled={busy} danger />
      </View>
      {value === null ? <Text style={styles.notAsked}>Not answered yet</Text> : null}
    </View>
  );
}

function Choice({ text, selected, onPress, disabled, danger }: { text: string; selected: boolean; onPress: () => void; disabled: boolean; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || selected}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      style={[styles.choice, selected ? (danger ? styles.choiceNo : styles.choiceYes) : null]}
    >
      <Text style={[styles.choiceText, selected ? styles.choiceTextSelected : null]}>{text}</Text>
    </Pressable>
  );
}

function SummaryItem({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, warn ? styles.warn : null]}>{value}</Text>
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  intro: { color: COLORS.text, fontSize: 15, lineHeight: 21 },
  small: { color: COLORS.textLight, fontSize: 13 },
  error: { color: COLORS.error },
  summary: { flexDirection: 'row', gap: 8 },
  summaryItem: { flex: 1, backgroundColor: '#14181C', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryValue: { color: COLORS.text, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  warn: { color: '#F5C400' },
  card: { backgroundColor: '#14181C', borderRadius: 12, padding: 14, gap: 10 },
  name: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  question: { gap: 6 },
  questionLabel: { color: COLORS.textLight, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, borderWidth: 1, borderColor: COLORS.textLight, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  choiceYes: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  choiceNo: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  choiceText: { color: COLORS.text, fontWeight: '800' },
  choiceTextSelected: { color: COLORS.background },
  notAsked: { color: '#F5C400', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  emptyText: { color: COLORS.textLight, textAlign: 'center' },
});
