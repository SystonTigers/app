import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../config';
import { apiErrorMessage, faEmailApi, type FaImportLine } from '../services/api';
import { matchDate } from '../utils/highlights';

const ACTION_TEXT: Record<FaImportLine['action'], string> = {
  added: 'Added',
  updated: 'Updated',
  unchanged: 'Already up to date',
  not_ours: "Not your team's match",
  skipped: 'Cancelled, so not added',
};

/**
 * Staff: paste an email from FA Full-Time and its fixtures are added or
 * updated. Handy on the phone, where the FA's emails arrive.
 */
export default function FaEmailPaste({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lines, setLines] = useState<FaImportLine[] | null>(null);

  const run = async () => {
    setBusy(true);
    setError('');
    setLines(null);
    try {
      const res = await faEmailApi.import(text);
      setLines(res.data.lines);
      setText('');
      if (res.data.added || res.data.updated) onImported();
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't work. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={styles.openButton}>
        <Text style={styles.link}>Got an email from FA Full-Time? Paste it here</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Fixtures from an FA email</Text>
      <Text style={styles.help}>Open the email from FA Full-Time, select all, copy and paste it below. New fixtures are added; moved, postponed or cancelled ones are updated. Contact details in the email aren't saved.</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Paste the whole email"
        placeholderTextColor={COLORS.textLight}
        style={styles.input}
        accessibilityLabel="FA Full-Time email"
      />
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      <View style={styles.row}>
        <Pressable onPress={() => { setOpen(false); setLines(null); setError(''); }} accessibilityRole="button"><Text style={styles.link}>Close</Text></Pressable>
        <Pressable onPress={run} disabled={busy || !text.trim()} accessibilityRole="button" style={[styles.button, busy || !text.trim() ? styles.disabled : null]}>
          <Text style={styles.buttonText}>{busy ? 'Reading…' : 'Add to fixtures'}</Text>
        </Pressable>
      </View>
      {lines ? lines.map((l, i) => (
        <Text key={i} style={styles.result}>
          {matchDate(l.date)}{l.time ? ` ${l.time}` : ''} · {l.opponent ? `${l.homeAway === 'home' ? 'v' : '@'} ${l.opponent}` : 'Other teams'}: {ACTION_TEXT[l.action]}{l.changes.length ? ` (${l.changes.join(', ')})` : ''}
        </Text>
      )) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  openButton: { paddingHorizontal: 16, paddingVertical: 8 },
  box: { margin: 16, marginTop: 4, padding: 14, borderRadius: 12, backgroundColor: '#14181C', gap: 10 },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 16 },
  help: { color: COLORS.textLight, fontSize: 13 },
  input: { minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.textLight, borderRadius: 8, padding: 10, color: COLORS.text, fontSize: 13 },
  error: { color: COLORS.error },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { color: COLORS.background, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  link: { color: COLORS.primary, fontWeight: '700' },
  result: { color: COLORS.text, fontSize: 13 },
});
