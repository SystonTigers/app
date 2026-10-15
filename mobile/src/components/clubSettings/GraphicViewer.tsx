import React from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import GraphicPreview from './GraphicPreview';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';

/** One style's graphics full size, one at a time, with the button to use the style. */
export default function GraphicViewer({ pack, samples, index, version, onIndex, onClose, action }: {
  pack: { id: string; name: string } | null;
  samples: Array<[string, string]>;
  index: number;
  version: string;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** "Use this style", "In use" or why it can't be chosen */
  action: React.ReactNode;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const { width, height } = useWindowDimensions();
  // As big as fits: the graphic is 4:5, leave room for the title and buttons
  const size = Math.max(200, Math.min(width - 64, (height - 260) * 0.8, 480));
  const [sample, label] = samples[index] ?? samples[0];
  const step = (by: number) => onIndex((index + by + samples.length) % samples.length);
  return (
    <Portal>
      <Modal visible={!!pack} onDismiss={onClose} contentContainerStyle={styles.modal}>
        {pack ? (
          <>
            <View style={styles.head}>
              <Text style={styles.title} numberOfLines={1}>{pack.name}</Text>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.close}>
                <MaterialCommunityIcons name="close" size={24} color={c.text} />
              </Pressable>
            </View>
            <View style={styles.stage}>
              <GraphicPreview key={`${pack.id}-${sample}`} pack={pack.id} sample={sample} label={label} version={version} width={size} spaced={false} />
            </View>
            <View style={styles.nav}>
              <Pressable onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel="Previous graphic" style={styles.arrow} hitSlop={6}>
                <MaterialCommunityIcons name="chevron-left" size={28} color={c.text} />
              </Pressable>
              <Text style={styles.count} accessibilityLiveRegion="polite">{label} · {index + 1} of {samples.length}</Text>
              <Pressable onPress={() => step(1)} accessibilityRole="button" accessibilityLabel="Next graphic" style={styles.arrow} hitSlop={6}>
                <MaterialCommunityIcons name="chevron-right" size={28} color={c.text} />
              </Pressable>
            </View>
            <View style={styles.action}>{action}</View>
          </>
        ) : null}
      </Modal>
    </Portal>
  );
}


const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, margin: 16, borderRadius: 18, padding: 16, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { flex: 1, color: c.text, fontFamily: FONTS.display, fontSize: 24, letterSpacing: 0.5, textTransform: 'uppercase' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stage: { alignItems: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  count: { color: c.textLight, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  action: { marginTop: 8, alignItems: 'stretch' },
}));
