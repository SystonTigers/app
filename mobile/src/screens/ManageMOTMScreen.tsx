import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button, List, Chip, FAB, Portal, Modal, TextInput, Checkbox, ProgressBar, Divider } from 'react-native-paper';
import { COLORS } from '../config';
import { motmApi } from '../services/api';

interface MOTMVote {
  id: string;
  matchId: string;
  opponent: string;
  date: string;
  status: 'draft' | 'active' | 'closed';
  nominees: {
    playerId: string;
    playerName: string;
    votes: number;
  }[];
  votingWindow: {
    start: string;
    end: string;
  };
  totalVotes: number;
  autoPostEnabled: boolean;
  resultPublished: boolean;
}

const mockVotes: MOTMVote[] = [
  {
    id: '1',
    matchId: 'm1',
    opponent: 'Leicester Panthers',
    date: '2025-10-05',
    status: 'active',
    nominees: [
      { playerId: 'p1', playerName: 'James Mitchell', votes: 145 },
      { playerId: 'p2', playerName: 'Tom Davies', votes: 98 },
      { playerId: 'p3', playerName: 'Luke Harrison', votes: 67 },
    ],
    votingWindow: {
      start: '2025-10-05T17:00:00',
      end: '2025-10-06T23:59:59',
    },
    totalVotes: 310,
    autoPostEnabled: true,
    resultPublished: false,
  },
  {
    id: '2',
    matchId: 'm2',
    opponent: 'Loughborough Lions',
    date: '2025-09-28',
    status: 'closed',
    nominees: [
      { playerId: 'p2', playerName: 'Tom Davies', votes: 234 },
      { playerId: 'p1', playerName: 'James Mitchell', votes: 189 },
      { playerId: 'p5', playerName: 'Ben Parker', votes: 156 },
    ],
    votingWindow: {
      start: '2025-09-28T17:00:00',
      end: '2025-09-29T23:59:59',
    },
    totalVotes: 579,
    autoPostEnabled: true,
    resultPublished: true,
  },
];

const mockPlayers = [
  { id: 'p1', name: 'James Mitchell', number: 9 },
  { id: 'p2', name: 'Tom Davies', number: 10 },
  { id: 'p3', name: 'Luke Harrison', number: 7 },
  { id: 'p4', name: 'Sam Roberts', number: 4 },
  { id: 'p5', name: 'Ben Parker', number: 1 },
];

const mockMatches = [
  { id: 'm1', opponent: 'Leicester Panthers', date: '2025-10-05' },
  { id: 'm2', opponent: 'Loughborough Lions', date: '2025-09-28' },
  { id: 'm3', opponent: 'Melton Mowbray', date: '2025-09-21' },
];

