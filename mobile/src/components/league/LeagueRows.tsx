import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FONTS } from '../../theme/brandFonts';
import { cell, gdText, movement, sameTeam, type LeagueRow } from '../../utils/leagueTable';

export interface LeaguePalette {
  text: string;
  muted: string;
  line: string;
  brand: string;
  /** Background of our row */
  highlight: string;
  up: string;
  down: string;
}

const COLUMNS: Array<[string, (r: LeagueRow) => string]> = [
  ['P', (r) => String(r.played)],
  ['W', (r) => String(r.won)],
  ['D', (r) => String(r.drawn)],
  ['L', (r) => String(r.lost)],
  ['F', (r) => cell(r.goalsFor)],
  ['A', (r) => cell(r.goalsAgainst)],
  ['GD', (r) => gdText(r.goalDifference)],
];

/**
 * Table rows with P W D L F A GD PTS, our row highlighted. In an "as it
 * stands" table an arrow shows who has moved and a dot who is playing now.
 */
export default function LeagueRows({ rows, ourTeam, palette, showMoves = false }: {
  rows: LeagueRow[]; ourTeam: string | null; palette: LeaguePalette; showMoves?: boolean;
}) {
  return (
    <View accessibilityRole="list">
      <View style={[styles.row, styles.head, { borderBottomColor: palette.line }]}>
        <Text style={[styles.pos, styles.headText, { color: palette.muted }]}>#</Text>
        <Text style={[styles.team, styles.headText, { color: palette.muted }]}>TEAM</Text>
        {COLUMNS.map(([label]) => (
          <Text key={label} style={[label === 'GD' ? styles.gd : styles.num, styles.headText, { color: palette.muted }]}>{label}</Text>
        ))}
        <Text style={[styles.pts, styles.headText, { color: palette.muted }]}>PTS</Text>
      </View>
      {rows.map((r) => {
        const us = !!ourTeam && sameTeam(r.team, ourTeam);
        const move = movement(r);
        return (
          <View
            key={r.team}
            style={[styles.row, { borderBottomColor: palette.line }, us ? { backgroundColor: palette.highlight } : null]}
            accessible
            accessibilityLabel={`${r.position}. ${r.team}${us ? ' (us)' : ''}: played ${r.played}, goal difference ${gdText(r.goalDifference)}, ${r.points} points${showMoves && move === 'up' ? ', moving up' : ''}${showMoves && move === 'down' ? ', moving down' : ''}${r.playing ? ', playing now' : ''}`}
          >
            <View style={[styles.pos, styles.posCell]}>
              <Text style={[styles.posText, { color: us ? palette.brand : palette.text }]}>{r.position}</Text>
              {showMoves && (move === 'up' || move === 'down') ? (
                <MaterialCommunityIcons name={move === 'up' ? 'menu-up' : 'menu-down'} size={16} color={move === 'up' ? palette.up : palette.down} />
              ) : null}
            </View>
            <View style={[styles.team, styles.teamCell]}>
              {r.playing ? <View style={[styles.liveDot, { backgroundColor: palette.down }]} /> : null}
              <Text numberOfLines={1} style={[styles.teamText, { color: us ? palette.brand : palette.text }, us ? styles.bold : null]}>{r.team}</Text>
            </View>
            {COLUMNS.map(([label, value]) => (
              <Text key={label} style={[label === 'GD' ? styles.gd : styles.num, styles.numText, { color: palette.muted }]}>{value(r)}</Text>
            ))}
            <Text style={[styles.pts, styles.ptsText, { color: us ? palette.brand : palette.text }]}>{r.points}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { paddingVertical: 6 },
  headText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  pos: { width: 30 },
  posCell: { flexDirection: 'row', alignItems: 'center' },
  posText: { fontFamily: FONTS.display, fontSize: 17 },
  team: { flex: 1, minWidth: 0, paddingRight: 4 },
  teamCell: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  teamText: { fontSize: 13, flexShrink: 1 },
  bold: { fontWeight: '800' },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  num: { width: 20, textAlign: 'center' },
  gd: { width: 30, textAlign: 'center' },
  numText: { fontSize: 12 },
  pts: { width: 32, textAlign: 'right' },
  ptsText: { fontFamily: FONTS.display, fontSize: 17 },
});
