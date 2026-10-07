import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Modal, Portal } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { themedStyles } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, cutoutsApi } from '../../services/api';
import CutoutPreview from './CutoutPreview';
import type { CutoutMakerProps } from './types';

/**
 * Phone app (iOS/Android build): pick a PNG that's already cut out and save
 * it. Taking the background out of an ordinary photo happens in the web app
 * (CutoutMaker.web.tsx), which this points staff to.
 */
export default function CutoutMaker({ player, onClose, onSaved }: CutoutMakerProps) {
  const styles = useStyles();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setUri(null); setError(''); setSaving(false); }, [player?.playerId]);

  const pick = async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Allow access to your photos to choose a cut-out.'); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
    if (!picked.canceled && picked.assets[0]) setUri(picked.assets[0].uri);
  };

  const save = async () => {
    if (!player || !uri) return;
    setSaving(true); setError('');
    try {
      onSaved(player.playerId, await cutoutsApi.save(player.playerId, { uri }));
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Check your signal and try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={!!player} onDismiss={saving ? undefined : onClose} contentContainerStyle={styles.modal}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title} accessibilityRole="header">CUT-OUT: {player?.name.toUpperCase()}</Text>
          <Text style={styles.body}>Choose a PNG of {player?.name.split(' ')[0] ?? 'them'} with the background already taken out. To take the background out of an ordinary photo, open the club app in your phone&apos;s browser.</Text>
          {uri ? <CutoutPreview uri={uri} height={320} label={`${player?.name ?? 'Player'} cut out`} /> : null}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <View style={styles.actions}>
            <Button mode={uri ? 'text' : 'contained'} icon="file-png-box" onPress={pick} disabled={saving}>{uri ? 'Choose another' : 'Choose a PNG'}</Button>
            {uri ? <Button mode="contained" icon="check" onPress={save} loading={saving} disabled={saving}>Save cut-out</Button> : null}
          </View>
          <Button mode="text" onPress={onClose} disabled={saving} style={styles.close}>Close</Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, margin: 12, borderRadius: 18, borderWidth: 1, borderColor: c.border, maxHeight: '92%' },
  content: { padding: 16, gap: 12 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 22, letterSpacing: 1 },
  body: { color: c.text, lineHeight: 21 },
  error: { color: c.error, fontWeight: '700', lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
  close: { alignSelf: 'center' },
}));
