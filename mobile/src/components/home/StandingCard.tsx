import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FONTS } from '../../theme/brandFonts';
import { ordinal, type Standing } from '../../utils/leagueStanding';

const STATS: Array<[keyof Standing, string, string]> = [
  ['played', 'P', 'played'],
  ['won', 'W', 'won'],
  ['drawn', 'D', 'drawn'],
  ['lost', 'L', 'lost'],
  ['goalsFor', 'F', 'goals for'],
  ['goalsAgainst', 'A', 'goals against'],
  ['goalDifference', 'GD', 'goal difference'],
  ['points', 'PTS', 'points'],
];

const show = (key: keyof Standing, value: Standing[keyof Standing]) => {
  if (value === null || value === undefined) return '–';
  return key === 'goalDifference' && typeof value === 'number' && value > 0 ? `+${value}` : String(value);
};

/** Home: just our row of the league table (P W D L F A GD Pts). Tap for the full table. */
export default function StandingCard({ standing, color, onPress }: { standing: Standing; color: string; onPress: () => void }) {
  const said = STATS.filter(([key]) => standing[key] !== null).map(([key, , words]) => `${show(key, standing[key])} ${words}`).join(', ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${standing.position ? `${ordinal(standing.position)} in the league` : 'Our league record'}: ${said}. Open the full table`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.top}>
        {standing.position ? <Text style={[styles.pos, { color }]}>{ordinal(standing.position)}</Text> : null}
        <Text style={styles.team} numberOfLines={2}>{standing.team}</Text>
      </View>
      <View style={styles.grid}>
        {STATS.map(([key, label]) => (
          <View key={key} style={styles.stat}>
            <Text style={[styles.label, key === 'points' ? { color } : null]}>{label}</Text>
            <Text style={[styles.value, key === 'points' ? { color } : null]}>{show(key, standing[key])}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={[styles.more, { color }]}>Full table</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={color} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, borderRadius: 18, backgroundColor: '#12161B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 12 },
  pos: { fontFamily: FONTS.display, fontSize: 34, lineHeight: 36, letterSpacing: 0.5 },
  team: { color: '#F2F5F7', fontFamily: FONTS.displaySemi, fontSize: 18, letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 1 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 10 },
  stat: { alignItems: 'center', minWidth: 30 },
  label: { color: 'rgba(242,245,247,0.55)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  value: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 24, marginTop: 2, fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingVertical: 6 },
  more: { fontWeight: '800', fontSize: 13 },
});
