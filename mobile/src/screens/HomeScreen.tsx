import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import { Fixture, getUpcomingFixtures, formatFixtureDate, formatKickOffTime } from '../services/fixturesApi';
import { feedApi, fixturesApi, liveApi, resultsApi, type HeadToHead as HeadToHeadRecord } from '../services/api';
import { scoreline, statusLabel, type LiveMatchView } from '../utils/liveMatch';
import { useClub } from '../context/ClubContext';
import { useMatchDay } from '../context/MatchDayContext';
import { stripFor, type LeagueSnapshot } from '../utils/leagueTable';

import HighlightCard from '../components/HighlightCard';
import ResultCard from '../components/ResultCard';
import FeedCard from '../components/FeedCard';
import { SkeletonCard } from '../components/LoadingSkeleton';
import InstallPrompt from '../components/InstallPrompt';
import ConsentPrompt from '../components/ConsentPrompt';
import HomeHeader from '../components/home/HomeHeader';
import NextMatchCard from '../components/home/NextMatchCard';
import HeadToHead from '../components/home/HeadToHead';
import LeagueStrip from '../components/home/LeagueStrip';
import LiveCard from '../components/home/LiveCard';
import QuickActions, { type QuickAction } from '../components/home/QuickActions';
import SectionTitle from '../components/home/SectionTitle';
import { isStaffRole } from '../utils/roles';
import { useAuth } from '../context/AuthContext';

