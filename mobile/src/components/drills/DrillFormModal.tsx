import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Chip, Modal, Portal, TextInput } from 'react-native-paper';
import { themedStyles } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage } from '../../services/api';
import { saveDrill } from '../../services/drillsStore';
import { CLUB_CATEGORIES, DIFFICULTIES, emptyForm, formBody, formFromDrill, formProblem, type AppDrill, type ClubDrill, type DrillForm } from '../../utils/drills';

/**
 * Staff: make a club drill, change one, or start from a built-in drill
 * ("Make our version"). Steps and coaching points are one per line.
 */
export default function DrillFormModal({ visible, editing, copyFrom, onDismiss, onSaved }: {
  visible: boolean;
  /** A club drill to change */
  editing?: AppDrill | null;
  /** A built-in drill to start from */
  copyFrom?: AppDrill | null;
  onDismiss: () => void;
  onSaved: (drill: ClubDrill) => void;
}) {
  const styles = useStyles();
  const [form, setForm] = useState<DrillForm>(emptyForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError('');
    setForm(editing ? formFromDrill(editing) : copyFrom ? formFromDrill(copyFrom, true) : emptyForm());
  }, [visible, editing, copyFrom]);

  const set = <K extends keyof DrillForm>(key: K) => (value: DrillForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const problem = formProblem(form);
    if (problem) return setError(problem);
    setSaving(true);
    setError('');
    try {
      onSaved(await saveDrill(editing?.club ? editing.id : null, formBody(form)));
    } catch (err) {
      setError(apiErrorMessage(err, "The drill didn't save. Check your connection and try again."));
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof DrillForm, label: string, extra: Partial<React.ComponentProps<typeof TextInput>> = {}) => (
    <TextInput
      label={label}
      accessibilityLabel={label}
      value={form[key] as string}
      onChangeText={set(key) as (v: string) => void}
      mode="outlined"
      style={styles.input}
      {...extra}
    />
  );

  return (
    <Portal>
      <Modal visible={visible} onDismiss={saving ? undefined : onDismiss} contentContainerStyle={styles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{editing ? 'Edit drill' : copyFrom ? 'Make our version' : 'New drill'}</Text>
          {field('name', 'Name', { maxLength: 80, placeholder: 'Tigers rondo' })}

          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {CLUB_CATEGORIES.map((cat) => (
              <Chip key={cat} compact selected={form.category === cat} onPress={() => set('category')(cat)} style={styles.chip}>{cat}</Chip>
            ))}
          </View>
          <Text style={styles.label}>Level</Text>
          <View style={styles.chips}>
            {DIFFICULTIES.map((d) => (
              <Chip key={d} compact selected={form.difficulty === d} onPress={() => set('difficulty')(d)} style={styles.chip}>{d.charAt(0).toUpperCase() + d.slice(1)}</Chip>
            ))}
          </View>

          <View style={styles.row}>
            {field('duration', 'Minutes', { keyboardType: 'number-pad', maxLength: 3, style: [styles.input, styles.flex] })}
            {field('players', 'Players', { placeholder: '8-12', maxLength: 30, style: [styles.input, styles.flex] })}
          </View>
          {field('description', 'What it is', { multiline: true, maxLength: 600, placeholder: 'A one or two line summary' })}
          {field('setup', 'Set-up', { multiline: true, maxLength: 600, placeholder: 'Area size, cones, where players start' })}
          {field('steps', 'How it works (one step per line)', { multiline: true, numberOfLines: 4 })}
          {field('coachingPoints', 'Coaching points (one per line)', { multiline: true, numberOfLines: 3 })}
          {field('equipment', 'Equipment (commas between)', { placeholder: 'Cones, Bibs, Balls' })}
          {field('focus', 'Focus (commas between)', { placeholder: 'passing, movement' })}

          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <View style={styles.buttons}>
            <Button mode="outlined" onPress={onDismiss} disabled={saving} style={styles.flex}>Cancel</Button>
            <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={styles.flex}>{editing ? 'Save' : 'Add drill'}</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, margin: 16, borderRadius: 18, padding: 18, maxHeight: '92%', maxWidth: 600, alignSelf: 'center', width: '94%' },
  title: { fontFamily: FONTS.display, fontSize: 24, letterSpacing: 1, textTransform: 'uppercase', color: c.text, marginBottom: 10 },
  label: { color: c.textLight, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { backgroundColor: c.surfaceRaised },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  input: { marginBottom: 10 },
  error: { color: c.error, marginBottom: 10 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
}));
