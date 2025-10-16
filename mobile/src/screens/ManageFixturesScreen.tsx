import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  FAB,
  Portal,
  Modal,
  Chip,
  Divider,
  IconButton,
} from 'react-native-paper';
import { COLORS } from '../config';
import { fixturesApi } from '../services/api';

interface Fixture {
  id: string;
  opponent: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
  homeAway: 'home' | 'away';
  homeScore?: number;
  awayScore?: number;
}

const mockFixtures: Fixture[] = [
  {
    id: '1',
    opponent: 'Leicester Panthers',
    date: '2025-10-15',
    time: '14:00',
    venue: 'Syston Recreation Ground',
    competition: 'League',
    homeAway: 'home',
  },
  {
    id: '2',
    opponent: 'Loughborough Lions',
    date: '2025-10-22',
    time: '15:00',
    venue: 'Loughborough Stadium',
    competition: 'Cup',
    homeAway: 'away',
  },
];

export default function ManageFixturesScreen() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);
  const [formData, setFormData] = useState({
    opponent: '',
    date: '',
    time: '',
    venue: '',
    competition: 'League',
    homeAway: 'home' as 'home' | 'away',
    homeScore: '',
    awayScore: '',
  });

  // Load fixtures from API on mount
  useEffect(() => {
    loadFixtures();
  }, []);

  const loadFixtures = async () => {
    try {
      setLoading(true);
      const response = await fixturesApi.getFixtures();
      setFixtures(response.data || []);
    } catch (error) {
      console.error('Failed to load fixtures:', error);
      Alert.alert('Error', 'Failed to load fixtures. Using local data.');
      setFixtures(mockFixtures); // Fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingFixture(null);
    setFormData({
      opponent: '',
      date: '',
      time: '',
      venue: '',
      competition: 'League',
      homeAway: 'home',
      homeScore: '',
      awayScore: '',
    });
    setShowModal(true);
  };

  const openEditModal = (fixture: Fixture) => {
    setEditingFixture(fixture);
    setFormData({
      opponent: fixture.opponent,
      date: fixture.date,
      time: fixture.time,
      venue: fixture.venue,
      competition: fixture.competition,
      homeAway: fixture.homeAway,
      homeScore: fixture.homeScore?.toString() || '',
      awayScore: fixture.awayScore?.toString() || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const fixtureData = {
        opponent: formData.opponent,
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        competition: formData.competition,
        homeAway: formData.homeAway,
        homeScore: formData.homeScore ? parseInt(formData.homeScore) : undefined,
        awayScore: formData.awayScore ? parseInt(formData.awayScore) : undefined,
      };

      if (editingFixture) {
        // Update existing fixture
        await fixturesApi.updateFixture(editingFixture.id, fixtureData);
        Alert.alert('Success', 'Fixture updated successfully!');
      } else {
        // Create new fixture
        await fixturesApi.createFixture(fixtureData);
        Alert.alert('Success', 'Fixture created successfully!');
      }

      setShowModal(false);
      loadFixtures(); // Reload fixtures from server
    } catch (error) {
      console.error('Failed to save fixture:', error);
      Alert.alert('Error', 'Failed to save fixture. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this fixture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fixturesApi.deleteFixture(id);
              Alert.alert('Success', 'Fixture deleted successfully!');
              loadFixtures(); // Reload fixtures from server
            } catch (error) {
              console.error('Failed to delete fixture:', error);
              Alert.alert('Error', 'Failed to delete fixture. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Paragraph style={styles.loadingText}>Loading fixtures...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Manage Fixtures</Title>
          <Paragraph style={styles.headerSubtitle}>
            Add upcoming matches and update results
          </Paragraph>
        </View>

        <View style={styles.fixturesContainer}>
          {fixtures.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Title style={styles.emptyTitle}>No Fixtures Yet</Title>
                <Paragraph style={styles.emptyText}>
                  Tap the + button to add your first fixture
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            fixtures.map((fixture) => (
            <Card key={fixture.id} style={styles.fixtureCard}>
              <Card.Content>
                <View style={styles.fixtureHeader}>
                  <Chip
                    style={[
                      styles.competitionChip,
                      { backgroundColor: fixture.competition === 'Cup' ? '#FF9800' : '#4CAF50' },
                    ]}
                    textStyle={styles.chipText}
                  >
                    {fixture.competition}
                  </Chip>
                  <Chip
                    style={[
                      styles.locationChip,
                      { backgroundColor: fixture.homeAway === 'home' ? '#2196F3' : '#9E9E9E' },
                    ]}
                    textStyle={styles.chipText}
                  >
                    {fixture.homeAway === 'home' ? '🏠 Home' : '✈️ Away'}
                  </Chip>
                </View>

                <View style={styles.matchup}>
                  <Title style={styles.teamName}>
                    {fixture.homeAway === 'home' ? 'Syston Tigers' : fixture.opponent}
                  </Title>
                  <Title style={styles.vs}>vs</Title>
                  <Title style={styles.teamName}>
                    {fixture.homeAway === 'home' ? fixture.opponent : 'Syston Tigers'}
                  </Title>
                </View>

                {fixture.homeScore !== undefined && fixture.awayScore !== undefined && (
                  <View style={styles.scoreContainer}>
                    <Title style={styles.score}>
                      {fixture.homeScore} - {fixture.awayScore}
                    </Title>
                  </View>
                )}

                <Divider style={styles.divider} />

                <View style={styles.details}>
                  <Paragraph style={styles.detailText}>📅 {fixture.date}</Paragraph>
                  <Paragraph style={styles.detailText}>🕐 {fixture.time}</Paragraph>
                  <Paragraph style={styles.detailText}>📍 {fixture.venue}</Paragraph>
                </View>

                <View style={styles.actions}>
                  <Button
                    mode="outlined"
                    onPress={() => openEditModal(fixture)}
                    style={styles.actionButton}
                  >
                    Edit
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleDelete(fixture.id)}
                    style={styles.actionButton}
                    textColor={COLORS.error}
                  >
                    Delete
                  </Button>
                </View>
              </Card.Content>
            </Card>
            ))
          )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openAddModal}
        color={COLORS.secondary}
      />

      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>
              {editingFixture ? 'Edit Fixture' : 'Add New Fixture'}
            </Title>

            <TextInput
              label="Opponent Team"
              value={formData.opponent}
              onChangeText={(text) => setFormData({ ...formData, opponent: text })}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Date (YYYY-MM-DD)"
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
              style={styles.input}
              mode="outlined"
              placeholder="2025-10-15"
            />

            <TextInput
              label="Time (HH:MM)"
              value={formData.time}
              onChangeText={(text) => setFormData({ ...formData, time: text })}
              style={styles.input}
              mode="outlined"
              placeholder="14:00"
            />

            <TextInput
              label="Venue"
              value={formData.venue}
              onChangeText={(text) => setFormData({ ...formData, venue: text })}
              style={styles.input}
              mode="outlined"
            />

            <View style={styles.chipGroup}>
              <Paragraph style={styles.label}>Competition:</Paragraph>
              <View style={styles.chips}>
                {['League', 'Cup', 'Friendly'].map((comp) => (
                  <Chip
                    key={comp}
                    selected={formData.competition === comp}
                    onPress={() => setFormData({ ...formData, competition: comp })}
                    style={styles.selectChip}
                  >
                    {comp}
                  </Chip>
                ))}
              </View>
            </View>

            <View style={styles.chipGroup}>
              <Paragraph style={styles.label}>Location:</Paragraph>
              <View style={styles.chips}>
                {[
                  { value: 'home', label: '🏠 Home' },
                  { value: 'away', label: '✈️ Away' },
                ].map((loc) => (
                  <Chip
                    key={loc.value}
                    selected={formData.homeAway === loc.value}
                    onPress={() =>
                      setFormData({ ...formData, homeAway: loc.value as 'home' | 'away' })
                    }
                    style={styles.selectChip}
                  >
                    {loc.label}
                  </Chip>
                ))}
              </View>
            </View>

            <Divider style={styles.divider} />
            <Paragraph style={styles.label}>Score (optional):</Paragraph>

            <View style={styles.scoreInputs}>
              <TextInput
                label={formData.homeAway === 'home' ? 'Syston' : 'Opponent'}
                value={formData.homeScore}
                onChangeText={(text) => setFormData({ ...formData, homeScore: text })}
                style={styles.scoreInput}
                mode="outlined"
                keyboardType="numeric"
              />
              <Title style={styles.scoreDash}>-</Title>
              <TextInput
                label={formData.homeAway === 'away' ? 'Syston' : 'Opponent'}
                value={formData.awayScore}
                onChangeText={(text) => setFormData({ ...formData, awayScore: text })}
                style={styles.scoreInput}
                mode="outlined"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={[styles.modalButton, { backgroundColor: COLORS.primary }]}
                textColor={COLORS.secondary}
              >
                Save
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textLight,
  },
  emptyCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
  },
  scrollView: {
    flex: 1,
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
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  fixturesContainer: {
    padding: 16,
  },
  fixtureCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  fixtureHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  competitionChip: {
    marginRight: 8,
  },
  locationChip: {},
  chipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  matchup: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  vs: {
    fontSize: 14,
    color: COLORS.textLight,
    marginHorizontal: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  divider: {
    marginVertical: 12,
  },
  details: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text,
  },
  input: {
    marginBottom: 12,
  },
  chipGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  scoreInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreInput: {
    flex: 1,
  },
  scoreDash: {
    marginHorizontal: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
