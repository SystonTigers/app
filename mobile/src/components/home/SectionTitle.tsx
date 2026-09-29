import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../../theme/brandFonts';

/** "LATEST UPDATES ——— See all" */
export default function SectionTitle({ title, color, action, onAction }: { title: string; color: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.row}>
      <View style={[styles.tick, { backgroundColor: color }]} />
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rule} />
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.action, { color }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  tick: { width: 4, height: 16, borderRadius: 2 },
  title: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1.5 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.14)' },
  action: { fontWeight: '800', fontSize: 13 },
});
