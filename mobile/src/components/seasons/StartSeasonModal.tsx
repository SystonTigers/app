import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Checkbox, Modal, Portal, TextInput } from 'react-native-paper';
import { themedStyles } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, seasonsApi, squadApi } from '../../services/api';
import { normaliseResultDate } from '../../utils/results';

/** "2026/27" for a season starting in August 2026 (or later that year). */
export function suggestedSeasonName(today = new Date()): string {
  const y = today.getUTCMonth() >= 6 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
}

/** Staff: start a new season, carrying over the players who are staying. */
export default function StartSeasonModal({ visible, onClose, onStarted }: { visible: boolean; onClose: () => void; onStarted: (name: string) => void }) {
  const styles = useStyles();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(suggestedSeasonName());
  const [startDate, setStartDate] = useState('');
  const [carryOver, setCarryOver] = useState(true);
  const [squad, setSquad] = useState<Array<{ id: string; name: string }>>([]);
  const [staying, setStaying] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStep(1); setError(''); setName(suggestedSeasonName());
    setStartDate(new Date().toLocaleDateString('en-GB'));
    squadApi.getSquad()
      .then((res) => {
        const list = ((res?.data ?? []) as Array<{ id: string; name: string }>).map((p) => ({ id: String(p.id), name: String(p.name) }));
        setSquad(list);
        setStaying(new Set(list.map((p) => p.id)));
      })
      .catch(() => setSquad([]));
  }, [visible]);

  const toggle = (id: string) => setStaying((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const start = async () => {
    const date = normaliseResultDate(startDate);
    if (!name.trim()) { setError('Give the season a name, like 2026/27.'); return; }
    if (!date) { setError('Enter the start date as DD/MM/YYYY.'); return; }
    setSaving(true); setError('');
    try {
      const res = await seasonsApi.startNew({ name: name.trim(), startDate: date, copySquad: carryOver, playerIds: carryOver ? [...staying] : [] });
      if (res?.success === false) throw new Error(typeof res.error === 'string' ? res.error : '');
      onStarted(name.trim());
    } catch (err) {
      setError(apiErrorMessage(err, (err as Error)?.message || "The season didn't start. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={saving ? undefined : onClose} contentContainerStyle={styles.modal}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>START A NEW SEASON</Text>
          {step === 1 ? (
            <>
              <TextInput mode="outlined" label="Season name" value={name} onChangeText={setName} placeholder="e.g. 2026/27" />
              <TextInput mode="outlined" label="Starts on (DD/MM/YYYY)" value={startDate} onChangeText={setStartDate} keyboardType="numbers-and-punctuation" />
              {squad.length ? (
                <Pressable onPress={() => setCarryOver((v) => !v)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked: carryOver }}>
                  <Checkbox status={carryOver ? 'checked' : 'unchecked'} onPress={() => setCarryOver((v) => !v)} />
                  <View style={styles.checkText}>
                    <Text style={styles.body}>Carry over the squad</Text>
                    <Text style={styles.hint}>Players who are staying are added to the new season.</Text>
                  </View>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.hint}>Untick anyone who has left the club.</Text>
              {squad.map((p) => (
                <Pressable key={p.id} onPress={() => toggle(p.id)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked: staying.has(p.id) }} accessibilityLabel={p.name}>
                  <Checkbox status={staying.has(p.id) ? 'checked' : 'unchecked'} onPress={() => toggle(p.id)} />
                  <Text style={styles.body}>{p.name}</Text>
                </Pressable>
              ))}
            </>
          )}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <View style={styles.buttons}>
            {step === 1 && carryOver && squad.length ? (
              <Button mode="contained" onPress={() => setStep(2)}>Next: check the squad</Button>
            ) : (
              <Button mode="contained" onPress={start} loading={saving} disabled={saving}>Start season</Button>
            )}
            <Button mode="text" onPress={step === 2 ? () => setStep(1) : onClose} disabled={saving}>{step === 2 ? 'Back' : 'Cancel'}</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, margin: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, maxHeight: '90%' },
  content: { padding: 18, gap: 12 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 24, letterSpacing: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  checkText: { flex: 1 },
  body: { color: c.text, fontSize: 15 },
  hint: { color: c.textLight, fontSize: 13, lineHeight: 19 },
  error: { color: c.error },
  buttons: { gap: 8, marginTop: 4 },
}));
