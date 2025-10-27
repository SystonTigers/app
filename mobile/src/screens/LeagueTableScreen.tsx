import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, DataTable } from 'react-native-paper';
import { COLORS } from '../config';

// Mock league table data
const mockLeagueTable = [
  { position: 1, team: 'Syston Tigers', played: 10, won: 8, drawn: 1, lost: 1, gf: 25, ga: 8, gd: 17, points: 25 },
  { position: 2, team: 'Leicester Panthers', played: 10, won: 7, drawn: 2, lost: 1, gf: 22, ga: 10, gd: 12, points: 23 },
  { position: 3, team: 'Melton Town', played: 10, won: 6, drawn: 2, lost: 2, gf: 18, ga: 12, gd: 6, points: 20 },
  { position: 4, team: 'Oadby Rangers', played: 10, won: 5, drawn: 3, lost: 2, gf: 17, ga: 13, gd: 4, points: 18 },
  { position: 5, team: 'Barrow United', played: 10, won: 4, drawn: 2, lost: 4, gf: 15, ga: 15, gd: 0, points: 14 },
];

export default function LeagueTableScreen() {
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>League Table</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title style={styles.posColumn}>#</DataTable.Title>
              <DataTable.Title style={styles.teamColumn}>Team</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>P</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>W</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>D</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>L</DataTable.Title>
              <DataTable.Title numeric style={styles.statColumn}>GD</DataTable.Title>
              <DataTable.Title numeric style={styles.ptsColumn}>Pts</DataTable.Title>
            </DataTable.Header>

            {mockLeagueTable.map((row) => (
              <DataTable.Row
                key={row.position}
                style={row.team === 'Syston Tigers' ? styles.highlightedRow : undefined}
              >
                <DataTable.Cell style={styles.posColumn}>{row.position}</DataTable.Cell>
                <DataTable.Cell style={styles.teamColumn}>{row.team}</DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>{row.played}</DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>{row.won}</DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>{row.drawn}</DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>{row.lost}</DataTable.Cell>
                <DataTable.Cell numeric style={styles.statColumn}>{row.gd}</DataTable.Cell>
                <DataTable.Cell numeric style={styles.ptsColumn}>
                  <Title style={styles.points}>{row.points}</Title>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
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
  card: {
    margin: 16,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.primary,
  },
  highlightedRow: {
    backgroundColor: COLORS.primary + '20', // 20% opacity
  },
  posColumn: {
    flex: 0.5,
    minWidth: 30,
  },
  teamColumn: {
    flex: 3,
    minWidth: 100,
  },
  statColumn: {
    flex: 0.7,
    minWidth: 30,
  },
  ptsColumn: {
    flex: 1,
    minWidth: 40,
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
