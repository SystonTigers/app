import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, List, Chip, FAB, Portal, Modal, TextInput, Checkbox, ProgressBar, Divider, Text } from 'react-native-paper';
import { COLORS } from '../config';
import { motmApi, fixturesApi, squadApi } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

interface MOTMVote {
  match_id: string; // From backend (motm_sessions table)
  tenant_id: string;
  status: 'draft' | 'active' | 'closed';
  voting_start_at: string;
  voting_end_at: string;
  auto_post: number; // 0 or 1
  created_at: string;
  updated_at: string;
  // Enriched data from frontend join
  opponent?: string;
  date?: string;
  totalVotes?: number;
  nominees?: any[];
}

export default function ManageMOTMScreen() {
  const [votes, setVotes] = useState<MOTMVote[]>([]);
  const [matches, setMatches] = useState<any[]>([]); // Past results & Upcoming fixtures
  const [players, setPlayers] = useState<any[]>([]); // Squad list
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedVote, setSelectedVote] = useState<MOTMVote | null>(null);
  const [tallyData, setTallyData] = useState<any>(null); // For selected vote detail

  const [createData, setCreateData] = useState({
    matchId: '',
    opponent: '',
    date: '',
    nominees: [] as string[], // We might auto-select all who played
    startDate: '',
    startTime: '17:00',
    endDate: '',
    endTime: '23:59',
    autoPost: true,
    status: 'draft' as 'draft' | 'active'
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsRes, fixturesRes, resultsRes, squadRes] = await Promise.all([
        motmApi.listSessions(),
        fixturesApi.getFixtures(),
        fixturesApi.getResults(),
        squadApi.getSquad()
      ]);

      // Combine fixtures and results for selection list
      // Normalize structure: { id, opponent, date, kickOffTime }
      const allMatches = [
        ...(fixturesRes.data || []).map((f: any) => ({
          id: f.id,
          opponent: f.opponent,
          date: f.date,
          kickOffTime: f.kickOffTime,
          type: 'fixture'
        })),
        ...(resultsRes.data || []).map((r: any) => ({
          id: r.id,
          opponent: r.opponent,
          date: r.date,
          kickOffTime: r.kickOffTime, // Might not exist on results depending on schema, stick to date
          type: 'result'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setMatches(allMatches);
      setPlayers(squadRes.data || []);

      // Enrich sessions with match details
      const sessions = (sessionsRes.data || []).map((s: any) => {
        const match = allMatches.find(m => m.id === s.match_id);
        return {
          ...s,
          opponent: match ? match.opponent : 'Unknown Match',
          date: match ? match.date : '',
          totalVotes: 0, // Need to fetch tally separately or just show '?'
          nominees: []
        };
      });

      setVotes(sessions);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load MOTM data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#9E9E9E';
      case 'active': return COLORS.success;
      case 'closed': return COLORS.error;
      default: return COLORS.textLight;
    }
  };

  const handleCreateVote = async () => {
    if (!createData.matchId) {
      Alert.alert('Invalid Data', 'Please select a match.');
      return;
    }

    try {
      const start = `${createData.startDate}T${createData.startTime}:00`;
      const end = `${createData.endDate}T${createData.endTime}:00`;

      await motmApi.openVoting(createData.matchId, {
        votingWindow: { start, end },
        autoPostEnabled: createData.autoPost,
        status: createData.status,
        nominees: [] // Backend logic handles candidates, usually whole squad or lineup
      });

      Alert.alert('Success', `MOTM vote saved as ${createData.status}!`);
      setCreateModalVisible(false);
      resetCreateData();
      fetchData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save MOTM vote');
    }
  };

  const resetCreateData = () => {
    const today = new Date().toISOString().split('T')[0];
    setCreateData({
      matchId: '',
      opponent: '',
      date: '',
      nominees: [],
      startDate: today,
      startTime: '17:00',
      endDate: today,
      endTime: '23:59',
      autoPost: true,
      status: 'active'
    });
  };

  const selectMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match) {
      setCreateData({
        ...createData,
        matchId,
        opponent: match.opponent,
        date: match.date,
        startDate: match.date.split('T')[0],
        endDate: match.date.split('T')[0],
      });
    }
  };

  const loadVoteDetails = async (vote: MOTMVote) => {
    setSelectedVote(vote);
    if (vote.status !== 'draft') {
      try {
        const tallyRes = await motmApi.getTally(vote.match_id);
        if (tallyRes.success) {
          setTallyData(tallyRes.data);
        }
      } catch (err) {
        console.error("Failed to load tally", err);
      }
    } else {
      setTallyData(null);
    }
  };

  const handleStatusChange = async (matchId: string, newStatus: 'active' | 'closed') => {
    try {
      if (newStatus === 'closed') {
        await motmApi.closeVoting(matchId);
      } else {
        // To re-open or activate draft, we use openVoting with current settings
        // For now, simpler to just use specific endpoints if available, but openVoting handles upsert
        const vote = votes.find(v => v.match_id === matchId);
        if (vote) {
          await motmApi.openVoting(matchId, {
            votingWindow: { start: vote.voting_start_at, end: vote.voting_end_at || '' },
            autoPostEnabled: !!vote.auto_post,
            status: 'active',
            nominees: []
          });
        }
      }
      fetchData();
      if (selectedVote) setSelectedVote(null); // Close modal
      Alert.alert('Success', `Vote is now ${newStatus}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const activeVotes = votes.filter(v => v.status === 'active');
  const draftVotes = votes.filter(v => v.status === 'draft');
  const closedVotes = votes.filter(v => v.status === 'closed');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Active Votes */}
        {activeVotes.length > 0 && (
          <>
            <Title style={styles.sectionTitle}>🔴 Active Votes</Title>
            {activeVotes.map(vote => (
              <Card key={vote.match_id} style={styles.voteCard} onPress={() => loadVoteDetails(vote)}>
                <Card.Content>
                  <View style={styles.voteHeader}>
                    <View style={styles.voteInfo}>
                      <Title style={styles.voteTitle}>vs {vote.opponent}</Title>
                      <Paragraph style={styles.voteDate}>
                        {new Date(vote.date || '').toLocaleDateString()}
                      </Paragraph>
                    </View>
                    <Chip style={[styles.statusChip, { backgroundColor: getStatusColor('active') }]} textStyle={styles.statusChipText}>Active</Chip>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </>
        )}

        {/* Draft Votes */}
        {draftVotes.length > 0 && (
          <>
            <Title style={styles.sectionTitle}>📝 Drafts</Title>
            {draftVotes.map(vote => (
              <Card key={vote.match_id} style={styles.voteCard} onPress={() => loadVoteDetails(vote)}>
                <Card.Content>
                  <View style={styles.voteHeader}>
                    <View style={styles.voteInfo}>
                      <Title style={styles.voteTitle}>vs {vote.opponent}</Title>
                      <Paragraph style={styles.voteDate}>
                        {new Date(vote.date || '').toLocaleDateString()}
                      </Paragraph>
                    </View>
                    <Chip style={[styles.statusChip, { backgroundColor: getStatusColor('draft') }]} textStyle={styles.statusChipText}>Draft</Chip>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </>
        )}

        {/* Closed Votes */}
        {closedVotes.length > 0 && (
          <>
            <Title style={styles.sectionTitle}>✅ Completed</Title>
            {closedVotes.map(vote => (
              <Card key={vote.match_id} style={styles.voteCard} onPress={() => loadVoteDetails(vote)}>
                <Card.Content>
                  <View style={styles.voteHeader}>
                    <View style={styles.voteInfo}>
                      <Title style={styles.voteTitle}>vs {vote.opponent}</Title>
                      <Paragraph style={styles.voteDate}>
                        {new Date(vote.date || '').toLocaleDateString()}
                      </Paragraph>
                    </View>
                    <Chip style={[styles.statusChip, { backgroundColor: getStatusColor('closed') }]} textStyle={styles.statusChipText}>Closed</Chip>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </>
        )}

        {votes.length === 0 && (
          <View style={styles.emptyState}>
            <Paragraph style={styles.emptyText}>No MOTM votes yet</Paragraph>
            <Paragraph style={styles.emptySubtext}>Tap + to start a vote</Paragraph>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        label="Create Vote"
        style={styles.fab}
        color={COLORS.secondary}
        onPress={() => {
          resetCreateData();
          setCreateModalVisible(true);
        }}
      />

      {/* Create Vote Modal */}
      <Portal>
        <Modal visible={createModalVisible} onDismiss={() => setCreateModalVisible(false)} contentContainerStyle={styles.createModal}>
          <ScrollView>
            <Title style={styles.modalTitle}>Create MOTM Vote</Title>

            <Paragraph style={styles.modalLabel}>Select Match</Paragraph>
            <View style={styles.matchList}>
              {matches.slice(0, 10).map(match => (
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
                  vs {match.opponent} ({new Date(match.date).toLocaleDateString()})
                </Chip>
              ))}
            </View>

            <Paragraph style={styles.modalLabel}>Voting Window</Paragraph>
            <View style={styles.dateTimeRow}>
              <TextInput
                label="Start Date"
                value={createData.startDate}
                onChangeText={t => setCreateData({ ...createData, startDate: t })}
                style={styles.input}
                placeholder="YYYY-MM-DD"
              />
              <TextInput
                label="Time"
                value={createData.startTime}
                onChangeText={t => setCreateData({ ...createData, startTime: t })}
                style={styles.input}
                placeholder="HH:MM"
              />
            </View>
            <View style={styles.dateTimeRow}>
              <TextInput
                label="End Date"
                value={createData.endDate}
                onChangeText={t => setCreateData({ ...createData, endDate: t })}
                style={styles.input}
                placeholder="YYYY-MM-DD"
              />
              <TextInput
                label="Time"
                value={createData.endTime}
                onChangeText={t => setCreateData({ ...createData, endTime: t })}
                style={styles.input}
                placeholder="HH:MM"
              />
            </View>

            <View style={styles.checkboxRow}>
              <Checkbox
                status={createData.autoPost ? 'checked' : 'unchecked'}
                onPress={() => setCreateData({ ...createData, autoPost: !createData.autoPost })}
                color={COLORS.primary}
              />
              <Paragraph style={styles.checkboxLabel}>Auto-post result</Paragraph>
            </View>

            <View style={styles.modalButtons}>
              <Button mode="outlined" onPress={() => setCreateModalVisible(false)} style={styles.modalButton}>Cancel</Button>
              <Button
                mode="contained"
                onPress={() => {
                  setCreateData({ ...createData, status: 'draft' });
                  // Need to use effect or a second wrapper to ensure state is updated, or just pass arg
                  // Better to just call a helper
                  handleCreateVoteWithStatus('draft');
                }}
                style={styles.modalButton}
              >
                Save Draft
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  handleCreateVoteWithStatus('active');
                }}
                style={styles.modalButton}
                buttonColor={COLORS.primary}
              >
                Activate
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Detail Modal */}
      <Portal>
        <Modal visible={!!selectedVote} onDismiss={() => setSelectedVote(null)} contentContainerStyle={styles.detailModal}>
          {selectedVote && (
            <ScrollView>
              <Title style={styles.detailTitle}>vs {selectedVote.opponent}</Title>
              <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                <Chip style={{ backgroundColor: getStatusColor(selectedVote.status) }} textStyle={{ color: 'white' }}>{selectedVote.status}</Chip>
              </View>

              {tallyData && (
                <View>
                  <Title style={styles.sectionSubtitle}>Results ({tallyData.totalVotes || 0} votes)</Title>
                  {(tallyData.results || []).map((r: any, idx: number) => (
                    <View key={r.player_id} style={styles.resultRow}>
                      <Text>{idx + 1}. {r.player_name}</Text>
                      <Text>{r.vote_count}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.detailButtons}>
                {selectedVote.status !== 'active' && (
                  <Button mode="contained" onPress={() => handleStatusChange(selectedVote.match_id, 'active')} style={styles.detailButton}>Activate</Button>
                )}
                {selectedVote.status === 'active' && (
                  <Button mode="contained" buttonColor={COLORS.error} onPress={() => handleStatusChange(selectedVote.match_id, 'closed')} style={styles.detailButton}>Close Voting</Button>
                )}
                <Button onPress={() => setSelectedVote(null)}>Close</Button>
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </View>
  );

  // Helper to avoid stale closure state issues if we just set state then call function
  async function handleCreateVoteWithStatus(status: 'draft' | 'active') {
    if (!createData.matchId) {
      Alert.alert('Invalid Data', 'Please select a match.');
      return;
    }

    try {
      const start = `${createData.startDate}T${createData.startTime}:00`;
      const end = `${createData.endDate}T${createData.endTime}:00`;

      await motmApi.openVoting(createData.matchId, {
        votingWindow: { start, end },
        autoPostEnabled: createData.autoPost,
        status: status,
        nominees: []
      });

      Alert.alert('Success', `MOTM vote saved as ${status}!`);
      setCreateModalVisible(false);
      resetCreateData();
      fetchData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save MOTM vote');
    }
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContent: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  scrollContainer: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  voteCard: { marginBottom: 10, borderRadius: 8, elevation: 2 },
  voteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voteInfo: { flex: 1 },
  voteTitle: { fontSize: 16, fontWeight: 'bold' },
  voteDate: { fontSize: 12, color: COLORS.textLight },
  statusChip: { height: 24 },
  statusChipText: { fontSize: 10, lineHeight: 18, color: 'white' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.textLight },
  emptySubtext: { color: COLORS.textLight },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: COLORS.primary },
  createModal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8, maxHeight: '80%' },
  detailModal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  modalLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  matchList: { flexDirection: 'row', flexWrap: 'wrap' },
  matchChip: { margin: 4 },
  matchChipSelected: { backgroundColor: COLORS.primary },
  matchChipText: {},
  matchChipTextSelected: { color: 'white' },
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  input: { flex: 1, margin: 4, backgroundColor: 'white' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  checkboxLabel: { marginLeft: 8 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  modalButton: { marginLeft: 10 },
  detailTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  sectionSubtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  detailButtons: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-around' },
  detailButton: { flex: 1, marginHorizontal: 5 }
});
