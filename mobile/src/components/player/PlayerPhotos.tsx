import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { IconButton, Modal, Portal } from 'react-native-paper';
import { themedStyles } from '../../theme/brand';

/** A player's photos in a grid; tap one to see it large. */
export default function PlayerPhotos({ photos, name }: { photos: Array<{ id: string; url: string }>; name: string }) {
  const styles = useStyles();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View style={styles.grid}>
      {photos.map((p, i) => (
        <Pressable key={p.id} onPress={() => setOpen(p.url)} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 1} of ${name}`} style={styles.cell}>
          <Image source={{ uri: p.url }} style={styles.thumb} resizeMode="cover" />
        </Pressable>
      ))}
      <Portal>
        <Modal visible={!!open} onDismiss={() => setOpen(null)} contentContainerStyle={styles.modal}>
          {open ? <Image source={{ uri: open }} style={styles.full} resizeMode="contain" accessibilityLabel={`Photo of ${name}`} /> : null}
          <IconButton icon="close" iconColor="#fff" style={styles.close} onPress={() => setOpen(null)} accessibilityLabel="Close photo" />
        </Modal>
      </Portal>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: '32%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surfaceRaised },
  thumb: { width: '100%', height: '100%' },
  modal: { margin: 12, height: '85%', backgroundColor: '#000', borderRadius: 14, overflow: 'hidden' },
  full: { width: '100%', height: '100%' },
  close: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)' },
}));
