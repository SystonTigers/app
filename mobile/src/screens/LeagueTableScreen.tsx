import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, DataTable, Chip, Button } from 'react-native-paper';
import { COLORS } from '../config';

interface LeagueTableRow {
  position: number;
  team: string;
  teamBadge?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isOurTeam?: boolean;
}

const mockLeagueTable: LeagueTableRow[] = [
  { position: 1, team: 'Syston Tigers', played: 18, won: 14, drawn: 3, lost: 1, goalsFor: 45, goalsAgainst: 12, goalDifference: 33, points: 45, isOurTeam: true },
  { position: 2, team: 'Leicester Panthers', played: 18, won: 13, drawn: 2, lost: 3, goalsFor: 42, goalsAgainst: 18, goalDifference: 24, points: 41 },
  { position: 3, team: 'Loughborough Lions', played: 18, won: 11, drawn: 4, lost: 3, goalsFor: 38, goalsAgainst: 20, goalDifference: 18, points: 37 },
  { position: 4, team: 'Melton Mowbray', played: 18, won: 10, drawn: 3, lost: 5, goalsFor: 32, goalsAgainst: 22, goalDifference: 10, points: 33 },
  { position: 5, team: 'Coalville FC', played: 18, won: 9, drawn: 4, lost: 5, goalsFor: 30, goalsAgainst: 25, goalDifference: 5, points: 31 },
  { position: 6, team: 'Hinckley United', played: 18, won: 8, drawn: 3, lost: 7, goalsFor: 28, goalsAgainst: 26, goalDifference: 2, points: 27 },
  { position: 7, team: 'Wigston FC', played: 18, won: 7, drawn: 4, lost: 7, goalsFor: 25, goalsAgainst: 28, goalDifference: -3, points: 25 },
  { position: 8, team: 'Oadby Town', played: 18, won: 6, drawn: 3, lost: 9, goalsFor: 22, goalsAgainst: 30, goalDifference: -8, points: 21 },
  { position: 9, team: 'Barrow FC', played: 18, won: 5, drawn: 2, lost: 11, goalsFor: 20, goalsAgainst: 35, goalDifference: -15, points: 17 },
  { position: 10, team: 'Market Harborough', played: 18, won: 3, drawn: 4, lost: 11, goalsFor: 18, goalsAgainst: 38, goalDifference: -20, points: 13 },
];