export default function ManageMOTMScreen() {
  const [votes, setVotes] = useState<MOTMVote[]>(mockVotes);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedVote, setSelectedVote] = useState<MOTMVote | null>(null);
  const [createData, setCreateData] = useState({
    matchId: '',
    opponent: '',
    date: '',
    nominees: [] as string[],
    startDate: '',
    startTime: '17:00',
    endDate: '',
    endTime: '23:59',
    autoPost: true,
  });

  const getStatusColor = (status: MOTMVote['status']) => {
    switch (status) {
      case 'draft': return '#9E9E9E';
      case 'active': return '#4CAF50';
      case 'closed': return '#F44336';
      default: return COLORS.textLight;
    }
  };

  const getStatusIcon = (status: MOTMVote['status']) => {
    switch (status) {
      case 'draft': return 'file-document-outline';
      case 'active': return 'vote';
      case 'closed': return 'check-circle';
      default: return 'help-circle';
    }
  };

  const handleCreateVote = () => {
    if (!createData.matchId || createData.nominees.length < 2) {
      Alert.alert('Invalid Data', 'Please select a match and at least 2 nominees.');
      return;
    }

    const match = mockMatches.find(m => m.id === createData.matchId);
    if (!match) return;

    const newVote: MOTMVote = {
      id: Date.now().toString(),
      matchId: createData.matchId,
      opponent: match.opponent,
      date: match.date,
      status: 'draft',
      nominees: createData.nominees.map(playerId => {
        const player = mockPlayers.find(p => p.id === playerId);
        return {
          playerId,
          playerName: player?.name || '',
          votes: 0,
        };
      }),
      votingWindow: {
        start: `${createData.startDate}T${createData.startTime}:00`,
        end: `${createData.endDate}T${createData.endTime}:00`,
      },
      totalVotes: 0,
      autoPostEnabled: createData.autoPost,
      resultPublished: false,
    };

    setVotes([newVote, ...votes]);
    setCreateModalVisible(false);
    resetCreateData();
    Alert.alert('Success', 'MOTM vote created! Remember to activate it when ready.');
  };

  const resetCreateData = () => {
    setCreateData({
      matchId: '',
      opponent: '',
      date: '',
      nominees: [],
      startDate: '',
      startTime: '17:00',
      endDate: '',
      endTime: '23:59',
      autoPost: true,
    });
  };

  const activateVote = (voteId: string) => {
    Alert.alert(
      'Activate Voting',
      'This will open voting to the public. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: () => {
            setVotes(votes.map(v => v.id === voteId ? { ...v, status: 'active' } : v));
            Alert.alert('Activated', 'Voting is now live!');
          }
        }
      ]
    );
  };

  const closeVote = (voteId: string) => {
    Alert.alert(
      'Close Voting',
      'This will end voting and publish results. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close & Publish',
          onPress: () => {
            const vote = votes.find(v => v.id === voteId);
            if (vote) {
              setVotes(votes.map(v =>
                v.id === voteId
                  ? { ...v, status: 'closed', resultPublished: true }
                  : v
              ));

              if (vote.autoPostEnabled) {
                Alert.alert(
                  'Published',
                  'Voting closed! Results will be auto-posted to social media.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Published', 'Voting closed!');
              }
            }
          }
        }
      ]
    );
  };

  const deleteVote = (voteId: string) => {
    Alert.alert(
      'Delete Vote',
      'Are you sure you want to delete this MOTM vote?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setVotes(votes.filter(v => v.id !== voteId));
            setSelectedVote(null);
            Alert.alert('Deleted', 'MOTM vote removed.');
          }
        }
      ]
    );
  };

  const toggleNominee = (playerId: string) => {
    const nominees = createData.nominees.includes(playerId)
      ? createData.nominees.filter(id => id !== playerId)
      : [...createData.nominees, playerId];
    setCreateData({ ...createData, nominees });
  };

  const selectMatch = (matchId: string) => {
    const match = mockMatches.find(m => m.id === matchId);
    if (match) {
      setCreateData({
        ...createData,
        matchId,
        opponent: match.opponent,
        date: match.date,
        startDate: match.date,
        endDate: match.date,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>MOTM Vote System</Title>
        <Paragraph style={styles.headerSubtitle}>Create & manage player voting</Paragraph>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Active Votes */}
        {votes.filter(v => v.status === 'active').length > 0 && (
          <>
            <Title style={styles.sectionTitle}>🔴 Active Votes</Title>
            {votes
              .filter(v => v.status === 'active')
              .map(vote => (
                <Card key={vote.id} style={styles.voteCard} onPress={() => setSelectedVote(vote)}>
                  <Card.Content>
                    <View style={styles.voteHeader}>
                      <View style={styles.voteInfo}>
                        <Title style={styles.voteTitle}>vs {vote.opponent}</Title>
                        <Paragraph style={styles.voteDate}>
                          {new Date(vote.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Paragraph>
                      </View>
                      <Chip
                        style={[styles.statusChip, { backgroundColor: getStatusColor(vote.status) }]}
                        textStyle={styles.statusChipText}
                      >
                        {vote.status}
                      </Chip>
                    </View>
                    <Paragraph style={styles.voteTally}>
                      {vote.totalVotes} total votes
                    </Paragraph>
                    <View style={styles.winnerPreview}>
                      {vote.nominees
                        .sort((a, b) => b.votes - a.votes)
                        .slice(0, 3)
                        .map((nominee, index) => (
                          <View key={nominee.playerId} style={styles.nomineeRow}>
                            <Paragraph style={styles.nomineeRank}>
                              {index === 0 && '🥇'}
                              {index === 1 && '🥈'}
                              {index === 2 && '🥉'}
                            </Paragraph>
                            <Paragraph style={styles.nomineeName}>{nominee.playerName}</Paragraph>
                            <Paragraph style={styles.nomineeVotes}>{nominee.votes} votes</Paragraph>
                          </View>
                        ))}
                    </View>
                    <Button
                      mode="contained"
                      onPress={() => closeVote(vote.id)}
                      style={styles.actionButton}
                      buttonColor={COLORS.error}
                      textColor={COLORS.secondary}
                    >
                      Close Voting
                    </Button>
                  </Card.Content>
                </Card>
              ))}
          </>
        )}

        {/* Draft Votes */}
        {votes.filter(v => v.status === 'draft').length > 0 && (
          <>
            <Title style={styles.sectionTitle}>📝 Drafts</Title>
            {votes
              .filter(v => v.status === 'draft')
              .map(vote => (
                <Card key={vote.id} style={styles.voteCard} onPress={() => setSelectedVote(vote)}>
                  <Card.Content>
                    <View style={styles.voteHeader}>
                      <View style={styles.voteInfo}>
                        <Title style={styles.voteTitle}>vs {vote.opponent}</Title>
                        <Paragraph style={styles.voteDate}>
                          {new Date(vote.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Paragraph>
                      </View>
                      <Chip
                        style={[styles.statusChip, { backgroundColor: getStatusColor(vote.status) }]}
                        textStyle={styles.statusChipText}
                      >
                        draft
                      </Chip>
                    </View>
                    <Paragraph style={styles.nomineeCount}>
                      {vote.nominees.length} nominees
                    </Paragraph>
                    <Button
                      mode="contained"
                      onPress={() => activateVote(vote.id)}
                      style={styles.actionButton}
                      buttonColor={COLORS.primary}
                      textColor={COLORS.secondary}
                    >
                      Activate Voting
                    </Button>
                  </Card.Content>
                </Card>
              ))}
          </>
        )}

        {/* Closed Votes */}
        {votes.filter(v => v.status === 'closed').length > 0 && (
          <>
            <Title style={styles.sectionTitle}>✅ Completed</Title>
            {votes
              .filter(v => v.status === 'closed')
              .map(vote => {
                const winner = vote.nominees.sort((a, b) => b.votes - a.votes)[0];
                return (
                  <Card key={vote.id} style={styles.voteCard} onPress={() => setSelectedVote(vote)}>
                    <Card.Content>
                      <View style={styles.voteHeader}>
                        <View style={styles.voteInfo}>
                          <Title style={styles.voteTitle}>vs {vote.opponent}</Title>
                          <Paragraph style={styles.voteDate}>
                            {new Date(vote.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Paragraph>
                        </View>
                        <Chip
                          style={[styles.statusChip, { backgroundColor: getStatusColor(vote.status) }]}
                          textStyle={styles.statusChipText}
                        >
                          closed
                        </Chip>
                      </View>
                      <View style={styles.winnerBanner}>
                        <Paragraph style={styles.winnerLabel}>🏆 Winner</Paragraph>
                        <Title style={styles.winnerName}>{winner.playerName}</Title>
                        <Paragraph style={styles.winnerVotes}>
                          {winner.votes} votes ({Math.round((winner.votes / vote.totalVotes) * 100)}%)
                        </Paragraph>
                      </View>
                      {vote.autoPostEnabled && vote.resultPublished && (
                        <Chip style={styles.postedChip} textStyle={styles.postedChipText}>
                          ✓ Auto-posted to socials
                        </Chip>
                      )}
                    </Card.Content>
                  </Card>
                );
              })}
          </>
        )}

        {votes.length === 0 && (
          <View style={styles.emptyState}>
            <Paragraph style={styles.emptyText}>No MOTM votes created yet</Paragraph>
            <Paragraph style={styles.emptySubtext}>Tap + to create your first vote</Paragraph>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        label="Create Vote"
        style={styles.fab}
        color={COLORS.secondary}
        onPress={() => setCreateModalVisible(true)}
      />

      {/* Create Vote Modal */}
      <Portal>
        <Modal
          visible={createModalVisible}
          onDismiss={() => {
            setCreateModalVisible(false);
            resetCreateData();
          }}
          contentContainerStyle={styles.createModal}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>Create MOTM Vote</Title>

            {/* Select Match */}
            <Paragraph style={styles.modalLabel}>Select Match</Paragraph>
            {mockMatches.map(match => (
              <Chip
                key={match.id}
                selected={createData.matchId === match.id}
                onPress={() => selectMatch(match.id)}
                style={[
                  styles.matchChip,
                  createData.matchId === match.id && styles.matchChipSelected
                ]}
                textStyle={[
                  styles.matchChipText,
                  createData.matchId === match.id && styles.matchChipTextSelected
                ]}
              >
                vs {match.opponent} ({new Date(match.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})
              </Chip>
            ))}

            {/* Select Nominees */}
            <Paragraph style={styles.modalLabel}>Select Nominees (min 2)</Paragraph>
            <View style={styles.nomineesGrid}>
              {mockPlayers.map(player => (
                <Chip
                  key={player.id}
                  selected={createData.nominees.includes(player.id)}
                  onPress={() => toggleNominee(player.id)}
                  style={[
                    styles.nomineeChip,
                    createData.nominees.includes(player.id) && styles.nomineeChipSelected
                  ]}
                  textStyle={[
                    styles.nomineeChipText,
                    createData.nominees.includes(player.id) && styles.nomineeChipTextSelected
                  ]}
                >
                  #{player.number} {player.name}
                </Chip>
              ))}
            </View>

            {/* Voting Window */}
            <Paragraph style={styles.modalLabel}>Voting Window</Paragraph>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeInput}>
                <TextInput
                  label="Start Date"
                  value={createData.startDate}
                  onChangeText={(text) => setCreateData({ ...createData, startDate: text })}
                  mode="outlined"
                  placeholder="YYYY-MM-DD"
                  style={styles.input}
                />
                <TextInput
                  label="Time"
                  value={createData.startTime}
                  onChangeText={(text) => setCreateData({ ...createData, startTime: text })}
                  mode="outlined"
                  placeholder="HH:MM"
                  style={styles.input}
                />
              </View>
              <View style={styles.dateTimeInput}>
                <TextInput
                  label="End Date"
                  value={createData.endDate}
                  onChangeText={(text) => setCreateData({ ...createData, endDate: text })}
                  mode="outlined"
                  placeholder="YYYY-MM-DD"
                  style={styles.input}
                />
                <TextInput
                  label="Time"
                  value={createData.endTime}
                  onChangeText={(text) => setCreateData({ ...createData, endTime: text })}
                  mode="outlined"
                  placeholder="HH:MM"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Auto-post Toggle */}
            <View style={styles.checkboxRow}>
              <Checkbox
                status={createData.autoPost ? 'checked' : 'unchecked'}
                onPress={() => setCreateData({ ...createData, autoPost: !createData.autoPost })}
                color={COLORS.primary}
              />
              <Paragraph style={styles.checkboxLabel}>Auto-post result to social media</Paragraph>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setCreateModalVisible(false);
                  resetCreateData();
                }}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateVote}
                style={styles.modalButton}
                buttonColor={COLORS.primary}
                textColor={COLORS.secondary}
                disabled={!createData.matchId || createData.nominees.length < 2}
              >
                Create
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Vote Detail Modal */}
      <Portal>
        <Modal
          visible={!!selectedVote}
          onDismiss={() => setSelectedVote(null)}
          contentContainerStyle={styles.detailModal}
        >
          {selectedVote && (
            <ScrollView>
              <Title style={styles.detailTitle}>vs {selectedVote.opponent}</Title>
              <Paragraph style={styles.detailDate}>
                {new Date(selectedVote.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Paragraph>

              <Divider style={styles.divider} />

              <Title style={styles.sectionSubtitle}>Voting Results</Title>
              <Paragraph style={styles.totalVotes}>Total Votes: {selectedVote.totalVotes}</Paragraph>

              {selectedVote.nominees
                .sort((a, b) => b.votes - a.votes)
                .map((nominee, index) => {
                  const percentage = selectedVote.totalVotes > 0
                    ? (nominee.votes / selectedVote.totalVotes) * 100
                    : 0;
                  return (
                    <View key={nominee.playerId} style={styles.resultRow}>
                      <View style={styles.resultHeader}>
                        <View style={styles.resultInfo}>
                          <Paragraph style={styles.resultRank}>
                            {index === 0 && '🥇'}
                            {index === 1 && '🥈'}
                            {index === 2 && '🥉'}
                            {index > 2 && `${index + 1}.`}
                          </Paragraph>
                          <Paragraph style={styles.resultName}>{nominee.playerName}</Paragraph>
                        </View>
                        <Paragraph style={styles.resultVotes}>
                          {nominee.votes} ({percentage.toFixed(1)}%)
                        </Paragraph>
                      </View>
                      <ProgressBar progress={percentage / 100} color={COLORS.primary} style={styles.progressBar} />
                    </View>
                  );
                })}

              <Divider style={styles.divider} />

              <Title style={styles.sectionSubtitle}>Settings</Title>
              <List.Item
                title="Status"
                description={selectedVote.status}
                left={props => <List.Icon {...props} icon={getStatusIcon(selectedVote.status)} color={getStatusColor(selectedVote.status)} />}
              />
              <List.Item
                title="Auto-post to socials"
                description={selectedVote.autoPostEnabled ? 'Enabled' : 'Disabled'}
                left={props => <List.Icon {...props} icon={selectedVote.autoPostEnabled ? 'check-circle' : 'close-circle'} />}
              />
              <List.Item
                title="Result published"
                description={selectedVote.resultPublished ? 'Yes' : 'Not yet'}
                left={props => <List.Icon {...props} icon={selectedVote.resultPublished ? 'check-circle' : 'clock-outline'} />}
              />

              <View style={styles.detailButtons}>
                {selectedVote.status === 'draft' && (
                  <Button
                    mode="contained"
                    onPress={() => {
                      activateVote(selectedVote.id);
                      setSelectedVote(null);
                    }}
                    style={styles.detailButton}
                    buttonColor={COLORS.primary}
                    textColor={COLORS.secondary}
                  >
                    Activate
                  </Button>
                )}
                {selectedVote.status === 'active' && (
                  <Button
                    mode="contained"
                    onPress={() => {
                      closeVote(selectedVote.id);
                      setSelectedVote(null);
                    }}
                    style={styles.detailButton}
                    buttonColor={COLORS.error}
                    textColor={COLORS.secondary}
                  >
                    Close Voting
                  </Button>
                )}
                <Button
                  mode="outlined"
                  onPress={() => {
                    deleteVote(selectedVote.id);
                  }}
                  style={styles.detailButton}
                  textColor={COLORS.error}
                >
                  Delete
                </Button>
              </View>

              <Button
                mode="text"
                onPress={() => setSelectedVote(null)}
                style={styles.closeDetailButton}
              >
                Close
              </Button>
            </ScrollView>
          )}
        </Modal>
      </Portal>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  voteCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
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
    fontSize: 12,
    color: COLORS.textLight,
  },
  statusChip: {
    height: 28,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.secondary,
    textTransform: 'uppercase',
  },
  voteTally: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  winnerPreview: {
    marginBottom: 12,
  },
  nomineeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  nomineeRank: {
    fontSize: 16,
    marginRight: 8,
    width: 24,
  },
  nomineeName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  nomineeVotes: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  nomineeCount: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  actionButton: {
    marginTop: 4,
  },
  winnerBanner: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  winnerLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
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
  postedChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
  },
  postedChipText: {
    fontSize: 11,
    color: COLORS.secondary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
  // Create Modal
  createModal: {
    backgroundColor: COLORS.surface,
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  matchChip: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  matchChipSelected: {
    backgroundColor: COLORS.primary,
  },
  matchChipText: {
    color: COLORS.primary,
  },
  matchChipTextSelected: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  nomineesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nomineeChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  nomineeChipSelected: {
    backgroundColor: COLORS.primary,
  },
  nomineeChipText: {
    color: COLORS.primary,
  },
  nomineeChipTextSelected: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateTimeInput: {
    flex: 1,
  },
  input: {
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
  },
  // Detail Modal
  detailModal: {
    backgroundColor: COLORS.surface,
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailDate: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: COLORS.background,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  totalVotes: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 16,
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
    width: 32,
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
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  detailButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  detailButton: {
    flex: 1,
  },
  closeDetailButton: {
    marginTop: 8,
  },
});
