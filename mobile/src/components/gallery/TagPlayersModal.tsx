import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Modal, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { withOpacity } from '../../theme/utils';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, galleryApi, squadApi } from '../../services/api';

interface SquadPlayer { id: string; name: string; number: number | null }

/**
 * Staff: tick who's in a gallery photo. Tagged photos also show on each
 * player's page (other members see them only with photo consent).
 */
export default function TagPlayersModal({ photoId, tagged, onClose, onSaved }: {
  photoId: string | null;
  tagged: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: (players: Array<{ id: string; name: string }>) => void;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const [squad, setSquad] = useState<SquadPlayer[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Start from the current tags each time a photo opens
  const taggedKey = tagged.map((p) => p.id).join(',');
  useEffect(() => {
    if (!photoId) return;
    setChosen(new Set(taggedKey ? taggedKey.split(',') : []));
    setSearch('');
    setError('');
  }, [photoId, taggedKey]);

  // The squad loads once, the first time the picker opens
  useEffect(() => {
    if (!photoId || squad) return;
    squadApi.getSquad()
      .then((res: { data?: unknown }) => {
        const rows = Array.isArray(res?.data) ? (res.data as Array<Record<string, unknown>>) : [];
        setSquad(rows
          .filter((r) => typeof r.id === 'string')
          .map((r) => ({ id: r.id as string, name: String(r.name ?? 'Player'), number: typeof r.number === 'number' && r.number > 0 ? r.number : null }))
          .sort((x, y) => x.name.localeCompare(y.name)));
      })
      .catch((err) => setError(apiErrorMessage(err, "The squad couldn't load. Check your signal and try again.")));
  }, [photoId, squad]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (squad ?? []).filter((p) => !q || p.name.toLowerCase().includes(q) || String(p.number ?? '') === q);
  }, [squad, search]);

  const toggle = (id: string) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    if (!photoId) return;
    setSaving(true);
    setError('');
    try {
      onSaved(await galleryApi.tagPlayers(photoId, [...chosen]));
    } catch (err) {
      setError(apiErrorMessage(err, "The tags didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={!!photoId} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <Text style={styles.title}>WHO&apos;S IN THIS PHOTO?</Text>
        <Text style={styles.help}>Tagged players see this photo on their page. Other members only see it there if a parent has said yes to photos.</Text>
        <TextInput mode="outlined" dense value={search} onChangeText={setSearch} placeholder="Search by name or number" left={<TextInput.Icon icon="magnify" />} accessibilityLabel="Search the squad" style={styles.search} />
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {!squad && !error ? <ActivityIndicator color={c.primary} style={styles.loading} /> : null}
        <ScrollView style={styles.list}>
          {shown.map((p) => {
            const on = chosen.has(p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => toggle(p.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={[styles.row, on ? { backgroundColor: withOpacity(c.primary, 0.14) } : null]}
              >
                <MaterialCommunityIcons name={on ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={on ? c.primary : c.textLight} />
                <Text style={styles.number}>{p.number ?? ''}</Text>
                <Text style={styles.name}>{p.name}</Text>
              </Pressable>
            );
          })}
          {squad && !shown.length ? <Text style={styles.help}>No players match that search.</Text> : null}
        </ScrollView>
        <View style={styles.actions}>
          <Button onPress={onClose}>Cancel</Button>
          <Button mode="contained" onPress={save} loading={saving} disabled={saving || !squad}>
            {chosen.size ? `Save (${chosen.size})` : 'Save'}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, margin: 16, padding: 16, borderRadius: 18, maxHeight: '88%', maxWidth: 560, width: '92%', alignSelf: 'center' },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 22, letterSpacing: 1 },
  help: { color: c.textLight, fontSize: 13, marginTop: 4, lineHeight: 18 },
  search: { marginTop: 12 },
  error: { color: c.error, marginTop: 8 },
  loading: { marginVertical: 20 },
  list: { marginTop: 8, flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 8, borderRadius: 10 },
  number: { color: c.textLight, width: 24, textAlign: 'right', fontVariant: ['tabular-nums'] },
  name: { color: c.text, fontSize: 15, fontWeight: '600', flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
}));
