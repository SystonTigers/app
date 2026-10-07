import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Checkbox, Modal, Portal, TextInput } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, signingOnApi } from '../../services/api';
import { answersFrom, blankContact, draftFrom, draftProblem, type Draft, type SigningOnEntry, type SigningOnForm } from '../../utils/signingOn';

/**
 * One child's signing-on form: details, emergency contacts, photo and video
 * consent and the code of conduct. Families fill it in; staff can fill it in
 * from a paper form. Medical notes are only seen by staff and the family.
 */
export default function SigningOnFormModal({ player, form, onClose, onSaved }: {
  player: { playerId: string; name: string } | null;
  form: SigningOnForm;
  onClose: () => void;
  onSaved: (entry: SigningOnEntry) => void;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const [draft, setDraft] = useState<Draft>(draftFrom(null));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    let stopped = false;
    setError(''); setLoading(true); setDraft(draftFrom(null));
    signingOnApi.entry(player.playerId)
      .then((entry) => { if (!stopped) setDraft(draftFrom(entry)); })
      .catch((err) => { if (!stopped) setError(apiErrorMessage(err, "Last season's answers didn't load. You can still fill the form in.")); })
      .finally(() => { if (!stopped) setLoading(false); });
    return () => { stopped = true; };
  }, [player]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setContact = (i: number, patch: Partial<Draft['contacts'][number]>) =>
    setDraft((d) => ({ ...d, contacts: d.contacts.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const send = async () => {
    if (!player) return;
    const problem = draftProblem(draft, !!form.conduct);
    if (problem) { setError(problem); return; }
    setSaving(true); setError('');
    try {
      onSaved(await signingOnApi.submit(player.playerId, answersFrom(draft)));
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't send. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const YesNo = ({ label, value, onPick }: { label: string; value: boolean | null; onPick: (v: boolean) => void }) => (
    <View style={styles.question}>
      <Text style={styles.body}>{label}</Text>
      <View style={styles.row}>
        {([true, false] as const).map((v) => {
          const on = value === v;
          return (
            <Pressable key={String(v)} onPress={() => onPick(v)} style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]}
              accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${label} ${v ? 'Yes' : 'No'}`}>
              <Text style={[styles.chipText, on ? { color: c.onPrimary } : null]}>{v ? 'Yes' : 'No'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <Portal>
      <Modal visible={!!player} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>SIGN ON: {player?.name.toUpperCase()}</Text>
          {loading ? <ActivityIndicator color={c.primary} /> : (
            <>
              <Text style={styles.section}>About them</Text>
              <TextInput mode="outlined" label="Date of birth (DD/MM/YYYY)" value={draft.dob} onChangeText={(dob) => set({ dob })} keyboardType="numbers-and-punctuation" />
              <TextInput mode="outlined" label="Home address (optional)" value={draft.address} onChangeText={(address) => set({ address })} multiline />
              <TextInput mode="outlined" label="School (optional)" value={draft.school} onChangeText={(school) => set({ school })} />
              <TextInput mode="outlined" label="Medical conditions the coaches should know (optional)" value={draft.medical} onChangeText={(medical) => set({ medical })} multiline />
              <TextInput mode="outlined" label="Allergies (optional)" value={draft.allergies} onChangeText={(allergies) => set({ allergies })} />
              <Text style={styles.meta}>Only the coaches and your family can see these.</Text>

              <Text style={styles.section}>Emergency contacts</Text>
              {draft.contacts.map((ct, i) => (
                <View key={i} style={styles.contact}>
                  <TextInput mode="outlined" label="Name" value={ct.name} onChangeText={(name) => setContact(i, { name })} autoComplete="name" />
                  <TextInput mode="outlined" label="Relationship, like Mum or Grandad (optional)" value={ct.relationship} onChangeText={(relationship) => setContact(i, { relationship })} />
                  <TextInput mode="outlined" label="Phone" value={ct.phone} onChangeText={(phone) => setContact(i, { phone })} keyboardType="phone-pad" autoComplete="tel" />
                  <TextInput mode="outlined" label="Email (optional)" value={ct.email} onChangeText={(email) => setContact(i, { email })} keyboardType="email-address" autoCapitalize="none" />
                  {draft.contacts.length > 1 ? (
                    <Button mode="text" icon="close" compact onPress={() => set({ contacts: draft.contacts.filter((_, j) => j !== i) })}>Remove this contact</Button>
                  ) : null}
                </View>
              ))}
              {draft.contacts.length < 3 ? (
                <Button mode="outlined" icon="plus" onPress={() => set({ contacts: [...draft.contacts, blankContact()] })} style={styles.left}>Add another contact</Button>
              ) : null}

              <Text style={styles.section}>Photos and video</Text>
              <YesNo label="Can the club share photos of them?" value={draft.photos} onPick={(photos) => set({ photos })} />
              <YesNo label="Can the club share match video of them?" value={draft.video} onPick={(video) => set({ video })} />
              <Text style={styles.meta}>You can change these any time on the Photo &amp; Video Consent screen.</Text>

              {form.conduct ? (
                <>
                  <Text style={styles.section}>Code of conduct</Text>
                  <ScrollView style={styles.conduct} nestedScrollEnabled><Text style={styles.body} selectable>{form.conduct}</Text></ScrollView>
                  <Checkbox.Item label="I've read it and agree" status={draft.agreeConduct ? 'checked' : 'unchecked'} onPress={() => set({ agreeConduct: !draft.agreeConduct })} position="leading" style={styles.check} />
                </>
              ) : null}
            </>
          )}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <View style={styles.actions}>
            <Button mode="text" onPress={onClose}>Cancel</Button>
            <Button mode="contained" icon="check" onPress={send} loading={saving} disabled={saving || loading}>Sign them on</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, margin: 12, borderRadius: 18, borderWidth: 1, borderColor: c.border, maxHeight: '92%' },
  content: { padding: 16, gap: 10 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 22, letterSpacing: 1 },
  section: { color: c.text, fontFamily: FONTS.display, fontSize: 18, letterSpacing: 0.6, marginTop: 10, textTransform: 'uppercase' },
  body: { color: c.text, lineHeight: 21 },
  meta: { color: c.textLight, fontSize: 12 },
  contact: { gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  question: { gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18, minHeight: 40, justifyContent: 'center' },
  chipText: { color: c.text, fontWeight: '700' },
  conduct: { borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, backgroundColor: c.surfaceRaised, maxHeight: 220 },
  check: { paddingHorizontal: 0 },
  left: { alignSelf: 'flex-start' },
  error: { color: c.error, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
}));
