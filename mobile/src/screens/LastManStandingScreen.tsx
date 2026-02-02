import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { apiClient } from '../services/api';

interface LMSGame {
    id: string;
    name: string;
    sport: string;
    competition?: string;
    status: 'active' | 'completed';
    round_number: number;
    total_entries: number;
    alive_entries: number;
    winner_name?: string;
}

interface LMSEntry {
    id: string;
    user_id: string;
    user_name: string;
    status: 'alive' | 'eliminated' | 'winner';
    streak: number;
    teams_used: string[];
}

interface Fixture {
    id: string;
    home: string;
    away: string;
    kickoff?: number;
    homeScore?: number;
    awayScore?: number;
}

interface LMSRound {
    id: string;
    round_number: number;
    name: string;
    deadline: number;
    status: 'open' | 'locked' | 'processed';
    fixtures: Fixture[];
}

export default function LastManStandingScreen() {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [games, setGames] = useState<LMSGame[]>([]);
    const [selectedGame, setSelectedGame] = useState<LMSGame | null>(null);
    const [standings, setStandings] = useState<LMSEntry[]>([]);
    const [currentRound, setCurrentRound] = useState<LMSRound | null>(null);
    const [userEntry, setUserEntry] = useState<LMSEntry | null>(null);
    const [userPrediction, setUserPrediction] = useState<any>(null);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadGames();
    }, []);

    const loadGames = async () => {
        try {
            const response = await apiClient.get('/api/v1/lms/games');
            if (response.data.success) {
                setGames(response.data.games || []);
                // Auto-select first active game
                const activeGame = response.data.games?.find((g: LMSGame) => g.status === 'active');
                if (activeGame) {
                    loadGameDetails(activeGame.id);
                }
            }
        } catch (err) {
            console.error('Failed to load LMS games:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadGameDetails = async (gameId: string) => {
        try {
            const response = await apiClient.get(`/api/v1/lms/games/${gameId}`);
            if (response.data.success) {
                setSelectedGame(response.data.game);
                setStandings(response.data.standings || []);
                setCurrentRound(response.data.currentRound);
                setUserEntry(response.data.userEntry);
                setUserPrediction(response.data.userPrediction);
                setSelectedTeam(response.data.userPrediction?.team_picked || null);
            }
        } catch (err) {
            console.error('Failed to load game details:', err);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadGames();
        if (selectedGame) {
            await loadGameDetails(selectedGame.id);
        }
        setRefreshing(false);
    }, [selectedGame]);

    const joinGame = async (gameId: string) => {
        try {
            const response = await apiClient.post(`/api/v1/lms/games/${gameId}/join`);
            if (response.data.success) {
                Alert.alert('Joined!', 'You have joined the game. Pick a winner each round!');
                loadGameDetails(gameId);
            }
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to join game');
        }
    };

    const submitPrediction = async () => {
        if (!currentRound || !selectedTeam) return;

        // Check if team already used
        if (userEntry?.teams_used?.includes(selectedTeam)) {
            Alert.alert('Invalid Pick', 'You have already used this team in a previous round.');
            return;
        }

        setSubmitting(true);
        try {
            const response = await apiClient.post('/api/v1/lms/predictions', {
                round_id: currentRound.id,
                team_picked: selectedTeam,
            });
            if (response.data.success) {
                Alert.alert('Prediction Saved!', `You picked ${selectedTeam} to win.`);
                if (selectedGame) loadGameDetails(selectedGame.id);
            }
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to submit prediction');
        } finally {
            setSubmitting(false);
        }
    };

    const getAvailableTeams = (): string[] => {
        if (!currentRound) return [];
        const teams: string[] = [];
        currentRound.fixtures.forEach(f => {
            teams.push(f.home, f.away);
        });
        return teams;
    };

    const isTeamUsed = (team: string): boolean => {
        return userEntry?.teams_used?.includes(team) || false;
    };

    const isDeadlinePassed = (): boolean => {
        if (!currentRound) return true;
        return Date.now() > currentRound.deadline;
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            padding: 20,
            paddingBottom: 10,
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            color: colors.text,
        },
        subtitle: {
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 4,
        },
        section: {
            backgroundColor: colors.card,
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 12,
            padding: 16,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 12,
        },
        gameCard: {
            backgroundColor: colors.background,
            borderRadius: 8,
            padding: 12,
            marginBottom: 8,
            borderWidth: 2,
            borderColor: 'transparent',
        },
        gameCardSelected: {
            borderColor: colors.primary,
        },
        gameName: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
        },
        gameInfo: {
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 4,
        },
        statusBadge: {
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4,
            alignSelf: 'flex-start',
            marginTop: 6,
        },
        statusText: {
            fontSize: 11,
            fontWeight: '600',
        },
        joinButton: {
            backgroundColor: colors.primary,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 6,
            marginTop: 8,
        },
        joinButtonText: {
            color: 'white',
            fontWeight: '600',
            textAlign: 'center',
        },
        fixtureRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        teamButton: {
            flex: 1,
            padding: 10,
            borderRadius: 8,
            backgroundColor: colors.background,
            alignItems: 'center',
        },
        teamButtonSelected: {
            backgroundColor: colors.primary,
        },
        teamButtonDisabled: {
            opacity: 0.4,
        },
        teamText: {
            fontSize: 14,
            fontWeight: '500',
            color: colors.text,
        },
        teamTextSelected: {
            color: 'white',
        },
        teamTextUsed: {
            textDecorationLine: 'line-through',
            color: colors.textSecondary,
        },
        vsText: {
            marginHorizontal: 10,
            color: colors.textSecondary,
            fontWeight: '600',
        },
        submitButton: {
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 12,
        },
        submitButtonDisabled: {
            backgroundColor: colors.textSecondary,
        },
        submitButtonText: {
            color: 'white',
            fontSize: 16,
            fontWeight: 'bold',
        },
        standingRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        standingRank: {
            width: 30,
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.textSecondary,
        },
        standingName: {
            flex: 1,
            fontSize: 15,
            color: colors.text,
        },
        standingStreak: {
            fontSize: 14,
            color: colors.primary,
            fontWeight: '600',
            marginRight: 10,
        },
        userStatus: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: colors.background,
            borderRadius: 8,
            marginBottom: 12,
        },
        userStatusIcon: {
            marginRight: 12,
        },
        userStatusText: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
        },
        userStatusSub: {
            fontSize: 13,
            color: colors.textSecondary,
        },
        emptyText: {
            textAlign: 'center',
            color: colors.textSecondary,
            padding: 20,
        },
        deadlineText: {
            fontSize: 12,
            color: colors.textSecondary,
            marginBottom: 12,
        },
        scoreText: {
            fontSize: 14,
            fontWeight: 'bold',
            color: colors.text,
            marginLeft: 8,
        },
    });

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.title}>🏆 Last Man Standing</Text>
                    <Text style={styles.subtitle}>Pick winners. Stay alive. Be the last one standing!</Text>
                </View>

                {/* Games List */}
                {games.length === 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.emptyText}>No games available yet. Check back soon!</Text>
                    </View>
                ) : (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Available Games</Text>
                        {games.map(game => (
                            <TouchableOpacity
                                key={game.id}
                                style={[
                                    styles.gameCard,
                                    selectedGame?.id === game.id && styles.gameCardSelected,
                                ]}
                                onPress={() => loadGameDetails(game.id)}
                            >
                                <Text style={styles.gameName}>{game.name}</Text>
                                <Text style={styles.gameInfo}>
                                    Round {game.round_number} • {game.alive_entries}/{game.total_entries} alive
                                </Text>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: game.status === 'active' ? '#dcfce7' : '#f3f4f6' },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusText,
                                            { color: game.status === 'active' ? '#166534' : '#6b7280' },
                                        ]}
                                    >
                                        {game.status.toUpperCase()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Selected Game Details */}
                {selectedGame && (
                    <>
                        {/* User Status */}
                        {userEntry ? (
                            <View style={styles.section}>
                                <View style={styles.userStatus}>
                                    <MaterialCommunityIcons
                                        name={
                                            userEntry.status === 'alive' ? 'check-circle' :
                                                userEntry.status === 'winner' ? 'trophy' : 'close-circle'
                                        }
                                        size={32}
                                        color={
                                            userEntry.status === 'alive' ? '#22c55e' :
                                                userEntry.status === 'winner' ? '#eab308' : '#ef4444'
                                        }
                                        style={styles.userStatusIcon}
                                    />
                                    <View>
                                        <Text style={styles.userStatusText}>
                                            {userEntry.status === 'alive' ? "You're Still In!" :
                                                userEntry.status === 'winner' ? "🎉 You Won!" : "Eliminated"}
                                        </Text>
                                        <Text style={styles.userStatusSub}>
                                            Streak: {userEntry.streak} correct picks
                                        </Text>
                                    </View>
                                </View>
                                {userEntry.teams_used.length > 0 && (
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                        Teams used: {userEntry.teams_used.join(', ')}
                                    </Text>
                                )}
                            </View>
                        ) : selectedGame.status === 'active' ? (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Join This Game</Text>
                                <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
                                    You haven't joined this game yet. Join now to start making predictions!
                                </Text>
                                <TouchableOpacity
                                    style={styles.joinButton}
                                    onPress={() => joinGame(selectedGame.id)}
                                >
                                    <Text style={styles.joinButtonText}>Join Game</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        {/* Current Round - Make Prediction */}
                        {currentRound && userEntry?.status === 'alive' && currentRound.status === 'open' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    {currentRound.name || `Round ${currentRound.round_number}`}
                                </Text>
                                <Text style={styles.deadlineText}>
                                    Deadline: {new Date(currentRound.deadline).toLocaleString()}
                                    {isDeadlinePassed() && ' (PASSED)'}
                                </Text>

                                {userPrediction ? (
                                    <View style={styles.userStatus}>
                                        <MaterialCommunityIcons
                                            name="check"
                                            size={24}
                                            color="#22c55e"
                                            style={styles.userStatusIcon}
                                        />
                                        <View>
                                            <Text style={styles.userStatusText}>
                                                Your Pick: {userPrediction.team_picked}
                                            </Text>
                                            <Text style={styles.userStatusSub}>
                                                {!isDeadlinePassed() ? 'You can change your pick until deadline' : 'Locked in!'}
                                            </Text>
                                        </View>
                                    </View>
                                ) : null}

                                {!isDeadlinePassed() && (
                                    <>
                                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                                            Pick a team to win (strikethrough = already used):
                                        </Text>
                                        {currentRound.fixtures.map((fixture) => (
                                            <View key={fixture.id} style={styles.fixtureRow}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.teamButton,
                                                        selectedTeam === fixture.home && styles.teamButtonSelected,
                                                        isTeamUsed(fixture.home) && styles.teamButtonDisabled,
                                                    ]}
                                                    onPress={() => !isTeamUsed(fixture.home) && setSelectedTeam(fixture.home)}
                                                    disabled={isTeamUsed(fixture.home)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.teamText,
                                                            selectedTeam === fixture.home && styles.teamTextSelected,
                                                            isTeamUsed(fixture.home) && styles.teamTextUsed,
                                                        ]}
                                                    >
                                                        {fixture.home}
                                                    </Text>
                                                </TouchableOpacity>
                                                <Text style={styles.vsText}>vs</Text>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.teamButton,
                                                        selectedTeam === fixture.away && styles.teamButtonSelected,
                                                        isTeamUsed(fixture.away) && styles.teamButtonDisabled,
                                                    ]}
                                                    onPress={() => !isTeamUsed(fixture.away) && setSelectedTeam(fixture.away)}
                                                    disabled={isTeamUsed(fixture.away)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.teamText,
                                                            selectedTeam === fixture.away && styles.teamTextSelected,
                                                            isTeamUsed(fixture.away) && styles.teamTextUsed,
                                                        ]}
                                                    >
                                                        {fixture.away}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}

                                        <TouchableOpacity
                                            style={[
                                                styles.submitButton,
                                                (!selectedTeam || submitting) && styles.submitButtonDisabled,
                                            ]}
                                            onPress={submitPrediction}
                                            disabled={!selectedTeam || submitting}
                                        >
                                            <Text style={styles.submitButtonText}>
                                                {submitting ? 'Saving...' : userPrediction ? 'Update Pick' : 'Lock In Pick'}
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        )}

                        {/* Processed Round Results */}
                        {currentRound && currentRound.status === 'processed' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    {currentRound.name || `Round ${currentRound.round_number}`} Results
                                </Text>
                                {currentRound.fixtures.map((fixture) => (
                                    <View key={fixture.id} style={styles.fixtureRow}>
                                        <Text style={styles.teamText}>{fixture.home}</Text>
                                        <Text style={styles.scoreText}>
                                            {fixture.homeScore} - {fixture.awayScore}
                                        </Text>
                                        <Text style={styles.teamText}>{fixture.away}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Standings */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Standings</Text>
                            {standings.length === 0 ? (
                                <Text style={styles.emptyText}>No players yet</Text>
                            ) : (
                                standings.slice(0, 20).map((entry, index) => (
                                    <View key={entry.id} style={styles.standingRow}>
                                        <Text style={styles.standingRank}>{index + 1}</Text>
                                        <Text style={styles.standingName}>{entry.user_name}</Text>
                                        <Text style={styles.standingStreak}>🔥 {entry.streak}</Text>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                {
                                                    backgroundColor:
                                                        entry.status === 'alive' ? '#dcfce7' :
                                                            entry.status === 'winner' ? '#fef3c7' : '#fee2e2',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusText,
                                                    {
                                                        color:
                                                            entry.status === 'alive' ? '#166534' :
                                                                entry.status === 'winner' ? '#92400e' : '#991b1b',
                                                    },
                                                ]}
                                            >
                                                {entry.status}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
