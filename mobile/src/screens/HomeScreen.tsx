import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, IconButton } from 'react-native-paper';
import {
  DEFAULT_CLUB_NAME,
  DEFAULT_CLUB_SHORT_NAME,
  COLORS,
} from '../config';
import {
  Fixture,
  getUpcomingFixtures,
  formatFixtureDate,
  formatKickOffTime,
  FixturesApiError,
} from '../services/fixturesApi';
import { feedApi } from '../services/api';
import MatchWidget from '../components/MatchWidget';
import type { NextFixture, LiveUpdate } from '@team-platform/sdk';

const FEED_PAGE_SIZE = 10;

interface FeedPost {
  id: string;
  content: string;
  channels: string[];
  createdAt?: string;
  likeCount?: number;
}

interface NormalisedFeed {
  posts: FeedPost[];
  hasMore: boolean;
  currentPage: number;
}

const extractFeedCollection = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.data?.posts)) return payload.data.posts;
  return [];
};

const extractFeedMeta = (payload: any) => {
  return (
    payload?.meta ||
    payload?.data?.meta ||
    payload?.pagination ||
    payload?.data?.pagination || {
      currentPage: 1,
    }
  );
};

const normaliseFeedResponse = (payload: any): NormalisedFeed => {
  const collection = extractFeedCollection(payload);

  const posts: FeedPost[] = collection
    .map((item: any, index: number) => {
      if (!item) return null;

      const rawId =
        item.id ??
        item.postId ??
        item.uuid ??
        item._id ??
        (item.slug ? `${item.slug}` : null);
      const id = rawId ? String(rawId) : `feed-${Date.now()}-${index}`;
      const content =
        item.content ?? item.text ?? item.message ?? item.body ?? item.description ?? '';
      if (!content) {
        return null;
      }

      const channels = Array.isArray(item.channels)
        ? item.channels.filter((channel: unknown): channel is string => typeof channel === 'string')
        : [];

      const likeCount =
        typeof item.likes === 'number'
          ? item.likes
          : typeof item.likeCount === 'number'
          ? item.likeCount
          : undefined;

      const createdAt =
        item.createdAt ?? item.timestamp ?? item.publishedAt ?? item.updatedAt ?? undefined;

      return {
        id,
        content,
        channels,
        likeCount,
        createdAt,
      } as FeedPost;
    })
    .filter((item): item is FeedPost => Boolean(item));

  const meta = extractFeedMeta(payload) ?? {};
  const currentPage =
    Number(meta.currentPage ?? meta.page ?? meta.pageNumber ?? meta.page_index ?? 1) || 1;
  const totalPages = Number(meta.totalPages ?? meta.total_pages ?? meta.totalPage ?? meta.pages);
  const hasMore =
    typeof meta.hasMore === 'boolean'
      ? meta.hasMore
      : totalPages
      ? currentPage < totalPages
      : posts.length >= FEED_PAGE_SIZE;

  return {
    posts,
    hasMore,
    currentPage,
  };
};

