import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { COLORS } from '../../config';

export interface PickablePlayer {
  id: string;
  name: string;
  number: number | null;
}

/** Full-screen-ish list of the squad with big tap targets, for use on the touchline. */
export default function PlayerPicker({ visible, title, players, onPick, onSkip, skipLabel, onCancel, excludeId }: {
  visible: boolean;
  title: string;
  players: PickablePlayer[];
  onPick: (player: PickablePlayer) => void;
  onCancel: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  excludeId?: string | null;
}) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onCancel} contentContainerStyle={styles.modal}>
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
          <Pressable onPress={onCancel} accessibilityRole="button" style={styles.action}><Text style={styles.actionText}>Cancel</Text></Pressable>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: '#14181C', margin: 16, borderRadius: 12, padding: 16, maxHeight: '85%' },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(192,192,192,0.25)' },
  pressed: { backgroundColor: 'rgba(0,255,255,0.08)' },
  number: { width: 40, color: COLORS.textLight, fontWeight: '800', fontSize: 16 },
  name: { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  empty: { color: COLORS.textLight, paddingVertical: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  action: { paddingHorizontal: 14, paddingVertical: 10 },
  actionText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
});
