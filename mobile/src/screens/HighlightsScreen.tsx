import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, List, IconButton, ProgressBar } from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';
import { COLORS } from '../config';

const { width } = Dimensions.get('window');

interface Clip {
  id: string;
  matchId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  youtubeUrl?: string;
  duration: number;
  uploadedAt: string;
  views: number;
  type: 'goal' | 'save' | 'skill' | 'highlights' | 'full-match';
}

interface Match {
  id: string;
  opponent: string;
  date: string;
  score: string;
  clipCount: number;
}

interface GOTMNominee {
  id: string;
  clipId: string;
  title: string;
  scorer: string;
  opponent: string;
  date: string;
  thumbnailUrl: string;
  votes: number;
  hasVoted: boolean;
}

interface GOTMWinner {
  id: string;
  month: string;
  year: string;
  title: string;
  scorer: string;
  votes: number;
  thumbnailUrl: string;
  videoUrl: string;
}

const mockMatches: Match[] = [
  { id: '1', opponent: 'Leicester Panthers', date: '2025-10-05', score: '3-1', clipCount: 8 },
  { id: '2', opponent: 'Loughborough Lions', date: '2025-09-28', score: '2-2', clipCount: 6 },
  { id: '3', opponent: 'Melton Mowbray', date: '2025-09-21', score: '4-0', clipCount: 12 },
];

