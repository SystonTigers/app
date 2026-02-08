import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { haptics } from '../utils/haptics';

interface CelebrationProps {
    visible: boolean;
    onComplete?: () => void;
    type?: 'victory' | 'goal' | 'trophy';
}

export default function Celebration({ visible, onComplete, type = 'victory' }: CelebrationProps) {
    const { theme } = useTheme();
    const { colors } = theme;

    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const rotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            haptics.success();

            // Scale and fade in
            Animated.parallel([
                Animated.spring(scale, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.loop(
                    Animated.timing(rotation, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    })
                ),
            ]).start();

            // Auto hide after 3 seconds
            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(scale, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    onComplete?.();
                });
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const spin = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const getIcon = () => {
        switch (type) {
            case 'goal':
                return 'soccer';
            case 'trophy':
                return 'trophy';
            default:
                return 'party-popper';
        }
    };

    if (!visible) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            <Animated.View
                style={[
                    styles.celebration,
                    {
                        transform: [{ scale }, { rotate: spin }],
                        opacity,
                    },
                ]}
            >
                <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
                    <MaterialCommunityIcons name={getIcon()} size={80} color={colors.background} />
                </View>
            </Animated.View>

            {/* Confetti effect */}
            {[...Array(20)].map((_, i) => (
                <ConfettiPiece key={i} index={i} opacity={opacity} />
            ))}
        </View>
    );
}

const ConfettiPiece = ({ index, opacity }: { index: number; opacity: Animated.Value }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const translateX = useRef(new Animated.Value(Math.random() * 400 - 200)).current;

    React.useEffect(() => {
        Animated.timing(translateY, {
            toValue: 1000,
            duration: 3000 + Math.random() * 1000,
            useNativeDriver: true,
        }).start();
    }, []);

    const colors = ['#00D9FF', '#FFD600', '#FF006E', '#00FF9F', '#8B00FF'];
    const randomColor = colors[index % colors.length];

    return (
        <Animated.View
            style={[
                styles.confetti,
                {
                    backgroundColor: randomColor,
                    transform: [{ translateX }, { translateY }],
                    opacity,
                },
            ]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    celebration: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 150,
        height: 150,
        borderRadius: 75,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    confetti: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});
