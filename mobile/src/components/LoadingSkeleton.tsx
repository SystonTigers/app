import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface LoadingSkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

export default function LoadingSkeleton({ width = '100%', height = 20, borderRadius = 4, style }: LoadingSkeletonProps) {
    const { theme } = useTheme();
    const { colors } = theme;
    const opacity = React.useRef(new Animated.Value(0.3)).current;

    React.useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: colors.surface,
                    opacity,
                },
                style,
            ]}
        />
    );
}

// Preset skeleton components
export const SkeletonCard = () => {
    const { theme } = useTheme();
    const { colors } = theme;

    return (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <LoadingSkeleton width={60} height={60} borderRadius={30} style={{ marginBottom: 12 }} />
            <LoadingSkeleton width="80%" height={20} style={{ marginBottom: 8 }} />
            <LoadingSkeleton width="60%" height={16} />
        </View>
    );
};

export const SkeletonList = ({ count = 3 }: { count?: number }) => {
    return (
        <View>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
    },
});
