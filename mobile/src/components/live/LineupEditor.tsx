import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Checkbox, Chip, Modal, Portal } from 'react-native-paper';
import { COLORS } from '../../config';
import { apiErrorMessage, lineupApi, type Lineup } from '../../services/api';
import type { PickablePlayer } from './PlayerPicker';

const TEAM_SIZES = [5, 7, 9, 11];
const MAX_SUBS = 12;
type Role = 'starter' | 'sub';

/**
 * Pick the team for a match: team size, starting players and subs. Tapping a
 * player cycles them: starting → sub → not playing.
 */
export default function LineupEditor({ visible, fixtureId, opponent, players, onClose, onSaved }: {
  visible: boolean;
  fixtureId: string | null;
  opponent: string;
  players: PickablePlayer[];
  onClose: () => void;
  onSaved: (lineup: Lineup, publish: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [teamSize, setTeamSize] = useState(11);
  const [clubDefault, setClubDefault] = useState(11);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [rememberSize, setRememberSize] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !fixtureId) return;
    setLoading(true);
    setError('');
    lineupApi.get(fixtureId)
      .then((res) => {
        setTeamSize(res.data.teamSize);
        setClubDefault(res.data.clubDefaultTeamSize);
        const r: Record<string, Role> = {};
        res.data.starters.forEach((p) => { r[p.playerId] = 'starter'; });
        res.data.subs.forEach((p) => { r[p.playerId] = 'sub'; });
        setRoles(r);
        setOrder([...res.data.starters, ...res.data.subs].map((p) => p.playerId));
      })
      .catch((err) => setError(apiErrorMessage(err, "We couldn't load the team.")))
      .finally(() => setLoading(false));
  }, [visible, fixtureId]);

  const starters = order.filter((id) => roles[id] === 'starter');
  const subs = order.filter((id) => roles[id] === 'sub');

  const cycle = (id: string) => {
    setError('');
    const current = roles[id];
    const next: Role | undefined = !current ? (starters.length < teamSize ? 'starter' : 'sub') : current === 'starter' ? 'sub' : undefined;
    if (next === 'sub' && subs.length >= MAX_SUBS && current !== 'sub') {
      setError(`Up to ${MAX_SUBS} subs.`);
      return;
    }
    setRoles((r) => {
      const copy = { ...r };
      if (next) copy[id] = next; else delete copy[id];
      return copy;
    });
    // Keep the order players were picked in (it's the order on the team sheet)
    setOrder((o) => (next && !o.includes(id) ? [...o, id] : next ? o : o.filter((x) => x !== id)));
  };

  const save = async (publish: boolean) => {
    if (!fixtureId) return;
    if (starters.length !== teamSize) {
      setError(`Pick ${teamSize} starting players (you've picked ${starters.length}).`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await lineupApi.save(fixtureId, { teamSize, starters, subs, makeClubDefault: rememberSize && teamSize !== clubDefault });
      onSaved(res.data, publish);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't save the team. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const label = (id: string) => {
    const p = players.find((x) => x.id === id);
    return p ? `${p.number ?? ''} ${p.name}`.trim() : 'Unknown';
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <Text style={styles.title}>Team v {opponent}</Text>
        {loading ? <ActivityIndicator color={COLORS.primary} style={styles.spinner} /> : (
          <ScrollView style={styles.scroll}>
            <Text style={styles.label}>Players a side</Text>
            <View style={styles.chips}>
              {TEAM_SIZES.map((n) => (
                <Chip key={n} selected={teamSize === n} onPress={() => setTeamSize(n)} style={styles.chip}>{n}-a-side</Chip>
              ))}
            </View>
            {teamSize !== clubDefault ? (
              <Pressable onPress={() => setRememberSize(!rememberSize)} style={styles.remember} accessibilityRole="checkbox" accessibilityState={{ checked: rememberSize }}>
                <Checkbox status={rememberSize ? 'checked' : 'unchecked'} color={COLORS.primary} />
                <Text style={styles.help}>Use {teamSize}-a-side for future matches</Text>
              </Pressable>
            ) : null}

            <Text style={styles.label}>Starting ({starters.length}/{teamSize}) · Subs ({subs.length})</Text>
            <Text style={styles.help}>Tap a player: starting → sub → not playing.</Text>
            {players.map((p) => {
              const role = roles[p.id];
              return (
                <Pressable key={p.id} onPress={() => cycle(p.id)} accessibilityRole="button" accessibilityLabel={`${p.name}: ${role === 'starter' ? 'starting' : role === 'sub' ? 'sub' : 'not playing'}`}
                  style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
                  <Text style={styles.number}>{p.number ?? ''}</Text>
                  <Text style={[styles.name, !role ? styles.dim : null]}>{p.name}</Text>
                  <Text style={[styles.badge, role === 'starter' ? styles.badgeStart : role === 'sub' ? styles.badgeSub : styles.badgeOut]}>
                    {role === 'starter' ? 'Starting' : role === 'sub' ? 'Sub' : '–'}
                  </Text>
                </Pressable>
              );
            })}
            {subs.length ? <Text style={styles.help}>Bench: {subs.map(label).join(', ')}</Text> : null}
          </ScrollView>
        )}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.link}><Text style={styles.linkText}>Cancel</Text></Pressable>
          <Pressable onPress={() => save(false)} disabled={saving} accessibilityRole="button" style={styles.secondary}><Text style={styles.secondaryText}>Save</Text></Pressable>
          <Pressable onPress={() => save(true)} disabled={saving} accessibilityRole="button" style={styles.primary}>
            <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save and post team news'}</Text>
          </Pressable>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: '#14181C', margin: 12, borderRadius: 12, padding: 16, maxHeight: '92%' },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' },
  spinner: { marginVertical: 24 },
  scroll: { flexGrow: 0 },
  label: { color: COLORS.text, fontWeight: '800', marginTop: 16, marginBottom: 6, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  help: { color: COLORS.textLight, fontSize: 13, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { margin: 4 },
  remember: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(192,192,192,0.25)' },
  pressed: { backgroundColor: 'rgba(0,255,255,0.08)' },
  number: { width: 36, color: COLORS.textLight, fontWeight: '800' },
  name: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '600' },
  dim: { color: COLORS.textLight },
  badge: { minWidth: 72, textAlign: 'center', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, fontWeight: '800', fontSize: 12, overflow: 'hidden' },
  badgeStart: { backgroundColor: COLORS.primary, color: COLORS.background },
  badgeSub: { borderWidth: 1, borderColor: COLORS.primary, color: COLORS.primary },
  badgeOut: { color: COLORS.textLight },
  error: { color: COLORS.error, marginTop: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  link: { padding: 10 },
  linkText: { color: COLORS.textLight, fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  secondaryText: { color: COLORS.primary, fontWeight: '800' },
  primary: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  primaryText: { color: COLORS.background, fontWeight: '900' },
});
