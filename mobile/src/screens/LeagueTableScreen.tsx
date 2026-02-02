import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, Text } from 'react-native-paper';
import { useTheme } from '../theme/useTheme';

// Mock league table data
const mockLeagueTable = [
  { position: 1, team: 'Syston Tigers', played: 10, won: 8, drawn: 1, lost: 1, gf: 25, ga: 8, gd: 17, points: 25 },
  { position: 2, team: 'Leicester Panthers', played: 10, won: 7, drawn: 2, lost: 1, gf: 22, ga: 10, gd: 12, points: 23 },
  { position: 3, team: 'Melton Town', played: 10, won: 6, drawn: 2, lost: 2, gf: 18, ga: 12, gd: 6, points: 20 },
  { position: 4, team: 'Oadby Rangers', played: 10, won: 5, drawn: 3, lost: 2, gf: 17, ga: 13, gd: 4, points: 18 },
  { position: 5, team: 'Barrow United', played: 10, won: 4, drawn: 2, lost: 4, gf: 15, ga: 15, gd: 0, points: 14 },
];

export default function LeagueTableScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>LEAGUE STANDINGS</Text>
        <Text style={[styles.headerSubtitle, { color: colors.primary }]}>PREMIER DIVISION</Text>
      </View>

      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, minWidth: '100%' }}>
          <DataTable style={styles.table}>
            <DataTable.Header style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
              <DataTable.Title style={styles.posColumn}><Text style={[styles.colHeader, { color: colors.secondary }]}>POS</Text></DataTable.Title>
              <DataTable.Title style={styles.teamColumn}><Text style={[styles.colHeader, { color: colors.secondary }]}>TEAM</Text></DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}><Text style={[styles.colHeader, { color: colors.secondary }]}>P</Text></DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}><Text style={[styles.colHeader, { color: colors.secondary }]}>W</Text></DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}><Text style={[styles.colHeader, { color: colors.secondary }]}>D</Text></DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}><Text style={[styles.colHeader, { color: colors.secondary }]}>L</Text></DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}><Text style={[styles.colHeader, { color: colors.secondary }]}>GF</Text></DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}><Text style={[styles.colHeader, { color: colors.secondary }]}>GA</Text></DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}><Text style={[styles.colHeader, { color: colors.secondary }]}>GD</Text></DataTable.Title>
              <DataTable.Title numeric style={styles.ptsColumn}><Text style={[styles.colHeader, { color: colors.primary }]}>PTS</Text></DataTable.Title>
            </DataTable.Header>

            {mockLeagueTable.map((row, index) => {
              const isTop = index === 0;
              return (
                <DataTable.Row
                  key={row.position}
                  style={[
                    styles.row,
                    { borderBottomColor: colors.border },
                    row.team === 'Syston Tigers' && { backgroundColor: 'rgba(0, 255, 255, 0.05)' }
                  ]}
                >
                  <DataTable.Cell style={styles.posColumn}>
                    <View style={[styles.rankBadge, isTop && { borderColor: colors.primary, borderWidth: 1 }]}>
                      <Text style={[styles.rankText, { color: isTop ? colors.primary : colors.textSecondary }]}>
                        {row.position}
                      </Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.teamColumn}>
                    <Text style={[styles.teamText, { color: colors.text, fontWeight: row.team === 'Syston Tigers' ? 'bold' : 'normal' }]}>
                      {row.team.toUpperCase()}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={styles.statColumn}><Text style={{ color: colors.textSecondary }}>{row.played}</Text></DataTable.Cell>
                  <DataTable.Cell numeric style={styles.statColumn}><Text style={{ color: colors.textSecondary }}>{row.won}</Text></DataTable.Cell>
                  <DataTable.Cell numeric style={styles.statColumn}><Text style={{ color: colors.textSecondary }}>{row.drawn}</Text></DataTable.Cell>
                  <DataTable.Cell numeric style={styles.statColumn}><Text style={{ color: colors.textSecondary }}>{row.lost}</Text></DataTable.Cell>
                  <DataTable.Cell numeric style={styles.statColumn}><Text style={{ color: colors.textSecondary }}>{row.gf}</Text></DataTable.Cell>
                  <DataTable.Cell numeric style={styles.statColumn}><Text style={{ color: colors.textSecondary }}>{row.ga}</Text></DataTable.Cell>
                  <DataTable.Cell numeric style={styles.statColumn}><Text style={{ color: colors.text }}>{row.gd}</Text></DataTable.Cell>
                  <DataTable.Cell numeric style={styles.ptsColumn}>
                    <Text style={[styles.pointsText, { color: colors.primary }]}>{row.points}</Text>
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 4,
  },
  table: {
    paddingHorizontal: 8,
  },
  tableHeader: {
    borderBottomWidth: 1,
    height: 40,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  row: {
    borderBottomWidth: 1,
    height: 48,
  },
  posColumn: {
    width: 40,
    justifyContent: 'center',
    flex: 0,
  },
  teamColumn: {
    flex: 1,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  statColumn: {
    width: 32,
    paddingHorizontal: 0,
    justifyContent: 'center',
    flex: 0,
  },
  ptsColumn: {
    width: 40,
    paddingHorizontal: 0,
    justifyContent: 'center',
    flex: 0,
  },
  rankBadge: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1D23',
    borderRadius: 4,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  teamText: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
