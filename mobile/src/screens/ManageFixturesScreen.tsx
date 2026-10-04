import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, Pressable, Text } from 'react-native';
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
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { fixturesApi } from '../services/api';
import { resultDate } from '../utils/results';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useClubName } from '../context/ClubContext';
import FaEmailPaste from '../components/FaEmailPaste';
import FixturePhotoReader from '../components/fixtures/FixturePhotoReader';

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



export default function ManageFixturesScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const clubName = useClubName();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);
  // Set when the form was filled in from a photo, so staff are reminded to check it
  const [fromPhoto, setFromPhoto] = useState(false);
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
      console.error('Failed to load fixtures:', error);
      Alert.alert('Error', 'Failed to load fixtures.');
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingFixture(null);
    setFromPhoto(false);
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
    setFromPhoto(false);
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
      'Remove this fixture?',
      'It comes off the fixtures list for everyone at the club.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fixturesApi.deleteFixture(id);
              loadFixtures(); // Reload fixtures from server
            } catch (error) {
              console.error('Failed to delete fixture:', error);
              Alert.alert("That didn't work", "The fixture wasn't removed. Check your signal and try again.");
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
        <Paragraph style={styles.intro}>
          Add upcoming matches and update results
        </Paragraph>

        <Pressable onPress={openAddModal} accessibilityRole="button" style={styles.photoLink}>
          <Text style={styles.photoLinkText}>Got a fixture list, poster or screenshot? Add fixtures from a photo</Text>
        </Pressable>

        <FaEmailPaste onImported={loadFixtures} />

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
                      style={styles.competitionChip}
                      textStyle={styles.chipText}
                    >
                      {fixture.competition}
                    </Chip>
                    <Chip
                      icon={fixture.homeAway === 'home' ? 'home' : 'airplane'}
                      style={styles.locationChip}
                      textStyle={styles.locationChipText}
                    >
                      {fixture.homeAway === 'home' ? 'Home' : 'Away'}
                    </Chip>
                  </View>

                  <View style={styles.matchup}>
                    <Title style={styles.teamName}>
                      {fixture.homeAway === 'home' ? clubName : fixture.opponent}
                    </Title>
                    <Title style={styles.vs}>vs</Title>
                    <Title style={styles.teamName}>
                      {fixture.homeAway === 'home' ? fixture.opponent : clubName}
                    </Title>
                  </View>

                  {fixture.homeScore != null && fixture.awayScore != null && (
                    <View style={styles.scoreContainer}>
                      <Title style={styles.score}>
                        {fixture.homeScore} - {fixture.awayScore}
                      </Title>
                    </View>
                  )}

                  <Divider style={styles.divider} />

                  <View style={styles.details}>
                    <Detail icon="calendar" text={resultDate(fixture.date)} />
                    {fixture.time ? <Detail icon="clock-outline" text={fixture.time} /> : null}
                    {fixture.venue ? <Detail icon="map-marker-outline" text={fixture.venue} /> : null}
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
        color={COLORS.onPrimary}
        accessibilityLabel="Add fixture"
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

            {!editingFixture ? (
              <FixturePhotoReader
                onFill={(form) => {
                  setFormData((current) => ({ ...current, ...form, homeScore: '', awayScore: '' }));
                  setFromPhoto(true);
                }}
                onAdded={(message) => {
                  setShowModal(false);
                  loadFixtures();
                  Alert.alert('Fixtures added', message);
                }}
              />
            ) : null}

            {fromPhoto ? (
              <Paragraph style={styles.photoNote} accessibilityRole="alert">
                Filled in from the photo. Check every detail before saving.
              </Paragraph>
            ) : null}

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
                  { value: 'home', label: 'Home', icon: 'home' },
                  { value: 'away', label: 'Away', icon: 'airplane' },
                ].map((loc) => (
                  <Chip
                    key={loc.value}
                    icon={formData.homeAway === loc.value ? undefined : loc.icon}
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
                label={formData.homeAway === 'home' ? clubName : 'Opponent'}
                value={formData.homeScore}
                onChangeText={(text) => setFormData({ ...formData, homeScore: text })}
                style={styles.scoreInput}
                mode="outlined"
                keyboardType="numeric"
              />
              <Title style={styles.scoreDash}>-</Title>
              <TextInput
                label={formData.homeAway === 'away' ? clubName : 'Opponent'}
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
                style={styles.modalButton}
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

function Detail({ icon, text }: { icon: string; text: string }) {
  const c = useBrandColors();
  const styles = useStyles();
  return (
    <View style={styles.detailRow}>
      <MaterialCommunityIcons name={icon as never} size={16} color={c.primary} />
      <Paragraph style={styles.detailText}>{text}</Paragraph>
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
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
  photoLink: { paddingHorizontal: 16, paddingTop: 4 },
  photoLinkText: { color: COLORS.primary, fontWeight: '700' },
  photoNote: { color: COLORS.warning, fontWeight: '700', marginBottom: 8 },
  intro: {
    color: COLORS.textLight,
    marginHorizontal: 16,
    marginTop: 12,
  },
  fixturesContainer: {
    padding: 16,
  },
  fixtureCard: {
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  fixtureHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  competitionChip: {
    marginRight: 8,
    backgroundColor: COLORS.primarySoft,
  },
  locationChip: {
    backgroundColor: COLORS.surfaceRaised,
  },
  chipText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  locationChipText: {
    color: COLORS.text,
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
    color: COLORS.text,
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
    fontFamily: FONTS.display,
    fontSize: 36,
    lineHeight: 40,
    color: COLORS.primary,
  },
  divider: {
    marginVertical: 12,
  },
  details: {
    marginBottom: 12,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    padding: 20,
    margin: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 16,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
    color: COLORS.text,
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
}));
