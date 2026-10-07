import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { themedStyles } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, signingOnApi } from '../../services/api';
import type { SigningOnForm } from '../../utils/signingOn';

/** Staff: this season's fee, how to pay and the code of conduct families agree to. */
export default function FormSettingsCard({ form, seasonLabel, onSaved }: { form: SigningOnForm; seasonLabel: string; onSaved: (form: SigningOnForm) => void }) {
  const styles = useStyles();
  const [fee, setFee] = useState('');
  const [feeNote, setFeeNote] = useState('');
  const [conduct, setConduct] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    setFee(form.feeAmount === null ? '' : Number.isInteger(form.feeAmount) ? String(form.feeAmount) : form.feeAmount.toFixed(2));
    setFeeNote(form.feeNote ?? '');
    setConduct(form.conduct ?? '');
  }, [form]);

  const save = async () => {
    const amount = fee.trim().replace(/^£/, '');
    if (amount && !/^\d+(\.\d{1,2})?$/.test(amount)) { setNote({ text: 'Enter the fee in pounds, like 45 or 45.50, or leave it blank.', error: true }); return; }
    setSaving(true); setNote(null);
    try {
      onSaved(await signingOnApi.saveForm({ feeAmount: amount ? Number(amount) : null, feeNote: feeNote.trim() || null, conduct: conduct.trim() || null }));
      setNote({ text: 'Saved. Families see this when they sign on.', error: false });
    } catch (err) {
      setNote({ text: apiErrorMessage(err, "That didn't save. Please try again."), error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{seasonLabel.toUpperCase()} FORM</Text>
      <Text style={styles.meta}>Families see this when they sign on.</Text>
      <TextInput mode="outlined" label="Signing-on fee in £ (blank for none)" value={fee} onChangeText={setFee} keyboardType="decimal-pad" />
      <TextInput mode="outlined" label="How to pay, like bank details or 'pay the coach'" value={feeNote} onChangeText={setFeeNote} multiline />
      <TextInput mode="outlined" label="Code of conduct (optional)" value={conduct} onChangeText={setConduct} multiline numberOfLines={5} />
      {note ? <Text style={note.error ? styles.error : styles.ok} accessibilityRole={note.error ? 'alert' : undefined}>{note.text}</Text> : null}
      <Button mode="contained" icon="content-save" onPress={save} loading={saving} disabled={saving} style={styles.left}>Save the form</Button>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 10 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  meta: { color: c.textLight, fontSize: 12 },
  ok: { color: c.success, fontWeight: '700' },
  error: { color: c.error, fontWeight: '700' },
  left: { alignSelf: 'flex-start' },
}));
