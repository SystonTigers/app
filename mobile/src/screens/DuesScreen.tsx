import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Modal, Portal, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { apiErrorMessage, duesApi } from '../services/api';
import { parseAmount, parseDueDate, pounds, type PaymentRequest } from '../utils/dues';
import { resultDate } from '../utils/results';

const EMPTY = { title: '', amount: '', description: '', dueDate: '' };

/**
 * Staff: subs and match fees (the website's Admin → Subs and fees). Ask
 * members for money and send reminders. Paying online needs Stripe, which
 * isn't switched on for clubs yet, so the screen says so.
 */
export default function DuesScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const [list, setList] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reminding, setReminding] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setList(await duesApi.list());
    } catch (err) {
      setError(apiErrorMessage(err, "Payment requests didn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    const amount = parseAmount(form.amount);
    const dueDate = parseDueDate(form.dueDate);
    if (!form.title.trim()) { setFormError("Say what it's for."); return; }
    if (amount === null) { setFormError('Enter an amount in pounds, like 25 or 12.50.'); return; }
    if (dueDate === null) { setFormError('Enter the date like 31/03/2026, or leave it blank.'); return; }
    setSaving(true); setFormError('');
    try {
      await duesApi.create({ title: form.title.trim(), amount, description: form.description.trim() || undefined, dueDate: dueDate || undefined });
      setCreating(false);
      setNotice('Payment request made.');
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "The request wasn't made. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const remind = async (r: PaymentRequest) => {
    setReminding(r.id); setNotice(''); setError('');
    try {
      const sent = await duesApi.remind(r.id);
      setNotice(sent ? `Reminder sent to ${sent} ${sent === 1 ? 'member' : 'members'}.` : 'Everyone has paid, so no reminders were needed.');
    } catch (err) {
      setError(apiErrorMessage(err, "Reminders weren't sent. Please try again."));
    } finally {
      setReminding(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
        <Text style={styles.intro}>Ask members for match fees, subs and kit money.</Text>
        <View style={styles.info}><Text style={styles.body}>Paying online isn&apos;t switched on for clubs yet, so members can&apos;t pay through the app until it is.</Text></View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <Button mode="contained" icon="plus" onPress={() => { setForm(EMPTY); setFormError(''); setCreating(true); }}>New request</Button>

        {loading ? <ActivityIndicator color={c.primary} style={styles.loading} /> : list.length === 0 && !error ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>NO PAYMENT REQUESTS YET</Text>
            <Text style={styles.body}>Make one for this month&apos;s subs or a tournament fee.</Text>
          </View>
        ) : list.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.title}>{r.title}</Text>
                {r.description ? <Text style={styles.meta}>{r.description}</Text> : null}
                <Text style={styles.body}><Text style={styles.strong}>{pounds(r.amount)}</Text>{r.dueDate ? <Text style={styles.meta}>  · due {resultDate(new Date(r.dueDate * 1000).toISOString().slice(0, 10))}</Text> : null}</Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.big, { color: c.primary }]}>{pounds(r.totalCollected)}</Text>
                <Text style={styles.meta}>{r.paidCount} paid</Text>
              </View>
            </View>
            <Button compact mode="outlined" icon="bell-outline" style={styles.start} onPress={() => remind(r)} loading={reminding === r.id} disabled={!!reminding}>Send a reminder</Button>
          </View>
        ))}
      </ScrollView>

      <Portal>
        <Modal visible={creating} onDismiss={() => setCreating(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.cardTitle}>NEW PAYMENT REQUEST</Text>
          <TextInput mode="outlined" label="What it's for" placeholder="e.g. March training subs" value={form.title} maxLength={120} onChangeText={(title) => setForm({ ...form, title })} />
          <TextInput mode="outlined" label="Amount (£)" placeholder="25.00" keyboardType="decimal-pad" value={form.amount} onChangeText={(amount) => setForm({ ...form, amount })} />
          <TextInput mode="outlined" label="Details (optional)" multiline value={form.description} maxLength={500} onChangeText={(description) => setForm({ ...form, description })} />
          <TextInput mode="outlined" label="Due by (optional)" placeholder="31/03/2026" value={form.dueDate} onChangeText={(dueDate) => setForm({ ...form, dueDate })} />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button mode="contained" onPress={save} loading={saving} disabled={saving}>Make request</Button>
          <Button mode="text" onPress={() => setCreating(false)} disabled={saving}>Cancel</Button>
        </Modal>
      </Portal>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  intro: { color: c.textLight, lineHeight: 20 },
  info: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, borderRadius: 14, padding: 12 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  loading: { marginTop: 24 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 10 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 24 },
  big: { fontFamily: FONTS.display, fontSize: 28 },
  body: { color: c.text, lineHeight: 21 },
  strong: { fontWeight: '800' },
  meta: { color: c.textLight, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flex: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end' },
  start: { alignSelf: 'flex-start' },
  modal: { backgroundColor: c.surface, margin: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 18, gap: 10 },
}));
