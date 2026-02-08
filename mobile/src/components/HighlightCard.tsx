import React from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../theme/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeedCard from './FeedCard';

interface HighlightCardProps {
    title: string;
    duration: string;
    thumbnailUrl: string;
    onPress: () => void;
}

export default function HighlightCard({ title, duration, thumbnailUrl, onPress }: HighlightCardProps) {
    const { theme } = useTheme();
    const { colors } = theme;

    return (
        <FeedCard title="MATCH HIGHLIGHTS" headerRight={<MaterialCommunityIcons name="video" size={20} color={colors.primary} />}>
            <TouchableOpacity onPress={onPress}>
                <ImageBackground source={{ uri: thumbnailUrl }} style={styles.thumbnail}>
                    <View style={styles.overlay}>
                        <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
                            <MaterialCommunityIcons name="play" size={32} color={colors.background} />
                        </View>
                        <View style={styles.durationBadge}>
                            <Text style={styles.durationText}>{duration}</Text>
                        </View>
                    </View>
                </ImageBackground>
                <View style={styles.details}>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                </View>
            </TouchableOpacity>
        </FeedCard>
    );
}

const styles = StyleSheet.create({
    thumbnail: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    durationBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    durationText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    details: {
        padding: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
    },
});
