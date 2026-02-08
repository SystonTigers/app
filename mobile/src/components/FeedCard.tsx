import React, { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../theme/useTheme';

interface FeedCardProps {
    title?: string;
    icon?: string;
    children: ReactNode;
    onPress?: () => void;
    headerRight?: ReactNode;
}

export default function FeedCard({ title, icon, children, onPress, headerRight }: FeedCardProps) {
    const { theme } = useTheme();
    const { colors } = theme;

    const CardContent = (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
            {(title || headerRight) && (
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerLeft}>
                        {/* TODO: Add Icon support if needed, for now just text */}
                        {title && <Text style={[styles.title, { color: colors.text }]}>{title.toUpperCase()}</Text>}
                    </View>
                    {headerRight}
                </View>
            )}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
                {CardContent}
            </TouchableOpacity>
        );
    }

    return CardContent;
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
        marginHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    content: {
        padding: 0, // Let children handle padding
    },
});
