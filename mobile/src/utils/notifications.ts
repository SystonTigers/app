import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Push notification utilities
 */

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const notifications = {
    /**
     * Request permission for notifications
     */
    requestPermission: async () => {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        return finalStatus === 'granted';
    },

    /**
     * Get push token
     */
    getPushToken: async () => {
        try {
            const token = await Notifications.getExpoPushTokenAsync();
            return token.data;
        } catch (error) {
            console.error('Failed to get push token:', error);
            return null;
        }
    },

    /**
     * Schedule a local notification
     */
    scheduleNotification: async (title: string, body: string, trigger: Date | number) => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
            },
            trigger:
                typeof trigger === 'number'
                    ? { seconds: trigger }
                    : trigger,
        });
    },

    /**
     * Schedule match reminder (1 hour before)
     */
    scheduleMatchReminder: async (matchTitle: string, matchDate: Date) => {
        const notificationTime = new Date(matchDate.getTime() - 60 * 60 * 1000); // 1 hour before

        await notifications.scheduleNotification(
            '⚽ Match Starting Soon!',
            `${matchTitle} starts in 1 hour`,
            notificationTime
        );
    },

    /**
     * Notify about new MOTM voting
     */
    notifyMOTMVoting: async (matchTitle: string) => {
        await notifications.scheduleNotification(
            '🌟 Vote for Man of the Match',
            `${matchTitle} - Cast your vote now!`,
            5 // 5 seconds delay
        );
    },

    /**
     * Cancel all scheduled notifications
     */
    cancelAllNotifications: async () => {
        await Notifications.cancelAllScheduledNotificationsAsync();
    },
};
