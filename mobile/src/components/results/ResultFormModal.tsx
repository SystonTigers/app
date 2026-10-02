import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Chip, Modal, Portal, TextInput } from 'react-native-paper';
import { themedStyles } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, resultsApi, type ClubResult } from '../../services/api';
import { COMPETITIONS, checkResultForm, emptyResultForm, type ResultForm } from '../../utils/results';

/**
 * Staff: add a result (any past date, so old seasons can be filled in) or
 * change one. The server works out the result, points and league table.
 */
export default function ResultFormModal({ visible, editing, onClose, onSaved }: {
  visible: boolean;
  /** The result being changed, or null to add one */
  editing: ClubResult | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const styles = useStyles();
  const [form, setForm] = useState<ResultForm>(emptyResultForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError('');
    setForm(editing ? {
      date: editing.date.slice(0, 10),
      opponent: editing.opponent,
      ourScore: String(editing.homeScore),
      theirScore: String(editing.awayScore),
      venue: editing.venue && editing.venue !== 'TBC' ? editing.venue : '',
      competition: editing.competition || 'League',
      scorers: editing.scorers || '',
    } : emptyResultForm());
  }, [visible, editing]);

  const set = (key: keyof ResultForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const checked = checkResultForm(form);
    if (typeof checked === 'string') {
      setError(checked);
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) await resultsApi.update(editing.id, checked);
      else await resultsApi.add(checked);
      onSaved(editing ? 'Result updated.' : `Result against ${checked.opponent} added.`);
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={saving ? undefined : onClose} contentContainerStyle={styles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{editing ? 'Edit result' : 'Add a result'}</Text>
          <Text style={styles.help}>Add results from any season, including ones played before you joined Boost Huddle.</Text>

          <TextInput label="Match date" accessibilityLabel="Match date" placeholder="14/09/2025" value={form.date} onChangeText={set('date')} mode="outlined" style={styles.input} />
          <TextInput label="Opponent" accessibilityLabel="Opponent" value={form.opponent} onChangeText={set('opponent')} mode="outlined" style={styles.input} maxLength={80} />
          <View style={styles.scores}>
            <TextInput label="Our score" accessibilityLabel="Our score" value={form.ourScore} onChangeText={set('ourScore')} mode="outlined" keyboardType="number-pad" maxLength={2} style={styles.score} />
            <Text style={styles.dash}>–</Text>
            <TextInput label="Their score" accessibilityLabel="Their score" value={form.theirScore} onChangeText={set('theirScore')} mode="outlined" keyboardType="number-pad" maxLength={2} style={styles.score} />
          </View>
          <View style={styles.chips}>
            {COMPETITIONS.map((c) => (
              <Chip key={c} selected={form.competition === c} onPress={() => set('competition')(c)} style={styles.chip}>{c}</Chip>
            ))}
          </View>
          <TextInput label="Venue (optional)" accessibilityLabel="Venue (optional)" value={form.venue} onChangeText={set('venue')} mode="outlined" style={styles.input} maxLength={120} />
          <TextInput label="Scorers (optional)" accessibilityLabel="Scorers (optional)" placeholder="Sam 2, Alex" value={form.scorers} onChangeText={set('scorers')} mode="outlined" style={styles.input} maxLength={500} />

          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <View style={styles.buttons}>
            <Button mode="outlined" onPress={onClose} disabled={saving} style={styles.button}>Cancel</Button>
            <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={styles.button}>{editing ? 'Save' : 'Add result'}</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, margin: 20, borderRadius: 18, padding: 20, maxHeight: '90%', maxWidth: 560, alignSelf: 'center', width: '92%' },
  title: { fontFamily: FONTS.display, fontSize: 24, letterSpacing: 1, textTransform: 'uppercase', color: c.text, marginBottom: 6 },
  help: { color: c.textLight, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  input: { marginBottom: 12 },
  scores: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  score: { flex: 1 },
  dash: { color: c.text, fontSize: 22, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderRadius: 999 },
  error: { color: c.error, marginBottom: 10 },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1 },
}));
