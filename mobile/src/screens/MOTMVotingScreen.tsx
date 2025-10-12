import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, ProgressBar, Divider, Avatar, RadioButton } from 'react-native-paper';
import { COLORS } from '../config';
import { motmApi } from '../services/api';

interface Nominee {
  candidateId: string;
  name: string;
  votes: number;
}

interface MOTMVote {
  id: string;
  matchId: string;
  opponent: string;
  date: string;
  status: 'active' | 'closed';
  nominees: Nominee[];
  votingWindow: {
    start: string;
    end: string;
  };
  totalVotes: number;
  hasVoted: boolean; // Whether current user has voted
  userVote?: string; // Which candidate user voted for
}

export default function MOTMVotingScreen() {
  const [activeVotes, setActiveVotes] = useState<MOTMVote[]>([]);
  const [closedVotes, setClosedVotes] = useState<MOTMVote[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [selectedVote, setSelectedVote] = useState<MOTMVote | null>(null);

  useEffect(() => {
    loadVotes();
  }, []);

  const loadVotes = async () => {
    setLoading(true);
    try {
      // Mock data - will connect to real API
      const mockActiveVotes: MOTMVote[] = [
        {
          id: '1',
          matchId: 'm1',
          opponent: 'Leicester Panthers',
          date: '2025-10-10',
          status: 'active',
          nominees: [
            { candidateId: 'p1', name: 'James Mitchell', votes: 145 },
            { candidateId: 'p2', name: 'Tom Davies', votes: 98 },
            { candidateId: 'p3', name: 'Luke Harrison', votes: 67 },
          ],
          votingWindow: {
            start: '2025-10-10T17:00:00',
            end: '2025-10-11T23:59:59',
          },
          totalVotes: 310,
          hasVoted: false,
        },
      ];

      const mockClosedVotes: MOTMVote[] = [
        {
          id: '2',
          matchId: 'm2',
          opponent: 'Loughborough Lions',
          date: '2025-10-03',
          status: 'closed',
          nominees: [
            { candidateId: 'p2', name: 'Tom Davies', votes: 234 },
            { candidateId: 'p1', name: 'James Mitchell', votes: 189 },
            { candidateId: 'p5', name: 'Ben Parker', votes: 156 },
          ],
          votingWindow: {
            start: '2025-10-03T17:00:00',
            end: '2025-10-04T23:59:59',
          },
          totalVotes: 579,
          hasVoted: true,
          userVote: 'p2',
        },
      ];

      setActiveVotes(mockActiveVotes);
      setClosedVotes(mockClosedVotes);
    } catch (error) {
      console.error('Error loading votes:', error);
      Alert.alert('Error', 'Failed to load MOTM votes');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVotes();
    setRefreshing(false);
  };

  const castVote = async (vote: MOTMVote) => {
    if (!selectedCandidate) {
      Alert.alert('No Selection', 'Please select a player before voting.');
      return;
    }

    Alert.alert(
      'Confirm Vote',
      `Cast your vote for ${vote.nominees.find((n) => n.candidateId === selectedCandidate)?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await motmApi.castVote(vote.matchId, selectedCandidate);

              if (response.ok) {
                // Update local state
                setActiveVotes(
                  activeVotes.map((v) =>
                    v.id === vote.id
                      ? {
                          ...v,
                          hasVoted: true,
                          userVote: selectedCandidate,
                          totalVotes: v.totalVotes + 1,
                          nominees: v.nominees.map((n) =>
                            n.candidateId === selectedCandidate
                              ? { ...n, votes: n.votes + 1 }
                              : n
                          ),
                        }
                      : v
                  )
                );
                setSelectedCandidate(null);
                setSelectedVote(null);
                Alert.alert(
                  'Vote Submitted!',
                  'Thank you for voting! Results will be announced after the voting closes.'
                );
              }
            } catch (error: any) {
              console.error('Error casting vote:', error);
              Alert.alert('Error', error.message || 'Failed to submit vote. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Voting closed';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} left`;
    }

    return `${hours}h ${minutes}m left`;
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Man of the Match</Title>
        <Paragraph style={styles.headerSubtitle}>Vote for your favorite player</Paragraph>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Active Votes */}
        {activeVotes.length > 0 && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>🗳️ Active Voting</Title>
            {activeVotes.map((vote) => (
              <Card key={vote.id} style={styles.voteCard}>
                <Card.Content>
                  <View style={styles.voteHeader}>
                    <View style={styles.voteInfo}>
                      <Title style={styles.voteTitle}>vs {vote.opponent}</Title>
                      <Paragraph style={styles.voteDate}>
                        {new Date(vote.date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </Paragraph>
                    </View>
                    <Chip style={styles.activeChip} textStyle={styles.activeChipText}>
                      LIVE
                    </Chip>
                  </View>

                  <View style={styles.timeRemainingContainer}>
                    <Paragraph style={styles.timeRemaining}>
                      ⏰ {getTimeRemaining(vote.votingWindow.end)}
                    </Paragraph>
                    <Paragraph style={styles.totalVotes}>{vote.totalVotes} votes cast</Paragraph>
                  </View>

                  <Divider style={styles.divider} />

                  {vote.hasVoted ? (
                    <View style={styles.votedContainer}>
                      <Chip style={styles.votedChip} textStyle={styles.votedChipText}>
                        ✓ You voted
                      </Chip>
                      <Paragraph style={styles.votedText}>
                        Thanks for voting! Check back to see the results.
                      </Paragraph>

                      {/* Show current standings */}
                      <Title style={styles.standingsTitle}>Current Standings</Title>
                      {vote.nominees
                        .sort((a, b) => b.votes - a.votes)
                        .map((nominee, index) => {
                          const percentage =
                            vote.totalVotes > 0 ? (nominee.votes / vote.totalVotes) * 100 : 0;
                          const isUserVote = nominee.candidateId === vote.userVote;

                          return (
                            <View key={nominee.candidateId} style={styles.standingRow}>
                              <View style={styles.standingHeader}>
                                <View style={styles.standingInfo}>
                                  <Paragraph style={styles.standingRank}>
                                    {index === 0 && '🥇'}
                                    {index === 1 && '🥈'}
                                    {index === 2 && '🥉'}
                                    {index > 2 && `${index + 1}.`}
                                  </Paragraph>
                                  <Paragraph
                                    style={[
                                      styles.standingName,
                                      isUserVote && styles.userVoteName,
                                    ]}
                                  >
                                    {nominee.name}
                                    {isUserVote && ' ✓'}
                                  </Paragraph>
                                </View>
                                <Paragraph style={styles.standingPercentage}>
                                  {percentage.toFixed(1)}%
                                </Paragraph>
                              </View>
                              <ProgressBar
                                progress={percentage / 100}
                                color={isUserVote ? COLORS.primary : COLORS.accent}
                                style={styles.progressBar}
                              />
                            </View>
                          );
                        })}
                    </View>
                  ) : (
                    <View style={styles.votingContainer}>
                      <Paragraph style={styles.votingLabel}>
                        Select your Man of the Match:
                      </Paragraph>

                      <RadioButton.Group
                        onValueChange={(value) => setSelectedCandidate(value)}
                        value={selectedCandidate || ''}
                      >
                        {vote.nominees.map((nominee) => (
                          <Card
                            key={nominee.candidateId}
                            style={[
                              styles.nomineeCard,
                              selectedCandidate === nominee.candidateId &&
                                styles.nomineeCardSelected,
                            ]}
                            onPress={() => setSelectedCandidate(nominee.candidateId)}
                          >
                            <Card.Content>
                              <View style={styles.nomineeRow}>
                                <Avatar.Text
                                  size={48}
                                  label={getInitials(nominee.name)}
                                  style={styles.nomineeAvatar}
                                  color={COLORS.secondary}
                                />
                                <View style={styles.nomineeInfo}>
                                  <Title style={styles.nomineeName}>{nominee.name}</Title>
                                </View>
                                <RadioButton
                                  value={nominee.candidateId}
                                  color={COLORS.primary}
                                />
                              </View>
                            </Card.Content>
                          </Card>
                        ))}
                      </RadioButton.Group>

                      <Button
                        mode="contained"
                        onPress={() => castVote(vote)}
                        style={styles.voteButton}
                        buttonColor={COLORS.primary}
                        textColor={COLORS.secondary}
                        disabled={!selectedCandidate || loading}
                        loading={loading}
                        icon="check"
                      >
                        Cast Your Vote
                      </Button>
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {/* Closed Votes / Results */}
        {closedVotes.length > 0 && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>🏆 Previous Results</Title>
            {closedVotes.map((vote) => {
              const winner = vote.nominees.sort((a, b) => b.votes - a.votes)[0];
              const winnerPercentage =
                vote.totalVotes > 0 ? (winner.votes / vote.totalVotes) * 100 : 0;

              return (
                <Card key={vote.id} style={styles.voteCard}>
                  <Card.Content>
                    <View style={styles.voteHeader}>
                      <View style={styles.voteInfo}>
                        <Title style={styles.voteTitle}>vs {vote.opponent}</Title>
                        <Paragraph style={styles.voteDate}>
                          {new Date(vote.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Paragraph>
                      </View>
                      <Chip style={styles.closedChip} textStyle={styles.closedChipText}>
                        CLOSED
                      </Chip>
                    </View>

                    <View style={styles.winnerBanner}>
                      <Paragraph style={styles.winnerLabel}>🏆 Man of the Match</Paragraph>
                      <Avatar.Text
                        size={64}
                        label={getInitials(winner.name)}
                        style={styles.winnerAvatar}
                        color={COLORS.secondary}
                      />
                      <Title style={styles.winnerName}>{winner.name}</Title>
                      <Paragraph style={styles.winnerVotes}>
                        {winner.votes} votes ({winnerPercentage.toFixed(1)}%)
                      </Paragraph>
                    </View>

                    <Divider style={styles.divider} />

                    <Paragraph style={styles.fullResultsLabel}>Full Results:</Paragraph>
                    {vote.nominees
                      .sort((a, b) => b.votes - a.votes)
                      .map((nominee, index) => {
                        const percentage =
                          vote.totalVotes > 0 ? (nominee.votes / vote.totalVotes) * 100 : 0;

                        return (
                          <View key={nominee.candidateId} style={styles.resultRow}>
                            <View style={styles.resultHeader}>
                              <View style={styles.resultInfo}>
                                <Paragraph style={styles.resultRank}>
                                  {index === 0 && '🥇'}
                                  {index === 1 && '🥈'}
                                  {index === 2 && '🥉'}
                                  {index > 2 && `${index + 1}.`}
                                </Paragraph>
                                <Paragraph style={styles.resultName}>{nominee.name}</Paragraph>
                              </View>
                              <Paragraph style={styles.resultVotes}>
                                {nominee.votes} ({percentage.toFixed(1)}%)
                              </Paragraph>
                            </View>
                            <ProgressBar
                              progress={percentage / 100}
                              color={index === 0 ? COLORS.primary : COLORS.accent}
                              style={styles.progressBar}
                            />
                          </View>
                        );
                      })}

                    <Paragraph style={styles.totalVotesText}>
                      Total votes: {vote.totalVotes}
                    </Paragraph>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}

        {activeVotes.length === 0 && closedVotes.length === 0 && (
          <View style={styles.emptyState}>
            <Paragraph style={styles.emptyText}>No MOTM votes available</Paragraph>
            <Paragraph style={styles.emptySubtext}>
              Check back after the next match to vote for your Man of the Match!
            </Paragraph>
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
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  voteCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
  },
  voteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  voteInfo: {
    flex: 1,
  },
  voteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  voteDate: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  activeChip: {
    backgroundColor: '#4CAF50',
    height: 28,
  },
  activeChipText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  closedChip: {
    backgroundColor: COLORS.textLight,
    height: 28,
  },
  closedChipText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  timeRemainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeRemaining: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  totalVotes: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: COLORS.background,
  },
  votedContainer: {
    marginTop: 8,
  },
  votedChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    marginBottom: 12,
  },
  votedChipText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  votedText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  standingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  standingRow: {
    marginBottom: 16,
  },
  standingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  standingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  standingRank: {
    fontSize: 16,
    marginRight: 8,
    width: 28,
  },
  standingName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  userVoteName: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  standingPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  votingContainer: {
    marginTop: 8,
  },
  votingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  nomineeCard: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nomineeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  nomineeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nomineeAvatar: {
    backgroundColor: COLORS.primary,
    marginRight: 12,
  },
  nomineeInfo: {
    flex: 1,
  },
  nomineeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  voteButton: {
    marginTop: 16,
  },
  winnerBanner: {
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  winnerLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  winnerAvatar: {
    backgroundColor: COLORS.primary,
    marginBottom: 12,
  },
  winnerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  winnerVotes: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  fullResultsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  resultRow: {
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultRank: {
    fontSize: 16,
    marginRight: 8,
    width: 28,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  resultVotes: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  totalVotesText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
