import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useTheme } from '../theme/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeedCard from './FeedCard';

interface VoteCardProps {
    matchTitle: string;
    dueDate: string;
    onVote: () => void;
}

export default function VoteCard({ matchTitle, dueDate, onVote }: VoteCardProps) {
    const { theme } = useTheme();
    const { colors } = theme;

    return (
        <FeedCard title="MAN OF THE MATCH" headerRight={<MaterialCommunityIcons name="star" size={20} color={colors.primary} />}>
            <View style={styles.content}>
                <Text style={[styles.matches, { color: colors.text }]}>{matchTitle}</Text>
                <Text style={[styles.expiry, { color: colors.error }]}>VOTING CLOSES: {dueDate.toUpperCase()}</Text>
                <Button mode="contained" onPress={onVote} style={styles.voteButton} labelStyle={{ fontWeight: 'bold' }}>
                    CAST YOUR VOTE
                </Button>
            </View>
        </FeedCard>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: 16,
        alignItems: 'center',
    },
    matches: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    expiry: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 16,
        opacity: 0.8,
    },
    voteButton: {
        width: '80%',
    },
});
