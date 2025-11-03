import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Linking, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Button, IconButton } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { COLORS } from '../config';
import type { NextFixture, LiveUpdate } from '@team-platform/sdk';

interface MatchWidgetProps {
  nextFixture: NextFixture | null;
  liveUpdates: LiveUpdate[];
  onRefresh?: () => void;
  navigation?: any; // Navigation prop for accessing LiveMatchInput
  isStaff?: boolean; // Feature flag for staff actions (default true for now)
}

const { width } = Dimensions.get('window');
const YOUTUBE_HEIGHT = width * 0.56; // 16:9 aspect ratio

// Constants for show window
const SHOW_BEFORE_MS = 24 * 60 * 60 * 1000; // 24h
const SHOW_AFTER_MS = 3 * 60 * 60 * 1000;   // 3h

export default function MatchWidget({ nextFixture, liveUpdates, onRefresh, navigation, isStaff = true }: MatchWidgetProps) {
  const [currentMinute, setCurrentMinute] = useState(0);

  // Update clock every minute for live matches
  useEffect(() => {
    if (nextFixture?.status === 'live' && nextFixture?.minute !== undefined) {
      const interval = setInterval(() => {
        setCurrentMinute((prev) => prev + 1);
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [nextFixture?.status, nextFixture?.minute]);

  if (!nextFixture) return null;

  const now = Date.now();
  const kickoff = new Date(nextFixture.kickoffIso).getTime();
  const withinWindow = now >= kickoff - SHOW_BEFORE_MS && now <= kickoff + SHOW_AFTER_MS;

  const showYouTube = withinWindow &&
    !!nextFixture.youtubeLiveId &&
    ['live', 'upcoming'].includes(nextFixture.youtubeStatus ?? 'offline');

  const isLive = nextFixture.status === 'live';
  const isHalftime = nextFixture.status === 'halftime';
  const isFT = nextFixture.status === 'ft';
  const isActive = isLive || isHalftime || isFT;

  const displayMinute = isLive ? (nextFixture.minute || 0) + currentMinute : nextFixture.minute || 0;

  const openYouTube = (videoId: string) => {
    const youtubeAppUrl = `vnd.youtube://${videoId}`;
    const youtubeWebUrl = `https://youtu.be/${videoId}`;

    Linking.canOpenURL(youtubeAppUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(youtubeAppUrl);
        } else {
          return Linking.openURL(youtubeWebUrl);
        }
      })
      .catch(() => Linking.openURL(youtubeWebUrl));
  };

  const getStatusLabel = () => {
    if (isLive) return 'LIVE';
    if (isHalftime) return 'HT';
    if (isFT) return 'FT';
    return '';
  };

  const getEventIcon = (type: string, card?: string) => {
    switch (type) {
      case 'goal':
        return '⚽';
      case 'card':
        if (card === 'yellow') return '🟨';
        if (card === 'red') return '🟥';
        if (card === 'sinbin') return '🟧';
        return '🟨';
      case 'subs':
        return '🔁';
      default:
        return 'ℹ️';
    }
  };

  // Show YouTube Embed + Scoreboard
  if (showYouTube) {
    const embedUrl = `https://www.youtube.com/embed/${nextFixture.youtubeLiveId}?autoplay=${nextFixture.youtubeStatus === 'live' ? 1 : 0}&playsinline=1&modestbranding=1`;

    return (
      <Card style={styles.liveCard}>
        <Card.Content style={{ padding: 0 }}>
          {/* Live Badge */}
          {nextFixture.youtubeStatus === 'live' && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Paragraph style={styles.liveText}>LIVE NOW</Paragraph>
            </View>
          )}

          {/* YouTube Embed */}
          <View style={styles.youtubeContainer}>
            <WebView
              source={{ uri: embedUrl }}
              style={styles.youtubeEmbed}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={nextFixture.youtubeStatus !== 'live'}
              javaScriptEnabled
              domStorageEnabled
            />
          </View>

          {/* Scoreboard (if match is active) */}
          {isActive && nextFixture.score && (
            <View style={styles.scoreboard}>
              <View style={styles.scoreRow}>
                <View style={styles.teamContainer}>
                  <Title style={styles.teamName}>{nextFixture.homeTeam}</Title>
                </View>
                <View style={styles.scoreContainer}>
                  <Title style={styles.score}>
                    {nextFixture.score.home} – {nextFixture.score.away}
                  </Title>
                </View>
                <View style={styles.teamContainer}>
                  <Title style={styles.teamName}>{nextFixture.awayTeam}</Title>
                </View>
              </View>

              <View style={styles.matchInfo}>
                <View style={[styles.statusPill, isLive && styles.statusPillLive]}>
                  <Paragraph style={styles.statusText}>{getStatusLabel()}</Paragraph>
                </View>
                {isLive && (
                  <Paragraph style={styles.clock}>{displayMinute}'</Paragraph>
                )}
              </View>
            </View>
          )}

          {/* Match Info (if not active yet) */}
          {!isActive && (
            <View style={styles.liveMatchInfo}>
              <Title style={styles.liveMatchTitle}>
                {nextFixture.homeTeam} vs {nextFixture.awayTeam}
              </Title>
              {nextFixture.competition && (
                <Paragraph style={styles.liveMatchCompetition}>
                  {nextFixture.competition}
                </Paragraph>
              )}
            </View>
          )}

          {/* Mini Event Feed (if active and has updates) */}
          {isActive && liveUpdates.length > 0 && (
            <View style={styles.eventFeed}>
              <Paragraph style={styles.eventFeedTitle}>Latest Events</Paragraph>
              {liveUpdates.slice(-5).reverse().map((update) => (
                <View key={update.id} style={styles.eventItem}>
                  <Paragraph style={styles.eventIcon}>
                    {getEventIcon(update.type, update.card)}
                  </Paragraph>
                  <View style={styles.eventContent}>
                    <Paragraph style={styles.eventText} numberOfLines={1}>
                      {update.text}
                    </Paragraph>
                    <Paragraph style={styles.eventMeta}>
                      {update.minute}' {update.scoreSoFar && `• ${update.scoreSoFar}`}
                    </Paragraph>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Open in YouTube Button */}
          <Button
            mode="contained"
            onPress={() => openYouTube(nextFixture.youtubeLiveId!)}
            style={styles.openYouTubeButton}
            icon="youtube"
            buttonColor="#FF0000"
          >
            Watch on YouTube
          </Button>

          {/* Staff Actions */}
          {isStaff && navigation && (
            <View style={styles.staffActions}>
              <Paragraph style={styles.staffActionsTitle}>Staff Actions</Paragraph>
              <View style={styles.quickActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    // TODO: Call sdk.setMatchState with kickoff
                    console.log('Kickoff');
                  }}
                  style={styles.quickActionButton}
                  compact
                >
                  Kickoff
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {
                    // TODO: Call sdk.setMatchState with halftime
                    console.log('Half-time');
                  }}
                  style={styles.quickActionButton}
                  compact
                >
                  Half-time
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {
                    // TODO: Call sdk.setMatchState with fulltime
                    console.log('Full-time');
                  }}
                  style={styles.quickActionButton}
                  compact
                >
                  Full-time
                </Button>
              </View>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('LiveMatchInput', { matchId: nextFixture.id })}
                style={styles.liveMatchInputButton}
                icon="plus-circle"
                buttonColor="#059669"
              >
                Add Live Update
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  }

  // Fallback: Show latest ticker
  const latestUpdate = liveUpdates.length > 0 ? liveUpdates[liveUpdates.length - 1] : null;

  if (latestUpdate) {
    return (
      <Card style={styles.tickerCard}>
        <Card.Content>
          <View style={styles.tickerHeader}>
            <View style={styles.tickerBadge}>
              <Paragraph style={styles.tickerBadgeText}>LIVE UPDATE</Paragraph>
            </View>
            <Paragraph style={styles.tickerMinute}>{latestUpdate.minute}'</Paragraph>
          </View>

          <Title style={styles.tickerText}>{latestUpdate.text}</Title>

          {latestUpdate.scoreSoFar && (
            <View style={styles.tickerScore}>
              <Paragraph style={styles.tickerScoreText}>
                Score: {latestUpdate.scoreSoFar}
              </Paragraph>
            </View>
          )}

          {latestUpdate.scorer && (
            <Paragraph style={styles.tickerDetails}>
              ⚽ {latestUpdate.scorer}
              {latestUpdate.assist && ` (assist: ${latestUpdate.assist})`}
            </Paragraph>
          )}

          <Paragraph style={styles.tickerTimestamp}>
            {new Date(latestUpdate.createdAt).toLocaleTimeString()}
          </Paragraph>
        </Card.Content>
      </Card>
    );
  }

  // No content to show
  return null;
}

const styles = StyleSheet.create({
  liveCard: {
    margin: 16,
    backgroundColor: COLORS.surface,
    elevation: 4,
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    margin: 0,
  },
  youtubeContainer: {
    width: '100%',
    height: YOUTUBE_HEIGHT,
    backgroundColor: '#000',
  },
  youtubeEmbed: {
    flex: 1,
  },
  scoreboard: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamContainer: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreContainer: {
    paddingHorizontal: 16,
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  matchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statusPill: {
    backgroundColor: '#9E9E9E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillLive: {
    backgroundColor: '#FF0000',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    margin: 0,
  },
  clock: {
    fontSize: 16,
    fontWeight: 'bold',
    margin: 0,
  },
  liveMatchInfo: {
    padding: 16,
    paddingBottom: 8,
  },
  liveMatchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  liveMatchCompetition: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  eventFeed: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  eventFeedTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.textLight,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  eventIcon: {
    fontSize: 20,
    margin: 0,
  },
  eventContent: {
    flex: 1,
  },
  eventText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
  },
  eventMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    margin: 0,
  },
  openYouTubeButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  staffActions: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#F0FDF4',
    borderTopWidth: 2,
    borderTopColor: '#059669',
  },
  staffActionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickActionButton: {
    flex: 1,
    borderColor: '#059669',
    borderWidth: 1.5,
  },
  liveMatchInputButton: {
    marginTop: 4,
  },
  tickerCard: {
    margin: 16,
    backgroundColor: '#1E3A8A',
    elevation: 4,
  },
  tickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tickerBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tickerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    margin: 0,
  },
  tickerMinute: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    margin: 0,
  },
  tickerText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 12,
  },
  tickerScore: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  tickerScoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    margin: 0,
  },
  tickerDetails: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  tickerTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 8,
  },
});
