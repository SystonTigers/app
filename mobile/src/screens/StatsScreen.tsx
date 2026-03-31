import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Avatar, DataTable, Chip, Button, List } from 'react-native-paper';
import { COLORS } from '../config';
import { statsApi } from '../services/api';

interface PlayerStats {
  id: string;
  name: string;
  number: number;
  position: string;
  photo?: string;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets?: number;
  recentForm: ('W' | 'D' | 'L' | '-')[];
  motmCount: number;
}

interface MOTMWinner {
  matchId: string;
  opponent: string;
  date: string;
  playerId: string;
  playerName: string;
  votes: number;
}

type LeaderboardType = 'scorers' | 'assisters' | 'combined' | 'cleansheets' | 'cards' | 'motm';

export default function StatsScreen() {
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LeaderboardType>('scorers');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [motmHistory, setMotmHistory] = useState<MOTMWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await statsApi.getPlayerStats();
      const raw = result?.data || [];
      const mapped: PlayerStats[] = raw.map((p: any) => ({
        id: p.id || p.playerId || String(Math.random()),
        name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        number: p.number || p.squadNumber || 0,
        position: p.position || 'Unknown',
        appearances: p.appearances || 0,
        minutes: p.minutes || 0,
        goals: p.goals || 0,
        assists: p.assists || 0,
        yellowCards: p.yellowCards || 0,
        redCards: p.redCards || 0,
        cleanSheets: p.cleanSheets || 0,
        recentForm: p.recentForm || [],
        motmCount: p.motmCount || 0,
        photo: p.photo || p.headshotUrl,
      }));
      setPlayerStats(mapped);
      // Build MOTM history from players with motmCount > 0
      const motmList: MOTMWinner[] = mapped
        .filter(p => p.motmCount > 0)
        .sort((a, b) => b.motmCount - a.motmCount)
        .map((p, i) => ({
          matchId: String(i),
          opponent: '',
          date: '',
          playerId: p.id,
          playerName: p.name,
          votes: p.motmCount,
        }));
      setMotmHistory(motmList);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getPositionColor = (position: string) => {
    const colors: { [key: string]: string } = {
      Goalkeeper: '#FFD700',
      Defender: '#2196F3',
      Midfielder: '#4CAF50',
      Forward: '#F44336',
    };
    return colors[position] || '#999999';
  };

  const getFormColor = (result: string) => {
    switch (result) {
      case 'W': return '#4CAF50';
      case 'D': return '#FFA726';
      case 'L': return '#F44336';
      default: return '#CCCCCC';
    }
  };

  const getLeaderboardData = () => {
    const sorted = [...playerStats];
    switch (selectedLeaderboard) {
      case 'scorers':
        return sorted.sort((a, b) => b.goals - a.goals).slice(0, 10);
      case 'assisters':
        return sorted.sort((a, b) => b.assists - a.assists).slice(0, 10);
      case 'combined':
        return sorted.sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists)).slice(0, 10);
      case 'cleansheets':
        return sorted.filter(p => p.position === 'Goalkeeper').sort((a, b) => (b.cleanSheets || 0) - (a.cleanSheets || 0));
      case 'cards':
        return sorted.sort((a, b) => (b.yellowCards + b.redCards * 2) - (a.yellowCards + a.redCards * 2)).slice(0, 10);
      case 'motm':
        return sorted.sort((a, b) => b.motmCount - a.motmCount).slice(0, 10);
      default:
        return sorted.slice(0, 10);
    }
  };

  const leaderboardButtons = [
    { type: 'scorers' as LeaderboardType, label: 'Top Scorers', icon: '⚽' },
    { type: 'assisters' as LeaderboardType, label: 'Assisters', icon: '🅰️' },
    { type: 'combined' as LeaderboardType, label: 'G+A', icon: '🎯' },
    { type: 'cleansheets' as LeaderboardType, label: 'Clean Sheets', icon: '🧤' },
    { type: 'cards' as LeaderboardType, label: 'Most Cards', icon: '🟨' },
    { type: 'motm' as LeaderboardType, label: 'MOTM', icon: '⭐' },
  ];

  const getStatValue = (player: PlayerStats) => {
    switch (selectedLeaderboard) {
      case 'scorers': return player.goals;
      case 'assisters': return player.assists;
      case 'combined': return player.goals + player.assists;
      case 'cleansheets': return player.cleanSheets || 0;
      case 'cards': return player.yellowCards + player.redCards * 2;
      case 'motm': return player.motmCount;
      default: return 0;
    }
  };

  if (selectedPlayer) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Button
            mode="text"
            onPress={() => setSelectedPlayer(null)}
            textColor={COLORS.secondary}
            icon="arrow-left"
          >
            Back to Stats
          </Button>
        </View>

        <Card style={styles.playerCard}>
          <Card.Content>
            <View style={styles.playerHeader}>
              <Avatar.Text
                size={80}
                label={getInitials(selectedPlayer.name)}
                style={{ backgroundColor: getPositionColor(selectedPlayer.position) }}
              />
              <View style={styles.playerInfo}>
                <View style={styles.playerNameRow}>
                  <Title style={styles.playerName}>{selectedPlayer.name}</Title>
                  <Chip
                    style={[styles.numberBadge, { backgroundColor: COLORS.primary }]}
                    textStyle={styles.numberText}
                  >
                    #{selectedPlayer.number}
                  </Chip>
                </View>
                <Chip
                  style={[styles.positionBadge, { backgroundColor: getPositionColor(selectedPlayer.position) }]}
                  textStyle={styles.positionText}
                >
                  {selectedPlayer.position}
                </Chip>
              </View>
            </View>

            <View style={styles.statsDivider} />

            <Title style={styles.sectionTitle}>Season Statistics</Title>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Paragraph style={styles.statValue}>{selectedPlayer.appearances}</Paragraph>
                <Paragraph style={styles.statLabel}>Apps</Paragraph>
              </View>
              <View style={styles.statBox}>
                <Paragraph style={styles.statValue}>{selectedPlayer.minutes}</Paragraph>
                <Paragraph style={styles.statLabel}>Minutes</Paragraph>
              </View>
              <View style={styles.statBox}>
                <Paragraph style={styles.statValue}>{selectedPlayer.goals}</Paragraph>
                <Paragraph style={styles.statLabel}>Goals</Paragraph>
              </View>
              <View style={styles.statBox}>
                <Paragraph style={styles.statValue}>{selectedPlayer.assists}</Paragraph>
                <Paragraph style={styles.statLabel}>Assists</Paragraph>
              </View>
              {selectedPlayer.cleanSheets !== undefined && (
                <View style={styles.statBox}>
                  <Paragraph style={styles.statValue}>{selectedPlayer.cleanSheets}</Paragraph>
                  <Paragraph style={styles.statLabel}>Clean Sheets</Paragraph>
                </View>
              )}
              <View style={styles.statBox}>
                <Paragraph style={styles.statValue}>{selectedPlayer.yellowCards}</Paragraph>
                <Paragraph style={styles.statLabel}>Yellow Cards</Paragraph>
              </View>
              <View style={styles.statBox}>
                <Paragraph style={styles.statValue}>{selectedPlayer.redCards}</Paragraph>
                <Paragraph style={styles.statLabel}>Red Cards</Paragraph>
              </View>
              <View style={styles.statBox}>
                <Paragraph style={styles.statValue}>{selectedPlayer.motmCount}</Paragraph>
                <Paragraph style={styles.statLabel}>MOTM</Paragraph>
              </View>
            </View>

            <View style={styles.statsDivider} />

            <Title style={styles.sectionTitle}>Recent Form (Last 5 Matches)</Title>
            <View style={styles.formContainer}>
              {selectedPlayer.recentForm.map((result, index) => (
                <View
                  key={index}
                  style={[styles.formBadge, { backgroundColor: getFormColor(result) }]}
                >
                  <Paragraph style={styles.formText}>{result}</Paragraph>
                </View>
              ))}
            </View>

            <View style={styles.statsDivider} />

            <Title style={styles.sectionTitle}>Averages</Title>
            <View style={styles.averagesContainer}>
              <View style={styles.averageRow}>
                <Paragraph style={styles.averageLabel}>Goals per game:</Paragraph>
                <Paragraph style={styles.averageValue}>
                  {(selectedPlayer.goals / selectedPlayer.appearances).toFixed(2)}
                </Paragraph>
              </View>
              <View style={styles.averageRow}>
                <Paragraph style={styles.averageLabel}>Assists per game:</Paragraph>
                <Paragraph style={styles.averageValue}>
                  {(selectedPlayer.assists / selectedPlayer.appearances).toFixed(2)}
                </Paragraph>
              </View>
              <View style={styles.averageRow}>
                <Paragraph style={styles.averageLabel}>Minutes per game:</Paragraph>
                <Paragraph style={styles.averageValue}>
                  {Math.round(selectedPlayer.minutes / selectedPlayer.appearances)}
                </Paragraph>
              </View>
              {selectedPlayer.cleanSheets !== undefined && (
                <View style={styles.averageRow}>
                  <Paragraph style={styles.averageLabel}>Clean sheet %:</Paragraph>
                  <Paragraph style={styles.averageValue}>
                    {((selectedPlayer.cleanSheets / selectedPlayer.appearances) * 100).toFixed(0)}%
                  </Paragraph>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Team Statistics</Title>
        <Paragraph style={styles.headerSubtitle}>2024/25 Season</Paragraph>
      </View>

      {/* Leaderboard Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leaderboardSelector}>
        {leaderboardButtons.map((btn) => (
          <Chip
            key={btn.type}
            selected={selectedLeaderboard === btn.type}
            onPress={() => setSelectedLeaderboard(btn.type)}
            style={[
              styles.leaderboardChip,
              selectedLeaderboard === btn.type && styles.leaderboardChipSelected,
            ]}
            textStyle={[
              styles.leaderboardChipText,
              selectedLeaderboard === btn.type && styles.leaderboardChipTextSelected,
            ]}
            selectedColor={COLORS.primary}
          >
            {btn.icon} {btn.label}
          </Chip>
        ))}
      </ScrollView>

      {/* Leaderboard Table */}
      <Card style={styles.tableCard}>
        <DataTable>
          <DataTable.Header style={styles.tableHeader}>
            <DataTable.Title style={styles.rankCol}>#</DataTable.Title>
            <DataTable.Title style={styles.playerCol}>Player</DataTable.Title>
            <DataTable.Title numeric style={styles.statCol}>
              {selectedLeaderboard === 'scorers' && 'Goals'}
              {selectedLeaderboard === 'assisters' && 'Assists'}
              {selectedLeaderboard === 'combined' && 'G+A'}
              {selectedLeaderboard === 'cleansheets' && 'CS'}
              {selectedLeaderboard === 'cards' && 'Cards'}
              {selectedLeaderboard === 'motm' && 'MOTM'}
            </DataTable.Title>
            <DataTable.Title numeric style={styles.appsCol}>Apps</DataTable.Title>
          </DataTable.Header>

          {getLeaderboardData().map((player, index) => (
            <DataTable.Row
              key={player.id}
              style={styles.tableRow}
              onPress={() => setSelectedPlayer(player)}
            >
              <DataTable.Cell style={styles.rankCol}>
                <View style={styles.rankCell}>
                  {index < 3 && (
                    <Paragraph style={styles.medalIcon}>
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                    </Paragraph>
                  )}
                  {index >= 3 && <Paragraph style={styles.rank}>{index + 1}</Paragraph>}
                </View>
              </DataTable.Cell>
              <DataTable.Cell style={styles.playerCol}>
                <View style={styles.playerCellContent}>
                  <Avatar.Text
                    size={32}
                    label={getInitials(player.name)}
                    style={[styles.miniAvatar, { backgroundColor: getPositionColor(player.position) }]}
                  />
                  <View style={styles.playerNameContainer}>
                    <Paragraph style={styles.playerNameText} numberOfLines={1}>
                      {player.name}
                    </Paragraph>
                    <Paragraph style={styles.playerPosition}>{player.position}</Paragraph>
                  </View>
                </View>
              </DataTable.Cell>
              <DataTable.Cell numeric style={styles.statCol}>
                <Paragraph style={styles.statValueText}>{getStatValue(player)}</Paragraph>
              </DataTable.Cell>
              <DataTable.Cell numeric style={styles.appsCol}>
                <Paragraph style={styles.appsText}>{player.appearances}</Paragraph>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card>

      {/* MOTM History */}
      <Card style={styles.motmCard}>
        <Card.Content>
          <Title style={styles.motmTitle}>⭐ Man of the Match History</Title>
          <List.Section>
            {motmHistory.map((winner) => (
              <List.Item
                key={winner.matchId}
                title={winner.playerName}
                description={`vs ${winner.opponent} • ${new Date(winner.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                left={props => <List.Icon {...props} icon="trophy" color={COLORS.primary} />}
                right={props => (
                  <Paragraph style={styles.votesText}>{winner.votes} votes</Paragraph>
                )}
                style={styles.motmItem}
              />
            ))}
          </List.Section>
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Paragraph style={styles.footerText}>
          Tap any player to see detailed statistics
        </Paragraph>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  leaderboardSelector: {
    padding: 16,
    paddingBottom: 8,
  },
  leaderboardChip: {
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  leaderboardChipSelected: {
    backgroundColor: COLORS.primary,
  },
  leaderboardChipText: {
    color: COLORS.primary,
  },
  leaderboardChipTextSelected: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  tableCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  tableHeader: {
    backgroundColor: COLORS.background,
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  rankCol: {
    flex: 0.5,
    justifyContent: 'center',
  },
  playerCol: {
    flex: 2.5,
  },
  statCol: {
    flex: 0.8,
    justifyContent: 'center',
  },
  appsCol: {
    flex: 0.7,
    justifyContent: 'center',
  },
  rankCell: {
    alignItems: 'center',
  },
  rank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  medalIcon: {
    fontSize: 20,
  },
  playerCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    marginRight: 8,
  },
  playerNameContainer: {
    flex: 1,
  },
  playerNameText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  playerPosition: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  statValueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  appsText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  motmCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  motmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  motmItem: {
    paddingVertical: 4,
  },
  votesText: {
    fontSize: 12,
    color: COLORS.textLight,
    alignSelf: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  // Player Detail Styles
  playerCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
    flex: 1,
  },
  numberBadge: {
    height: 28,
  },
  numberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  positionBadge: {
    alignSelf: 'flex-start',
  },
  positionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsDivider: {
    height: 1,
    backgroundColor: COLORS.background,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  formContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  formBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  averagesContainer: {
    gap: 8,
  },
  averageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  averageLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  averageValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});
