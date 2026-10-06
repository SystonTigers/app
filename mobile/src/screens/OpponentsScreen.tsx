import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, IconButton, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import Crest from '../components/home/Crest';
import { pickImage } from '../components/clubSettings/pickImage';
import { clubSettingsApi } from '../services/clubSettingsApi';
import { apiErrorMessage, opponentsApi, type Opponent } from '../services/api';

/**
 * Staff: the teams we play and their badges. Upload each badge once (PNG or
 * JPG) and it's used on every match graphic and post; without one, initials
 * show. Teams are added automatically when a post mentions them.
 */
export default function OpponentsScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const [list, setList] = useState<Opponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setList(await opponentsApi.list());
    } catch (err) {
      setError(apiErrorMessage(err, "Opponents didn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const say = (text: string) => { setError(''); setNotice(text); };
  const fail = (err: unknown, fallback: string) => { setNotice(''); setError(apiErrorMessage(err, fallback)); };

  const add = async () => {
    const team = name.trim().replace(/\s+/g, ' ');
    if (!team) return;
    setBusy('add');
    try {
      await opponentsApi.add(team);
      setName('');
      say(`${team} added.`);
      load();
    } catch (err) { fail(err, "That team wasn't added. Please try again."); } finally { setBusy(null); }
  };

  const upload = async (o: Opponent) => {
    const picked = await pickImage();
    if (!picked) return;
    if ('problem' in picked) { setError(picked.problem); return; }
    setBusy(o.id);
    try {
      await clubSettingsApi.uploadOpponentBadge(o.id, picked.image);
      say(`Badge saved for ${o.team_name}.`);
      load();
    } catch (err) { fail(err, "That badge didn't upload. Use a PNG or JPG under 2 MB."); } finally { setBusy(null); }
  };

  const confirm = async (o: Opponent, action: 'confirm' | 'reject') => {
    setBusy(o.id);
    try {
      await opponentsApi.confirm(o.id, action);
      say(action === 'confirm' ? `Badge saved for ${o.team_name}.` : `Suggestion removed. Upload ${o.team_name}'s badge yourself.`);
      load();
    } catch (err) { fail(err, "That didn't save. Please try again."); } finally { setBusy(null); }
  };

  const remove = (o: Opponent) => Alert.alert(`Remove ${o.team_name}?`, 'Their badge is removed too. They come back if a post mentions them again.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      try { await opponentsApi.remove(o.id); say(`${o.team_name} removed.`); load(); } catch (err) { fail(err, "That team wasn't removed. Please try again."); }
    } },
  ]);

  const pending = list.filter((o) => o.needs_approval && o.pending_badge_url);
  const search = (team: string) => Linking.openURL(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${team} football club badge`)}`);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
      <Text style={styles.intro}>Upload each opponent&apos;s badge once (PNG or JPG) and it&apos;s used on every match graphic and post. Without one we show their initials. Teams are added here when you play them.</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

      <View style={styles.addRow}>
        <TextInput mode="outlined" label="Add a team" value={name} onChangeText={setName} style={styles.flex} onSubmitEditing={add} returnKeyType="done" />
        <Button mode="contained" onPress={add} loading={busy === 'add'} disabled={!name.trim() || !!busy}>Add</Button>
      </View>

      {pending.length ? (
        <>
          <Text style={styles.section}>IS THIS THE RIGHT BADGE?</Text>
          {pending.map((o) => (
            <View key={o.id} style={[styles.row, { borderColor: c.warning }]}>
              <Image source={{ uri: o.pending_badge_url! }} style={styles.badge} accessibilityLabel={`Suggested badge for ${o.team_name}`} />
              <Text style={[styles.name, styles.flex]} numberOfLines={2}>{o.team_name}</Text>
              <Button compact mode="contained" onPress={() => confirm(o, 'confirm')} disabled={busy === o.id}>Yes</Button>
              <Button compact mode="text" onPress={() => confirm(o, 'reject')} disabled={busy === o.id}>No</Button>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>ALL OPPONENTS ({list.length})</Text>
      {loading ? <ActivityIndicator color={c.primary} style={styles.loading} /> : list.length === 0 ? (
        <View style={styles.empty}><Text style={styles.meta}>No opponents yet. They&apos;re added when you add fixtures, or add one above.</Text></View>
      ) : list.map((o) => (
        <View key={o.id} style={styles.row}>
          {o.effective_badge_url ? <Image source={{ uri: o.effective_badge_url }} style={styles.badge} accessibilityLabel={`${o.team_name} badge`} /> : <Crest name={o.team_name} color="#8E99A4" size={40} />}
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={2}>{o.team_name}</Text>
            <Text style={styles.meta}>{o.effective_badge_url ? 'Badge set' : 'No badge yet'}</Text>
          </View>
          {busy === o.id ? <ActivityIndicator color={c.primary} /> : (
            <>
              <IconButton icon="image-plus" onPress={() => upload(o)} accessibilityLabel={`Upload ${o.team_name}'s badge`} />
              <IconButton icon="magnify" onPress={() => search(o.team_name)} accessibilityLabel={`Search the web for ${o.team_name}'s badge`} />
              <IconButton icon="delete-outline" iconColor={c.error} onPress={() => remove(o)} accessibilityLabel={`Remove ${o.team_name}`} />
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 10 },
  intro: { color: c.textLight, lineHeight: 20 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  loading: { marginTop: 16 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  section: { color: c.text, fontFamily: FONTS.displaySemi, fontSize: 15, letterSpacing: 1.5, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 8, paddingLeft: 12, paddingRight: 2 },
  badge: { width: 40, height: 40, resizeMode: 'contain' },
  name: { color: c.text, fontWeight: '800', fontSize: 15 },
  meta: { color: c.textLight, fontSize: 12 },
  empty: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
}));
