import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Card, Title, Paragraph, Avatar, Chip, Button } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import ScreenIntro from '../components/brand/ScreenIntro';
import { playerPageApi, resultsApi, squadApi, statsApi } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LinkChildCard from '../components/consent/LinkChildCard';
import { useAuth } from '../context/AuthContext';
import type { MyPlayer } from '../utils/playerPage';
import { playerInitials, shirtNumber } from '../utils/playerNames';
import { useTracksAssists } from '../context/ClubContext';

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
  initials: string;
  number: number;
  position: string;
  stats: PlayerStats;
}

/**
 * Players (bottom tab): everyone in the squad with this season's numbers. Tap
 * a player for their page. A player sees a shortcut to their own page, or
 * links it with the code from the manager.
 */
export default function SquadScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const withAssists = useTracksAssists();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [mine, setMine] = useState<MyPlayer[] | null>(null);
  const openPlayer = (id: string) => navigation.navigate('Player', { id });
  const [squad, setSquad] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSquad = useCallback(async () => {
    setError(null);
    try {
      // This season's numbers come from the stats endpoint (the squad list has none)
      const seasonId = await resultsApi.seasons().then((r) => r.data.find((o) => o.current)?.id).catch(() => undefined);
      const [response, stats, linked] = await Promise.all([
        squadApi.getSquad(),
        seasonId ? statsApi.getPlayerStats(seasonId).catch(() => null) : Promise.resolve(null),
        // Only players get the "your page" shortcut
        user?.role === 'player' ? playerPageApi.mine().catch(() => null) : Promise.resolve(null),
      ]);
      setMine(linked);
      const totals = new Map<string, any>((stats?.data || []).map((t: any) => [t.id, t]));

      // Normalize the response
      let playerList: any[] = [];
      if (response?.data) {
        playerList = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        playerList = response;
      }

      // Map backend players to our format
      const mappedPlayers: Player[] = playerList.map((player: any) => {
        const t = totals.get(player.id) || {};
        return {
          id: player.id || player.playerId || String(Math.random()),
          name: player.name || player.playerName || 'Unknown Player',
          initials: playerInitials(player),
          number: player.number || player.shirtNumber || 0,
          position: player.position || 'Unknown',
          stats: {
            goals: t.goals || 0,
            assists: t.assists || 0,
            appearances: t.appearances || 0,
            cards: { yellow: t.yellowCards || 0, red: t.redCards || 0 },
          },
        };
      });

      setSquad(mappedPlayers);
    } catch (err) {
      console.error('Failed to load squad:', err);
      setError(err instanceof Error ? err.message : 'Failed to load squad');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadSquad();
  }, [loadSquad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSquad();
  }, [loadSquad]);
  const getPositionColor = (position: string) => {
    switch (position.toLowerCase()) {
      case 'goalkeeper':
        return '#FFC107';
      case 'defender':
        return '#4FA3FF';
      case 'midfielder':
        return '#2BD576';
      case 'forward':
        return '#FF5A6E';
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
      }
    >
      <ScreenIntro title="Players" subtitle="Tap a player for their page" />

      {/* A player's own page: a shortcut, or link it with the manager's code */}
      {user?.role === 'player' && mine ? (
        mine.find((p) => p.isMe) ? (
          <TouchableOpacity onPress={() => openPlayer(mine.find((p) => p.isMe)!.id)} accessibilityRole="button" style={styles.mine}>
            <MaterialCommunityIcons name="account-star" size={26} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Paragraph style={styles.mineTitle}>Your player page</Paragraph>
              <Paragraph style={styles.mineText}>{mine.find((p) => p.isMe)!.hasBio ? 'See your stats, photos and goals.' : 'Write your bio so everyone knows a bit about you.'}</Paragraph>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        ) : (
          <View style={styles.linkCard}><LinkChildCard prominent forSelf onLinked={() => loadSquad()} /></View>
        )
      ) : null}

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

      {squad.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Paragraph style={styles.emptyText}>No players in the squad yet</Paragraph>
        </View>
      ) : (
        squad.map((player) => (
          <TouchableOpacity key={player.id} onPress={() => openPlayer(player.id)} accessibilityRole="button" accessibilityLabel={`${player.name}, open their page`}>
            <Card style={styles.playerCard}>
              <Card.Content>
                <View style={styles.playerHeader}>
                  <View style={styles.playerInfo}>
                    <Avatar.Text
                      size={50}
                      label={player.initials}
                      style={[styles.avatar, { backgroundColor: COLORS.primary }]}
                      labelStyle={{ color: COLORS.onPrimary }}
                    />
                    <View style={styles.playerDetails}>
                      <Title style={styles.playerName}>
                        {shirtNumber(player.number) ? `#${shirtNumber(player.number)} ` : ''}{player.name}
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
                  {withAssists ? (
                    <View style={styles.statItem}>
                      <Title style={styles.statValue}>{player.stats.assists}</Title>
                      <Paragraph style={styles.statLabel}>Assists</Paragraph>
                    </View>
                  ) : null}
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

const useStyles = themedStyles((COLORS) => ({
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(255,0,85,0.14)',
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
  playerCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontFamily: FONTS.display,
    fontSize: 22,
    letterSpacing: 0.5,
    color: COLORS.text,
    marginBottom: 4,
  },
  positionChip: {
    alignSelf: 'flex-start',
  },
  positionText: {
    color: '#06080B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
  mine: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary },
  mineTitle: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
  mineText: { color: COLORS.textLight, fontSize: 13 },
  linkCard: { marginHorizontal: 16, marginBottom: 12 },
}));
