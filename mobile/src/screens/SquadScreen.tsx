import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Card, Title, Paragraph, Avatar, Chip, Button } from 'react-native-paper';
import { COLORS } from '../config';
import { squadApi } from '../services/api';

interface PlayerStats {
  goals: number;
  assists: number;
  appearances: number;
  cards: {
    yellow: number;
    red: number;
  };
}

interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  stats: PlayerStats;
}

export default function SquadScreen() {
  const [squad, setSquad] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSquad = useCallback(async () => {
    setError(null);
    try {
      const response = await squadApi.getSquad();

      // Normalize the response
      let playerList: any[] = [];
      if (response?.data) {
        playerList = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        playerList = response;
      }

      // Map backend players to our format
      const mappedPlayers: Player[] = playerList.map((player: any) => ({
        id: player.id || player.playerId || String(Math.random()),
        name: player.name || player.playerName || 'Unknown Player',
        number: player.number || player.shirtNumber || 0,
        position: player.position || 'Unknown',
        stats: {
          goals: player.stats?.goals || player.goals || 0,
          assists: player.stats?.assists || player.assists || 0,
          appearances: player.stats?.appearances || player.apps || player.matches || 0,
          cards: {
            yellow: player.stats?.cards?.yellow || player.yellows || player.yellowCards || 0,
            red: player.stats?.cards?.red || player.reds || player.redCards || 0,
          },
        },
      }));

      setSquad(mappedPlayers);
    } catch (err) {
      console.error('Failed to load squad:', err);
      setError(err instanceof Error ? err.message : 'Failed to load squad');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSquad();
  }, [loadSquad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSquad();
  }, [loadSquad]);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Paragraph style={styles.loadingText}>Loading squad...</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Error Message */}
      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Paragraph style={styles.errorText}>{error}</Paragraph>
            <Button mode="outlined" onPress={loadSquad} style={styles.retryButton}>
              Retry
            </Button>
          </Card.Content>
        </Card>
      )}

      <View style={styles.header}>
        <Title>👥 Squad</Title>
        <Paragraph style={styles.subtitle}>Team Players</Paragraph>
      </View>

      {squad.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Paragraph style={styles.emptyText}>No players in the squad yet</Paragraph>
        </View>
      ) : (
        squad.map((player) => (
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
        ))
      )}
    </ScrollView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
  },
  errorCard: {
    margin: 16,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
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
