import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ImageBackground } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { Fixture, getUpcomingFixtures, formatFixtureDate, formatKickOffTime } from '../services/fixturesApi';
import { feedApi, fixturesApi } from '../services/api';
import { useClub } from '../context/ClubContext';
import { isOurTeam } from '../utils/clubMatch';

import HighlightCard from '../components/HighlightCard';
import ResultCard from '../components/ResultCard';
import FeedCard from '../components/FeedCard';
import { SkeletonCard } from '../components/LoadingSkeleton';
import InstallPrompt from '../components/InstallPrompt';

interface QuickStats {
  position: string;
  points: string;
  won: string;
  goalDifference: string;
}

/** "5 minutes ago" style label for a post date (ISO string or epoch ms). */
function timeAgo(value: unknown): string {
  const ms = typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(ms)) return '';
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function HomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { club } = useClub();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Data State
  const [nextFixture, setNextFixture] = useState<Fixture | null>(null);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);

  const loadData = useCallback(async () => {
    setFixturesLoading(true);
    try {
      const [fixtures, news, table] = await Promise.all([
        getUpcomingFixtures({ limit: 1 }),
        feedApi.getPosts(1, 10),
        // The table is optional: a missing league must not blank the rest of the page.
        fixturesApi.getLeagueTable().catch(() => null),
      ]);
      setNextFixture(fixtures[0] || null);
      const rows: any[] = Array.isArray(table?.data) ? table.data : [];
      const ourRow = rows.find((row) => isOurTeam(row.team_name, club));
      setQuickStats(ourRow ? {
        position: String(ourRow.position ?? '-'),
        points: String(ourRow.points ?? '-'),
        won: String(ourRow.won ?? '-'),
        goalDifference: String((ourRow.goals_for ?? 0) - (ourRow.goals_against ?? 0)),
      } : null);
      const allPosts = Array.isArray(news.data) ? news.data : [];
      setNewsPosts(allPosts.filter((p: any) => p.type === 'news' || !p.type));
      // Extract result and highlight items from feed
      setFeedItems(allPosts.filter((p: any) => p.type === 'result' || p.type === 'highlight'));
    } catch (error) {
      console.error('Failed to load home data', error);
    } finally {
      setFixturesLoading(false);
    }
  }, [club]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);


  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Club header with the menu (the drawer holds every other section) */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton
          icon="menu"
          iconColor={colors.text}
          onPress={() => navigation.getParent?.()?.openDrawer?.()}
          accessibilityLabel="Open menu"
        />
        <Text style={[styles.topBarTitle, { color: colors.text }]} numberOfLines={1}>
          {club?.name || 'Home'}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <InstallPrompt />
      </View>

      {/* 1. HERO SECTION (Next Match) */}
      {fixturesLoading ? (
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <SkeletonCard />
        </View>
      ) : nextFixture ? (
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=800' }}
          style={styles.heroCard}
          imageStyle={styles.heroImage}
        >
          <View style={[styles.heroOverlay, { backgroundColor: 'rgba(11, 13, 15, 0.85)' }]}>
            <Text style={[styles.heroLabel, { color: colors.primary }]}>NEXT MATCH</Text>
            <View style={styles.heroTeams}>
              <Text style={[styles.heroTeamName, { color: colors.primary }]}>
                {(nextFixture.homeTeamName || club?.name || 'HOME').toUpperCase()}
              </Text>
              <Text style={[styles.heroVs, { color: colors.text }]}>VS</Text>
              <Text style={[styles.heroTeamName, { color: colors.primary }]}>
                {nextFixture.awayTeamName || 'OPPONENT'}
              </Text>
            </View>
            <Text style={[styles.heroDetails, { color: colors.text }]}>
              {formatFixtureDate(nextFixture.date).toUpperCase()} | {formatKickOffTime(nextFixture.kickOffTime)} | {nextFixture.location || 'HOME'}
            </Text>
          </View>
        </ImageBackground>
      ) : null}

      {/* 2. QUICK STATS ROW (only when the club is in the league table) */}
      {quickStats && (
        <View style={styles.statsRow}>
          <StatItem label="POS" value={quickStats.position} icon="trophy-variant" colors={colors} />
          <StatItem label="PTS" value={quickStats.points} icon="star" colors={colors} />
          <StatItem label="WON" value={quickStats.won} icon="trophy" colors={colors} />
          <StatItem label="GD" value={quickStats.goalDifference} icon="target" colors={colors} />
        </View>
      )}

      {/* 3. TEAM FEED TIMELINE */}
      <View style={styles.feedContainer}>
        <Text style={[styles.feedHeader, { color: colors.text }]}>LATEST UPDATES</Text>

        {/* Dynamic feed items */}
        {feedItems.map((item) => {
          if (item.type === 'result') return (
            <ResultCard key={item.id} {...item} />
          );
          if (item.type === 'highlight') return (
            <HighlightCard
              key={item.id}
              {...item}
              onPress={() => navigation.navigate('Videos')}
            />
          );
          return null;
        })}

        {!fixturesLoading && !nextFixture && feedItems.length === 0 && newsPosts.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Welcome to {club?.name || 'your club'}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Fixtures, results and club news will show up here as soon as your club adds them. Pull down to refresh.
            </Text>
          </View>
        ) : null}

        {/* FEED ITEMS: News Posts */}
        {newsPosts.map((post) => (
          <FeedCard key={post.id} title="CLUB NEWS">
            <View style={{ padding: 16 }}>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{post.content}</Text>
              <View style={{ flexDirection: 'row', marginTop: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{timeAgo(post.created_at ?? post.timestamp)}</Text>
              </View>
            </View>
          </FeedCard>
        ))}

      </View>
    </ScrollView>
  );
}

// Helper for Stats
const StatItem = ({ label, value, icon, colors }: any) => (
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
    <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
      <IconButton icon={icon} iconColor={colors.primary} size={18} />
    </View>
    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingRight: 16,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroCard: {
    height: 160,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroImage: {
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  heroVs: {
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  heroDetails: {
    fontSize: 10,
    marginTop: 8,
    letterSpacing: 1,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  feedContainer: {
    flex: 1,
  },
  feedHeader: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: 16,
    marginBottom: 12,
    opacity: 0.7,
  },
});