const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) {
    return 'Just now';
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  const now = Date.now();
  const diffInSeconds = Math.floor((now - parsed.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hr${diffInHours === 1 ? '' : 's'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};

export default function HomeScreen() {
  const [attending, setAttending] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [nextEvent, setNextEvent] = useState<Fixture | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedPage, setFeedPage] = useState(1);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);

  // MatchWidget state (TODO: Replace with real SDK calls)
  const [nextFixture, setNextFixture] = useState<NextFixture | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);

  const loadNextEvent = useCallback(async () => {
    setEventLoading(true);
    setEventError(null);

    try {
      const fixtures = await getUpcomingFixtures({ limit: 1 });
      setNextEvent(fixtures[0] ?? null);
    } catch (error) {
      console.error('Failed to load upcoming fixture:', error);
      const message =
        error instanceof FixturesApiError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Failed to load upcoming event';
      setEventError(message);
      setNextEvent(null);
    } finally {
      setEventLoading(false);
    }
  }, []);

  const loadFeed = useCallback(
    async (page = 1, { append = false }: { append?: boolean } = {}) => {
      if (append) {
        setFeedLoadingMore(true);
      } else {
        setFeedLoading(true);
      }
      setFeedError(null);

      try {
        const payload = await feedApi.getPosts(page, FEED_PAGE_SIZE);
        const { posts, hasMore, currentPage } = normaliseFeedResponse(payload);

        setFeedPosts((prev) => (append ? [...prev, ...posts] : posts));
        setFeedPage(currentPage);
        setHasMoreFeed(hasMore);
      } catch (error) {
        console.error('Failed to load feed posts:', error);
        const message =
          error instanceof Error ? error.message : 'Failed to load the latest news feed';
        setFeedError(message);
        if (!append) {
          setFeedPosts([]);
          setHasMoreFeed(false);
        }
      } finally {
        if (append) {
          setFeedLoadingMore(false);
        } else {
          setFeedLoading(false);
        }
      }
    },
    []
  );

  const loadAllData = useCallback(async () => {
    await Promise.allSettled([loadNextEvent(), loadFeed(1)]);
  }, [loadNextEvent, loadFeed]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  const handleRSVP = (isAttending: boolean) => {
    setAttending(isAttending);
    // TODO: Send RSVP to backend
    console.log('RSVP:', isAttending ? 'Attending' : 'Not Attending');
  };

  const loadMoreFeed = useCallback(() => {
    if (feedLoadingMore || !hasMoreFeed) {
      return;
    }
    loadFeed(feedPage + 1, { append: true });
  }, [feedLoadingMore, hasMoreFeed, feedPage, loadFeed]);

  const clubName = useMemo(() => {
    return (
      nextEvent?.teamName ||
      nextEvent?.homeTeamName ||
      nextEvent?.teamShortName ||
      DEFAULT_CLUB_NAME
    );
  }, [nextEvent]);

  const clubShortName = useMemo(() => {
    return (
      nextEvent?.teamShortName ||
      nextEvent?.teamName ||
      nextEvent?.homeTeamName ||
      DEFAULT_CLUB_SHORT_NAME ||
      DEFAULT_CLUB_NAME
    );
  }, [nextEvent]);

  const opponentName = useMemo(() => {
    if (!nextEvent) {
      return 'Opponent';
    }

    return nextEvent.awayTeamName || nextEvent.opponent || 'Opponent';
  }, [nextEvent]);

  const eventDateLabel = nextEvent ? formatFixtureDate(nextEvent.date) : null;
  const eventTimeLabel = nextEvent ? formatKickOffTime(nextEvent.kickOffTime) : null;
  const eventLocationLabel = nextEvent
    ? nextEvent.location ||
      (nextEvent.venue
        ? nextEvent.venue.toLowerCase() === 'home'
          ? clubShortName
          : nextEvent.venue
        : undefined)
    : null;
  const eventStatus = nextEvent?.status;
  const eventTypeLabel = nextEvent?.competition || 'Upcoming Fixture';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Live Match Widget */}
      <MatchWidget
        nextFixture={nextFixture}
        liveUpdates={liveUpdates}
        onRefresh={onRefresh}
      />

      {/* Next Event Widget */}
      <Card style={styles.eventCard}>
        <Card.Content>
          <Title style={styles.eventTitle}>NEXT EVENT</Title>

          {eventLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.surface} />
              <Paragraph style={styles.loadingText}>Loading next event...</Paragraph>
            </View>
          ) : eventError ? (
            <View>
              <Paragraph style={styles.errorText}>{eventError}</Paragraph>
              <Button mode="outlined" onPress={loadNextEvent} style={styles.retryButton}>
                Try again
              </Button>
            </View>
          ) : nextEvent ? (
            <>
              <Paragraph style={styles.eventType}>⚽ {eventTypeLabel.toUpperCase()}</Paragraph>
              <Title>{`${clubName} vs ${opponentName}`}</Title>
              {eventDateLabel && (
                <Paragraph style={styles.eventDetails}>
                  📅 {eventDateLabel}
                  {eventTimeLabel ? ` • ${eventTimeLabel}` : ''}
                </Paragraph>
              )}
              {eventLocationLabel && (
                <Paragraph style={styles.eventDetails}>📍 {eventLocationLabel}</Paragraph>
              )}
              {eventStatus && eventStatus.toLowerCase() !== 'scheduled' && (
                <Chip style={styles.statusChip}>{eventStatus.toUpperCase()}</Chip>
              )}

              <View style={styles.rsvpButtons}>
                <Button
                  mode={attending === true ? 'contained' : 'outlined'}
                  onPress={() => handleRSVP(true)}
                  style={styles.rsvpButton}
                  buttonColor={attending === true ? COLORS.success : undefined}
                >
                  ✓ Attending
                </Button>
                <Button
                  mode={attending === false ? 'contained' : 'outlined'}
                  onPress={() => handleRSVP(false)}
                  style={styles.rsvpButton}
                  buttonColor={attending === false ? COLORS.error : undefined}
                >
                  ✗ Can't Make It
                </Button>
              </View>
            </>
          ) : (
            <Paragraph style={styles.eventDetails}>No upcoming fixtures at the moment.</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* News Feed */}
      <View style={styles.feedHeader}>
        <Title>📰 TEAM NEWS</Title>
      </View>

      {feedLoading ? (
        <Card style={styles.postCard}>
          <Card.Content>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.primary} />
              <Paragraph style={styles.loadingText}>Loading latest posts...</Paragraph>
            </View>
          </Card.Content>
        </Card>
      ) : feedError ? (
        <Card style={styles.postCard}>
          <Card.Content>
            <Paragraph style={styles.errorText}>{feedError}</Paragraph>
            <Button mode="outlined" onPress={() => loadFeed(1)} style={styles.retryButton}>
              Try again
            </Button>
          </Card.Content>
        </Card>
      ) : feedPosts.length === 0 ? (
        <Card style={styles.postCard}>
          <Card.Content>
            <Paragraph>No news updates just yet. Check back soon!</Paragraph>
          </Card.Content>
        </Card>
      ) : (
        feedPosts.map((post) => (
          <Card key={post.id} style={styles.postCard}>
            <Card.Content>
              <Paragraph style={styles.postContent}>{post.content}</Paragraph>

              <View style={styles.postMeta}>
                <View style={styles.channelChips}>
                  {post.channels.map((channel) => (
                    <Chip
                      key={`${post.id}-${channel}`}
                      style={styles.channelChip}
                      textStyle={styles.chipText}
                    >
                      {channel}
                    </Chip>
                  ))}
                </View>
                <Paragraph style={styles.timestamp}>{formatTimestamp(post.createdAt)}</Paragraph>
              </View>

              <View style={styles.postActions}>
                <IconButton
                  icon="heart-outline"
                  size={20}
                  onPress={() => console.log('Like', post.id)}
                />
                <Paragraph style={styles.likeCount}>
                  {post.likeCount ? `${post.likeCount} likes` : 'Be the first to like this'}
                </Paragraph>
                <IconButton
                  icon="comment-outline"
                  size={20}
                  onPress={() => console.log('Comment', post.id)}
                />
                <IconButton
                  icon="share-variant-outline"
                  size={20}
                  onPress={() => console.log('Share', post.id)}
                />
              </View>
            </Card.Content>
          </Card>
        ))
      )}

      {hasMoreFeed && feedPosts.length > 0 && (
        <Button
          mode="outlined"
          style={styles.loadMoreButton}
          onPress={loadMoreFeed}
          loading={feedLoadingMore}
          disabled={feedLoadingMore}
        >
          {feedLoadingMore ? 'Loading…' : 'Load More'}
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  eventCard: {
    margin: 16,
    backgroundColor: COLORS.primary,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  eventType: {
    fontSize: 12,
    color: COLORS.secondary,
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 14,
    color: COLORS.secondary,
    marginTop: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.secondary,
  },
  errorText: {
    color: COLORS.error,
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  rsvpButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  rsvpButton: {
    flex: 1,
  },
  feedHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  postCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: COLORS.surface,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  postMeta: {
    marginBottom: 8,
  },
  channelChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  channelChip: {
    backgroundColor: COLORS.background,
    height: 24,
  },
  chipText: {
    fontSize: 11,
    marginVertical: 0,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  likeCount: {
    fontSize: 13,
    color: COLORS.textLight,
    marginRight: 12,
  },
  loadMoreButton: {
    margin: 16,
  },
});
