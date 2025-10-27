import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Animated } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { COLORS } from '../config';
import { liveMatchApi, fixturesApi } from '../services/api';

interface MatchEvent {
  id: string;
  ts: number;
  type: 'goal' | 'yellow' | 'red' | 'sub' | 'ht' | 'ft' | 'note';
  minute?: number;
  payload?: any;
}

interface MatchState {
  matchId: string;
  title?: string;
  home?: string;
  away?: string;
  kickoffTs?: number;
  timeline: MatchEvent[];
  homeScore: number;
  awayScore: number;
  closed: boolean;
  updatedAt: number;
}

interface LiveMatch {
  id: string;
  title: string;
  home: string;
  away: string;
  status: 'live' | 'half-time' | 'finished';
}

export default function LiveMatchWatchScreen() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadLiveMatches();
  }, []);

  useEffect(() => {
    if (selectedMatch && !selectedMatch.closed) {
      const interval = setInterval(() => {
        refreshMatchState();
      }, 5000); // Refresh every 5 seconds for viewers

      return () => clearInterval(interval);
    }
  }, [selectedMatch]);

  useEffect(() => {
    if (selectedMatch && selectedMatch.kickoffTs && !selectedMatch.closed) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - selectedMatch.kickoffTs!;
        const minutes = Math.floor(elapsed / 60000);
        setCurrentMinute(minutes);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedMatch]);

  useEffect(() => {
    // Pulse animation for LIVE indicator
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  const loadLiveMatches = async () => {
    setLoading(true);
    try {
      // Mock live matches - will connect to real API
      const mockMatches: LiveMatch[] = [
        {
          id: 'f1',
          title: 'Syston Tigers vs Leicester Panthers',
          home: 'Syston Tigers',
          away: 'Leicester Panthers',
          status: 'live',
        },
      ];
      setLiveMatches(mockMatches);

      // Auto-select first match if available
      if (mockMatches.length > 0 && !selectedMatch) {
        await watchMatch(mockMatches[0].id);
      }
    } catch (error) {
      console.error('Error loading live matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const watchMatch = async (matchId: string) => {
    setLoading(true);
    try {
      const response = await liveMatchApi.getTally(matchId);
      if (response.ok) {
        setSelectedMatch(response.data);
      }
    } catch (error) {
      console.error('Error loading match:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshMatchState = async () => {
    if (!selectedMatch) return;

    try {
      const response = await liveMatchApi.getTally(selectedMatch.matchId);
      if (response.ok) {
        setSelectedMatch(response.data);
      }
    } catch (error) {
      console.error('Error refreshing match:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadLiveMatches(), refreshMatchState()]);
    setRefreshing(false);
  };

  const formatTime = (minute: number) => {
    if (minute > 45 && minute <= 50) return `45+${minute - 45}'`;
    if (minute > 90) return `90+${minute - 90}'`;
    return `${minute}'`;
  };

  const getMatchStatus = () => {
    if (!selectedMatch) return '';
    if (selectedMatch.closed) return 'FULL-TIME';

    const lastEvent = selectedMatch.timeline[selectedMatch.timeline.length - 1];
    if (lastEvent?.type === 'ht') return 'HALF-TIME';

    return 'LIVE';
  };

  const getMatchStatusColor = () => {
    const status = getMatchStatus();
    if (status === 'LIVE') return '#4CAF50';
    if (status === 'HALF-TIME') return '#FF9800';
    if (status === 'FULL-TIME') return '#F44336';
    return COLORS.textLight;
  };

  const getEventDescription = (event: MatchEvent) => {
    switch (event.type) {
      case 'goal':
        return `⚽ GOAL! ${event.payload?.scorer || 'Unknown'} (${event.payload?.side || 'home'})`;
      case 'yellow':
        return `🟨 Yellow card - ${event.payload?.player || 'Unknown'}`;
      case 'red':
        return `🟥 Red card - ${event.payload?.player || 'Unknown'}`;
      case 'sub':
        return `🔄 Substitution - ${event.payload?.player || 'Unknown'}`;
      case 'ht':
        return '⏸️ Half-time';
      case 'ft':
        return '⏹️ Full-time';
      case 'note':
        return `📝 ${event.payload?.text || 'Note'}`;
      default:
        return event.type;
    }
  };

  const isGoalEvent = (event: MatchEvent) => event.type === 'goal';

  const getLastGoalTime = () => {
    const goalEvents = selectedMatch?.timeline.filter(isGoalEvent) || [];
    if (goalEvents.length === 0) return null;

    const lastGoal = goalEvents[goalEvents.length - 1];
    const timeSinceGoal = Date.now() - lastGoal.ts;

    // Show celebration for 10 seconds after a goal
    if (timeSinceGoal < 10000) {
      return lastGoal;
    }
    return null;
  };

  const lastGoal = getLastGoalTime();

  if (loading && !selectedMatch) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Paragraph style={styles.loadingText}>Loading live matches...</Paragraph>
      </View>
    );
  }

  if (liveMatches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Title style={styles.emptyTitle}>No Live Matches</Title>
        <Paragraph style={styles.emptySubtitle}>
          There are no matches being broadcast right now.
        </Paragraph>
        <Paragraph style={styles.emptySubtitle}>
          Check back when a match is in progress!
        </Paragraph>
        <Button
          mode="contained"
          onPress={loadLiveMatches}
          style={styles.refreshButton}
          buttonColor={COLORS.primary}
          textColor={COLORS.secondary}
          icon="refresh"
        >
          Refresh
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedMatch && (
        <>
          {/* Goal celebration banner */}
          {lastGoal && (
            <View style={styles.goalBanner}>
              <Title style={styles.goalBannerText}>
                ⚽ GOAL! {lastGoal.payload?.scorer}
              </Title>
            </View>
          )}

          {/* Match header */}
          <View style={[styles.header, { backgroundColor: getMatchStatusColor() }]}>
            <View style={styles.headerTop}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Chip style={styles.liveChip} textStyle={styles.liveChipText}>
                  {getMatchStatus()}
                </Chip>
              </Animated.View>
              <Paragraph style={styles.matchTime}>
                ⏱️ {formatTime(currentMinute)}
              </Paragraph>
            </View>

            <Paragraph style={styles.matchTitle}>{selectedMatch.title}</Paragraph>

            <View style={styles.scoreboard}>
              <View style={styles.teamScore}>
                <Title style={styles.teamName}>{selectedMatch.home}</Title>
                <Title style={styles.score}>{selectedMatch.homeScore}</Title>
              </View>
              <Paragraph style={styles.scoreVs}>-</Paragraph>
              <View style={styles.teamScore}>
                <Title style={styles.teamName}>{selectedMatch.away}</Title>
                <Title style={styles.score}>{selectedMatch.awayScore}</Title>
              </View>
            </View>

            <Paragraph style={styles.updatedAt}>
              Updated: {new Date(selectedMatch.updatedAt).toLocaleTimeString()}
            </Paragraph>
          </View>

          {/* Match timeline */}
          <ScrollView
            style={styles.scrollContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={styles.timelineContainer}>
              <View style={styles.timelineHeader}>
                <Title style={styles.sectionTitle}>Match Events</Title>
                {!selectedMatch.closed && (
                  <Chip style={styles.autoRefreshChip} textStyle={styles.autoRefreshChipText}>
                    🔄 Auto-refreshing
                  </Chip>
                )}
              </View>

              {selectedMatch.timeline.length === 0 && (
                <Card style={styles.emptyTimelineCard}>
                  <Card.Content>
                    <Paragraph style={styles.emptyTimeline}>
                      No events yet. The match has just started!
                    </Paragraph>
                  </Card.Content>
                </Card>
              )}

              {selectedMatch.timeline
                .sort((a, b) => b.ts - a.ts)
                .map((event) => (
                  <Card
                    key={event.id}
                    style={[
                      styles.timelineCard,
                      isGoalEvent(event) && styles.goalTimelineCard,
                    ]}
                  >
                    <Card.Content>
                      <View style={styles.timelineRow}>
                        <View style={styles.timelineTime}>
                          <Paragraph
                            style={[
                              styles.timelineMinute,
                              isGoalEvent(event) && styles.goalTimelineMinute,
                            ]}
                          >
                            {formatTime(event.minute || 0)}
                          </Paragraph>
                        </View>
                        <View style={styles.timelineContent}>
                          <Paragraph
                            style={[
                              styles.timelineText,
                              isGoalEvent(event) && styles.goalTimelineText,
                            ]}
                          >
                            {getEventDescription(event)}
                          </Paragraph>
                          <Paragraph style={styles.timelineTimestamp}>
                            {new Date(event.ts).toLocaleTimeString()}
                          </Paragraph>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
            </View>

            {/* Match stats summary */}
            <View style={styles.statsContainer}>
              <Title style={styles.sectionTitle}>Match Summary</Title>
              <Card style={styles.statsCard}>
                <Card.Content>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Title style={styles.statValue}>
                        {selectedMatch.timeline.filter((e) => e.type === 'goal').length}
                      </Title>
                      <Paragraph style={styles.statLabel}>Goals</Paragraph>
                    </View>
                    <Divider style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Title style={styles.statValue}>
                        {selectedMatch.timeline.filter((e) => e.type === 'yellow').length}
                      </Title>
                      <Paragraph style={styles.statLabel}>Yellow Cards</Paragraph>
                    </View>
                    <Divider style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Title style={styles.statValue}>
                        {selectedMatch.timeline.filter((e) => e.type === 'red').length}
                      </Title>
                      <Paragraph style={styles.statLabel}>Red Cards</Paragraph>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 8,
  },
  refreshButton: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  goalBanner: {
    backgroundColor: '#4CAF50',
    padding: 16,
    alignItems: 'center',
  },
  goalBannerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  header: {
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveChip: {
    backgroundColor: COLORS.secondary,
    height: 28,
  },
  liveChipText: {
    color: '#F44336',
    fontWeight: 'bold',
    fontSize: 12,
  },
  matchTime: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  matchTitle: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreboard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamScore: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  score: {
    fontSize: 56,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  scoreVs: {
    fontSize: 24,
    color: COLORS.secondary,
    marginHorizontal: 20,
    fontWeight: 'bold',
  },
  updatedAt: {
    fontSize: 11,
    color: COLORS.secondary,
    opacity: 0.8,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  timelineContainer: {
    marginBottom: 24,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  autoRefreshChip: {
    height: 24,
    backgroundColor: COLORS.primary,
  },
  autoRefreshChipText: {
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  emptyTimelineCard: {
    borderRadius: 8,
    elevation: 1,
  },
  emptyTimeline: {
    textAlign: 'center',
    color: COLORS.textLight,
    padding: 12,
  },
  timelineCard: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
  },
  goalTimelineCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineTime: {
    width: 50,
    marginRight: 12,
  },
  timelineMinute: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  goalTimelineMinute: {
    color: '#4CAF50',
    fontSize: 18,
  },
  timelineContent: {
    flex: 1,
  },
  timelineText: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 4,
    fontWeight: '500',
  },
  goalTimelineText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  timelineTimestamp: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsCard: {
    borderRadius: 12,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.background,
  },
});
