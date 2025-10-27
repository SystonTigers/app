import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, FAB, Portal, Modal, TextInput, RadioButton, Divider } from 'react-native-paper';
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

interface Fixture {
  id: string;
  opponent: string;
  homeAway: 'home' | 'away';
  venue: string;
  date: string;
  time: string;
}

export default function LiveMatchInputScreen() {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<'goal' | 'yellow' | 'red' | 'sub' | 'ht' | 'ft' | 'note'>('goal');
  const [eventData, setEventData] = useState({
    minute: '',
    side: 'home' as 'home' | 'away',
    scorer: '',
    player: '',
    note: '',
  });
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [currentMinute, setCurrentMinute] = useState(0);

  useEffect(() => {
    loadFixtures();
  }, []);

  useEffect(() => {
    if (matchState && !matchState.closed) {
      const interval = setInterval(() => {
        refreshMatchState();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [matchState]);

  useEffect(() => {
    if (matchState && matchState.kickoffTs && !matchState.closed) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - matchState.kickoffTs!;
        const minutes = Math.floor(elapsed / 60000);
        setCurrentMinute(minutes);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [matchState]);

  const loadFixtures = async () => {
    setLoading(true);
    try {
      // Mock fixtures for now - will connect to real API
      const mockFixtures: Fixture[] = [
        {
          id: 'f1',
          opponent: 'Leicester Panthers',
          homeAway: 'home',
          venue: 'Syston Sports Ground',
          date: '2025-10-10',
          time: '10:00',
        },
        {
          id: 'f2',
          opponent: 'Loughborough Lions',
          homeAway: 'away',
          venue: 'Loughborough Stadium',
          date: '2025-10-17',
          time: '14:00',
        },
      ];
      setFixtures(mockFixtures);
    } catch (error) {
      console.error('Error loading fixtures:', error);
      Alert.alert('Error', 'Failed to load fixtures');
    } finally {
      setLoading(false);
    }
  };

  const refreshMatchState = async () => {
    if (!matchState) return;

    try {
      const response = await liveMatchApi.getTally(matchState.matchId);
      if (response.ok) {
        setMatchState(response.data);
      }
    } catch (error) {
      console.error('Error refreshing match state:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshMatchState();
    setRefreshing(false);
  };

  const startMatch = async () => {
    if (!selectedFixture) {
      Alert.alert('Error', 'Please select a fixture');
      return;
    }

    setLoading(true);
    try {
      const kickoffTs = Date.now();
      const matchData = {
        title: selectedFixture.homeAway === 'home'
          ? `Syston Tigers vs ${selectedFixture.opponent}`
          : `${selectedFixture.opponent} vs Syston Tigers`,
        home: selectedFixture.homeAway === 'home' ? 'Syston Tigers' : selectedFixture.opponent,
        away: selectedFixture.homeAway === 'away' ? 'Syston Tigers' : selectedFixture.opponent,
        kickoffTs,
      };

      const response = await liveMatchApi.openMatch(selectedFixture.id, matchData);

      if (response.ok) {
        // Load match state
        const tallyResponse = await liveMatchApi.getTally(selectedFixture.id);
        if (tallyResponse.ok) {
          setMatchState(tallyResponse.data);
          setStartModalVisible(false);
          setSelectedFixture(null);
          Alert.alert('Success', 'Match started! You can now record events.');
        }
      }
    } catch (error: any) {
      console.error('Error starting match:', error);
      Alert.alert('Error', error.message || 'Failed to start match');
    } finally {
      setLoading(false);
    }
  };

  const recordEvent = async () => {
    if (!matchState) return;

    const minute = parseInt(eventData.minute) || currentMinute;

    let payload: any = {};
    if (selectedEventType === 'goal') {
      if (!eventData.scorer) {
        Alert.alert('Error', 'Please enter scorer name');
        return;
      }
      payload = {
        side: eventData.side,
        scorer: eventData.scorer,
      };
    } else if (['yellow', 'red', 'sub'].includes(selectedEventType)) {
      if (!eventData.player) {
        Alert.alert('Error', 'Please enter player name');
        return;
      }
      payload = {
        player: eventData.player,
        side: eventData.side,
      };
    } else if (selectedEventType === 'note') {
      if (!eventData.note) {
        Alert.alert('Error', 'Please enter note');
        return;
      }
      payload = {
        text: eventData.note,
      };
    }

    setLoading(true);
    try {
      const event = {
        type: selectedEventType,
        minute,
        payload,
      };

      const response = await liveMatchApi.recordEvent(matchState.matchId, event);

      if (response.ok) {
        // Refresh match state
        await refreshMatchState();
        setEventModalVisible(false);
        resetEventData();
        Alert.alert('Success', 'Event recorded!');
      }
    } catch (error: any) {
      console.error('Error recording event:', error);
      Alert.alert('Error', error.message || 'Failed to record event');
    } finally {
      setLoading(false);
    }
  };

  const closeMatch = async () => {
    if (!matchState) return;

    Alert.alert(
      'Close Match',
      'Are you sure you want to close this match? This will finalize the result.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Match',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await liveMatchApi.closeMatch(matchState.matchId);
              if (response.ok) {
                await refreshMatchState();
                Alert.alert('Success', 'Match closed!');
              }
            } catch (error: any) {
              console.error('Error closing match:', error);
              Alert.alert('Error', error.message || 'Failed to close match');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetEventData = () => {
    setEventData({
      minute: '',
      side: 'home',
      scorer: '',
      player: '',
      note: '',
    });
    setSelectedEventType('goal');
  };

  const openEventModal = (type: 'goal' | 'yellow' | 'red' | 'sub' | 'ht' | 'ft' | 'note') => {
    setSelectedEventType(type);
    setEventData({ ...eventData, minute: currentMinute.toString() });
    setEventModalVisible(true);
  };

  const formatTime = (minute: number) => {
    if (minute > 45 && minute <= 50) return `45+${minute - 45}'`;
    if (minute > 90) return `90+${minute - 90}'`;
    return `${minute}'`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal': return '⚽';
      case 'yellow': return '🟨';
      case 'red': return '🟥';
      case 'sub': return '🔄';
      case 'ht': return '⏸️';
      case 'ft': return '⏹️';
      case 'note': return '📝';
      default: return '•';
    }
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

  return (
    <View style={styles.container}>
      {!matchState && (
        <View style={styles.emptyContainer}>
          <Title style={styles.emptyTitle}>Live Match Input</Title>
          <Paragraph style={styles.emptySubtitle}>Record match events in real-time</Paragraph>
          <Button
            mode="contained"
            onPress={() => setStartModalVisible(true)}
            style={styles.startButton}
            buttonColor={COLORS.primary}
            textColor={COLORS.secondary}
            icon="play"
          >
            Start New Match
          </Button>
        </View>
      )}

      {matchState && (
        <>
          <View style={[styles.header, matchState.closed && styles.headerClosed]}>
            <View style={styles.headerTop}>
              <View style={styles.headerInfo}>
                <Paragraph style={styles.headerTitle}>{matchState.title}</Paragraph>
                {matchState.closed && (
                  <Chip style={styles.closedChip} textStyle={styles.closedChipText}>
                    MATCH CLOSED
                  </Chip>
                )}
              </View>
            </View>

            <View style={styles.scoreboard}>
              <View style={styles.teamScore}>
                <Title style={styles.teamName}>{matchState.home}</Title>
                <Title style={styles.score}>{matchState.homeScore}</Title>
              </View>
              <Paragraph style={styles.scoreVs}>-</Paragraph>
              <View style={styles.teamScore}>
                <Title style={styles.teamName}>{matchState.away}</Title>
                <Title style={styles.score}>{matchState.awayScore}</Title>
              </View>
            </View>

            <View style={styles.matchInfo}>
              <Chip style={styles.timeChip} textStyle={styles.timeChipText}>
                ⏱️ {formatTime(currentMinute)}
              </Chip>
              <Paragraph style={styles.updatedAt}>
                Last updated: {new Date(matchState.updatedAt).toLocaleTimeString()}
              </Paragraph>
            </View>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {/* Event buttons */}
            {!matchState.closed && (
              <View style={styles.eventButtonsContainer}>
                <Title style={styles.sectionTitle}>Record Event</Title>
                <View style={styles.eventButtons}>
                  <Button
                    mode="contained"
                    onPress={() => openEventModal('goal')}
                    style={[styles.eventButton, styles.goalButton]}
                    textColor={COLORS.secondary}
                    icon="soccer"
                  >
                    Goal
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => openEventModal('yellow')}
                    style={[styles.eventButton, styles.yellowButton]}
                    textColor={COLORS.text}
                    icon="card"
                  >
                    Yellow
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => openEventModal('red')}
                    style={[styles.eventButton, styles.redButton]}
                    textColor={COLORS.secondary}
                    icon="card"
                  >
                    Red
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => openEventModal('sub')}
                    style={[styles.eventButton, styles.subButton]}
                    textColor={COLORS.secondary}
                    icon="swap-horizontal"
                  >
                    Sub
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => openEventModal('ht')}
                    style={styles.eventButton}
                    textColor={COLORS.primary}
                  >
                    Half-time
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => openEventModal('ft')}
                    style={styles.eventButton}
                    textColor={COLORS.primary}
                  >
                    Full-time
                  </Button>
                </View>
              </View>
            )}

            {/* Match timeline */}
            <View style={styles.timelineContainer}>
              <Title style={styles.sectionTitle}>Match Timeline</Title>
              {matchState.timeline.length === 0 && (
                <Paragraph style={styles.emptyTimeline}>No events recorded yet</Paragraph>
              )}
              {matchState.timeline
                .sort((a, b) => b.ts - a.ts)
                .map((event) => (
                  <Card key={event.id} style={styles.timelineCard}>
                    <Card.Content>
                      <View style={styles.timelineRow}>
                        <View style={styles.timelineTime}>
                          <Paragraph style={styles.timelineMinute}>
                            {formatTime(event.minute || 0)}
                          </Paragraph>
                        </View>
                        <View style={styles.timelineContent}>
                          <Paragraph style={styles.timelineText}>
                            {getEventDescription(event)}
                          </Paragraph>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
            </View>

            {!matchState.closed && (
              <Button
                mode="contained"
                onPress={closeMatch}
                style={styles.closeMatchButton}
                buttonColor={COLORS.error}
                textColor={COLORS.secondary}
                icon="stop"
              >
                Close Match
              </Button>
            )}

            {matchState.closed && (
              <Button
                mode="outlined"
                onPress={() => setMatchState(null)}
                style={styles.newMatchButton}
                textColor={COLORS.primary}
                icon="plus"
              >
                Start New Match
              </Button>
            )}
          </ScrollView>
        </>
      )}

      {/* Start Match Modal */}
      <Portal>
        <Modal
          visible={startModalVisible}
          onDismiss={() => {
            setStartModalVisible(false);
            setSelectedFixture(null);
          }}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>Start Match</Title>
            <Paragraph style={styles.modalLabel}>Select fixture:</Paragraph>

            {fixtures.map((fixture) => (
              <Card
                key={fixture.id}
                style={[
                  styles.fixtureCard,
                  selectedFixture?.id === fixture.id && styles.fixtureCardSelected,
                ]}
                onPress={() => setSelectedFixture(fixture)}
              >
                <Card.Content>
                  <View style={styles.fixtureInfo}>
                    <Title style={styles.fixtureOpponent}>vs {fixture.opponent}</Title>
                    <Chip style={styles.homeAwayChip}>
                      {fixture.homeAway === 'home' ? 'HOME' : 'AWAY'}
                    </Chip>
                  </View>
                  <Paragraph style={styles.fixtureDetails}>
                    {new Date(fixture.date).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short'
                    })} at {fixture.time}
                  </Paragraph>
                  <Paragraph style={styles.fixtureVenue}>{fixture.venue}</Paragraph>
                </Card.Content>
              </Card>
            ))}

            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setStartModalVisible(false);
                  setSelectedFixture(null);
                }}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={startMatch}
                style={styles.modalButton}
                buttonColor={COLORS.primary}
                textColor={COLORS.secondary}
                disabled={!selectedFixture}
                loading={loading}
              >
                Start
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Event Modal */}
      <Portal>
        <Modal
          visible={eventModalVisible}
          onDismiss={() => {
            setEventModalVisible(false);
            resetEventData();
          }}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>
              {selectedEventType.charAt(0).toUpperCase() + selectedEventType.slice(1)}
            </Title>

            <TextInput
              label="Minute"
              value={eventData.minute}
              onChangeText={(text) => setEventData({ ...eventData, minute: text })}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.input}
            />

            {['goal', 'yellow', 'red', 'sub'].includes(selectedEventType) && (
              <>
                <Paragraph style={styles.modalLabel}>Team:</Paragraph>
                <RadioButton.Group
                  onValueChange={(value) => setEventData({ ...eventData, side: value as 'home' | 'away' })}
                  value={eventData.side}
                >
                  <View style={styles.radioRow}>
                    <RadioButton.Item label={matchState?.home || 'Home'} value="home" />
                    <RadioButton.Item label={matchState?.away || 'Away'} value="away" />
                  </View>
                </RadioButton.Group>
              </>
            )}

            {selectedEventType === 'goal' && (
              <TextInput
                label="Scorer"
                value={eventData.scorer}
                onChangeText={(text) => setEventData({ ...eventData, scorer: text })}
                mode="outlined"
                style={styles.input}
                placeholder="Player name"
              />
            )}

            {['yellow', 'red', 'sub'].includes(selectedEventType) && (
              <TextInput
                label="Player"
                value={eventData.player}
                onChangeText={(text) => setEventData({ ...eventData, player: text })}
                mode="outlined"
                style={styles.input}
                placeholder="Player name"
              />
            )}

            {selectedEventType === 'note' && (
              <TextInput
                label="Note"
                value={eventData.note}
                onChangeText={(text) => setEventData({ ...eventData, note: text })}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Match note or observation"
              />
            )}

            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setEventModalVisible(false);
                  resetEventData();
                }}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={recordEvent}
                style={styles.modalButton}
                buttonColor={COLORS.primary}
                textColor={COLORS.secondary}
                loading={loading}
              >
                Record
              </Button>
            </View>
          </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  startButton: {
    paddingHorizontal: 24,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerClosed: {
    backgroundColor: COLORS.textLight,
  },
  headerTop: {
    marginBottom: 16,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  closedChip: {
    backgroundColor: COLORS.error,
  },
  closedChipText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 10,
  },
  scoreboard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
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
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  scoreVs: {
    fontSize: 24,
    color: COLORS.secondary,
    marginHorizontal: 20,
  },
  matchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeChip: {
    backgroundColor: COLORS.secondary,
  },
  timeChipText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  updatedAt: {
    fontSize: 11,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  eventButtonsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  eventButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventButton: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 8,
  },
  goalButton: {
    backgroundColor: '#4CAF50',
  },
  yellowButton: {
    backgroundColor: '#FFD700',
  },
  redButton: {
    backgroundColor: '#F44336',
  },
  subButton: {
    backgroundColor: '#2196F3',
  },
  timelineContainer: {
    marginBottom: 24,
  },
  emptyTimeline: {
    textAlign: 'center',
    color: COLORS.textLight,
    padding: 24,
  },
  timelineCard: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineTime: {
    width: 50,
    marginRight: 12,
  },
  timelineMinute: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  timelineContent: {
    flex: 1,
  },
  timelineText: {
    fontSize: 14,
    color: COLORS.text,
  },
  closeMatchButton: {
    marginBottom: 24,
  },
  newMatchButton: {
    marginBottom: 24,
  },
  modal: {
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
  input: {
    marginBottom: 12,
  },
  radioRow: {
    flexDirection: 'row',
    marginBottom: 12,
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
  fixtureCard: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fixtureCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  fixtureInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fixtureOpponent: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeAwayChip: {
    height: 24,
    backgroundColor: COLORS.primary,
  },
  fixtureDetails: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  fixtureVenue: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
