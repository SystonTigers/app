import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import api, { API_BASE_URL, TENANT_ID } from '../config';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android';
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

class NotificationService {
  private token: string | null = null;
  private location: UserLocation | null = null;
  private locationUpdateInterval: NodeJS.Timeout | null = null;

  /**
   * Request notification permissions and register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Permission for push notifications was denied');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'systontowntigersfc/syston-mobile',
      });

      this.token = tokenData.data;

      // Register token with backend
      await this.registerTokenWithBackend(this.token);

      console.log('Push notification token registered:', this.token);
      return this.token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Register push token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      await api.post('/api/v1/push/register', {
        tenant: TENANT_ID,
        token,
        platform,
      });

      console.log('Token registered with backend');
    } catch (error) {
      console.error('Error registering token with backend:', error);
    }
  }

  /**
   * Request location permissions and start tracking
   */
  async startLocationTracking(): Promise<void> {
    try {
      // Request location permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        console.warn('Location permission was denied');
        return;
      }

      // Request background location (optional, for better accuracy)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission was denied');
      }

      // Get current location
      await this.updateLocation();

      // Update location every 30 seconds
      this.locationUpdateInterval = setInterval(() => {
        this.updateLocation();
      }, 30000);

      console.log('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  }

  /**
   * Stop location tracking
   */
  stopLocationTracking(): void {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
      console.log('Location tracking stopped');
    }
  }

  /**
   * Update current location
   */
  private async updateLocation(): Promise<void> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      this.location = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
      };

      // Send location to backend for geo-fencing
      await this.updateLocationOnBackend(this.location);

      console.log('Location updated:', this.location);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  /**
   * Update location on backend for geo-fencing
   */
  private async updateLocationOnBackend(location: UserLocation): Promise<void> {
    if (!this.token) return;

    try {
      await api.post('/api/v1/push/location', {
        tenant: TENANT_ID,
        token: this.token,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
      });
    } catch (error) {
      console.error('Error updating location on backend:', error);
    }
  }

  /**
   * Get current location
   */
  getCurrentLocation(): UserLocation | null {
    return this.location;
  }

  /**
   * Add notification received listener
   */
  addNotificationReceivedListener(
    handler: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(handler);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  addNotificationResponseListener(
    handler: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1,
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Calculate distance between two coordinates (in meters)
   * Uses Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Check if user is at venue (within 500m)
   */
  isUserAtVenue(venueLatitude: number, venueLongitude: number): boolean {
    if (!this.location) return false;

    const distance = this.calculateDistance(
      this.location.latitude,
      this.location.longitude,
      venueLatitude,
      venueLongitude
    );

    return distance <= 500; // 500m radius
  }
}

// Fix: Add Device import for isDevice check
import * as Device from 'expo-device';

// Export singleton instance
export const notificationService = new NotificationService();

// Export types
export type { Notifications };
