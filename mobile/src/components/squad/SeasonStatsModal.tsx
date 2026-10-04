import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button, Modal, Portal, TextInput } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, playerStatsApi, type PlayerSeasonStats, type StatNumbers } from '../../services/api';
import SeasonPicker from '../seasons/SeasonPicker';
import { useTracksAssists } from '../../context/ClubContext';

const FIELDS: Array<{ key: keyof StatNumbers; label: string }> = [
  { key: 'appearances', label: 'Apps' },
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'yellowCards', label: '🟨 Yellow' },
  { key: 'redCards', label: '🟥 Red' },
  { key: 'motm', label: 'MOTM' },
];

type Form = Record<keyof StatNumbers, string>;
const EMPTY: Form = { appearances: '', goals: '', assists: '', yellowCards: '', redCards: '', motm: '' };

function toForm(n: StatNumbers | null): Form {
  if (!n) return EMPTY;
  const out = { ...EMPTY };
  for (const f of FIELDS) out[f.key] = n[f.key] ? String(n[f.key]) : '';
  return out;
}

/** Turns the form into numbers, or a message if any box isn't a whole number. */
function toNumbers(form: Form): StatNumbers | string {
  const out = {} as StatNumbers;
  for (const f of FIELDS) {
    const v = form[f.key].trim();
    if (v && !/^\d{1,3}$/.test(v)) return `${f.label.replace(/^\S+ /, '')} must be a whole number.`;
    out[f.key] = v ? Number(v) : 0;
  }
  return out;
}

/**
 * Staff: enter a player's numbers for a season by hand (past seasons, or games
 * not run through Match Centre). They're added on top of Match Centre's.
 */
export default function SeasonStatsModal({ player, onClose, onSaved }: {
  player: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  // Clubs that don't record assists don't see the field (any number already saved is kept)
  const withAssists = useTracksAssists();
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [season, setSeason] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<PlayerSeasonStats[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    setSeason(null);
    setError('');
    setLoading(true);
    playerStatsApi.seasons(player.id)
      .then(setSeasons)
      .catch((err) => setError(apiErrorMessage(err, "This player's stats couldn't load.")))
      .finally(() => setLoading(false));
  }, [player]);

  useEffect(() => {
    setForm(toForm(seasons.find((s) => s.id === season)?.entered ?? null));
  }, [season, seasons]);

  const save = async () => {
    if (!player || !season) return;
    const numbers = toNumbers(form);
    if (typeof numbers === 'string') return setError(numbers);
    setSaving(true);
    setError('');
    try {
      const res = await playerStatsApi.set(player.id, season, numbers);
      setSeasons((list) => list.map((s) => (s.id === season ? { ...s, entered: res.entered } : s)));
      const label = seasons.find((s) => s.id === season)?.label ?? 'that season';
      onSaved(res.entered ? `${player.name}'s ${label} stats saved.` : `${player.name}'s ${label} stats cleared.`);
    } catch (err) {
      setError(apiErrorMessage(err, "The stats didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={!!player} onDismiss={saving ? undefined : onClose} contentContainerStyle={styles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{player?.name ?? ''}: season stats</Text>
          <Text style={styles.help}>
            For past seasons, or games that weren&apos;t run through Match Centre. These numbers are added on top of what Match Centre records, so don&apos;t enter the same games twice.
          </Text>
          {player ? <SeasonPicker value={season} onChange={(id) => setSeason(id)} allowAll={false} /> : null}
          {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loading} /> : (
            <View style={styles.grid}>
              {FIELDS.filter((f) => withAssists || f.key !== 'assists').map((f) => (
                <TextInput
                  key={f.key}
                  label={f.label}
                  accessibilityLabel={f.label}
                  value={form[f.key]}
                  placeholder="0"
                  onChangeText={(v) => setForm((x) => ({ ...x, [f.key]: v }))}
                  keyboardType="number-pad"
                  maxLength={3}
                  mode="outlined"
                  style={styles.cell}
                />
              ))}
            </View>
          )}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <View style={styles.buttons}>
            <Button mode="outlined" onPress={onClose} disabled={saving} style={styles.button}>Close</Button>
            <Button mode="contained" onPress={save} loading={saving} disabled={saving || !season || loading} style={styles.button}>Save</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, margin: 20, borderRadius: 18, padding: 20, maxHeight: '90%', maxWidth: 560, alignSelf: 'center', width: '92%' },
  title: { fontFamily: FONTS.display, fontSize: 22, letterSpacing: 1, textTransform: 'uppercase', color: c.text, marginBottom: 6 },
  help: { color: c.textLight, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  loading: { marginVertical: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 },
  cell: { width: '30%', minWidth: 90, flexGrow: 1 },
  error: { color: c.error, marginBottom: 10 },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1 },
}));
