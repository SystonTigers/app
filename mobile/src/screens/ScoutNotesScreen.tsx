import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip, IconButton, List, Divider, ActivityIndicator } from 'react-native-paper';
import { COLORS, API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface KeyPlayer {
    number: string;
    position: string;
    notes: string;
}

interface ScoutNote {
    id?: string;
    opponent_name: string;
    formation: string;
    key_players: KeyPlayer[];
    strengths: string[];
    weaknesses: string[];
    set_pieces: string;
    notes: string;
    visible_to_players: boolean;
}

// Common formations
const FORMATIONS = [
    '4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3',
    '4-1-4-1', '4-5-1', '5-3-2', '5-4-1', '4-4-1-1',
];

// Common strengths/weaknesses
const STRENGTH_OPTIONS = [
    'Fast counter-attacks',
    'Strong in the air',
    'Good set pieces',
    'Solid defense',
    'High pressing',
    'Technical players',
    'Physical team',
    'Good goalkeeper',
];

const WEAKNESS_OPTIONS = [
    'Slow defenders',
    'Weak in the air',
    'Poor at set pieces',
    'Vulnerable on counter',
    'Low work rate',
    'Weak left side',
    'Weak right side',
    'Keeper struggles with crosses',
];

interface Props {
    route: {
        params: {
            fixtureId: string;
            opponent: string;
        };
    };
    navigation: any;
}

export default function ScoutNotesScreen({ route, navigation }: Props) {
    const { fixtureId, opponent } = route.params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [scoutNote, setScoutNote] = useState<ScoutNote>({
        opponent_name: opponent || '',
        formation: '',
        key_players: [],
        strengths: [],
        weaknesses: [],
        set_pieces: '',
        notes: '',
        visible_to_players: false,
    });

    // New key player form
    const [newPlayer, setNewPlayer] = useState<KeyPlayer>({ number: '', position: '', notes: '' });
    const [showAddPlayer, setShowAddPlayer] = useState(false);

    const fetchScoutNotes = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/v1/fixtures/${fixtureId}/scout`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setScoutNote(prev => ({ ...prev, ...result.data }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch scout notes:', error);
        } finally {
            setLoading(false);
        }
    }, [fixtureId]);

    useEffect(() => {
        fetchScoutNotes();
    }, [fetchScoutNotes]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/v1/fixtures/${fixtureId}/scout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scoutNote),
            });

            if (response.ok) {
                Alert.alert('Success', 'Scout notes saved!');
                navigation.goBack();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to save scout notes');
        } finally {
            setSaving(false);
        }
    };

    const toggleStrength = (item: string) => {
        setScoutNote(prev => ({
            ...prev,
            strengths: prev.strengths.includes(item)
                ? prev.strengths.filter(s => s !== item)
                : [...prev.strengths, item],
        }));
    };

    const toggleWeakness = (item: string) => {
        setScoutNote(prev => ({
            ...prev,
            weaknesses: prev.weaknesses.includes(item)
                ? prev.weaknesses.filter(w => w !== item)
                : [...prev.weaknesses, item],
        }));
    };

    const addKeyPlayer = () => {
        if (!newPlayer.position) {
            Alert.alert('Required', 'Please enter at least a position');
            return;
        }
        setScoutNote(prev => ({
            ...prev,
            key_players: [...prev.key_players, newPlayer],
        }));
        setNewPlayer({ number: '', position: '', notes: '' });
        setShowAddPlayer(false);
    };

    const removeKeyPlayer = (index: number) => {
        setScoutNote(prev => ({
            ...prev,
            key_players: prev.key_players.filter((_, i) => i !== index),
        }));
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading scout notes...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Scout Report</Text>
                    <Text style={styles.subtitle}>vs {opponent}</Text>
                </View>

                {/* Formation Picker */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Formation</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.chipRow}>
                            {FORMATIONS.map(formation => (
                                <Chip
                                    key={formation}
                                    selected={scoutNote.formation === formation}
                                    onPress={() => setScoutNote(prev => ({ ...prev, formation }))}
                                    style={[
                                        styles.chip,
                                        scoutNote.formation === formation && styles.chipSelected,
                                    ]}
                                    textStyle={scoutNote.formation === formation ? styles.chipTextSelected : undefined}
                                >
                                    {formation}
                                </Chip>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                <Divider style={styles.divider} />

                {/* Key Players */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Key Players to Watch</Text>
                        <IconButton
                            icon="plus"
                            size={24}
                            onPress={() => setShowAddPlayer(true)}
                        />
                    </View>

                    {scoutNote.key_players.map((player, index) => (
                        <View key={index} style={styles.playerCard}>
                            <View style={styles.playerInfo}>
                                <Text style={styles.playerNumber}>#{player.number || '?'}</Text>
                                <View>
                                    <Text style={styles.playerPosition}>{player.position}</Text>
                                    <Text style={styles.playerNotes}>{player.notes}</Text>
                                </View>
                            </View>
                            <IconButton
                                icon="close"
                                size={20}
                                onPress={() => removeKeyPlayer(index)}
                            />
                        </View>
                    ))}

                    {showAddPlayer && (
                        <View style={styles.addPlayerForm}>
                            <TextInput
                                mode="outlined"
                                label="Jersey #"
                                value={newPlayer.number}
                                onChangeText={text => setNewPlayer(p => ({ ...p, number: text }))}
                                style={styles.playerInput}
                                keyboardType="numeric"
                            />
                            <TextInput
                                mode="outlined"
                                label="Position"
                                value={newPlayer.position}
                                onChangeText={text => setNewPlayer(p => ({ ...p, position: text }))}
                                style={styles.playerInput}
                                placeholder="e.g., Striker, #10"
                            />
                            <TextInput
                                mode="outlined"
                                label="Notes"
                                value={newPlayer.notes}
                                onChangeText={text => setNewPlayer(p => ({ ...p, notes: text }))}
                                style={styles.playerNotesInput}
                                multiline
                                placeholder="e.g., Very fast, likes to cut inside"
                            />
                            <View style={styles.addPlayerButtons}>
                                <Button mode="text" onPress={() => setShowAddPlayer(false)}>Cancel</Button>
                                <Button mode="contained" onPress={addKeyPlayer}>Add Player</Button>
                            </View>
                        </View>
                    )}

                    {scoutNote.key_players.length === 0 && !showAddPlayer && (
                        <Text style={styles.emptyText}>No key players added yet</Text>
                    )}
                </View>

                <Divider style={styles.divider} />

                {/* Strengths */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Their Strengths</Text>
                    <View style={styles.chipGrid}>
                        {STRENGTH_OPTIONS.map(item => (
                            <Chip
                                key={item}
                                selected={scoutNote.strengths.includes(item)}
                                onPress={() => toggleStrength(item)}
                                style={[
                                    styles.optionChip,
                                    scoutNote.strengths.includes(item) && styles.strengthChipSelected,
                                ]}
                                textStyle={scoutNote.strengths.includes(item) ? styles.chipTextSelected : undefined}
                            >
                                {item}
                            </Chip>
                        ))}
                    </View>
                </View>

                <Divider style={styles.divider} />

                {/* Weaknesses */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Their Weaknesses</Text>
                    <View style={styles.chipGrid}>
                        {WEAKNESS_OPTIONS.map(item => (
                            <Chip
                                key={item}
                                selected={scoutNote.weaknesses.includes(item)}
                                onPress={() => toggleWeakness(item)}
                                style={[
                                    styles.optionChip,
                                    scoutNote.weaknesses.includes(item) && styles.weaknessChipSelected,
                                ]}
                                textStyle={scoutNote.weaknesses.includes(item) ? styles.chipTextSelected : undefined}
                            >
                                {item}
                            </Chip>
                        ))}
                    </View>
                </View>

                <Divider style={styles.divider} />

                {/* Set Pieces */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Set Piece Notes</Text>
                    <TextInput
                        mode="outlined"
                        value={scoutNote.set_pieces}
                        onChangeText={text => setScoutNote(prev => ({ ...prev, set_pieces: text }))}
                        multiline
                        numberOfLines={3}
                        placeholder="e.g., They take short corners, #9 attacks near post..."
                    />
                </View>

                <Divider style={styles.divider} />

                {/* General Notes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Additional Notes</Text>
                    <TextInput
                        mode="outlined"
                        value={scoutNote.notes}
                        onChangeText={text => setScoutNote(prev => ({ ...prev, notes: text }))}
                        multiline
                        numberOfLines={4}
                        placeholder="Any other observations about the team..."
                    />
                </View>

                {/* Visibility Toggle */}
                <List.Item
                    title="Share with players"
                    description="Players can see this scout report"
                    left={props => <List.Icon {...props} icon="eye" />}
                    right={() => (
                        <Chip
                            selected={scoutNote.visible_to_players}
                            onPress={() => setScoutNote(prev => ({
                                ...prev,
                                visible_to_players: !prev.visible_to_players
                            }))}
                        >
                            {scoutNote.visible_to_players ? 'Visible' : 'Hidden'}
                        </Chip>
                    )}
                />

                {/* Save Button */}
                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving}
                    style={styles.saveButton}
                    contentStyle={styles.saveButtonContent}
                >
                    Save Scout Report
                </Button>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 12,
        color: COLORS.textLight,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 18,
        color: COLORS.textLight,
        marginTop: 4,
    },
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
    },
    chip: {
        marginRight: 8,
        backgroundColor: COLORS.surface,
    },
    chipSelected: {
        backgroundColor: COLORS.primary,
    },
    chipTextSelected: {
        color: '#fff',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        marginBottom: 8,
        backgroundColor: COLORS.surface,
    },
    strengthChipSelected: {
        backgroundColor: '#22c55e',
    },
    weaknessChipSelected: {
        backgroundColor: '#ef4444',
    },
    divider: {
        marginVertical: 16,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    playerNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginRight: 12,
        minWidth: 40,
    },
    playerPosition: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    playerNotes: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    addPlayerForm: {
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 8,
        marginTop: 8,
    },
    playerInput: {
        marginBottom: 8,
    },
    playerNotesInput: {
        marginBottom: 16,
    },
    addPlayerButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    emptyText: {
        color: COLORS.textLight,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 16,
    },
    saveButton: {
        marginTop: 24,
    },
    saveButtonContent: {
        paddingVertical: 8,
    },
});
