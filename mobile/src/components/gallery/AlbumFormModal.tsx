import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Chip, Modal, Portal, TextInput } from 'react-native-paper';
import { themedStyles } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, galleryApi, type GalleryAlbum } from '../../services/api';
import { ALBUM_KINDS, type AlbumKind } from '../../utils/gallery';
import { localDay, normaliseResultDate } from '../../utils/results';

/** Staff: make an album (a day out, a match, a throwback) or rename one. */
export default function AlbumFormModal({ visible, editing, onClose, onSaved }: {
  visible: boolean;
  editing: GalleryAlbum | null;
  onClose: () => void;
  onSaved: (album: GalleryAlbum) => void;
}) {
  const styles = useStyles();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<AlbumKind>('social');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError('');
    setTitle(editing?.title ?? '');
    setDate(editing?.date?.slice(0, 10) ?? localDay(new Date()));
    setType(editing?.type ?? 'social');
  }, [visible, editing]);

  const save = async () => {
    const name = title.trim();
    const day = normaliseResultDate(date);
    if (!name) return setError('Give the album a name, like "Skegness day out".');
    if (!day) return setError('Enter the date, for example 14/06/2025.');
    setSaving(true);
    setError('');
    try {
      const album = editing
        ? await galleryApi.updateAlbum(editing.id, { title: name, date: day, type })
        : await galleryApi.createAlbum({ title: name, date: day, type });
      onSaved(album);
    } catch (err) {
      setError(apiErrorMessage(err, "The album didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={saving ? undefined : onClose} contentContainerStyle={styles.modal}>
        <Text style={styles.title}>{editing ? 'Edit album' : 'New album'}</Text>
        <TextInput label="Album name" accessibilityLabel="Album name" placeholder="Skegness day out" value={title} onChangeText={setTitle} mode="outlined" maxLength={80} style={styles.input} />
        <TextInput label="Date" accessibilityLabel="Date" placeholder="14/06/2025" value={date} onChangeText={setDate} mode="outlined" style={styles.input} />
        <Text style={styles.help}>Old photos? Use the date they were taken and the album goes into that season.</Text>
        <View style={styles.chips}>
          {ALBUM_KINDS.map((k) => (
            <Chip key={k.id} selected={type === k.id} onPress={() => setType(k.id)} style={styles.chip}>{`${k.icon} ${k.label}`}</Chip>
          ))}
        </View>
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.buttons}>
          <Button mode="outlined" onPress={onClose} disabled={saving} style={styles.button}>Cancel</Button>
          <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={styles.button}>{editing ? 'Save' : 'Make album'}</Button>
        </View>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, margin: 20, borderRadius: 18, padding: 20, maxWidth: 560, alignSelf: 'center', width: '92%' },
  title: { fontFamily: FONTS.display, fontSize: 24, letterSpacing: 1, textTransform: 'uppercase', color: c.text, marginBottom: 12 },
  input: { marginBottom: 10 },
  help: { color: c.textLight, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderRadius: 999 },
  error: { color: c.error, marginBottom: 10 },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1 },
}));
