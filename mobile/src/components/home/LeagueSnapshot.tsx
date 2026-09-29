import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FONTS } from '../../theme/brandFonts';
import { ordinal } from './homeUtils';

/** Where the club sits in the league: position, points, wins, goal difference. */
export default function LeagueSnapshot({ position, points, won, goalDifference, color, onPress }: {
  position: number | null; points: string; won: string; goalDifference: number; color: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="League table" style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <View style={[styles.pos, { borderColor: color }]}>
        <Text style={[styles.posValue, { color }]}>{position ? ordinal(position) : '–'}</Text>
        <Text style={styles.posLabel}>IN LEAGUE</Text>
      </View>
      <Stat label="PTS" value={points} />
      <Stat label="WON" value={won} />
      <Stat label="GD" value={`${goalDifference > 0 ? '+' : ''}${goalDifference}`} />
      <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(242,245,247,0.4)" />
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 12, borderRadius: 18, backgroundColor: '#12161B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 6 },
  pressed: { opacity: 0.85 },
  pos: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', marginRight: 6 },
  posValue: { fontFamily: FONTS.display, fontSize: 30, lineHeight: 32 },
  posLabel: { color: 'rgba(242,245,247,0.55)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 26, lineHeight: 28 },
  statLabel: { color: 'rgba(242,245,247,0.55)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
