import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themedStyles, useBrandColors } from '../theme/brand';
import SectionTitle from '../components/home/SectionTitle';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { alertPrefsApi, apiErrorMessage, type AlertGroup } from '../services/api';
import { pushPermission, registerForPush, type PushPermission } from '../services/push';
import { APP_VERSION } from '../config';

const GROUPS: Array<{ id: AlertGroup; title: string; detail: string; icon: string }> = [
  { id: 'match', title: 'Kick-off, half time and full time', detail: 'Including the final score', icon: 'whistle' },
  { id: 'goals', title: 'Goals', detail: 'Ours and theirs, as they happen', icon: 'soccer' },
  { id: 'cards', title: 'Cards', detail: 'Yellow and red cards for our players', icon: 'card' },
  { id: 'video', title: 'Live video', detail: 'When a match starts streaming in the app', icon: 'video' },
  { id: 'reminders', title: 'Reminders', detail: 'Things the club needs from you, like photo consent', icon: 'bell-ring-outline' },
];

const PERMISSION_TEXT: Record<PushPermission, string> = {
  granted: 'Notifications are on for this device.',
  undetermined: "Notifications aren't on for this device yet.",
  denied: "Notifications are blocked for this app. Turn them on in your phone or browser settings.",
  'needs-install': 'On iPhone, add the app to your home screen first (Share → Add to Home Screen), then turn notifications on.',
  unsupported: "This browser can't show notifications.",
};

