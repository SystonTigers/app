import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Linking, Alert, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, List, IconButton, ProgressBar } from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';
import { COLORS } from '../config';
import { fixturesApi, videosApi, gotmApi, squadApi } from '../services/api';

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
  videoUrl?: string;
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

export default function HighlightsScreen() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [playingClip, setPlayingClip] = useState<Clip | null>(null);
  const [selectedTab, setSelectedTab] = useState<'recent' | 'gotm' | 'archive'>('recent');
  const [gotmNominees, setGotmNominees] = useState<GOTMNominee[]>([]);
  const [gotmWinners, setGotmWinners] = useState<GOTMWinner[]>([]);
  const [videos, setVideos] = useState<Clip[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [fixturesRes, videosRes, gotmRes, squadRes] = await Promise.all([
        fixturesApi.getFixtures(),
        videosApi.list(),
        gotmApi.getVoting(),
        squadApi.getSquad()
      ]);

      // Process Matches
      const allFixtures = fixturesRes.data || [];
      const pastMatches = allFixtures
        .filter((f: any) => f.status === 'finished' || f.match_status === 'ft')
        .map((f: any) => ({
          id: f.id,
          opponent: f.opponent,
          date: f.fixture_date,
          score: `${f.home_score}-${f.away_score}`,
          clipCount: 0,
        }));

      // Process Videos
      const allVideos = videosRes.data || [];
      const mappedClips: Clip[] = allVideos.map((v: any) => ({
        id: v.id,
        matchId: v.match_id,
        title: v.title,
        description: v.description,
        thumbnailUrl: v.thumbnail_url || 'https://via.placeholder.com/400x300',
        videoUrl: v.video_url,
        youtubeUrl: v.youtube_url,
        duration: v.duration,
        uploadedAt: v.uploaded_at,
        views: v.views,
        type: v.type,
      }));

      // Update match clip counts
      const matchesWithCounts = pastMatches.map((m: any) => ({
        ...m,
        clipCount: mappedClips.filter(c => c.matchId === m.id).length
      })).filter((m: any) => m.clipCount > 0);

      setMatches(matchesWithCounts);
      setVideos(mappedClips);

      // Process GOTM
      const players = squadRes.data || [];
      const getPlayerName = (id: string) => {
        const p = players.find((p: any) => p.id === id);
        return p ? `${p.first_name} ${p.last_name}` : 'Unknown Player';
      };

      if (gotmRes.success && gotmRes.data && gotmRes.data.voting) {
        setVotingId(gotmRes.data.voting.id);
        const candidates = gotmRes.data.candidates.map((c: any) => ({
          id: c.id,
          clipId: c.match_id, // fallback if no specific clip link
          title: c.description,
          scorer: getPlayerName(c.player_id),
          opponent: 'Unknown', // Need to link to match to get opponent
          date: new Date().toISOString(), // Placeholder
          thumbnailUrl: 'https://via.placeholder.com/400x300', // Need thumbnail
          votes: c.votes,
          hasVoted: false, // Need to check if user voted (API should probably tell us or we check locally)
          videoUrl: c.video_url,
        }));
        setGotmNominees(candidates);
      } else {
        setGotmNominees([]);
      }

    } catch (error) {
      console.error('Error loading highlights:', error);
      Alert.alert('Error', 'Failed to load highlights data');
    } finally {
      setLoading(false);
    }
  };

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

  const handleVote = async (nomineeId: string) => {
    if (!votingId) return;

    try {
      const response = await gotmApi.castVote(votingId, nomineeId);
      if (response.success) {
        setGotmNominees(nominees =>
          nominees.map(n =>
            n.id === nomineeId
              ? { ...n, votes: n.votes + 1, hasVoted: true }
              : n
          )
        );
        Alert.alert('Vote Cast', 'Thank you for voting!');
      } else {
        Alert.alert('Error', response.error || 'Failed to cast vote');
      }
    } catch (error) {
      console.error('Vote error:', error);
      Alert.alert('Error', 'Failed to cast vote');
    }
  };

  const openYouTube = (url: string) => {
    Linking.openURL(url);
  };

  // Match clips view
  if (selectedMatch) {
    const matchClips = videos.filter(c => c.matchId === selectedMatch.id);

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
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
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
                {matches.map((match) => (
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
                {gotmNominees.length > 0 ? (
                  <>
                    <Card style={styles.votingCard}>
                      <Card.Content>
                        <Title style={styles.votingTitle}>🏆 Vote for Goal of the Month</Title>
                        <Paragraph style={styles.votingSubtitle}>Cast your vote below!</Paragraph>
                        <Paragraph style={styles.votingStats}>{gotmNominees.reduce((acc, curr) => acc + curr.votes, 0)} votes cast</Paragraph>
                      </Card.Content>
                    </Card>

                    {gotmNominees.map((nominee) => (
                      <Card key={nominee.id} style={styles.nomineeCard}>
                        <Card.Cover source={{ uri: nominee.thumbnailUrl }} style={styles.nomineeThumbnail} />
                        <Card.Content style={styles.nomineeContent}>
                          <Title style={styles.nomineeTitle}>{nominee.title}</Title>
                          <Paragraph style={styles.nomineeInfo}>
                            {nominee.scorer}
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
                  </>
                ) : (
                  <Paragraph style={{ padding: 20, textAlign: 'center' }}>No active voting currently.</Paragraph>
                )}
              </View>
            )}

            {/* Archive Tab */}
            {selectedTab === 'archive' && (
              <View style={styles.archiveContainer}>
                <Title style={styles.archiveTitle}>Past Winners</Title>
                <Paragraph>No existing past winners data available.</Paragraph>
              </View>
            )}
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
