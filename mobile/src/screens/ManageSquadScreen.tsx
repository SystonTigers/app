import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
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
import { COLORS } from '../config';

interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  photo?: string;
  goals: number;
  assists: number;
  appearances: number;
  yellowCards: number;
  redCards: number;
}

const mockPlayers: Player[] = [
  {
    id: '1',
    name: 'John Smith',
    number: 9,
    position: 'Forward',
    goals: 12,
    assists: 5,
    appearances: 18,
    yellowCards: 2,
    redCards: 0,
  },
  {
    id: '2',
    name: 'Mike Johnson',
    number: 10,
    position: 'Midfielder',
    goals: 7,
    assists: 9,
    appearances: 20,
    yellowCards: 3,
    redCards: 0,
  },
];

const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
const positionColors: { [key: string]: string } = {
  Goalkeeper: '#FFD700',
  Defender: '#2196F3',
  Midfielder: '#4CAF50',
  Forward: '#F44336',
};

export default function ManageSquadScreen() {
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    position: 'Forward',
    goals: '0',
    assists: '0',
    appearances: '0',
    yellowCards: '0',
    redCards: '0',
  });

  const openAddModal = () => {
    setEditingPlayer(null);
    setFormData({
      name: '',
      number: '',
      position: 'Forward',
      goals: '0',
      assists: '0',
      appearances: '0',
      yellowCards: '0',
      redCards: '0',
    });
    setShowModal(true);
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      number: player.number.toString(),
      position: player.position,
      goals: player.goals.toString(),
      assists: player.assists.toString(),
      appearances: player.appearances.toString(),
      yellowCards: player.yellowCards.toString(),
      redCards: player.redCards.toString(),
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const newPlayer: Player = {
      id: editingPlayer?.id || Date.now().toString(),
      name: formData.name,
      number: parseInt(formData.number),
      position: formData.position,
      goals: parseInt(formData.goals),
      assists: parseInt(formData.assists),
      appearances: parseInt(formData.appearances),
      yellowCards: parseInt(formData.yellowCards),
      redCards: parseInt(formData.redCards),
    };

    if (editingPlayer) {
      setPlayers(players.map((p) => (p.id === editingPlayer.id ? newPlayer : p)));
    } else {
      setPlayers([...players, newPlayer]);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Squad Management</Title>
          <Paragraph style={styles.headerSubtitle}>
            Manage players, update stats, and track performance
          </Paragraph>
        </View>

        <View style={styles.playersContainer}>
          {players.map((player) => (
            <Card key={player.id} style={styles.playerCard}>
              <Card.Content>
                <View style={styles.playerHeader}>
                  <View style={styles.playerLeft}>
                    <Avatar.Text
                      size={60}
                      label={getInitials(player.name)}
                      style={[
                        styles.avatar,
                        { backgroundColor: positionColors[player.position] || '#999' },
                      ]}
                    />
                    <View style={styles.playerInfo}>
                      <View style={styles.nameRow}>
                        <Title style={styles.playerName}>{player.name}</Title>
                        <View style={styles.numberBadge}>
                          <Title style={styles.numberText}>#{player.number}</Title>
                        </View>
                      </View>
                      <Chip
                        style={[
                          styles.positionChip,
                          { backgroundColor: positionColors[player.position] },
                        ]}
                        textStyle={styles.chipText}
                      >
                        {player.position}
                      </Chip>
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
                    <Paragraph style={styles.statLabel}>⚽ Goals</Paragraph>
                  </View>
                  <View style={styles.statBox}>
                    <Title style={styles.statValue}>{player.assists}</Title>
                    <Paragraph style={styles.statLabel}>🎯 Assists</Paragraph>
                  </View>
                  <View style={styles.statBox}>
                    <Title style={styles.statValue}>{player.appearances}</Title>
                    <Paragraph style={styles.statLabel}>👕 Apps</Paragraph>
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
          ))}
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
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </Title>

            <TextInput
              label="Player Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              style={styles.input}
              mode="outlined"
            />

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
                      style={styles.selectChip}
                      selectedColor={positionColors[pos]}
                    >
                      {pos}
                    </Chip>
                  ))}
                </View>
              </View>
            </View>

            <Paragraph style={styles.sectionTitle}>Season Stats</Paragraph>

            <View style={styles.statsInputRow}>
              <TextInput
                label="Goals"
                value={formData.goals}
                onChangeText={(text) => setFormData({ ...formData, goals: text })}
                style={[styles.input, styles.quarterInput]}
                mode="outlined"
                keyboardType="numeric"
              />
              <TextInput
                label="Assists"
                value={formData.assists}
                onChangeText={(text) => setFormData({ ...formData, assists: text })}
                style={[styles.input, styles.quarterInput]}
                mode="outlined"
                keyboardType="numeric"
              />
              <TextInput
                label="Apps"
                value={formData.appearances}
                onChangeText={(text) => setFormData({ ...formData, appearances: text })}
                style={[styles.input, styles.quarterInput]}
                mode="outlined"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.statsInputRow}>
              <TextInput
                label="🟨 Yellow"
                value={formData.yellowCards}
                onChangeText={(text) => setFormData({ ...formData, yellowCards: text })}
                style={[styles.input, styles.halfInput]}
                mode="outlined"
                keyboardType="numeric"
              />
              <TextInput
                label="🟥 Red"
                value={formData.redCards}
                onChangeText={(text) => setFormData({ ...formData, redCards: text })}
                style={[styles.input, styles.halfInput]}
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
  playersContainer: {
    padding: 16,
  },
  playerCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
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
    color: COLORS.secondary,
  },
  positionChip: {
    alignSelf: 'flex-start',
  },
  chipText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
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
  quarterInput: {
    flex: 1,
    marginRight: 8,
  },
  chipGroup: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 12,
    color: COLORS.text,
  },
  statsInputRow: {
    flexDirection: 'row',
    marginBottom: 12,
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
