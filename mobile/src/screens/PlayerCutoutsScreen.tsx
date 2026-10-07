import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { apiErrorMessage, cutoutsApi, type CutoutPlayer } from '../services/api';
import CutoutMaker from '../components/cutouts/CutoutMaker';

/**
 * Staff: each player's cut-out photo (their background removed), which
 * stands in the club's goal graphics and player posts when they score.
 * Only used for players whose family said yes to photos.
 */
export default function PlayerCutoutsScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const [players, setPlayers] = useState<CutoutPlayer[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState<CutoutPlayer | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setPlayers(await cutoutsApi.list());
    } catch (err) {
      setError(apiErrorMessage(err, "The squad didn't load. Check your signal and pull to refresh."));
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saved = (playerId: string, cutoutUrl: string) => {
    const name = open?.name ?? 'Their';
    setOpen(null);
    setNotice(`${name}'s cut-out is saved.`);
    setPlayers((list) => list?.map((p) => (p.playerId === playerId ? { ...p, cutoutUrl } : p)) ?? list);
  };

  const remove = (p: CutoutPlayer) => {
    Alert.alert(`Remove ${p.name}'s cut-out?`, 'Their graphics will use their ordinary photo instead, if they have one.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setRemoving(p.playerId); setNotice(''); setError('');
          try {
            await cutoutsApi.remove(p.playerId);
            setPlayers((list) => list?.map((x) => (x.playerId === p.playerId ? { ...x, cutoutUrl: null } : x)) ?? list);
          } catch (err) {
            setError(apiErrorMessage(err, "That didn't work. Please try again."));
          } finally {
            setRemoving(null);
          }
        },
      },
    ]);
  };

  const done = players?.filter((p) => p.cutoutUrl).length ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>IN YOUR GOAL GRAPHICS</Text>
        <Text style={styles.body}>When a player scores, their cut-out stands in the goal graphic. Choose a photo of each player and the app takes the background out.</Text>
        <Text style={styles.meta}>Only used for players whose family said yes to photos.{players?.length ? ` ${done} of ${players.length} done.` : ''}</Text>
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {!players && !error ? <ActivityIndicator color={c.primary} style={styles.loading} /> : null}
      {players && !players.length ? <Text style={styles.body}>Add players in Manage Squad first.</Text> : null}

      {players?.map((p) => (
        <View key={p.playerId} style={styles.row}>
          <View style={styles.thumb}>
            {p.cutoutUrl ? (
              <Image source={{ uri: p.cutoutUrl }} style={styles.thumbImage} resizeMode="contain" accessibilityLabel={`${p.name} cut out`} />
            ) : (
              <Text style={styles.thumbText}>{p.number ?? p.name.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>{p.number !== null ? `${p.number}. ` : ''}{p.name}</Text>
            <Text style={[styles.meta, p.cutoutUrl ? { color: c.success } : null]}>{p.cutoutUrl ? 'Cut-out ready' : 'No cut-out yet'}</Text>
            {p.photoConsent !== true ? (
              <Text style={styles.warn}>{p.photoConsent === false ? "Family said no to photos: it won't be used" : "No photo consent yet: it won't be used until they say yes"}</Text>
            ) : null}
          </View>
          <View style={styles.buttons}>
            <Button mode={p.cutoutUrl ? 'outlined' : 'contained'} compact onPress={() => { setNotice(''); setOpen(p); }}
              accessibilityLabel={p.cutoutUrl ? `Change ${p.name}'s cut-out` : `Make a cut-out of ${p.name}`}>
              {p.cutoutUrl ? 'Change' : 'Add'}
            </Button>
            {p.cutoutUrl ? (
              <Button mode="text" compact textColor={c.error} loading={removing === p.playerId} disabled={!!removing} onPress={() => remove(p)}
                accessibilityLabel={`Remove ${p.name}'s cut-out`}>
                Remove
              </Button>
            ) : null}
          </View>
        </View>
      ))}

      <CutoutMaker player={open} onClose={() => setOpen(null)} onSaved={saved} />
    </ScrollView>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 10 },
  loading: { marginTop: 24 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 8 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  body: { color: c.text, lineHeight: 21 },
  meta: { color: c.textLight, fontSize: 12, marginTop: 2 },
  warn: { color: c.warning, fontSize: 12, fontWeight: '700', marginTop: 2 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 10, minHeight: 72 },
  thumb: { width: 52, height: 64, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbText: { color: c.onPrimary, fontFamily: FONTS.display, fontSize: 24, marginBottom: 14 },
  flex: { flex: 1 },
  name: { color: c.text, fontWeight: '800' },
  buttons: { alignItems: 'flex-end', gap: 2 },
}));
