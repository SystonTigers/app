import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ImageBackground, TouchableOpacity, Modal } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTheme } from '../theme/useTheme';
import { Fixture, getUpcomingFixtures, formatFixtureDate, formatKickOffTime } from '../services/fixturesApi';
import { feedApi } from '../services/api';

import VoteCard from '../components/VoteCard';
import HighlightCard from '../components/HighlightCard';
import ResultCard from '../components/ResultCard';
import FeedCard from '../components/FeedCard';
import GlobalSearch from '../components/GlobalSearch';
import { SkeletonCard } from '../components/LoadingSkeleton';



export default function HomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [refreshing, setRefreshing] = useState(false);

  // Data State
  const [nextFixture, setNextFixture] = useState<Fixture | null>(null);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [quickStats, setQuickStats] = useState({ position: '-', points: '-', won: '-', goalDifference: '-' });
  const [showSearch, setShowSearch] = useState(false);

  const loadData = useCallback(async () => {
    setFixturesLoading(true);
    try {
      const [fixtures, news] = await Promise.all([
        getUpcomingFixtures({ limit: 1 }),
        feedApi.getPosts(1, 10)
      ]);
      setNextFixture(fixtures[0] || null);
      const allPosts = Array.isArray(news.data) ? news.data : [];
      setNewsPosts(allPosts.filter((p: any) => p.type === 'news' || !p.type));
      // Extract vote, result, highlight items from feed
      setFeedItems(allPosts.filter((p: any) => p.type === 'vote' || p.type === 'result' || p.type === 'highlight'));
    } catch (error) {
      console.error('Failed to load home data', error);
    } finally {
      setFixturesLoading(false);
    }
  }, []);

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
      {/* Search Button */}
      <TouchableOpacity
        style={[styles.searchButton, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}
        onPress={() => setShowSearch(true)}
      >
        <IconButton icon="magnify" iconColor={colors.primary} size={20} />
        <Text style={[styles.searchText, { color: colors.textSecondary }]}>Search...</Text>
      </TouchableOpacity>
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
                {nextFixture.homeTeamName || 'SYSTON TIGERS'}
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

      {/* 2. QUICK STATS ROW */}
      <View style={styles.statsRow}>
        <StatItem label="POS" value={quickStats.position} icon="trophy-variant" colors={colors} />
        <StatItem label="PTS" value={quickStats.points} icon="star" colors={colors} />
        <StatItem label="WON" value={quickStats.won} icon="trophy" colors={colors} />
        <StatItem label="GD" value={quickStats.goalDifference} icon="target" colors={colors} />
      </View>

      {/* 3. TEAM FEED TIMELINE */}
      <View style={styles.feedContainer}>
        <Text style={[styles.feedHeader, { color: colors.text }]}>LATEST UPDATES</Text>

        {/* Dynamic feed items */}
        {feedItems.map((item) => {
          if (item.type === 'vote') return (
            <VoteCard
              key={item.id}
              matchTitle={item.matchTitle || item.title || ''}
              dueDate={item.dueDate || item.closesAt || ''}
              onVote={() => navigation.navigate('MOTMVoting')}
            />
          );
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

        {/* FEED ITEMS: News Posts */}
        {newsPosts.map((post) => (
          <FeedCard key={post.id} title="CLUB NEWS">
            <View style={{ padding: 16 }}>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{post.content}</Text>
              <View style={{ flexDirection: 'row', marginTop: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Just now</Text>
              </View>
            </View>
          </FeedCard>
        ))}

      </View>

      {/* Global Search Modal */}
      <Modal visible={showSearch} animationType="slide" onRequestClose={() => setShowSearch(false)}>
        <GlobalSearch onClose={() => setShowSearch(false)} onNavigate={navigation.navigate} />
      </Modal>
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
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingRight: 16,
  },
  searchText: {
    fontSize: 14,
  },
});
