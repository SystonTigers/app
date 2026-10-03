import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LeagueRows, { type LeaguePalette } from '../league/LeagueRows';
import { liveHeadline, ourMoveText, type LeagueRow, type LiveLeagueTable } from '../../utils/leagueTable';

const LIVE_RED = '#FF3B5C';

/**
 * Home: our league row and the teams around us. While a league game is on it
 * becomes "As it stands" with the live score counted.
 */
export default function LeagueStrip({ rows, ourTeam, live, color, onPress }: {
  rows: LeagueRow[]; ourTeam: string; live: LiveLeagueTable | null; color: string; onPress: () => void;
}) {
  const palette: LeaguePalette = {
    text: '#F2F5F7',
    muted: 'rgba(242,245,247,0.6)',
    line: 'rgba(255,255,255,0.07)',
    brand: color,
    highlight: 'rgba(255,255,255,0.06)',
    up: '#2BD576',
    down: LIVE_RED,
  };
  const move = live ? ourMoveText(live, ourTeam) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={live ? `League table as it stands, ${liveHeadline(live)}. Open the full table` : 'Open the full league table'}
      style={({ pressed }) => [styles.card, live ? { borderColor: LIVE_RED } : null, pressed ? styles.pressed : null]}
    >
      {live ? (
        <View style={styles.liveHead}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>AS IT STANDS</Text>
          <Text style={styles.liveScore} numberOfLines={1}>{liveHeadline(live)}</Text>
          {move ? <Text style={[styles.move, { color }]}>{move}</Text> : null}
        </View>
      ) : null}
      <LeagueRows rows={rows} ourTeam={ourTeam} palette={palette} showMoves={!!live} />
      <View style={styles.footer}>
        <Text style={[styles.more, { color }]}>Full table</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={color} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 4, borderRadius: 18, backgroundColor: '#12161B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  pressed: { opacity: 0.85 },
  liveHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 6, flexWrap: 'wrap' },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: LIVE_RED },
  liveLabel: { color: LIVE_RED, fontWeight: '900', fontSize: 11, letterSpacing: 1.2 },
  liveScore: { color: '#F2F5F7', fontWeight: '700', fontSize: 13, flexShrink: 1 },
  move: { fontWeight: '800', fontSize: 12, marginLeft: 'auto' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingVertical: 6, paddingRight: 4 },
  more: { fontWeight: '800', fontSize: 13 },
});
