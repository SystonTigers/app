import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Alert } from 'react-native';
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
  Avatar,
  IconButton,
} from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { squadApi, statsApi } from '../services/api';
import SeasonStatsModal from '../components/squad/SeasonStatsModal';
import { namePartsOf, playerInitials, shirtNumber } from '../utils/playerNames';
import { isoDate, ukDate } from '../utils/signingOn';
import { birthdayLabel, dobProblem } from '../utils/squadDob';
import { useTracksAssists } from '../context/ClubContext';

interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  number: number | null;
  position: string;
  /** YYYY-MM-DD, for birthday posts */
  dob: string | null;
  photo?: string;
  goals: number;
  assists: number;
  appearances: number;
  yellowCards: number;
  redCards: number;
}

// (mock data removed)

const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

export default function ManageSquadScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const withAssists = useTracksAssists();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', number: '', position: 'Forward', dob: '' });
  // Player whose season stats are open
  const [statsFor, setStatsFor] = useState<Player | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      // Squad details plus all-time totals (Match Centre and hand-entered season stats)
      const [response, stats] = await Promise.all([squadApi.getSquad(), statsApi.getPlayerStats('all').catch(() => null)]);
      const totals = new Map<string, any>((stats?.data || []).map((t: any) => [t.id, t]));
      const raw = response?.data || [];
      const mapped: Player[] = raw.map((p: any) => {
        const t = totals.get(p.id) || {};
        const shirt = p.number ?? p.squad_number ?? p.squadNumber;
        return {
          id: p.id || p.playerId,
          name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
          firstName: namePartsOf(p).first,
          lastName: namePartsOf(p).last,
          number: shirt === null || shirt === undefined || shirt === '' ? null : Number(shirt),
          position: p.position || 'Forward',
          dob: typeof (p.dob ?? p.date_of_birth) === 'string' ? isoDate(String(p.dob ?? p.date_of_birth).slice(0, 10)) : null,
          goals: t.goals || 0,
          assists: t.assists || 0,
          appearances: t.appearances || 0,
          yellowCards: t.yellowCards || 0,
          redCards: t.redCards || 0,
          photo: t.photo || p.photo || p.headshotUrl,
        };
      });
      setPlayers(mapped);
    } catch (error) {
      console.error('Failed to load squad:', error);
      Alert.alert('Error', 'Failed to load squad.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingPlayer(null);
    setFormData({ firstName: '', lastName: '', number: '', position: 'Forward', dob: '' });
    setShowModal(true);
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setFormData({ firstName: player.firstName, lastName: player.lastName, number: player.number === null ? '' : String(player.number), position: player.position, dob: ukDate(player.dob) });
    setShowModal(true);
  };

  const handleSave = async () => {
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const number = formData.number.trim();
    const dobIssue = formData.dob.trim() ? dobProblem(formData.dob) : null;
    if (dobIssue) {
      Alert.alert('Date of birth', dobIssue);
      return;
    }
    if (!firstName) {
      Alert.alert('Name needed', "Enter the player's first name.");
      return;
    }
    if (number && !/^\d{1,3}$/.test(number)) {
      Alert.alert('Shirt number', 'The shirt number must be a whole number.');
      return;
    }
    try {
      const dob = formData.dob.trim() ? isoDate(formData.dob) : null;
      const playerData = { firstName, lastName, number: number ? Number(number) : null, position: formData.position, dateOfBirth: dob };

      if (editingPlayer) {
        await squadApi.updatePlayer(editingPlayer.id, playerData);
        Alert.alert('Success', 'Player updated successfully!');
      } else {
        await squadApi.createPlayer(playerData);
        Alert.alert('Success', 'Player added successfully!');
      }

      setShowModal(false);
      loadPlayers();
    } catch (error) {
      console.error('Failed to save player:', error);
      Alert.alert('Error', 'Failed to save player. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this player from the squad?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await squadApi.deletePlayer(id);
              Alert.alert('Success', 'Player removed successfully!');
              loadPlayers();
            } catch (error) {
              console.error('Failed to delete player:', error);
              Alert.alert('Error', 'Failed to delete player. Please try again.');
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
        <Paragraph style={styles.loadingText}>Loading squad...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Paragraph style={styles.intro}>
          Add players, set shirt numbers and positions, and add stats from past seasons.
        </Paragraph>

        <View style={styles.playersContainer}>
          {players.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Title style={styles.emptyTitle}>No Players Yet</Title>
                <Paragraph style={styles.emptyText}>
                  Tap the + button to add your first player
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            players.map((player) => (
              <Card key={player.id} style={styles.playerCard}>
                <Card.Content>
                  <View style={styles.playerHeader}>
                    <View style={styles.playerLeft}>
                      <Avatar.Text
                        size={60}
                        label={playerInitials({ first_name: player.firstName, last_name: player.lastName, name: player.name })}
                        style={styles.avatar}
                        color={COLORS.primary}
                      />
                      <View style={styles.playerInfo}>
                        <View style={styles.nameRow}>
                          <Title style={styles.playerName}>{player.name}</Title>
                          {shirtNumber(player.number) ? (
                            <View style={styles.numberBadge}>
                              <Title style={styles.numberText}>#{shirtNumber(player.number)}</Title>
                            </View>
                          ) : null}
                        </View>
                        <Chip
                          style={styles.positionChip}
                          textStyle={styles.chipText}
                        >
                          {player.position}
                        </Chip>
                        <Paragraph style={styles.birthday}>{player.dob ? `Birthday ${birthdayLabel(player.dob)}` : 'No date of birth: no birthday post'}</Paragraph>
                      </View>
                    </View>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => openEditModal(player)}
                    />
                  </View>

                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Title style={styles.statValue}>{player.goals}</Title>
                      <Paragraph style={styles.statLabel}>Goals</Paragraph>
                    </View>
                    {withAssists ? (
                      <View style={styles.statBox}>
                        <Title style={styles.statValue}>{player.assists}</Title>
                        <Paragraph style={styles.statLabel}>Assists</Paragraph>
                      </View>
                    ) : null}
                    <View style={styles.statBox}>
                      <Title style={styles.statValue}>{player.appearances}</Title>
                      <Paragraph style={styles.statLabel}>Apps</Paragraph>
                    </View>
                    <View style={styles.statBox}>
                      <Title style={styles.statValue}>
                        {player.yellowCards > 0 && `🟨${player.yellowCards} `}
                        {player.redCards > 0 && `🟥${player.redCards}`}
                        {player.yellowCards === 0 && player.redCards === 0 && '✓'}
                      </Title>
                      <Paragraph style={styles.statLabel}>Cards</Paragraph>
                    </View>
                  </View>

                  <Paragraph style={styles.totalsNote}>All-time totals</Paragraph>
                  <Button mode="contained-tonal" icon="chart-box-plus-outline" onPress={() => setStatsFor(player)} style={styles.statsButton}>
                    Season stats
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleDelete(player.id)}
                    style={styles.deleteButton}
                    textColor={COLORS.error}
                  >
                    Remove from Squad
                  </Button>
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
        accessibilityLabel="Add player"
      />

      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </Title>

            <View style={styles.row}>
              <TextInput
                label="First name"
                accessibilityLabel="First name"
                value={formData.firstName}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                style={[styles.input, styles.halfInput]}
                mode="outlined"
                maxLength={40}
              />
              <TextInput
                label="Surname"
                accessibilityLabel="Surname"
                value={formData.lastName}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                style={[styles.input, styles.halfInput]}
                mode="outlined"
                maxLength={40}
              />
            </View>
            <Paragraph style={styles.nameHelp}>Two-word names go in one box, e.g. first name &quot;Mary Jane&quot; or surname &quot;Van Dijk&quot;. Posts use these for &quot;S. Smith&quot; style names.</Paragraph>

            <View style={styles.row}>
              <TextInput
                label="Number"
                value={formData.number}
                onChangeText={(text) => setFormData({ ...formData, number: text })}
                style={[styles.input, styles.halfInput]}
                mode="outlined"
                keyboardType="numeric"
              />
              <View style={styles.chipGroup}>
                <Paragraph style={styles.label}>Position:</Paragraph>
                <View style={styles.chips}>
                  {positions.map((pos) => (
                    <Chip
                      key={pos}
                      selected={formData.position === pos}
                      onPress={() => setFormData({ ...formData, position: pos })}
                      style={[styles.selectChip, formData.position === pos && styles.selectChipActive]}
                      selectedColor={COLORS.primary}
                    >
                      {pos}
                    </Chip>
                  ))}
                </View>
              </View>
            </View>

            <TextInput
              label="Date of birth (optional)"
              value={formData.dob}
              onChangeText={(text) => setFormData({ ...formData, dob: text.slice(0, 10) })}
              placeholder="dd/mm/yyyy"
              style={styles.input}
              mode="outlined"
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Date of birth, day month year"
            />
            <Paragraph style={styles.nameHelp}>For the club&apos;s birthday posts. Only staff and the player&apos;s family see it, and posts never show an age.</Paragraph>

            <Paragraph style={styles.formHelp}>
              Goals, apps and cards come from Match Centre. To add numbers for past seasons, save the player and tap Season stats.
            </Paragraph>

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
      <SeasonStatsModal
        player={statsFor}
        onClose={() => setStatsFor(null)}
        onSaved={(message) => {
          setStatsFor(null);
          Alert.alert('Saved', message);
          loadPlayers();
        }}
      />
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
  totalsNote: {
    color: COLORS.textLight,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  statsButton: {
    marginTop: 8,
  },
  formHelp: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 8,
  },
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
    fontFamily: FONTS.display,
    fontSize: 22,
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
  intro: {
    color: COLORS.textLight,
    marginHorizontal: 16,
    marginTop: 12,
  },
  playersContainer: {
    padding: 16,
  },
  playerCard: {
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  playerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
    backgroundColor: COLORS.primarySoft,
  },
  playerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  numberBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  numberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  positionChip: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySoft,
  },
  chipText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: COLORS.surfaceRaised,
    padding: 12,
    borderRadius: 14,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  deleteButton: {
    borderColor: COLORS.error,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    margin: 20,
    borderRadius: 18,
    maxHeight: '90%',
  },
  modalTitle: {
    fontFamily: FONTS.display,
    fontSize: 24,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
    marginRight: 8,
  },
  birthday: {
    fontSize: 12,
    marginTop: 4,
    color: COLORS.textLight,
  },
  nameHelp: {
    fontSize: 12,
    marginTop: -4,
    marginBottom: 12,
    opacity: 0.7,
  },
  chipGroup: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectChipActive: {
    backgroundColor: COLORS.primarySoft,
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
