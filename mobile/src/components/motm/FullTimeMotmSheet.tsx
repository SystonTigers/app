import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Chip, Modal, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, motmApi } from '../../services/api';
import { customHours, lengthText } from '../../utils/motmVote';
import { shirtNumber } from '../../utils/playerNames';

const LENGTHS = [2, 3, 4];
const DEFAULT_HOURS = 3;
const MAX_NOMINEES = 40;

interface SquadPlayer { id: string; name: string; number: number | null }

/**
 * Pops up on the manager's phone at full time: everyone who played is ticked
 * (or the whole squad if there was no line-up). Untick anyone who didn't
 * play, choose how long voting lasts and open it; everyone at the club is
 * told straight away.
 */
export default function FullTimeMotmSheet({ matchId, opponent, players, visible, onClose, onOpened }: {
  matchId: string | null;
  opponent: string;
  players: SquadPlayer[];
  visible: boolean;
  onClose: () => void;
  onOpened: (message: string) => void;
}) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [fromLineup, setFromLineup] = useState(false);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<'hours' | 'days'>('hours');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !matchId) return;
    setError('');
    setCustom(false);
    setHours(DEFAULT_HOURS);
    setLoading(true);
    motmApi.getVote(matchId)
      .then((res) => {
        const suggested = res.data.suggested ?? [];
        const already = res.data.nominees.map((n) => n.playerId);
        const start = already.length ? already : suggested.length ? suggested : players.map((p) => p.id);
        setFromLineup(!already.length && suggested.length > 0);
        setTicked(new Set(start.slice(0, MAX_NOMINEES)));
      })
      .catch(() => setTicked(new Set(players.slice(0, MAX_NOMINEES).map((p) => p.id))))
      .finally(() => setLoading(false));
  }, [visible, matchId, players]);

  const toggle = (id: string) => setTicked((set) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else if (next.size < MAX_NOMINEES) next.add(id);
    return next;
  });

  const length = custom ? customHours(amount, unit) : hours;
  const closes = length ? new Date(Date.now() + length * 3600_000) : null;

  const open = async () => {
    if (!matchId) return;
    if (ticked.size < 2) return setError('Tick at least 2 players.');
    if (!length || !closes) return setError('Choose how long voting stays open (1 hour to 3 days).');
    setSaving(true);
    setError('');
    try {
      await motmApi.openVoting(matchId, { nominees: [...ticked], votingWindow: { end: closes.toISOString() }, status: 'active' });
      onOpened(`Man of the Match voting is open for ${lengthText(length)}. Everyone at the club has been told.`);
    } catch (err) {
      setError(apiErrorMessage(err, "Voting didn't open. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  // Players who played first, then the rest of the squad
  const sorted = [...players].sort((a, b) => Number(ticked.has(b.id)) - Number(ticked.has(a.id)) || a.name.localeCompare(b.name));

  return (
    <Portal>
      <Modal visible={visible} onDismiss={saving ? undefined : onClose} contentContainerStyle={styles.modal}>
        <View style={styles.head}>
          <MaterialCommunityIcons name="star-circle" size={28} color={COLORS.primary} />
          <View style={styles.flex}>
            <Text style={styles.title}>Man of the Match</Text>
            <Text style={styles.small}>v {opponent}</Text>
          </View>
        </View>
        <Text style={styles.help}>
          {fromLineup ? 'Everyone who played is ticked. ' : 'The whole squad is ticked. '}
          Untick anyone who didn&apos;t play, then open voting. Everyone at the club gets a notification to vote.
        </Text>
        {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loading} /> : (
          <>
            <View style={styles.tools}>
              <Text style={styles.count}>{ticked.size} nominated</Text>
              <Pressable onPress={() => setTicked(new Set(players.slice(0, MAX_NOMINEES).map((p) => p.id)))} accessibilityRole="button"><Text style={[styles.link, { color: COLORS.primary }]}>All</Text></Pressable>
              <Pressable onPress={() => setTicked(new Set())} accessibilityRole="button"><Text style={[styles.link, { color: COLORS.primary }]}>None</Text></Pressable>
            </View>
            <ScrollView style={styles.list}>
              {sorted.map((p) => {
                const on = ticked.has(p.id);
                return (
                  <Pressable key={p.id} onPress={() => toggle(p.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.row}>
                    <MaterialCommunityIcons name={on ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={on ? COLORS.primary : COLORS.textLight} />
                    <Text style={[styles.name, !on && { color: COLORS.textLight }]}>{p.name}</Text>
                    {shirtNumber(p.number) ? <Text style={styles.small}>#{shirtNumber(p.number)}</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
        <Text style={styles.label}>Voting closes after</Text>
        <View style={styles.chips}>
          {LENGTHS.map((h) => (
            <Chip key={h} selected={!custom && hours === h} onPress={() => { setCustom(false); setHours(h); }} style={styles.chip}>{h} hours</Chip>
          ))}
          <Chip selected={custom} onPress={() => setCustom(true)} style={styles.chip} icon="pencil">Custom</Chip>
        </View>
        {custom ? (
          <View style={styles.customRow}>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" mode="outlined" label="How long" accessibilityLabel="How long" style={styles.amount} />
            <Chip selected={unit === 'hours'} onPress={() => setUnit('hours')} style={styles.chip}>hours</Chip>
            <Chip selected={unit === 'days'} onPress={() => setUnit('days')} style={styles.chip}>days</Chip>
          </View>
        ) : null}
        <Text style={styles.small}>
          {closes ? `Closes ${closes.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}. Up to 3 days.` : 'Enter 1 hour to 3 days.'}
        </Text>
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.buttons}>
          <Button mode="outlined" onPress={onClose} disabled={saving} style={styles.flex}>Later</Button>
          <Button mode="contained" onPress={open} loading={saving} disabled={saving || loading} style={styles.flex}>Open voting</Button>
        </View>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.primary, margin: 14, borderRadius: 20, padding: 18, maxHeight: '94%', maxWidth: 560, alignSelf: 'center', width: '95%' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  flex: { flex: 1 },
  title: { fontFamily: FONTS.display, fontSize: 26, letterSpacing: 1, textTransform: 'uppercase', color: c.text },
  help: { color: c.textLight, fontSize: 13, lineHeight: 18 },
  small: { color: c.textLight, fontSize: 12 },
  loading: { marginVertical: 20 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10, marginBottom: 4 },
  count: { color: c.text, fontWeight: '800', flex: 1 },
  link: { fontWeight: '800' },
  list: { maxHeight: 300 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  name: { color: c.text, fontWeight: '700', flex: 1 },
  label: { color: c.text, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { borderRadius: 999 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  amount: { width: 110 },
  error: { color: c.error, marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 12 },
}));
