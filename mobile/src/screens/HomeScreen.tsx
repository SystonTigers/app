import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, IconButton } from 'react-native-paper';
import { COLORS } from '../config';

// Mock data for now - we'll connect to API later
const mockNextEvent = {
  type: 'match',
  title: 'vs Leicester Panthers',
  date: 'Saturday, 10 Nov',
  time: '2:00 PM',
  location: 'Syston Recreation Ground',
};

const mockFeedPosts = [
  {
    id: '1',
    content: 'Great win today! 3-1 against tough opponents. Well done lads! 💪',
    channels: ['X', 'Instagram', 'Feed'],
    timestamp: '2 hours ago',
    likes: 12,
  },
  {
    id: '2',
    content: 'Match photos now available in the gallery! Check them out!',
    channels: ['Feed'],
    timestamp: '5 hours ago',
    likes: 8,
  },
  {
    id: '3',
    content: 'Training tonight at 6 PM. Don\'t forget your boots!',
    channels: ['X', 'Feed'],
    timestamp: 'Yesterday',
    likes: 15,
  },
];

export default function HomeScreen() {
  const [attending, setAttending] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // TODO: Fetch fresh data from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleRSVP = (isAttending: boolean) => {
    setAttending(isAttending);
    // TODO: Send RSVP to backend
    console.log('RSVP:', isAttending ? 'Attending' : 'Not Attending');
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Next Event Widget */}
      <Card style={styles.eventCard}>
        <Card.Content>
          <Title style={styles.eventTitle}>NEXT EVENT</Title>
          <Paragraph style={styles.eventType}>
            ⚽ {mockNextEvent.type.toUpperCase()}
          </Paragraph>
          <Title>{mockNextEvent.title}</Title>
          <Paragraph style={styles.eventDetails}>
            📅 {mockNextEvent.date} • {mockNextEvent.time}
          </Paragraph>
          <Paragraph style={styles.eventDetails}>
            📍 {mockNextEvent.location}
          </Paragraph>

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
        </Card.Content>
      </Card>

      {/* News Feed */}
      <View style={styles.feedHeader}>
        <Title>📰 TEAM NEWS</Title>
      </View>

      {mockFeedPosts.map((post) => (
        <Card key={post.id} style={styles.postCard}>
          <Card.Content>
            <Paragraph style={styles.postContent}>{post.content}</Paragraph>

            <View style={styles.postMeta}>
              <View style={styles.channelChips}>
                {post.channels.map((channel) => (
                  <Chip
                    key={channel}
                    style={styles.channelChip}
                    textStyle={styles.chipText}
                  >
                    {channel}
                  </Chip>
                ))}
              </View>
              <Paragraph style={styles.timestamp}>{post.timestamp}</Paragraph>
            </View>

            <View style={styles.postActions}>
              <IconButton icon="heart-outline" size={20} onPress={() => console.log('Like')} />
              <Paragraph style={styles.likeCount}>{post.likes} likes</Paragraph>
              <IconButton icon="comment-outline" size={20} onPress={() => console.log('Comment')} />
              <IconButton icon="share-variant-outline" size={20} onPress={() => console.log('Share')} />
            </View>
          </Card.Content>
        </Card>
      ))}

      <Button mode="outlined" style={styles.loadMoreButton} onPress={() => console.log('Load more')}>
        Load More
      </Button>
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
