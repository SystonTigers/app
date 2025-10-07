import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Chip, Divider } from 'react-native-paper';
import { COLORS } from '../config';

// Mock data
const mockFixtures = [
  {
    id: '1',
    homeTeam: 'Syston Tigers',
    awayTeam: 'Leicester Panthers',
    date: '2025-11-10',
    time: '14:00',
    competition: 'U13 League',
    venue: 'Syston Recreation Ground',
  },
  {
    id: '2',
    homeTeam: 'Melton Town',
    awayTeam: 'Syston Tigers',
    date: '2025-11-17',
    time: '10:30',
    competition: 'U13 Cup',
    venue: 'Melton Sports Ground',
  },
];

const mockResults = [
  {
    id: '1',
    homeTeam: 'Syston Tigers',
    homeScore: 3,
    awayTeam: 'Oadby FC',
    awayScore: 1,
    date: '2025-11-03',
    competition: 'U13 League',
    scorers: ['John Smith 23\'', 'Mike Jones 45\'', 'Tom Brown 67\''],
  },
  {
    id: '2',
    homeTeam: 'Birstall United',
    homeScore: 2,
    awayTeam: 'Syston Tigers',
    awayScore: 2,
    date: '2025-10-27',
    competition: 'U13 League',
    scorers: ['Mike Jones 15\'', 'John Smith 78\''],
  },
];

export default function FixturesScreen() {
  return (
    <ScrollView style={styles.container}>
      {/* Upcoming Fixtures */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>⚽ Upcoming Fixtures</Title>
        {mockFixtures.map((fixture) => (
          <Card key={fixture.id} style={styles.card}>
            <Card.Content>
              <Chip style={styles.competitionChip}>{fixture.competition}</Chip>
              <View style={styles.matchInfo}>
                <Title style={styles.teamName}>{fixture.homeTeam}</Title>
                <Paragraph style={styles.vs}>vs</Paragraph>
                <Title style={styles.teamName}>{fixture.awayTeam}</Title>
              </View>
              <Paragraph style={styles.detail}>📅 {fixture.date} • {fixture.time}</Paragraph>
              <Paragraph style={styles.detail}>📍 {fixture.venue}</Paragraph>
            </Card.Content>
          </Card>
        ))}
      </View>

      <Divider style={styles.divider} />

      {/* Recent Results */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>📊 Recent Results</Title>
        {mockResults.map((result) => (
          <Card key={result.id} style={styles.card}>
            <Card.Content>
              <Chip style={styles.competitionChip}>{result.competition}</Chip>
              <View style={styles.matchInfo}>
                <View style={styles.team}>
                  <Title style={styles.teamName}>{result.homeTeam}</Title>
                  <Title style={styles.score}>{result.homeScore}</Title>
                </View>
                <Paragraph style={styles.vs}>-</Paragraph>
                <View style={styles.team}>
                  <Title style={styles.score}>{result.awayScore}</Title>
                  <Title style={styles.teamName}>{result.awayTeam}</Title>
                </View>
              </View>
              <Paragraph style={styles.detail}>📅 {result.date}</Paragraph>
              {result.scorers.length > 0 && (
                <View style={styles.scorers}>
                  <Paragraph style={styles.scorersTitle}>⚽ Scorers:</Paragraph>
                  {result.scorers.map((scorer, index) => (
                    <Paragraph key={index} style={styles.scorer}>
                      • {scorer}
                    </Paragraph>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  card: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  competitionChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    backgroundColor: COLORS.primary,
  },
  matchInfo: {
    alignItems: 'center',
    marginVertical: 8,
  },
  team: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamName: {
    fontSize: 18,
    textAlign: 'center',
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  vs: {
    fontSize: 14,
    color: COLORS.textLight,
    marginVertical: 4,
  },
  detail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  scorers: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  scorersTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scorer: {
    fontSize: 13,
    marginLeft: 8,
  },
  divider: {
    marginVertical: 8,
  },
});
