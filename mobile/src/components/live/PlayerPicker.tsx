import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';

export interface PickablePlayer {
  id: string;
  name: string;
  number: number | null;
  /** Small label after the name, e.g. "On the bench" when the full squad is shown */
  where?: string | null;
}

/**
 * Full-screen-ish list of the squad with big tap targets, for use on the touchline.
 * Tapping outside the list calls onDismiss (defaults to onCancel).
 * With `toggle`, a line under the title says who's listed ("On the pitch · 11")
 * and one tap switches to the full squad and back.
 */
export default function PlayerPicker({ visible, title, players, onPick, onSkip, skipLabel, onCancel, cancelLabel, onDismiss, excludeId, emptyText, heading, toggle }: {
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
  /** Shown when nobody can be picked (default: add players first) */
  emptyText?: string;
  /** Who's listed, under the title */
  heading?: string | null;
  /** Show the full squad / back to the usual group */
  toggle?: { label: string; on: boolean; onPress: () => void } | null;
}) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const shown = players.filter((p) => p.id !== excludeId);
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss ?? onCancel} contentContainerStyle={styles.modal}>
        <Text style={styles.title}>{title}</Text>
        {heading || toggle ? (
          <View style={styles.headRow}>
            {heading ? <Text style={styles.heading} accessibilityLiveRegion="polite">{heading}</Text> : <View />}
            {toggle ? (
              <Pressable
                onPress={toggle.onPress}
                accessibilityRole="switch"
                accessibilityState={{ checked: toggle.on }}
                accessibilityLabel={toggle.label}
                hitSlop={6}
                style={({ pressed }) => [styles.toggle, toggle.on ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : null, pressed ? styles.pressed : null]}
              >
                <Text style={[styles.toggleText, toggle.on ? { color: COLORS.onPrimary } : null]}>{toggle.label}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <ScrollView style={styles.list}>
          {shown.map((p) => (
            <Pressable key={p.id} onPress={() => onPick(p)} accessibilityRole="button" accessibilityLabel={p.where ? `${p.name}, ${p.where}` : p.name}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
              <Text style={styles.number}>{p.number ?? ''}</Text>
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
              {p.where ? <Text style={styles.where} numberOfLines={1}>{p.where}</Text> : null}
            </Pressable>
          ))}
          {!shown.length ? <Text style={styles.empty}>{emptyText ?? 'Add players in Manage Squad first.'}</Text> : null}
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
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  heading: { color: COLORS.textLight, fontFamily: FONTS.displaySemi, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', fontVariant: ['tabular-nums'], flexShrink: 1 },
  toggle: { minHeight: 44, justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 14 },
  toggleText: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  pressed: { backgroundColor: COLORS.primarySoft },
  number: { width: 40, color: COLORS.textLight, fontWeight: '800', fontSize: 16, fontVariant: ['tabular-nums'] },
  name: { color: COLORS.text, fontSize: 17, fontWeight: '600', flex: 1 },
  where: { color: COLORS.textLight, fontSize: 12, marginLeft: 8 },
  empty: { color: COLORS.textLight, paddingVertical: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 12 },
  action: { paddingHorizontal: 14, paddingVertical: 10 },
  actionText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
}));
