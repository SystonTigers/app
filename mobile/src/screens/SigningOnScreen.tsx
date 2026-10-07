import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../utils/roles';
import { apiErrorMessage, signingOnApi } from '../services/api';
import { feeText, squadTotals, type SigningOnOverview } from '../utils/signingOn';
import LinkChildCard from '../components/consent/LinkChildCard';
import SigningOnFormModal from '../components/signingOn/SigningOnFormModal';
import FormSettingsCard from '../components/signingOn/FormSettingsCard';

/**
 * Signing on for the season (a club extra, switched on in Club Settings).
 * Families sign their linked children on. Staff set the fee and code of
 * conduct, see who has signed on, fill in paper forms and mark fees paid.
 */
export default function SigningOnScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const { user } = useAuth();
  const staff = isStaffRole(user?.role);
  const [data, setData] = useState<SigningOnOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState<{ playerId: string; name: string } | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await signingOnApi.overview());
    } catch (err) {
      setError(apiErrorMessage(err, "Signing on didn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markPaid = async (playerId: string, paid: boolean) => {
    setPaying(playerId); setNotice('');
    try {
      await signingOnApi.markPaid(playerId, paid);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setPaying(null);
    }
  };

  if (loading) return <View style={styles.container}><ActivityIndicator color={c.primary} style={styles.loading} /></View>;

  const fee = data ? feeText(data.form.feeAmount) : null;
  const totals = data?.squad ? squadTotals(data.squad) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {data ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SIGNING ON {data.season.label.toUpperCase()}</Text>
            <Text style={styles.body}>Fill in your child&apos;s details, emergency contacts and photo consent once a season.</Text>
            {fee ? <Text style={styles.fee}>Fee: {fee}</Text> : null}
            {data.form.feeNote ? <Text style={styles.body} selectable>{data.form.feeNote}</Text> : null}
          </View>

          {data.children.map((child) => (
            <Pressable key={child.playerId} onPress={() => setOpen(child)} style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
              accessibilityRole="button" accessibilityLabel={`${child.name}: ${child.entry ? 'signed on' : 'not signed on yet'}`}>
              <MaterialCommunityIcons name={child.entry ? 'check-circle' : 'clipboard-edit-outline'} size={26} color={child.entry ? c.success : c.primary} />
              <View style={styles.flex}>
                <Text style={styles.name}>{child.name}</Text>
                <Text style={styles.meta}>{child.entry ? `Signed on${fee ? (child.entry.paid ? ' · Paid' : ' · Fee not paid yet') : ''}. Tap to update.` : 'Not signed on yet. Tap to fill in the form.'}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={c.textLight} />
            </Pressable>
          ))}

          {!staff && !data.children.length ? (
            <>
              <Text style={styles.body}>Link your account to your child first, with the code from their coach.</Text>
              <LinkChildCard prominent onLinked={(name) => { setNotice(`Linked to ${name}. You can sign them on now.`); load(); }} />
            </>
          ) : null}

          {staff ? (
            <>
              {totals ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>THE SQUAD</Text>
                  <Text style={styles.body}>{totals.signedOn} of {totals.total} signed on{fee ? ` · ${totals.paid} paid` : ''}</Text>
                  {totals.noParent ? <Text style={styles.warn}>{totals.noParent} not signed on with no parent linked. Send their family a parent code (Photo &amp; Video Consent), or fill in their paper form here.</Text> : null}
                  {data.squad!.map((p) => (
                    <View key={p.playerId} style={styles.squadRow}>
                      <Pressable onPress={() => setOpen(p)} style={styles.flex} accessibilityRole="button" accessibilityLabel={`${p.name}: open their form`}>
                        <Text style={styles.name}>{p.number !== null ? `${p.number}. ` : ''}{p.name}</Text>
                        <Text style={[styles.meta, p.signedOn ? { color: c.success } : null]}>
                          {p.signedOn ? 'Signed on' : p.linkedParents ? 'Not yet' : 'Not yet · no parent linked'}
                        </Text>
                      </Pressable>
                      {p.signedOn && fee ? (
                        <Button mode={p.paid ? 'contained-tonal' : 'outlined'} compact icon={p.paid ? 'check' : 'cash'} loading={paying === p.playerId} disabled={!!paying}
                          onPress={() => markPaid(p.playerId, !p.paid)} accessibilityLabel={p.paid ? `${p.name} has paid. Mark as not paid` : `Mark ${p.name} as paid`}>
                          {p.paid ? 'Paid' : 'Mark paid'}
                        </Button>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
              <FormSettingsCard form={data.form} seasonLabel={data.season.label} onSaved={(form) => setData({ ...data, form })} />
            </>
          ) : null}
        </>
      ) : null}

      <SigningOnFormModal
        player={open}
        form={data?.form ?? { feeAmount: null, feeNote: null, conduct: null }}
        onClose={() => setOpen(null)}
        onSaved={() => { setNotice(`${open?.name ?? 'They'} is signed on. Thank you!`); setOpen(null); load(); }}
      />
    </ScrollView>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  loading: { marginTop: 24 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  warn: { color: c.warning, fontWeight: '700', lineHeight: 20 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 8 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  body: { color: c.text, lineHeight: 21 },
  fee: { color: c.primary, fontFamily: FONTS.display, fontSize: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, minHeight: 64 },
  pressed: { opacity: 0.8 },
  flex: { flex: 1 },
  name: { color: c.text, fontWeight: '800' },
  meta: { color: c.textLight, fontSize: 12, marginTop: 2 },
  squadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border, minHeight: 48 },
}));
