import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FONTS } from '../../theme/brandFonts';

/** A Match Centre button: an icon chip and a label; `hero` fills with the club colour. */
export default function ActionTile({ icon, label, onPress, disabled, color, iconColor, hero, wide, quarter }: {
  icon: string; label: string; onPress: () => void; disabled?: boolean; color: string; iconColor?: string; hero?: boolean; wide?: boolean; quarter?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, wide ? styles.wide : null, quarter ? styles.quarter : null, hero ? { backgroundColor: color, borderColor: color } : null, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}
    >
      <View style={[styles.chip, hero ? styles.chipHero : { backgroundColor: `${iconColor ?? color}22` }]}>
        <MaterialCommunityIcons name={icon as any} size={hero ? 30 : 24} color={hero ? '#06080B' : iconColor ?? color} />
      </View>
      <Text style={[styles.label, hero ? styles.labelHero : null]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flexBasis: '30%', flexGrow: 1, minHeight: 92, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#12161B', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 6, gap: 8 },
  wide: { flexBasis: '45%', minHeight: 104 },
  quarter: { flexBasis: '22%', minHeight: 84, paddingHorizontal: 2 },
  chip: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipHero: { backgroundColor: 'rgba(6,8,11,0.15)', width: 52, height: 52 },
  label: { color: '#F2F5F7', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  labelHero: { color: '#06080B', fontFamily: FONTS.display, fontSize: 22, letterSpacing: 1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.35 },
});
