import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { useTheme } from '../theme/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { IconButton } from 'react-native-paper';

interface SwipeAction {
    icon: string;
    color: string;
    onPress: () => void;
}

interface SwipeableCardProps {
    children: React.ReactNode;
    leftAction?: SwipeAction;
    rightAction?: SwipeAction;
}

export default function SwipeableCard({ children, leftAction, rightAction }: SwipeableCardProps) {
    const { theme } = useTheme();
    const { colors } = theme;
    const translateX = React.useRef(new Animated.Value(0)).current;

    const onGestureEvent = Animated.event(
        [{ nativeEvent: { translationX: translateX } }],
        { useNativeDriver: true }
    );

    const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
        const { translationX } = event.nativeEvent;

        if (Math.abs(translationX) > 100) {
            // Trigger action
            if (translationX > 100 && leftAction) {
                leftAction.onPress();
            } else if (translationX < -100 && rightAction) {
                rightAction.onPress();
            }
        }

        // Reset position
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
        }).start();
    };

    return (
        <View style={styles.container}>
            {/* Left Action */}
            {leftAction && (
                <View style={[styles.actionContainer, styles.leftAction, { backgroundColor: leftAction.color }]}>
                    <MaterialCommunityIcons name={leftAction.icon as any} size={24} color="#fff" />
                </View>
            )}

            {/* Right Action */}
            {rightAction && (
                <View style={[styles.actionContainer, styles.rightAction, { backgroundColor: rightAction.color }]}>
                    <MaterialCommunityIcons name={rightAction.icon as any} size={24} color="#fff" />
                </View>
            )}

            {/* Swipeable Content */}
            <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange as any}
            >
                <Animated.View style={[styles.card, { transform: [{ translateX }] }]}>
                    {children}
                </Animated.View>
            </PanGestureHandler>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        marginBottom: 12,
    },
    actionContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    leftAction: {
        left: 0,
    },
    rightAction: {
        right: 0,
    },
    card: {
        backgroundColor: 'transparent',
    },
});
