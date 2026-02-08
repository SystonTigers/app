import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utilities for the mobile app
 */

export const haptics = {
    /**
     * Light tap feedback (buttons, selections)
     */
    light: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },

    /**
     * Medium impact (important actions)
     */
    medium: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },

    /**
     * Heavy impact (major events, errors)
     */
    heavy: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },

    /**
     * Success notification
     */
    success: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },

    /**
     * Warning notification
     */
    warning: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },

    /**
     * Error notification
     */
    error: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },

    /**
     * Selection changed (pickers, tabs)
     */
    selection: () => {
        Haptics.selectionAsync();
    },
};
