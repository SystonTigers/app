import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage for auth credentials and the signed-in user's profile.
 *
 * On iOS/Android values live in the Keychain / Keystore via expo-secure-store
 * (App Store / Play review expect tokens not to sit in plain AsyncStorage).
 * On web SecureStore isn't available, so we fall back to AsyncStorage.
 *
 * Values written by older builds to AsyncStorage are migrated on first read
 * and then deleted from AsyncStorage, so existing users stay signed in.
 */

export const AUTH_STORAGE_KEYS = {
  token: 'auth_token',
  refreshToken: 'auth_refresh_token',
  userId: 'user_id',
  role: 'user_role',
  firstName: 'user_firstName',
  lastName: 'user_lastName',
  email: 'user_email',
} as const;

export type AuthStorageKey = (typeof AUTH_STORAGE_KEYS)[keyof typeof AUTH_STORAGE_KEYS];

export const ALL_AUTH_KEYS: AuthStorageKey[] = Object.values(AUTH_STORAGE_KEYS);

const useSecureStore = Platform.OS === 'ios' || Platform.OS === 'android';

const secureOptions: SecureStore.SecureStoreOptions = {
  // Readable after first unlock so background fetches/notifications still work
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

let migration: Promise<void> | null = null;

/** Move any auth values left in AsyncStorage by older builds into SecureStore (once per launch). */
function migrateLegacy(): Promise<void> {
  if (!useSecureStore) {
    return Promise.resolve();
  }
  if (!migration) {
    migration = (async () => {
      try {
        const legacy = await AsyncStorage.multiGet(ALL_AUTH_KEYS);
        const present = legacy.filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '');
        if (present.length === 0) {
          return;
        }
        for (const [key, value] of present) {
          const existing = await SecureStore.getItemAsync(key);
          if (existing === null) {
            await SecureStore.setItemAsync(key, value, secureOptions);
          }
        }
        await AsyncStorage.multiRemove(present.map(([key]) => key));
      } catch (error) {
        // Leave legacy values in place; we'll retry next launch
        console.warn('Auth storage migration failed', error);
        migration = null;
      }
    })();
  }
  return migration;
}

export const authStorage = {
  async getItem(key: AuthStorageKey): Promise<string | null> {
    if (!useSecureStore) {
      return AsyncStorage.getItem(key);
    }
    await migrateLegacy();
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: AuthStorageKey, value: string): Promise<void> {
    if (!useSecureStore) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, secureOptions);
  },

  async removeItem(key: AuthStorageKey): Promise<void> {
    if (!useSecureStore) {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },

  async multiGet(keys: readonly AuthStorageKey[]): Promise<[AuthStorageKey, string | null][]> {
    return Promise.all(keys.map(async (key) => [key, await authStorage.getItem(key)] as [AuthStorageKey, string | null]));
  },

  async multiSet(entries: readonly [AuthStorageKey, string][]): Promise<void> {
    await Promise.all(entries.map(([key, value]) => authStorage.setItem(key, value)));
  },

  async multiRemove(keys: readonly AuthStorageKey[]): Promise<void> {
    await Promise.all(keys.map((key) => authStorage.removeItem(key)));
    if (useSecureStore) {
      // Also clear any legacy copies so a failed migration can't resurrect a session
      await AsyncStorage.multiRemove([...keys]).catch(() => undefined);
    }
  },

  /** Current bearer token, or null when signed out. */
  getToken(): Promise<string | null> {
    return authStorage.getItem(AUTH_STORAGE_KEYS.token);
  },

  /** Remove every auth/profile value (logout). */
  clear(): Promise<void> {
    return authStorage.multiRemove(ALL_AUTH_KEYS);
  },
};
