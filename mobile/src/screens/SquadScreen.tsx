import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Avatar, Chip } from 'react-native-paper';
import { COLORS } from '../config';

// Mock squad data
const mockSquad = [
  {
    id: '1',
    name: 'John Smith',
    number: 10,
    position: 'Forward',
    stats: { goals: 12, assists: 5, appearances: 18, cards: { yellow: 2, red: 0 } },
  },
  {
    id: '2',
    name: 'Mike Jones',
    number: 7,
    position: 'Midfielder',
    stats: { goals: 8, assists: 10, appearances: 18, cards: { yellow: 3, red: 0 } },
  },
  {
    id: '3',
    name: 'Tom Brown',
    number: 5,
    position: 'Defender',
    stats: { goals: 2, assists: 1, appearances: 17, cards: { yellow: 4, red: 1 } },
  },
  {
    id: '4',
    name: 'Sam Wilson',
    number: 1,
    position: 'Goalkeeper',
    stats: { goals: 0, assists: 0, appearances: 18, cards: { yellow: 1, red: 0 } },
  },
];

export default function SquadScreen() {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const getPositionColor = (position: string) => {
    switch (position.toLowerCase()) {
      case 'goalkeeper':
        return '#FFC107';
      case 'defender':
        return '#2196F3';
      case 'midfielder':
        return '#4CAF50';
      case 'forward':
        return '#F44336';
      default:
        return COLORS.textLight;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title>👥 Squad</Title>
        <Paragraph style={styles.subtitle}>U13 Boys Team</Paragraph>
      </View>

      {mockSquad.map((player) => (
        <TouchableOpacity key={player.id} onPress={() => console.log('Player details:', player.id)}>
          <Card style={styles.playerCard}>
            <Card.Content>
              <View style={styles.playerHeader}>
                <View style={styles.playerInfo}>
                  <Avatar.Text
                    size={50}
                    label={getInitials(player.name)}
                    style={[styles.avatar, { backgroundColor: COLORS.primary }]}
                    labelStyle={{ color: COLORS.secondary }}
                  />
                  <View style={styles.playerDetails}>
                    <Title style={styles.playerName}>
                      #{player.number} {player.name}
                    </Title>
                    <Chip
                      style={[styles.positionChip, { backgroundColor: getPositionColor(player.position) }]}
                      textStyle={styles.positionText}
                    >
                      {player.position}
                    </Chip>
                  </View>
                </View>
              </View>

              <View style={styles.stats}>
                <View style={styles.statItem}>
                  <Title style={styles.statValue}>{player.stats.goals}</Title>
                  <Paragraph style={styles.statLabel}>Goals</Paragraph>
                </View>
                <View style={styles.statItem}>
                  <Title style={styles.statValue}>{player.stats.assists}</Title>
                  <Paragraph style={styles.statLabel}>Assists</Paragraph>
                </View>
                <View style={styles.statItem}>
                  <Title style={styles.statValue}>{player.stats.appearances}</Title>
                  <Paragraph style={styles.statLabel}>Apps</Paragraph>
                </View>
                <View style={styles.statItem}>
                  <View style={styles.cards}>
                    <Paragraph style={styles.cardYellow}>🟨 {player.stats.cards.yellow}</Paragraph>
                    {player.stats.cards.red > 0 && (
                      <Paragraph style={styles.cardRed}>🟥 {player.stats.cards.red}</Paragraph>
                    )}
                  </View>
                  <Paragraph style={styles.statLabel}>Cards</Paragraph>
                </View>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
  },
  subtitle: {
    color: COLORS.textLight,
  },
  playerCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  playerHeader: {
    marginBottom: 16,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    backgroundColor: COLORS.primary,
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    marginBottom: 4,
  },
  positionChip: {
    alignSelf: 'flex-start',
  },
  positionText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  cards: {
    flexDirection: 'row',
    gap: 4,
  },
  cardYellow: {
    fontSize: 14,
  },
  cardRed: {
    fontSize: 14,
  },
});
