import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';

export interface PickablePlayer {
  id: string;
  name: string;
  number: number | null;
}

/**
 * Full-screen-ish list of the squad with big tap targets, for use on the touchline.
 * Tapping outside the list calls onDismiss (defaults to onCancel).
 */
export default function PlayerPicker({ visible, title, players, onPick, onSkip, skipLabel, onCancel, cancelLabel, onDismiss, excludeId }: {
  visible: boolean;
  title: string;
  players: PickablePlayer[];
  onPick: (player: PickablePlayer) => void;
  onCancel: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  cancelLabel?: string;
  onDismiss?: () => void;
  excludeId?: string | null;
}) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss ?? onCancel} contentContainerStyle={styles.modal}>
        <Text style={styles.title}>{title}</Text>
        <ScrollView style={styles.list}>
          {players.filter((p) => p.id !== excludeId).map((p) => (
            <Pressable key={p.id} onPress={() => onPick(p)} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
              <Text style={styles.number}>{p.number ?? ''}</Text>
              <Text style={styles.name}>{p.name}</Text>
            </Pressable>
          ))}
          {!players.length ? <Text style={styles.empty}>Add players in Manage Squad first.</Text> : null}
        </ScrollView>
        <View style={styles.actions}>
          {onSkip ? (
            <Pressable onPress={onSkip} accessibilityRole="button" style={styles.action}><Text style={styles.actionText}>{skipLabel ?? 'Skip'}</Text></Pressable>
          ) : null}
          <Pressable onPress={onCancel} accessibilityRole="button" style={styles.action}><Text style={styles.actionText}>{cancelLabel ?? 'Cancel'}</Text></Pressable>
        </View>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((COLORS) => ({
  modal: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, margin: 16, borderRadius: 18, padding: 16, maxHeight: '85%' },
  title: { color: COLORS.text, fontFamily: FONTS.display, fontSize: 22, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  pressed: { backgroundColor: COLORS.primarySoft },
  number: { width: 40, color: COLORS.textLight, fontWeight: '800', fontSize: 16 },
  name: { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  empty: { color: COLORS.textLight, paddingVertical: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 12 },
  action: { paddingHorizontal: 14, paddingVertical: 10 },
  actionText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
}));
