import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, ImageBackground } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTheme } from '../theme/useTheme';
import { Fixture, getUpcomingFixtures, formatFixtureDate, formatKickOffTime, FixturesApiError } from '../services/fixturesApi';
import { feedApi } from '../services/api';

const FEED_PAGE_SIZE = 3; // Show only top 3 news items on home

interface FeedPost {
  id: string;
  content: string;
  channels: string[];
  createdAt?: string;
}

// Mock quick stats (replace with real API data)
const MOCK_STATS = {
  position: 2,
  points: 45,
  won: 14,
  goalDifference: 22,
};

// Mock league table (top 5 - replace with real API)
const MOCK_LEAGUE_TABLE = [
  { position: 1, team: 'Syston Tigers', points: 45 },
  { position: 2, team: 'Wakerios', points: 42 },
  { position: 3, team: 'Rival FC', points: 36 },
  { position: 4, team: 'Natolente', points: 33 },
  { position: 5, team: 'Thurmaston', points: 28 },
];

const OUR_TEAM = 'Syston Tigers';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const [refreshing, setRefreshing] = useState(false);
  const [nextFixture, setNextFixture] = useState<Fixture | null>(null);
  const [upcomingFixtures, setUpcomingFixtures] = useState<Fixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const loadFixtures = useCallback(async () => {
    setFixturesLoading(true);
    try {
      const fixtures = await getUpcomingFixtures({ limit: 4 });
      setNextFixture(fixtures[0] || null);
      setUpcomingFixtures(fixtures.slice(1, 4)); // Next 3 upcoming
    } catch (error) {
      console.error('Failed to load fixtures:', error);
    } finally {
      setFixturesLoading(false);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const payload = await feedApi.getPosts(1, FEED_PAGE_SIZE);
      const posts = Array.isArray(payload.data) ? payload.data : [];
      setFeedPosts(posts.slice(0, 3));
    } catch (error) {
      console.error('Failed to load feed:', error);
      setFeedPosts([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.allSettled([loadFixtures(), loadFeed()]);
  }, [loadFixtures, loadFeed]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Next Match Hero Card */}
      {fixturesLoading ? (
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : nextFixture ? (
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800' }}
          style={styles.heroCard}
          imageStyle={styles.heroImage}
        >
          <View style={[styles.heroOverlay, { backgroundColor: 'rgba(11, 13, 15, 0.85)' }]}>
            <Text style={[styles.heroLabel, { color: colors.primary }]}>NEXT MATCH</Text>
            <View style={styles.heroTeams}>
              <Text style={[styles.heroTeamName, { color: colors.primary }]}>
                {nextFixture.homeTeamName || 'SYSTON TIGERS'}
              </Text>
              <Text style={[styles.heroVs, { color: colors.text }]}>VS</Text>
              <Text style={[styles.heroTeamName, { color: colors.primary }]}>
                {nextFixture.awayTeamName || 'OPPONENT'}
              </Text>
            </View>
            <Text style={[styles.heroDetails, { color: colors.text }]}>
              {formatFixtureDate(nextFixture.date).toUpperCase()} | {formatKickOffTime(nextFixture.kickOffTime)} | {nextFixture.location || 'HOME STADIUM'}
            </Text>
          </View>
        </ImageBackground>
      ) : null}

      {/* Quick Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <IconButton icon="trophy-variant" iconColor={colors.primary} size={20} />
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>POS</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{MOCK_STATS.position}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <IconButton icon="star" iconColor={colors.primary} size={20} />
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PTS</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{MOCK_STATS.points}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <IconButton icon="trophy" iconColor={colors.primary} size={20} />
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>WON</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{MOCK_STATS.won}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <IconButton icon="target" iconColor={colors.primary} size={20} />
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GD</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>+{MOCK_STATS.goalDifference}</Text>
        </View>
      </View>

      {/* Content Grid */}
      <View style={styles.contentGrid}>
        {/* Left Column: News Cards */}
        <View style={styles.leftColumn}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>LATEST NEWS</Text>
          {feedLoading ? (
            <View style={[styles.newsCard, { backgroundColor: colors.surface }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : feedPosts.length > 0 ? (
            feedPosts.map((post) => (
              <View key={post.id} style={[styles.newsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ImageBackground
                  source={{ uri: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400' }}
                  style={styles.newsImage}
                  imageStyle={{ borderRadius: 4 }}
                >
                  <View style={styles.newsOverlay} />
                </ImageBackground>
                <View style={styles.newsContent}>
                  <Text style={[styles.newsTitle, { color: colors.text }]} numberOfLines={2}>
                    {post.content.substring(0, 60)}...
                  </Text>
                  <Text style={[styles.newsExcerpt, { color: colors.textSecondary }]} numberOfLines={2}>
                    {post.content.substring(60, 120)}...
                  </Text>
                  <TouchableOpacity style={[styles.newsButton, { borderColor: colors.primary }]}>
                    <Text style={[styles.newsButtonText, { color: colors.primary }]}>VIEW ALL NEWS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : null}
        </View>

        {/* Right Column: League Standings + Upcoming Matches */}
        <View style={styles.rightColumn}>
          {/* League Standings Mini */}
          <View style={[styles.miniTable, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.miniTableTitle, { color: colors.text }]}>LEAGUE STANDINGS</Text>
            {MOCK_LEAGUE_TABLE.map((row) => {
              const isOurs = row.team === OUR_TEAM;
              return (
                <View
                  key={row.position}
                  style={[
                    styles.miniTableRow,
                    { borderBottomColor: colors.border },
                    isOurs && { backgroundColor: colors.primary + '15' },
                  ]}
                >
                  <Text style={[styles.miniPos, { color: colors.textSecondary }]}>{row.position}</Text>
                  <Text style={[styles.miniTeam, { color: isOurs ? colors.primary : colors.text }]} numberOfLines={1}>
                    {row.team.toUpperCase()}
                  </Text>
                  <Text style={[styles.miniPts, { color: colors.primary }]}>{row.points}</Text>
                </View>
              );
            })}
            <TouchableOpacity style={[styles.miniTableButton, { borderTopColor: colors.primary }]}>
              <Text style={[styles.miniTableButtonText, { color: colors.primary }]}>FULL STANDINGS</Text>
            </TouchableOpacity>
          </View>

          {/* Upcoming Matches */}
          <View style={[styles.upcomingCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.upcomingTitle, { color: colors.text }]}>UPCOMING MATCHES</Text>
            {upcomingFixtures.map((fixture, index) => (
              <View
                key={index}
                style={[styles.upcomingMatch, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              >
                <View style={styles.upcomingTeams}>
                  <Text style={[styles.upcomingTeam, { color: colors.primary }]} numberOfLines={1}>
                    {fixture.homeTeamName || 'SYSTON TIGERS'}
                  </Text>
                  <Text style={[styles.upcomingScore, { color: colors.text }]}>1-0</Text>
                  <Text style={[styles.upcomingTeam, { color: colors.text }]} numberOfLines={1}>
                    {fixture.awayTeamName || 'RIVAL FC'}
                  </Text>
                </View>
                <Text style={[styles.upcomingDate, { color: colors.textSecondary }]}>
                  {formatFixtureDate(fixture.date)} • {formatKickOffTime(fixture.kickOffTime)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    height: 180,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  heroImage: {
    borderRadius: 8,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroTeamName: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  heroVs: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  heroDetails: {
    fontSize: 11,
    marginTop: 8,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  contentGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    width: 180,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  newsCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  newsImage: {
    height: 100,
    justifyContent: 'flex-end',
  },
  newsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  newsContent: {
    padding: 12,
  },
  newsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  newsExcerpt: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  newsButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  newsButtonText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  miniTable: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  miniTableTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    padding: 12,
    textAlign: 'center',
  },
  miniTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  miniPos: {
    width: 20,
    fontSize: 11,
    fontWeight: 'bold',
  },
  miniTeam: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
  },
  miniPts: {
    width: 24,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  miniTableButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  miniTableButtonText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  upcomingCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  upcomingTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  upcomingMatch: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  upcomingTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  upcomingTeam: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
  },
  upcomingScore: {
    fontSize: 12,
    fontWeight: '900',
    marginHorizontal: 4,
  },
  upcomingDate: {
    fontSize: 8,
    textAlign: 'center',
  },
});