/** Alerts (saved to your account, so every device follows them), and account actions. */
export default function SettingsScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { club } = useClub();
  const [off, setOff] = useState<AlertGroup[] | null>(null);
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [saving, setSaving] = useState<AlertGroup | 'all' | null>(null);
  const [turningOn, setTurningOn] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const load = useCallback(async () => {
    setError('');
    pushPermission().then(setPermission).catch(() => setPermission('unsupported'));
    try {
      setOff((await alertPrefsApi.get()).data.off);
    } catch (err) {
      setOff([]);
      setError(apiErrorMessage(err, "We couldn't load your alert choices."));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (next: AlertGroup[], which: AlertGroup | 'all') => {
    const before = off;
    setOff(next);
    setSaving(which);
    setError('');
    try {
      setOff((await alertPrefsApi.set(next)).data.off);
    } catch (err) {
      setOff(before);
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setSaving(null);
    }
  };

  const toggle = (g: AlertGroup, on: boolean) => {
    if (!off) return;
    save(on ? off.filter((x) => x !== g) : [...off, g], g);
  };

  const allOn = !!off && off.length === 0;
  const allOff = !!off && GROUPS.every((g) => off.includes(g.id));

  const turnOnDevice = async () => {
    setTurningOn(true);
    setNote('');
    const result = await registerForPush({ prompt: true });
    setTurningOn(false);
    setNote(result.ok ? 'Done. This device will get the alerts you choose below.' : result.message);
    pushPermission().then(setPermission).catch(() => undefined);
  };

  const deleted = async () => {
    await AsyncStorage.clear().catch(() => undefined);
    setShowDelete(false);
    await logout();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionTitle title="THIS DEVICE" color={c.primary} />
      <View style={styles.card}>
        <View style={styles.row}>
          <MaterialCommunityIcons name={permission === 'granted' ? 'bell-check' : 'bell-off-outline'} size={22} color={permission === 'granted' ? c.primary : c.textLight} />
          <Text style={[styles.body, { flex: 1 }]}>{permission ? PERMISSION_TEXT[permission] : 'Checking…'}</Text>
        </View>
        {permission === 'undetermined' ? (
          <Pressable onPress={turnOnDevice} disabled={turningOn} accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: c.primary }]}>
            {turningOn ? <ActivityIndicator color={c.onPrimary} /> : <Text style={[styles.primaryButtonText, { color: c.onPrimary }]}>Turn on notifications</Text>}
          </Pressable>
        ) : null}
        {note ? <Text style={styles.small}>{note}</Text> : null}
      </View>

      <SectionTitle title="TELL ME ABOUT" color={c.primary} />
      <View style={styles.card}>
        {off === null ? <ActivityIndicator color={c.primary} /> : (
          <>
            <View style={[styles.row, styles.master]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>All alerts</Text>
                <Text style={styles.small}>{allOff ? 'Everything is off.' : allOn ? 'Everything is on.' : 'Some are off.'} Saved to your account, so all your devices follow it.</Text>
              </View>
              <Switch
                value={!allOff}
                onValueChange={(v) => save(v ? [] : GROUPS.map((g) => g.id), 'all')}
                disabled={saving !== null}
                trackColor={{ true: c.primary, false: 'rgba(255,255,255,0.2)' }}
                thumbColor="#FFFFFF"
                accessibilityLabel="All alerts"
              />
            </View>
            {GROUPS.map((g) => {
              const on = !off.includes(g.id);
              return (
                <View key={g.id} style={styles.row}>
                  <MaterialCommunityIcons name={g.icon as never} size={20} color={on ? c.primary : c.textLight} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.body}>{g.title}</Text>
                    <Text style={styles.small}>{g.detail}</Text>
                  </View>
                  {saving === g.id ? <ActivityIndicator color={c.primary} /> : null}
                  <Switch
                    value={on}
                    onValueChange={(v) => toggle(g.id, v)}
                    disabled={saving !== null}
                    trackColor={{ true: c.primary, false: 'rgba(255,255,255,0.2)' }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel={g.title}
                  />
                </View>
              );
            })}
            <Text style={styles.small}>You never get alerts while your phone says you're at the ground, or for updates you post yourself.</Text>
          </>
        )}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      </View>

      <SectionTitle title="ACCOUNT" color={c.primary} />
      <View style={styles.card}>
        <Text style={styles.body}>{user?.email}</Text>
        <Text style={styles.small}>{club?.name ? `${club.name} · ` : ''}{user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : ''}</Text>
        <Pressable onPress={() => navigation.navigate('Profile')} accessibilityRole="button" style={styles.linkRow}>
          <MaterialCommunityIcons name="account-edit-outline" size={20} color={c.primary} />
          <Text style={[styles.link, { color: c.primary }]}>Edit your name, phone or password</Text>
        </Pressable>
        {confirmLogout ? (
          <View style={styles.confirm}>
            <Text style={styles.body}>Log out of {club?.name || 'the app'} on this device?</Text>
            <View style={styles.buttons}>
              <Pressable onPress={logout} accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: c.primary, flex: 1 }]}>
                <Text style={[styles.primaryButtonText, { color: c.onPrimary }]}>Log out</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmLogout(false)} accessibilityRole="button" style={[styles.ghostButton, { flex: 1 }]}>
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmLogout(true)} accessibilityRole="button" style={styles.linkRow}>
            <MaterialCommunityIcons name="logout" size={20} color={c.text} />
            <Text style={styles.link}>Log out</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setShowDelete(true)} accessibilityRole="button" style={styles.linkRow}>
          <MaterialCommunityIcons name="delete-forever-outline" size={20} color={c.error} />
          <Text style={[styles.link, { color: c.error }]}>Delete my account</Text>
        </Pressable>
      </View>

      <Text style={styles.version}>Version {APP_VERSION}</Text>

      <DeleteAccountModal visible={showDelete} onDismiss={() => setShowDelete(false)} onDeleteSuccess={deleted} />
    </ScrollView>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingBottom: 40 },
  card: { marginHorizontal: 16, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  master: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  title: { color: c.text, fontWeight: '800', fontSize: 16 },
  body: { color: c.text, fontSize: 15 },
  small: { color: c.textLight, fontSize: 12, marginTop: 2 },
  error: { color: c.error },
  primaryButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontWeight: '900', fontSize: 15 },
  ghostButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  ghostText: { color: c.text, fontWeight: '800' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  link: { color: c.text, fontWeight: '700', fontSize: 15 },
  confirm: { gap: 10, paddingVertical: 4 },
  buttons: { flexDirection: 'row', gap: 10 },
  version: { color: c.textLight, textAlign: 'center', fontSize: 12, marginTop: 24 },
}));
