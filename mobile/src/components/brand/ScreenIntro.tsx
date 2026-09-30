import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../../theme/brandFonts';
import { TEXT, TEXT_MUTED, useBrandColors } from '../../theme/brand';

/**
 * The top of a screen, in the home screen's style: condensed capitals with the
 * club colour tick, a short line underneath and an optional action on the right.
 */
export default function ScreenIntro({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const c = useBrandColors();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.tick, { backgroundColor: c.primary }]} />
        <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>{title.toUpperCase()}</Text>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tick: { width: 5, height: 24, borderRadius: 2 },
  title: { flex: 1, color: TEXT, fontFamily: FONTS.display, fontSize: 28, letterSpacing: 1 },
  right: { marginLeft: 'auto' },
  subtitle: { color: TEXT_MUTED, fontSize: 14, marginTop: 4, marginLeft: 15 },
});
