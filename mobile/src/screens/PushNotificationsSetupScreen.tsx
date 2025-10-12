import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { COLORS } from '../config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../services/api';

interface PushNotificationsSetupScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function PushNotificationsSetupScreen({ onComplete, onSkip }: PushNotificationsSetupScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
  };

  const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    let token: string | null = null;

    // Check if running on physical device
    if (!Device.isDevice) {
      Alert.alert('Error', 'Push notifications only work on physical devices, not simulators.');
      return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Permission Denied', 'You need to enable notifications in your device settings.');
      setPermissionStatus('denied');
      return null;
    }

    setPermissionStatus('granted');

    // Get Expo push token
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);

      // Register token with backend
      if (user?.userId && token) {
        await notificationsApi.registerToken(user.userId, token);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get push notification token.');
      console.error(error);
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: COLORS.primary,
      });
    }

    return token;
  };

  const handleEnableNotifications = async () => {
    setLoading(true);

    try {
      const token = await registerForPushNotificationsAsync();

      if (token) {
        Alert.alert(
          'Success!',
          'Push notifications are now enabled. You\'ll receive updates about matches, events, and team news.',
          [{ text: 'OK', onPress: onComplete }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enable notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!expoPushToken) {
      Alert.alert('Error', 'Please enable notifications first.');
      return;
    }

    try {
      // Schedule a local test notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification 🎉',
          body: 'This is what notifications from Syston Tigers will look like!',
          data: { type: 'test' },
          sound: true,
        },
        trigger: { seconds: 2 },
      });

      Alert.alert('Test Sent', 'You should receive a test notification in 2 seconds!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification.');
    }
  };

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Enable Notifications',
        'Open Settings > Notifications > Syston Tigers > Allow Notifications',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Notifications.openSettingsAsync() },
        ]
      );
    } else {
      Notifications.openSettingsAsync();
    }
  };

  const benefits = [
    {
      icon: 'soccer',
      title: 'Match Updates',
      description: 'Goals, cards, half-time, and full-time notifications',
    },
    {
      icon: 'calendar-alert',
      title: 'Event Reminders',
      description: 'Never miss training, matches, or team events',
    },
    {
      icon: 'bell-ring',
      title: 'Team News',
      description: 'Get notified about important team announcements',
    },
    {
      icon: 'map-marker-radius',
      title: 'Smart Geo-fencing',
      description: 'Only receive match updates if you\'re not at the venue',
    },
    {
      icon: 'trophy',
      title: 'MOTM Results',
      description: 'Find out who won Man of the Match',
    },
    {
      icon: 'video',
      title: 'Highlight Clips',
      description: 'Get notified when new match highlights are ready',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={permissionStatus === 'granted' ? 'bell-check' : 'bell-ring'}
          size={80}
          color={permissionStatus === 'granted' ? COLORS.success : COLORS.primary}
        />
        <Text style={styles.title}>
          {permissionStatus === 'granted' ? 'Notifications Enabled!' : 'Stay in the Loop'}
        </Text>
        <Text style={styles.subtitle}>
          {permissionStatus === 'granted'
            ? 'You\'re all set to receive team updates'
            : 'Never miss important team updates with push notifications'}
        </Text>
      </View>

      {/* Benefits */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>What You'll Get</Text>
          <Divider style={styles.divider} />

          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={benefit.icon as any} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Status Card */}
      {permissionStatus === 'granted' && (
        <Card style={[styles.card, styles.successCard]}>
          <Card.Content>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.success} />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>Notifications Active</Text>
                <Text style={styles.statusDescription}>
                  You're receiving all team updates
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {permissionStatus === 'denied' && (
        <Card style={[styles.card, styles.warningCard]}>
          <Card.Content>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={COLORS.warning} />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>Notifications Disabled</Text>
                <Text style={styles.statusDescription}>
                  You can enable them in your device settings
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {permissionStatus !== 'granted' ? (
          <>
            <Button
              mode="contained"
              onPress={handleEnableNotifications}
              loading={loading}
              disabled={loading}
              style={styles.button}
              buttonColor={COLORS.primary}
              textColor="#000"
              icon="bell-ring"
            >
              Enable Notifications
            </Button>

            {permissionStatus === 'denied' && (
              <Button
                mode="outlined"
                onPress={handleOpenSettings}
                style={styles.button}
                icon="cog"
              >
                Open Settings
              </Button>
            )}

            {onSkip && (
              <Button
                mode="text"
                onPress={onSkip}
                style={styles.skipButton}
                disabled={loading}
              >
                Skip for Now
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              mode="contained"
              onPress={handleSendTestNotification}
              style={styles.button}
              buttonColor={COLORS.primary}
              textColor="#000"
              icon="send"
            >
              Send Test Notification
            </Button>

            <Button
              mode="outlined"
              onPress={onComplete}
              style={styles.button}
            >
              Continue
            </Button>
          </>
        )}
      </View>

      {/* Info */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information" size={20} color={COLORS.textLight} />
            <Text style={styles.infoText}>
              You can change notification preferences anytime in Settings. We respect your privacy and only send relevant team updates.
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Spacer */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    elevation: 2,
    marginBottom: 16,
  },
  successCard: {
    backgroundColor: `${COLORS.success}15`,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  warningCard: {
    backgroundColor: `${COLORS.warning}15`,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: COLORS.background,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  actions: {
    marginTop: 8,
  },
  button: {
    marginBottom: 12,
    paddingVertical: 6,
  },
  skipButton: {
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: `${COLORS.textLight}10`,
    elevation: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 18,
  },
});