export default function LeagueTableScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showFullTable, setShowFullTable] = useState(true);
  const [lastUpdated] = useState('2 hours ago');

  const onRefresh = () => {
    setRefreshing(true);
    // TODO: Fetch fresh data from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const displayedTable = showFullTable ? mockLeagueTable : mockLeagueTable.slice(0, 10);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Title style={styles.headerTitle}>League Table</Title>
        <Paragraph style={styles.lastUpdated}>Last updated: {lastUpdated}</Paragraph>
      </View>

      <View style={styles.controls}>
        <Button
          mode={showFullTable ? 'contained' : 'outlined'}
          onPress={() => setShowFullTable(true)}
          style={styles.controlButton}
          labelStyle={{ color: showFullTable ? COLORS.secondary : COLORS.primary }}
          buttonColor={showFullTable ? COLORS.primary : 'transparent'}
        >
          Full Table
        </Button>
        <Button
          mode={!showFullTable ? 'contained' : 'outlined'}
          onPress={() => setShowFullTable(false)}
          style={styles.controlButton}
          labelStyle={{ color: !showFullTable ? COLORS.secondary : COLORS.primary }}
          buttonColor={!showFullTable ? COLORS.primary : 'transparent'}
        >
          Top 10
        </Button>
      </View>

      <Card style={styles.tableCard}>
        <DataTable>
          <DataTable.Header style={styles.tableHeader}>
            <DataTable.Title style={styles.positionCol}>#</DataTable.Title>
            <DataTable.Title style={styles.teamCol}>Team</DataTable.Title>
            <DataTable.Title numeric style={styles.statCol}>P</DataTable.Title>
            <DataTable.Title numeric style={styles.statCol}>W</DataTable.Title>
            <DataTable.Title numeric style={styles.statCol}>D</DataTable.Title>
            <DataTable.Title numeric style={styles.statCol}>L</DataTable.Title>
            <DataTable.Title numeric style={styles.statCol}>GD</DataTable.Title>
            <DataTable.Title numeric style={styles.ptsCol}>Pts</DataTable.Title>
          </DataTable.Header>

          {displayedTable.map((row) => (
            <DataTable.Row
              key={row.position}
              style={[
                styles.tableRow,
                row.isOurTeam && styles.ourTeamRow,
                row.position <= 3 && styles.promotionRow,
                row.position >= mockLeagueTable.length - 2 && styles.relegationRow,
              ]}
            >
              <DataTable.Cell style={styles.positionCol}>
                <View style={styles.positionCell}>
                  {row.position <= 3 && <View style={[styles.indicator, styles.promotionIndicator]} />}
                  {row.position >= mockLeagueTable.length - 2 && <View style={[styles.indicator, styles.relegationIndicator]} />}
                  <Paragraph style={[styles.position, row.isOurTeam && styles.ourTeamText]}>
                    {row.position}
                  </Paragraph>
                </View>
              </DataTable.Cell>
              <DataTable.Cell style={styles.teamCol}>
                <Paragraph
                  style={[styles.teamName, row.isOurTeam && styles.ourTeamText]}
                  numberOfLines={1}
                >
                  {row.team}
                </Paragraph>
              </DataTable.Cell>
              <DataTable.Cell numeric style={styles.statCol}>
                <Paragraph style={row.isOurTeam && styles.ourTeamText}>{row.played}</Paragraph>
              </DataTable.Cell>
              <DataTable.Cell numeric style={styles.statCol}>
                <Paragraph style={row.isOurTeam && styles.ourTeamText}>{row.won}</Paragraph>
              </DataTable.Cell>
              <DataTable.Cell numeric style={styles.statCol}>
                <Paragraph style={row.isOurTeam && styles.ourTeamText}>{row.drawn}</Paragraph>
              </DataTable.Cell>
              <DataTable.Cell numeric style={styles.statCol}>
                <Paragraph style={row.isOurTeam && styles.ourTeamText}>{row.lost}</Paragraph>
              </DataTable.Cell>
              <DataTable.Cell numeric style={styles.statCol}>
                <Paragraph
                  style={[
                    row.goalDifference > 0 && styles.positiveGD,
                    row.goalDifference < 0 && styles.negativeGD,
                    row.isOurTeam && styles.ourTeamText,
                  ]}
                >
                  {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                </Paragraph>
              </DataTable.Cell>
              <DataTable.Cell numeric style={styles.ptsCol}>
                <Paragraph style={[styles.points, row.isOurTeam && styles.ourTeamText]}>
                  {row.points}
                </Paragraph>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, styles.promotionIndicator]} />
          <Paragraph style={styles.legendText}>Promotion</Paragraph>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, styles.relegationIndicator]} />
          <Paragraph style={styles.legendText}>Relegation</Paragraph>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, { backgroundColor: COLORS.primary }]} />
          <Paragraph style={styles.legendText}>Syston Tigers</Paragraph>
        </View>
      </View>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Paragraph style={styles.infoText}>
            <Paragraph style={styles.infoBold}>P</Paragraph> = Played,{' '}
            <Paragraph style={styles.infoBold}>W</Paragraph> = Won,{' '}
            <Paragraph style={styles.infoBold}>D</Paragraph> = Drawn,{' '}
            <Paragraph style={styles.infoBold}>L</Paragraph> = Lost,{' '}
            <Paragraph style={styles.infoBold}>GD</Paragraph> = Goal Difference,{' '}
            <Paragraph style={styles.infoBold}>Pts</Paragraph> = Points
          </Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  controls: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  controlButton: {
    flex: 1,
  },
  tableCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  tableHeader: {
    backgroundColor: COLORS.background,
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  ourTeamRow: {
    backgroundColor: '#FFF8DC',
  },
  promotionRow: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  relegationRow: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  positionCol: {
    flex: 0.5,
    justifyContent: 'center',
  },
  teamCol: {
    flex: 2,
  },
  statCol: {
    flex: 0.5,
    justifyContent: 'center',
  },
  ptsCol: {
    flex: 0.7,
    justifyContent: 'center',
  },
  positionCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 4,
    height: 20,
    marginRight: 4,
  },
  promotionIndicator: {
    backgroundColor: '#4CAF50',
  },
  relegationIndicator: {
    backgroundColor: '#F44336',
  },
  position: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  teamName: {
    fontSize: 13,
  },
  points: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  positiveGD: {
    color: '#4CAF50',
  },
  negativeGD: {
    color: '#F44336',
  },
  ourTeamText: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    paddingTop: 0,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 1,
  },
  infoText: {
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
});
