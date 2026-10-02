import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { Button, Checkbox, Modal, Portal, ProgressBar, TextInput } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { galleryApi } from '../../services/api';
import { photoCount, uploadSummary } from '../../utils/gallery';

/**
 * Staff: check the picked photos, confirm consent and upload them to the
 * album one at a time (a weak signal fails one photo, not the lot).
 */
export default function UploadPhotosModal({ uris, albumId, onClose, onDone }: {
  /** Photos picked on the phone; empty hides the modal */
  uris: string[];
  albumId: string;
  onClose: () => void;
  /** Called with a message once uploading finishes (some may have failed) */
  onDone: (message: string, failed: string[]) => void;
}) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [caption, setCaption] = useState('');
  const [throwback, setThrowback] = useState(false);
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    if (uris.length) {
      setCaption('');
      setThrowback(false);
      setConsent(false);
      setProgress(null);
    }
  }, [uris]);

  const upload = async () => {
    const failed: string[] = [];
    setProgress(0);
    for (let i = 0; i < uris.length; i += 1) {
      try {
        await galleryApi.uploadPhoto({ imageUri: uris[i], albumId, caption: caption.trim() || undefined, tags: throwback ? ['throwback'] : [] });
      } catch {
        failed.push(uris[i]);
      }
      setProgress(i + 1);
    }
    onDone(uploadSummary(uris.length - failed.length, uris.length), failed);
  };

  const busy = progress !== null;
  return (
    <Portal>
      <Modal visible={uris.length > 0} onDismiss={busy ? undefined : onClose} contentContainerStyle={styles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Add {photoCount(uris.length)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previews}>
            {uris.slice(0, 12).map((u) => <Image key={u} source={{ uri: u }} style={styles.preview} />)}
            {uris.length > 12 ? <Text style={styles.more}>+{uris.length - 12}</Text> : null}
          </ScrollView>
          <TextInput label="Caption (optional, for every photo)" accessibilityLabel="Caption (optional, for every photo)" value={caption} onChangeText={setCaption} mode="outlined" maxLength={500} style={styles.input} disabled={busy} />
          <View style={styles.row}>
            <Checkbox status={throwback ? 'checked' : 'unchecked'} onPress={() => setThrowback(!throwback)} color={COLORS.primary} disabled={busy} />
            <Text style={styles.label} onPress={() => !busy && setThrowback(!throwback)}>Can be posted for Throwback Thursday</Text>
          </View>
          <View style={styles.consent}>
            <View style={styles.row}>
              <Checkbox status={consent ? 'checked' : 'unchecked'} onPress={() => setConsent(!consent)} color={COLORS.primary} disabled={busy} />
              <Text style={styles.label} onPress={() => !busy && setConsent(!consent)}>Everyone pictured is OK with this</Text>
            </View>
            <Text style={styles.help}>
              Parents or guardians have agreed for any under-18s pictured. The gallery is only for club members. Photos ticked for Throwback Thursday may be posted on the club's social media, and only if the club allows player photos in posts.
            </Text>
          </View>
          {busy ? (
            <View style={styles.progress}>
              <ProgressBar progress={uris.length ? (progress ?? 0) / uris.length : 0} color={COLORS.primary} />
              <Text style={styles.help}>Uploading {Math.min((progress ?? 0) + 1, uris.length)} of {uris.length}…</Text>
            </View>
          ) : null}
          <View style={styles.buttons}>
            <Button mode="outlined" onPress={onClose} disabled={busy} style={styles.button}>Cancel</Button>
            <Button mode="contained" onPress={upload} disabled={!consent || busy} loading={busy} style={styles.button}>Upload</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, margin: 20, borderRadius: 18, padding: 20, maxHeight: '90%', maxWidth: 560, alignSelf: 'center', width: '92%' },
  title: { fontFamily: FONTS.display, fontSize: 24, letterSpacing: 1, textTransform: 'uppercase', color: c.text, marginBottom: 12 },
  previews: { gap: 8, paddingBottom: 12, alignItems: 'center' },
  preview: { width: 72, height: 72, borderRadius: 10, backgroundColor: c.surfaceRaised },
  more: { color: c.textLight, fontWeight: '800', paddingHorizontal: 8 },
  input: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { color: c.text, fontSize: 14, flex: 1 },
  consent: { backgroundColor: c.surfaceRaised, borderRadius: 12, padding: 10, marginVertical: 10 },
  help: { color: c.textLight, fontSize: 12, lineHeight: 17 },
  progress: { gap: 6, marginBottom: 12 },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1 },
}));
