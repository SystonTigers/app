import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Button, FAB, Portal, Modal, TextInput, IconButton, List, Chip } from 'react-native-paper';
import { COLORS } from '../config';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Drill {
  id: string;
  name: string;
  category: string;
  duration: string;
  players: string;
  equipment: string[];
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focus: string[];
}

interface SessionDrill {
  drill: Drill;
  duration: number;
  notes?: string;
}

interface TrainingSession {
  id: string;
  date: string;
  time: string;
  team: string;
  focus: string;
  drills: SessionDrill[];
  totalDuration: number;
  attendees: number;
  status: 'planned' | 'completed' | 'cancelled';
}

export default function TrainingScreen() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showDrillPickerModal, setShowDrillPickerModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // New session form state
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('18:00');
  const [newSessionTeam, setNewSessionTeam] = useState('U13 Boys');
  const [newSessionFocus, setNewSessionFocus] = useState('');

  // Mock drills library (first 10 of 100+)
  const drillsLibrary: Drill[] = [
    {
      id: 'drill-001',
      name: 'Passing Triangles',
      category: 'Passing',
      duration: '10-15 mins',
      players: '6-12',
      equipment: ['6 cones', '2 balls'],
      description: 'Players form triangles and pass in sequence, focusing on first touch and movement.',
      difficulty: 'beginner',
      focus: ['passing', 'movement', 'communication'],
    },
    {
      id: 'drill-002',
      name: 'Rondo 4v2',
      category: 'Possession',
      duration: '15-20 mins',
      players: '6-8',
      equipment: ['Cones for grid', '1 ball'],
      description: '4 players keep possession against 2 defenders in a small grid.',
      difficulty: 'intermediate',
      focus: ['passing', 'movement', 'pressure'],
    },
    {
      id: 'drill-003',
      name: 'Shooting Drill',
      category: 'Shooting',
      duration: '15 mins',
      players: '8-16',
      equipment: ['Goal', '10 balls', 'Cones'],
      description: 'Players practice shooting technique from various angles.',
      difficulty: 'beginner',
      focus: ['shooting', 'finishing', 'accuracy'],
    },
    {
      id: 'drill-004',
      name: 'Dynamic Stretching',
      category: 'Warm-up',
      duration: '10 mins',
      players: 'All',
      equipment: ['None'],
      description: 'Active warm-up with leg swings, lunges, and movement patterns.',
      difficulty: 'beginner',
      focus: ['flexibility', 'warm-up', 'injury prevention'],
    },
    {
      id: 'drill-005',
      name: '1v1 Dribbling',
      category: 'Dribbling',
      duration: '15 mins',
      players: '6-16',
      equipment: ['Cones', '8 balls'],
      description: 'Players take turns attacking and defending in 1v1 situations.',
      difficulty: 'intermediate',
      focus: ['dribbling', 'defending', '1v1'],
    },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    // Mock data - replace with API call
    const mockSessions: TrainingSession[] = [
      {
        id: 'session-001',
        date: '2025-11-15',
        time: '18:00',
        team: 'U13 Boys',
        focus: 'Passing & Movement',
        drills: [
          {
            drill: drillsLibrary[3], // Dynamic Stretching
            duration: 10,
            notes: 'Focus on hamstrings',
          },
          {
            drill: drillsLibrary[0], // Passing Triangles
            duration: 15,
            notes: 'Emphasize first touch',
          },
          {
            drill: drillsLibrary[1], // Rondo 4v2
            duration: 20,
            notes: 'Quick passing',
          },
        ],
        totalDuration: 90,
        attendees: 14,
        status: 'planned',
      },
      {
        id: 'session-002',
        date: '2025-11-08',
        time: '18:00',
        team: 'U13 Boys',
        focus: 'Shooting Practice',
        drills: [
          {
            drill: drillsLibrary[3],
            duration: 10,
          },
          {
            drill: drillsLibrary[2], // Shooting drill
            duration: 25,
            notes: 'Work on both feet',
          },
        ],
        totalDuration: 60,
        attendees: 16,
        status: 'completed',
      },
    ];

    setSessions(mockSessions);
  };

  const createNewSession = () => {
    if (!newSessionDate || !newSessionFocus) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const newSession: TrainingSession = {
      id: `session-${Date.now()}`,
      date: newSessionDate,
      time: newSessionTime,
      team: newSessionTeam,
      focus: newSessionFocus,
      drills: [],
      totalDuration: 0,
      attendees: 0,
      status: 'planned',
    };

    setSessions([newSession, ...sessions]);
    setSelectedSession(newSession);
    setShowNewSessionModal(false);

    // Reset form
    setNewSessionDate('');
    setNewSessionTime('18:00');
    setNewSessionFocus('');

    Alert.alert('Success', 'New training session created!');
  };

  const addDrillToSession = (drill: Drill) => {
    if (!selectedSession) return;

    const newDrill: SessionDrill = {
      drill,
      duration: 15, // Default duration
    };

    const updatedSession = {
      ...selectedSession,
      drills: [...selectedSession.drills, newDrill],
      totalDuration: selectedSession.totalDuration + 15,
    };

    setSelectedSession(updatedSession);

    // Update in sessions array
    setSessions(sessions.map(s => (s.id === selectedSession.id ? updatedSession : s)));

    setShowDrillPickerModal(false);
    Alert.alert('Success', `${drill.name} added to session`);
  };

  const removeDrillFromSession = (index: number) => {
    if (!selectedSession) return;

    const drillToRemove = selectedSession.drills[index];
    const updatedDrills = selectedSession.drills.filter((_, i) => i !== index);

    const updatedSession = {
      ...selectedSession,
      drills: updatedDrills,
      totalDuration: selectedSession.totalDuration - drillToRemove.duration,
    };

    setSelectedSession(updatedSession);
    setSessions(sessions.map(s => (s.id === selectedSession.id ? updatedSession : s)));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return COLORS.success;
      case 'intermediate':
        return COLORS.warning;
      case 'advanced':
        return COLORS.error;
      default:
        return COLORS.textLight;
    }
  };

  const renderSessionCard = (session: TrainingSession) => (
    <Card key={session.id} style={styles.sessionCard} onPress={() => setSelectedSession(session)}>
      <Card.Content>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionDate}>
              {new Date(session.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.sessionTime}>{session.time}</Text>
          </View>
          <Chip
            style={[
              styles.statusChip,
              {
                backgroundColor:
                  session.status === 'completed'
                    ? COLORS.success
                    : session.status === 'cancelled'
                    ? COLORS.error
                    : COLORS.warning,
              },
            ]}
            textStyle={{ color: '#fff' }}
          >
            {session.status.toUpperCase()}
          </Chip>
        </View>

        <Text style={styles.sessionFocus}>{session.focus}</Text>
        <Text style={styles.sessionTeam}>{session.team}</Text>

        <View style={styles.sessionStats}>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.statText}>{session.totalDuration} mins</Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="run" size={16} color={COLORS.textLight} />
            <Text style={styles.statText}>{session.drills.length} drills</Text>
          </View>
          {session.attendees > 0 && (
            <View style={styles.stat}>
              <MaterialCommunityIcons name="account-group" size={16} color={COLORS.textLight} />
              <Text style={styles.statText}>{session.attendees} players</Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderSessionDetail = () => {
    if (!selectedSession) return null;

    return (
      <Portal>
        <Modal
          visible={!!selectedSession}
          onDismiss={() => setSelectedSession(null)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSession.focus}</Text>
              <IconButton icon="close" onPress={() => setSelectedSession(null)} />
            </View>

            <Text style={styles.modalSubtitle}>
              {new Date(selectedSession.date).toLocaleDateString()} at {selectedSession.time}
            </Text>

            <View style={styles.totalDuration}>
              <MaterialCommunityIcons name="clock" size={24} color={COLORS.primary} />
              <Text style={styles.totalDurationText}>{selectedSession.totalDuration} minutes total</Text>
            </View>

            <Text style={styles.sectionTitle}>Session Plan</Text>

            {selectedSession.drills.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>No drills added yet</Text>
                  <Text style={styles.emptySubtext}>Tap the + button to add drills</Text>
                </Card.Content>
              </Card>
            ) : (
              selectedSession.drills.map((sessionDrill, index) => (
                <Card key={index} style={styles.drillCard}>
                  <Card.Content>
                    <View style={styles.drillHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.drillNumber}>{index + 1}.</Text>
                        <Text style={styles.drillName}>{sessionDrill.drill.name}</Text>
                        <Text style={styles.drillCategory}>{sessionDrill.drill.category}</Text>
                      </View>
                      <IconButton
                        icon="delete"
                        iconColor={COLORS.error}
                        size={20}
                        onPress={() => removeDrillFromSession(index)}
                      />
                    </View>

                    <View style={styles.drillMeta}>
                      <Chip
                        style={[styles.difficultyChip, { backgroundColor: getDifficultyColor(sessionDrill.drill.difficulty) }]}
                        textStyle={{ color: '#fff', fontSize: 11 }}
                      >
                        {sessionDrill.drill.difficulty}
                      </Chip>
                      <Text style={styles.drillDuration}>{sessionDrill.duration} mins</Text>
                    </View>

                    <Text style={styles.drillDescription}>{sessionDrill.drill.description}</Text>

                    <View style={styles.drillDetails}>
                      <Text style={styles.drillDetailText}>
                        <MaterialCommunityIcons name="account-group" size={14} /> {sessionDrill.drill.players} players
                      </Text>
                      <Text style={styles.drillDetailText}>
                        <MaterialCommunityIcons name="soccer" size={14} />{' '}
                        {sessionDrill.drill.equipment.join(', ')}
                      </Text>
                    </View>

                    {sessionDrill.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{sessionDrill.notes}</Text>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              ))
            )}

            <Button
              mode="contained"
              icon="plus"
              onPress={() => setShowDrillPickerModal(true)}
              style={styles.addDrillButton}
              buttonColor={COLORS.primary}
            >
              Add Drill
            </Button>

            <Button
              mode="outlined"
              icon="share"
              onPress={() => Alert.alert('Share', 'Share session plan (coming soon)')}
              style={styles.shareButton}
            >
              Share Session Plan
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Training Sessions</Text>

        {sessions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <MaterialCommunityIcons name="whistle" size={64} color={COLORS.textLight} style={{ alignSelf: 'center' }} />
              <Text style={styles.emptyText}>No training sessions yet</Text>
              <Text style={styles.emptySubtext}>Create your first session to get started</Text>
            </Card.Content>
          </Card>
        ) : (
          sessions.map(renderSessionCard)
        )}
      </ScrollView>

      {/* New Session Modal */}
      <Portal>
        <Modal
          visible={showNewSessionModal}
          onDismiss={() => setShowNewSessionModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Training Session</Text>
            <IconButton icon="close" onPress={() => setShowNewSessionModal(false)} />
          </View>

          <TextInput
            label="Date (YYYY-MM-DD)"
            value={newSessionDate}
            onChangeText={setNewSessionDate}
            mode="outlined"
            style={styles.input}
            placeholder="2025-11-15"
          />

          <TextInput
            label="Time"
            value={newSessionTime}
            onChangeText={setNewSessionTime}
            mode="outlined"
            style={styles.input}
            placeholder="18:00"
          />

          <TextInput
            label="Team"
            value={newSessionTeam}
            onChangeText={setNewSessionTeam}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Session Focus *"
            value={newSessionFocus}
            onChangeText={setNewSessionFocus}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Passing & Movement"
          />

          <Button mode="contained" onPress={createNewSession} style={styles.createButton} buttonColor={COLORS.primary}>
            Create Session
          </Button>
        </Modal>
      </Portal>

      {/* Drill Picker Modal */}
      <Portal>
        <Modal
          visible={showDrillPickerModal}
          onDismiss={() => setShowDrillPickerModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Drill</Text>
            <IconButton icon="close" onPress={() => setShowDrillPickerModal(false)} />
          </View>

          <ScrollView>
            {drillsLibrary.map((drill) => (
              <Card key={drill.id} style={styles.drillPickerCard} onPress={() => addDrillToSession(drill)}>
                <Card.Content>
                  <Text style={styles.drillName}>{drill.name}</Text>
                  <Text style={styles.drillCategory}>{drill.category}</Text>
                  <View style={styles.drillMeta}>
                    <Chip
                      style={[styles.difficultyChip, { backgroundColor: getDifficultyColor(drill.difficulty) }]}
                      textStyle={{ color: '#fff', fontSize: 11 }}
                    >
                      {drill.difficulty}
                    </Chip>
                    <Text style={styles.drillDuration}>{drill.duration}</Text>
                  </View>
                  <Text style={styles.drillDescription}>{drill.description}</Text>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>

          <Text style={styles.moreText}>Showing 5 of 100+ drills</Text>
        </Modal>
      </Portal>

      {renderSessionDetail()}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowNewSessionModal(true)}
        color="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.text,
  },
  sessionCard: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sessionTime: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  sessionFocus: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  sessionTeam: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statusChip: {
    height: 28,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    padding: 16,
    paddingTop: 8,
  },
  input: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  createButton: {
    margin: 16,
  },
  totalDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: `${COLORS.primary}20`,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  totalDurationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    padding: 16,
    paddingBottom: 8,
  },
  drillCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  drillNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  drillName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  drillCategory: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  drillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  difficultyChip: {
    height: 24,
  },
  drillDuration: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  drillDescription: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  drillDetails: {
    gap: 4,
  },
  drillDetailText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  addDrillButton: {
    margin: 16,
  },
  shareButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  drillPickerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  moreText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    padding: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
});
