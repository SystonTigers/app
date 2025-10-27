import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Chip, Divider, Button } from 'react-native-paper';
import { COLORS, DEFAULT_CLUB_NAME, DEFAULT_CLUB_SHORT_NAME } from '../config';
import {
  getUpcomingFixtures,
  getRecentResults,
  formatFixtureDate,
  formatKickOffTime,
  getStatusColor,
  type Fixture,
  type Result,
  FixturesApiError,
} from '../services/fixturesApi';

const pickDisplayName = (
  ...candidates: Array<string | undefined | null>
): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
};

export default function FixturesScreen() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async ({ showSpinner = false }: { showSpinner?: boolean } = {}) => {
      if (showSpinner) {
        setLoading(true);
      }
      setError(null);

      try {
        const [fixturesData, resultsData] = await Promise.all([
          getUpcomingFixtures(),
          getRecentResults(),
        ]);

        setFixtures(fixturesData);
        setResults(resultsData);
      } catch (err) {
        console.error('Failed to load fixtures data:', err);
        const message =
          err instanceof FixturesApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Unable to load fixtures right now.';
        setError(message);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadData({ showSpinner: true });
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const clubName = useMemo(() => {
    const candidates: Array<string | undefined> = [];

    fixtures.forEach((fixture) => {
      candidates.push(
        fixture.teamName,
        fixture.homeTeamName,
        fixture.homeScoreLabel,
        fixture.teamShortName
      );
    });

    results.forEach((result) => {
      candidates.push(
        result.teamName,
        result.homeTeamName,
        result.homeScoreLabel,
        result.teamShortName
      );
    });

    return pickDisplayName(...candidates) ?? DEFAULT_CLUB_NAME;
  }, [fixtures, results]);

  const clubShortName = useMemo(() => {
    const candidates: Array<string | undefined> = [];

    fixtures.forEach((fixture) => {
      candidates.push(fixture.teamShortName, fixture.teamName, fixture.homeTeamName);
    });

    results.forEach((result) => {
      candidates.push(
        result.teamShortName,
        result.teamName,
        result.homeTeamName,
        result.homeScoreLabel
      );
    });

    return pickDisplayName(...candidates) ?? (DEFAULT_CLUB_SHORT_NAME || clubName);
  }, [fixtures, results, clubName]);

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
      {error && (
        <Card style={[styles.card, styles.errorCard]}>
          <Card.Content>
            <Paragraph style={styles.errorText}>{error}</Paragraph>
            <Button mode="outlined" onPress={() => loadData({ showSpinner: true })}>
              Retry
            </Button>
          </Card.Content>
        </Card>
      )}

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
                      {fixture.venue === 'Home'
                        ? pickDisplayName(
                            fixture.homeScoreLabel,
                            fixture.homeTeamName,
                            fixture.teamName,
                            fixture.teamShortName,
                            clubName
                          ) ?? clubName
                        : pickDisplayName(
                            fixture.awayTeamName,
                            fixture.awayScoreLabel,
                            fixture.opponent
                          ) || fixture.opponent}
                    </Title>
                    <Paragraph style={styles.vs}>vs</Paragraph>
                    <Title style={styles.teamName}>
                      {fixture.venue === 'Home'
                        ? pickDisplayName(
                            fixture.awayTeamName,
                            fixture.awayScoreLabel,
                            fixture.opponent
                          ) || fixture.opponent
                        : pickDisplayName(
                            fixture.homeScoreLabel,
                            fixture.homeTeamName,
                            fixture.teamName,
                            fixture.teamShortName,
                            clubName
                          ) ?? clubName}
                    </Title>
                  </View>
                  <Paragraph style={styles.detail}>
                    📅 {formatFixtureDate(fixture.date)} • {formatKickOffTime(fixture.kickOffTime)}
                  </Paragraph>
                  <Paragraph style={styles.detail}>
                    📍
                    {fixture.venue === 'Home'
                      ? pickDisplayName(fixture.location, clubShortName, clubName) ?? 'Home'
                      : pickDisplayName(fixture.location, fixture.venue, 'Away') ?? 'Away'}
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
            const scorers = result.scorers ? result.scorers.split(',') : [];
            const homeTeamLabel =
              pickDisplayName(
                result.homeScoreLabel,
                result.homeTeamName,
                isHome ? clubName : result.opponent
              ) ?? (isHome ? clubName : result.opponent);
            const awayTeamLabel =
              pickDisplayName(
                result.awayScoreLabel,
                result.awayTeamName,
                isHome ? result.opponent : clubName
              ) ?? (isHome ? result.opponent : clubName);

            return (
              <Card key={result.id} style={styles.card}>
                <Card.Content>
                  <Chip style={styles.competitionChip}>{result.competition}</Chip>
                  <View style={styles.matchInfo}>
                    <View style={styles.team}>
                      <Title style={styles.teamName}>{homeTeamLabel}</Title>
                      <Title style={styles.score}>{isHome ? result.homeScore : result.awayScore}</Title>
                    </View>
                    <Paragraph style={styles.vs}>-</Paragraph>
                    <View style={styles.team}>
                      <Title style={styles.score}>{isHome ? result.awayScore : result.homeScore}</Title>
                      <Title style={styles.teamName}>{awayTeamLabel}</Title>
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
  errorCard: {
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    marginBottom: 8,
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
