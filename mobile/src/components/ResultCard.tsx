import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../theme/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeedCard from './FeedCard';
import { social } from '../utils/social';
import { haptics } from '../utils/haptics';
import SwipeableCard from './SwipeableCard';

interface ResultCardProps {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    date: string;
    competition: string;
}

export default function ResultCard({ homeTeam, awayTeam, homeScore, awayScore, date, competition }: ResultCardProps) {
    const { theme } = useTheme();
    const { colors } = theme;

    const isWin = homeTeam === 'Syston Tigers' ? homeScore > awayScore : awayScore > homeScore;
    const isDraw = homeScore === awayScore;
    const outcomeColor = isWin ? colors.success : isDraw ? colors.textSecondary : colors.error;

    const handleShare = () => {
        haptics.light();
        social.shareMatchResult(homeTeam, awayTeam, homeScore, awayScore);
    };

    return (
        <SwipeableCard
            leftAction={{
                icon: 'share-variant',
                color: colors.primary,
                onPress: handleShare,
            }}
        >
            <FeedCard title="FULL TIME RESULT" headerRight={<MaterialCommunityIcons name="scoreboard" size={20} color={colors.primary} />}>
                <View style={styles.container}>
                    <Text style={[styles.competition, { color: colors.textSecondary }]}>{competition.toUpperCase()}</Text>

                    <View style={styles.scoreRow}>
                        <View style={styles.teamContainer}>
                            <Text style={[styles.teamName, { color: colors.text }]}>{homeTeam}</Text>
                        </View>

                        <View style={[styles.scoreBox, { backgroundColor: colors.background, borderColor: outcomeColor }]}>
                            <Text style={[styles.score, { color: colors.text }]}>{homeScore}</Text>
                            <Text style={[styles.hyphen, { color: colors.textSecondary }]}>-</Text>
                            <Text style={[styles.score, { color: colors.text }]}>{awayScore}</Text>
                        </View>

                        <View style={styles.teamContainer}>
                            <Text style={[styles.teamName, { color: colors.text }]}>{awayTeam}</Text>
                        </View>
                    </View>

                    <View style={[styles.outcomeBadge, { backgroundColor: outcomeColor + '20', borderColor: outcomeColor }]}>
                        <Text style={[styles.outcomeText, { color: outcomeColor }]}>
                            {isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
                        </Text>
                    </View>
                </View>
            </FeedCard>
        </SwipeableCard>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        alignItems: 'center',
    },
    competition: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 16,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    teamContainer: {
        flex: 1,
        alignItems: 'center',
    },
    teamName: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    scoreBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        marginHorizontal: 8,
    },
    score: {
        fontSize: 24,
        fontWeight: '900',
    },
    hyphen: {
        fontSize: 24,
        marginHorizontal: 8,
    },
    outcomeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
    },
    outcomeText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