/** While a match is live the score and "as it stands" table refresh this often. */
const LIVE_REFRESH_MS = 30000;

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
  const { user } = useAuth();
  const { day } = useMatchDay();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Data State
  const [nextFixture, setNextFixture] = useState<Fixture | null>(null);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [league, setLeague] = useState<LeagueSnapshot | null>(null);
  const [liveMatches, setLiveMatches] = useState<LiveMatchView[]>([]);
  const [h2h, setH2h] = useState<{ opponent: string; record: HeadToHeadRecord } | null>(null);

  const loadData = useCallback(async () => {
    setFixturesLoading(true);
    try {
      const [fixtures, news, table, live] = await Promise.all([
        getUpcomingFixtures({ limit: 2 }),
        feedApi.getPosts(1, 10),
        // The table and live score are optional: they must not blank the rest of the page.
        fixturesApi.getLeagueSnapshot().catch(() => null),
        liveApi.list().catch(() => ({ data: [] as LiveMatchView[] })),
      ]);
      const onNow = live.data.filter((m) => m.status === 'live' || m.status === 'half_time');
      setLiveMatches(onNow);
      // A match that's on now shows as the live card, so "next up" is the one after it
      setNextFixture(fixtures.find((f) => !onNow.some((m) => String(m.fixture.id) === String(f.id))) || null);
      setLeague(table);
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

  // Our record against the next opponent; optional, so a failure just hides it
  const nextOpponent = nextFixture?.opponent ?? null;
  useEffect(() => {
    if (!nextOpponent) { setH2h(null); return undefined; }
    let cancelled = false;
    resultsApi.headToHead(nextOpponent)
      .then((res) => { if (!cancelled) setH2h({ opponent: nextOpponent, record: res.data }); })
      .catch(() => { if (!cancelled) setH2h(null); });
    return () => { cancelled = true; };
  }, [nextOpponent]);

  // During a match: keep the live score and "as it stands" table fresh while Home is open
  const anyLive = liveMatches.length > 0;
  useFocusEffect(useCallback(() => {
    if (!anyLive) return undefined;
    const refreshLive = async () => {
      const [live, table] = await Promise.all([
        liveApi.list().catch(() => null),
        fixturesApi.getLeagueSnapshot().catch(() => null),
      ]);
      if (live) setLiveMatches(live.data.filter((m) => m.status === 'live' || m.status === 'half_time'));
      if (table) setLeague(table);
    };
    const timer = setInterval(refreshLive, LIVE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [anyLive]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);


  const color = colors.primary;
  const clubName = club?.name || 'Your club';
  const staff = isStaffRole(user?.role);
  const videoFirst = (day?.fixtures ?? [])
    .filter((f) => f.stream?.status === 'live' && f.matchStatus !== 'full_time' && !liveMatches.some((m) => m.fixture.id === f.id));
  const matchToday = (day?.fixtures ?? []).length > 0;
  const strip = stripFor(league);
  const actions: QuickAction[] = [
    { label: 'Live Match', icon: 'whistle', onPress: () => navigation.navigate('LiveMatch'), highlight: matchToday || liveMatches.length > 0 },
    { label: 'Fixtures', icon: 'calendar-month', onPress: () => navigation.navigate('Matches') },
    { label: 'League', icon: 'format-list-numbered', onPress: () => navigation.navigate('LeagueTable') },
    { label: 'Highlights', icon: 'play-box-multiple', onPress: () => navigation.navigate('Highlights') },
    { label: 'Man of the Match', icon: 'star-circle', onPress: () => navigation.navigate('MOTMVoting') },
    { label: 'Squad', icon: 'account-group', onPress: () => navigation.navigate('Squad') },
    { label: 'Stats', icon: 'chart-bar', onPress: () => navigation.navigate('Stats') },
    staff
      ? { label: 'Match Centre', icon: 'scoreboard', onPress: () => navigation.navigate('MatchCentre') }
      : { label: 'Results', icon: 'scoreboard-outline', onPress: () => navigation.navigate('Results') },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: '#07090C' }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color} />}
      contentContainerStyle={styles.contentContainer}
    >
      <HomeHeader
        clubName={clubName}
        color={color}
        badgeUrl={club?.badgeUrl}
        firstName={user?.firstName}
        topInset={insets.top}
        onMenu={() => navigation.getParent?.()?.openDrawer?.()}
      />

      <View style={{ paddingHorizontal: 16 }}>
        <InstallPrompt />
        <ConsentPrompt onOpen={() => navigation.navigate('MediaConsent')} />
      </View>

      {/* Live video that's on before kick-off has been tapped in Match Centre */}
      {videoFirst.map((f) => (
        <LiveCard
          key={`video-${f.id}`}
          status="VIDEO ON"
          home={f.homeAway === 'away' ? f.opponent : clubName}
          away={f.homeAway === 'away' ? clubName : f.opponent}
          homeScore={null}
          awayScore={null}
          video
          color={color}
          onPress={() => navigation.navigate('LiveMatch')}
        />
      ))}

      {/* Live score while a match is on */}
      {liveMatches.map((m) => {
        const s = scoreline(m, clubName);
        const video = day?.fixtures.find((f) => f.id === m.fixture.id)?.stream?.status === 'live';
        return (
          <LiveCard
            key={m.fixture.id}
            status={statusLabel(m, Date.now()).toUpperCase()}
            home={s.home}
            away={s.away}
            homeScore={s.homeScore}
            awayScore={s.awayScore}
            video={!!video}
            color={color}
            onPress={() => navigation.navigate('LiveMatch')}
          />
        );
      })}

      {/* Next match */}
      {fixturesLoading ? (
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <SkeletonCard />
        </View>
      ) : nextFixture ? (
        <>
          <SectionTitle title="NEXT UP" color={color} action="All fixtures" onAction={() => navigation.navigate('Matches')} />
          <NextMatchCard
            clubName={clubName}
            color={color}
            badgeUrl={club?.badgeUrl}
            opponent={nextFixture.opponent}
            homeAway={nextFixture.homeAway === 'away' ? 'away' : 'home'}
            date={String(nextFixture.date).slice(0, 10)}
            dateText={formatFixtureDate(nextFixture.date)}
            time={formatKickOffTime(nextFixture.kickOffTime)}
            venue={nextFixture.venue || null}
            competition={nextFixture.competition || null}
            onPress={() => navigation.navigate('Matches')}
          />
          {h2h && h2h.opponent === nextFixture.opponent ? (
            <HeadToHead opponent={h2h.opponent} record={h2h.record} onPress={() => navigation.navigate('Results')} />
          ) : null}
        </>
      ) : null}

      {/* Our league row and the teams around us; "as it stands" during a league game */}
      {strip && league?.ourTeam ? (
        <>
          <SectionTitle title={strip.live ? 'LIVE TABLE' : 'THE TABLE'} color={color} />
          <LeagueStrip
            rows={strip.rows}
            ourTeam={league.ourTeam}
            live={strip.live}
            color={color}
            onPress={() => navigation.navigate(strip.live ? 'LiveMatch' : 'LeagueTable')}
          />
        </>
      ) : null}

      <SectionTitle title="QUICK LINKS" color={color} />
      <QuickActions actions={actions} color={color} />

      {/* Team feed */}
      <SectionTitle title="LATEST" color={color} />
      <View style={styles.feedContainer}>
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

        {!fixturesLoading && feedItems.length === 0 && newsPosts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>All quiet for now</Text>
            <Text style={styles.emptyText}>
              Results, goals, team news and club posts land here as they happen. Pull down to refresh.
            </Text>
          </View>
        ) : null}

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: 48 },
  feedContainer: { flex: 1 },
  emptyCard: { marginHorizontal: 16, padding: 20, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.15)' },
  emptyTitle: { color: '#F2F5F7', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptyText: { color: 'rgba(242,245,247,0.65)', fontSize: 14, lineHeight: 20 },
});
