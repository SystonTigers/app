import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface QuickAction { label: string; icon: string; onPress: () => void; highlight?: boolean }

/** A grid of big shortcuts, four to a row. */
export default function QuickActions({ actions, color }: { actions: QuickAction[]; color: string }) {
  return (
    <View style={styles.grid}>
      {actions.map((a) => (
        <Pressable key={a.label} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={a.label} style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}>
          <View style={[styles.icon, { backgroundColor: a.highlight ? color : `${color}1F`, borderColor: `${color}55` }]}>
            <MaterialCommunityIcons name={a.icon as any} size={24} color={a.highlight ? '#06080B' : color} />
          </View>
          <Text style={styles.label} numberOfLines={2}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  tile: { width: '25%', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 6 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  icon: { width: 54, height: 54, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { color: 'rgba(242,245,247,0.85)', fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
