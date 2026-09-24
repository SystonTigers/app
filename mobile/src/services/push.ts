import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { COLORS } from '../config';
import { pushApi } from './api';

/**
 * Push notifications: permission, the Expo push token, and registering it
 * with the backend for the signed-in user's club.
 */

export type PushResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'not-a-device' | 'denied' | 'not-configured' | 'failed'; message: string };

const ASKED_KEY = '@push_permission_asked';

/** The EAS project id from app.json. Push tokens can't be issued without a real one. */
export function getProjectId(): string | null {
  const id =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/**
 * Get permission (asking only when `prompt` is true), then register this
 * device for the current club's notifications.
 */
export async function registerForPush({ prompt }: { prompt: boolean }): Promise<PushResult> {
  if (Platform.OS === 'web') {
    return { ok: false, reason: 'not-configured', message: 'Notifications are available in the phone app.' };
  }
  if (!Device.isDevice) {
    return { ok: false, reason: 'not-a-device', message: 'Notifications only work on a real phone, not a simulator.' };
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && prompt) {
    status = (await Notifications.requestPermissionsAsync()).status;
    await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => undefined);
  }
  if (status !== 'granted') {
    return { ok: false, reason: 'denied', message: 'Notifications are turned off for this app in your phone settings.' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Match updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: COLORS.primary,
    });
  }

  const projectId = getProjectId();
  if (!projectId) {
    return { ok: false, reason: 'not-configured', message: "Notifications aren't set up for this version of the app yet." };
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await pushApi.registerToken(token);
    return { ok: true, token };
  } catch (error) {
    console.warn('Push registration failed', error);
    return { ok: false, reason: 'failed', message: "We couldn't turn on notifications. Please try again." };
  }
}

/**
 * After sign-in: register quietly if already allowed, or ask once
 * (people can change their mind later in their phone's settings).
 */
export async function registerForPushAfterSignIn(): Promise<void> {
  try {
    const asked = await AsyncStorage.getItem(ASKED_KEY).catch(() => null);
    await registerForPush({ prompt: !asked });
  } catch (error) {
    console.warn('Push registration after sign-in failed', error);
  }
}
