import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Chip, Divider } from 'react-native-paper';
import { COLORS } from '../config';
import {
  getUpcomingFixtures,
  getRecentResults,
  formatFixtureDate,
  formatKickOffTime,
  getStatusColor,
  type Fixture,
  type Result,
} from '../services/fixturesApi';

export default function FixturesScreen() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [fixturesData, resultsData] = await Promise.all([
        getUpcomingFixtures(),
        getRecentResults(),
      ]);

      setFixtures(fixturesData);
      setResults(resultsData);
    } catch (error) {
      console.error('Failed to load fixtures data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Paragraph style={styles.loadingText}>Loading fixtures...</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Upcoming Fixtures */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>⚽ Upcoming Fixtures</Title>
        {fixtures.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Paragraph>No upcoming fixtures at the moment.</Paragraph>
            </Card.Content>
          </Card>
        ) : (
          fixtures.map((fixture) => (
            <Card key={fixture.id} style={styles.card}>
              <Card.Content>
                <Chip style={styles.competitionChip}>{fixture.competition}</Chip>
                <View style={styles.matchInfo}>
                  <Title style={styles.teamName}>
                    {fixture.venue === 'Home' ? 'Shepshed U16' : fixture.opponent}
                  </Title>
                  <Paragraph style={styles.vs}>vs</Paragraph>
                  <Title style={styles.teamName}>
                    {fixture.venue === 'Home' ? fixture.opponent : 'Shepshed U16'}
                  </Title>
                </View>
                <Paragraph style={styles.detail}>
                  📅 {formatFixtureDate(fixture.date)} • {formatKickOffTime(fixture.kickOffTime)}
                </Paragraph>
                <Paragraph style={styles.detail}>
                  📍 {fixture.venue === 'Home' ? 'Home' : 'Away'}
                </Paragraph>
                {fixture.status !== 'scheduled' && (
                  <Chip
                    style={[styles.statusChip, { backgroundColor: getStatusColor(fixture.status) }]}
                  >
                    {fixture.status.toUpperCase()}
                  </Chip>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </View>

      <Divider style={styles.divider} />

      {/* Recent Results */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>📊 Recent Results</Title>
        {results.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Paragraph>No recent results available.</Paragraph>
            </Card.Content>
          </Card>
        ) : (
          results.map((result) => {
            const isHome = result.venue === 'Home';
            const ourScore = isHome ? result.homeScore : result.awayScore;
            const theirScore = isHome ? result.awayScore : result.homeScore;
            const scorers = result.scorers ? result.scorers.split(',') : [];

            return (
              <Card key={result.id} style={styles.card}>
                <Card.Content>
                  <Chip style={styles.competitionChip}>{result.competition}</Chip>
                  <View style={styles.matchInfo}>
                    <View style={styles.team}>
                      <Title style={styles.teamName}>
                        {isHome ? 'Shepshed U16' : result.opponent}
                      </Title>
                      <Title style={styles.score}>{isHome ? result.homeScore : result.awayScore}</Title>
                    </View>
                    <Paragraph style={styles.vs}>-</Paragraph>
                    <View style={styles.team}>
                      <Title style={styles.score}>{isHome ? result.awayScore : result.homeScore}</Title>
                      <Title style={styles.teamName}>
                        {isHome ? result.opponent : 'Shepshed U16'}
                      </Title>
                    </View>
                  </View>
                  <Paragraph style={styles.detail}>📅 {formatFixtureDate(result.date)}</Paragraph>
                  {scorers.length > 0 && (
                    <View style={styles.scorers}>
                      <Paragraph style={styles.scorersTitle}>⚽ Scorers:</Paragraph>
                      {scorers.map((scorer, index) => (
                        <Paragraph key={index} style={styles.scorer}>
                          • {scorer.trim()}
                        </Paragraph>
                      ))}
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
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
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
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