const mockClips: Clip[] = [
  { id: '1', matchId: '1', title: 'James Mitchell - Goal 1', description: 'Beautiful strike from outside the box', thumbnailUrl: 'https://picsum.photos/400/300?random=21', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', youtubeUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', duration: 45, uploadedAt: '2025-10-05 17:30', views: 234, type: 'goal' },
  { id: '2', matchId: '1', title: 'Tom Davies - Assist', description: 'Perfect through ball', thumbnailUrl: 'https://picsum.photos/400/300?random=22', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', youtubeUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', duration: 30, uploadedAt: '2025-10-05 17:35', views: 156, type: 'skill' },
  { id: '3', matchId: '1', title: 'Ben Parker - Save', description: 'Outstanding reaction save', thumbnailUrl: 'https://picsum.photos/400/300?random=23', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', duration: 25, uploadedAt: '2025-10-05 17:40', views: 189, type: 'save' },
  { id: '4', matchId: '1', title: 'Match Highlights', description: 'Full 90 minutes condensed', thumbnailUrl: 'https://picsum.photos/400/300?random=24', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', youtubeUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', duration: 420, uploadedAt: '2025-10-05 18:00', views: 512, type: 'highlights' },
];

const mockGOTMNominees: GOTMNominee[] = [
  { id: '1', clipId: '1', title: 'Thunderbolt from 30 yards', scorer: 'James Mitchell', opponent: 'Leicester Panthers', date: '2025-10-05', thumbnailUrl: 'https://picsum.photos/400/300?random=31', votes: 145, hasVoted: false },
  { id: '2', clipId: '5', title: 'Solo run from halfway', scorer: 'Luke Harrison', opponent: 'Loughborough Lions', date: '2025-09-28', thumbnailUrl: 'https://picsum.photos/400/300?random=32', votes: 98, hasVoted: false },
  { id: '3', clipId: '8', title: 'Overhead kick winner', scorer: 'Tom Davies', opponent: 'Melton Mowbray', date: '2025-09-21', thumbnailUrl: 'https://picsum.photos/400/300?random=33', votes: 167, hasVoted: false },
];

const mockGOTMWinners: GOTMWinner[] = [
  { id: '1', month: 'September', year: '2025', title: 'Bicycle kick vs Coalville', scorer: 'James Mitchell', votes: 234, thumbnailUrl: 'https://picsum.photos/400/300?random=41', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
  { id: '2', month: 'August', year: '2025', title: 'Long-range screamer', scorer: 'Luke Harrison', votes: 189, thumbnailUrl: 'https://picsum.photos/400/300?random=42', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
];

export default function HighlightsScreen() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [playingClip, setPlayingClip] = useState<Clip | null>(null);
  const [selectedTab, setSelectedTab] = useState<'recent' | 'gotm' | 'archive'>('recent');
  const [gotmNominees, setGotmNominees] = useState<GOTMNominee[]>(mockGOTMNominees);

  const getClipTypeColor = (type: Clip['type']) => {
    switch (type) {
      case 'goal': return '#4CAF50';
      case 'save': return '#2196F3';
      case 'skill': return '#FF9800';
      case 'highlights': return '#9C27B0';
      case 'full-match': return '#F44336';
      default: return COLORS.primary;
    }
  };

  const getClipTypeIcon = (type: Clip['type']) => {
    switch (type) {
      case 'goal': return '⚽';
      case 'save': return '🧤';
      case 'skill': return '⭐';
      case 'highlights': return '🎬';
      case 'full-match': return '📹';
      default: return '🎥';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVote = (nomineeId: string) => {
    setGotmNominees(nominees =>
      nominees.map(n =>
        n.id === nomineeId
          ? { ...n, votes: n.votes + 1, hasVoted: true }
          : { ...n, hasVoted: true }
      )
    );
  };

  const openYouTube = (url: string) => {
    Linking.openURL(url);
  };

  // Match clips view
  if (selectedMatch) {
    const matchClips = mockClips.filter(c => c.matchId === selectedMatch.id);

    return (
      <View style={styles.container}>
        <View style={styles.matchHeader}>
          <IconButton
            icon="arrow-left"
            iconColor={COLORS.secondary}
            size={24}
            onPress={() => {
              setSelectedMatch(null);
              setPlayingClip(null);
            }}
          />
          <View style={styles.matchHeaderContent}>
            <Title style={styles.matchTitle}>vs {selectedMatch.opponent}</Title>
            <Paragraph style={styles.matchSubtitle}>
              {new Date(selectedMatch.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {selectedMatch.score} • {selectedMatch.clipCount} clips
            </Paragraph>
          </View>
        </View>

        <ScrollView style={styles.clipsContainer}>
          {playingClip && (
            <View style={styles.videoPlayer}>
              <Video
                source={{ uri: playingClip.videoUrl }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
              />
              <View style={styles.videoInfo}>
                <Title style={styles.videoTitle}>{playingClip.title}</Title>
                <Paragraph style={styles.videoDescription}>{playingClip.description}</Paragraph>
                {playingClip.youtubeUrl && (
                  <Button
                    mode="outlined"
                    icon="youtube"
                    onPress={() => openYouTube(playingClip.youtubeUrl!)}
                    style={styles.youtubeButton}
                    textColor="#FF0000"
                  >
                    Watch on YouTube
                  </Button>
                )}
              </View>
            </View>
          )}

          <View style={styles.clipsList}>
            {matchClips.map((clip) => (
              <Card key={clip.id} style={styles.clipCard}>
                <TouchableOpacity onPress={() => setPlayingClip(clip)}>
                  <Card.Cover source={{ uri: clip.thumbnailUrl }} style={styles.clipThumbnail} />
                  <View style={styles.clipOverlay}>
                    <IconButton icon="play-circle" iconColor={COLORS.secondary} size={48} />
                    <Chip
                      style={[styles.durationChip, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}
                      textStyle={styles.durationText}
                    >
                      {formatDuration(clip.duration)}
                    </Chip>
                  </View>
                </TouchableOpacity>
                <Card.Content style={styles.clipContent}>
                  <View style={styles.clipHeader}>
                    <Chip
                      style={[styles.typeChip, { backgroundColor: getClipTypeColor(clip.type) }]}
                      textStyle={styles.typeText}
                    >
                      {getClipTypeIcon(clip.type)} {clip.type}
                    </Chip>
                    <Paragraph style={styles.clipViews}>👁️ {clip.views}</Paragraph>
                  </View>
                  <Title style={styles.clipTitle}>{clip.title}</Title>
                  <Paragraph style={styles.clipDescription}>{clip.description}</Paragraph>
                </Card.Content>
              </Card>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Main highlights view
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Highlights</Title>
        <Paragraph style={styles.headerSubtitle}>Match clips & Goal of the Month</Paragraph>
      </View>

      {/* Tab selector */}
      <View style={styles.tabContainer}>
        <Button
          mode={selectedTab === 'recent' ? 'contained' : 'outlined'}
          onPress={() => setSelectedTab('recent')}
          style={styles.tabButton}
          buttonColor={selectedTab === 'recent' ? COLORS.primary : 'transparent'}
          textColor={selectedTab === 'recent' ? COLORS.secondary : COLORS.primary}
        >
          Recent Clips
        </Button>
        <Button
          mode={selectedTab === 'gotm' ? 'contained' : 'outlined'}
          onPress={() => setSelectedTab('gotm')}
          style={styles.tabButton}
          buttonColor={selectedTab === 'gotm' ? COLORS.primary : 'transparent'}
          textColor={selectedTab === 'gotm' ? COLORS.secondary : COLORS.primary}
        >
          Goal of Month
        </Button>
        <Button
          mode={selectedTab === 'archive' ? 'contained' : 'outlined'}
          onPress={() => setSelectedTab('archive')}
          style={styles.tabButton}
          buttonColor={selectedTab === 'archive' ? COLORS.primary : 'transparent'}
          textColor={selectedTab === 'archive' ? COLORS.secondary : COLORS.primary}
        >
          Archive
        </Button>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Recent Clips Tab */}
        {selectedTab === 'recent' && (
          <View style={styles.matchesList}>
            {mockMatches.map((match) => (
              <Card key={match.id} style={styles.matchCard}>
                <List.Item
                  title={`vs ${match.opponent}`}
                  description={`${new Date(match.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • ${match.score} • ${match.clipCount} clips`}
                  left={props => <List.Icon {...props} icon="video-box" color={COLORS.primary} />}
                  right={props => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => setSelectedMatch(match)}
                  style={styles.matchListItem}
                />
              </Card>
            ))}
          </View>
        )}

        {/* Goal of the Month Tab */}
        {selectedTab === 'gotm' && (
          <View style={styles.gotmContainer}>
            <Card style={styles.votingCard}>
              <Card.Content>
                <Title style={styles.votingTitle}>🏆 Vote for October Goal of the Month</Title>
                <Paragraph style={styles.votingSubtitle}>Voting ends: October 31, 2025</Paragraph>
                <ProgressBar
                  progress={0.65}
                  color={COLORS.primary}
                  style={styles.votingProgress}
                />
                <Paragraph style={styles.votingStats}>350 votes cast • 15 days remaining</Paragraph>
              </Card.Content>
            </Card>

            {gotmNominees.map((nominee) => (
              <Card key={nominee.id} style={styles.nomineeCard}>
                <Card.Cover source={{ uri: nominee.thumbnailUrl }} style={styles.nomineeThumbnail} />
                <Card.Content style={styles.nomineeContent}>
                  <Title style={styles.nomineeTitle}>{nominee.title}</Title>
                  <Paragraph style={styles.nomineeInfo}>
                    {nominee.scorer} • vs {nominee.opponent}
                  </Paragraph>
                  <Paragraph style={styles.nomineeDate}>
                    {new Date(nominee.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Paragraph>
                  <View style={styles.voteSection}>
                    <Paragraph style={styles.voteCount}>
                      {nominee.votes} votes
                    </Paragraph>
                    <Button
                      mode="contained"
                      onPress={() => handleVote(nominee.id)}
                      disabled={nominee.hasVoted}
                      buttonColor={nominee.hasVoted ? '#CCCCCC' : COLORS.primary}
                      textColor={COLORS.secondary}
                      style={styles.voteButton}
                    >
                      {nominee.hasVoted ? 'Voted ✓' : 'Vote'}
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {/* Archive Tab */}
        {selectedTab === 'archive' && (
          <View style={styles.archiveContainer}>
            <Title style={styles.archiveTitle}>Past Winners</Title>
            {mockGOTMWinners.map((winner) => (
              <Card key={winner.id} style={styles.winnerCard}>
                <Card.Cover source={{ uri: winner.thumbnailUrl }} style={styles.winnerThumbnail} />
                <View style={styles.winnerBadge}>
                  <Paragraph style={styles.winnerBadgeText}>🏆 WINNER</Paragraph>
                </View>
                <Card.Content>
                  <Chip style={styles.winnerMonth} textStyle={styles.winnerMonthText}>
                    {winner.month} {winner.year}
                  </Chip>
                  <Title style={styles.winnerTitle}>{winner.title}</Title>
                  <Paragraph style={styles.winnerScorer}>{winner.scorer}</Paragraph>
                  <Paragraph style={styles.winnerVotes}>{winner.votes} votes</Paragraph>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  matchesList: {
    padding: 16,
  },
  matchCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  matchListItem: {
    paddingVertical: 8,
  },
  // Match view styles
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingRight: 20,
    paddingVertical: 8,
  },
  matchHeaderContent: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  matchSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  clipsContainer: {
    flex: 1,
  },
  videoPlayer: {
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: 250,
  },
  videoInfo: {
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  youtubeButton: {
    borderColor: '#FF0000',
  },
  clipsList: {
    padding: 16,
  },
  clipCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  clipThumbnail: {
    height: 200,
  },
  clipOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationChip: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  durationText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  clipContent: {
    paddingTop: 12,
  },
  clipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeChip: {
    height: 28,
  },
  typeText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  clipViews: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  clipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clipDescription: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  // GOTM styles
  gotmContainer: {
    padding: 16,
  },
  votingCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  votingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  votingSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  votingProgress: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  votingStats: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  nomineeCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  nomineeThumbnail: {
    height: 200,
  },
  nomineeContent: {
    paddingTop: 12,
  },
  nomineeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nomineeInfo: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  nomineeDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  voteSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  voteButton: {
    minWidth: 100,
  },
  // Archive styles
  archiveContainer: {
    padding: 16,
  },
  archiveTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  winnerCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  winnerThumbnail: {
    height: 200,
  },
  winnerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  winnerBadgeText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  winnerMonth: {
    backgroundColor: COLORS.background,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  winnerMonthText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  winnerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  winnerScorer: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  winnerVotes: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
