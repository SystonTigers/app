import test from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, authApi, AUTH_STORAGE_KEYS, AuthError } from '../../services/api';
import { TENANT_ID } from '../../config';

const memoryStorage = new Map<string, string>();

const applyMemoryLocalStorage = () => {
  const localStorage = {
    getItem(key: string) {
      return memoryStorage.has(key) ? memoryStorage.get(key)! : null;
    },
    setItem(key: string, value: string) {
      memoryStorage.set(key, value);
    },
    removeItem(key: string) {
      memoryStorage.delete(key);
    },
    clear() {
      memoryStorage.clear();
    },
    key(index: number) {
      const keys = Array.from(memoryStorage.keys());
      return keys[index] ?? null;
    },
    get length() {
      return memoryStorage.size;
    },
  };

  const globalWindow = (globalThis as any).window ?? {};
  globalWindow.localStorage = localStorage;
  (globalThis as any).window = globalWindow;
};

const resetMemoryLocalStorage = () => {
  memoryStorage.clear();
};

applyMemoryLocalStorage();

test('authApi.login stores tokens and user metadata', async () => {
  const originalPost = apiClient.post;
  const calls: Array<{ url: string; data: unknown }> = [];

  (apiClient as any).post = async (url: string, data: unknown) => {
    calls.push({ url, data });
    return {
      data: {
        success: true,
        data: {
          token: 'jwt-token',
          refreshToken: 'refresh-token',
          user: {
            id: 'user-123',
            role: 'coach',
            firstName: 'Sam',
            lastName: 'Taylor',
            email: 'sam@example.com',
          },
        },
      },
    };
  };

  try {
    resetMemoryLocalStorage();
    await AsyncStorage.clear();
    const result = await authApi.login({ email: 'sam@example.com', password: 'secret' });

    assert.equal(result.token, 'jwt-token');
    assert.equal(result.user.id, 'user-123');
    assert.equal(result.user.role, 'coach');

    assert.equal(await AsyncStorage.getItem(AUTH_STORAGE_KEYS.token), 'jwt-token');
    assert.equal(await AsyncStorage.getItem(AUTH_STORAGE_KEYS.refreshToken), 'refresh-token');
    assert.equal(await AsyncStorage.getItem(AUTH_STORAGE_KEYS.userId), 'user-123');
    assert.equal(await AsyncStorage.getItem(AUTH_STORAGE_KEYS.role), 'coach');
    assert.equal(await AsyncStorage.getItem(AUTH_STORAGE_KEYS.firstName), 'Sam');
    assert.equal(await AsyncStorage.getItem(AUTH_STORAGE_KEYS.lastName), 'Taylor');
    assert.equal(await AsyncStorage.getItem(AUTH_STORAGE_KEYS.email), 'sam@example.com');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/v1/auth/login');
    assert.deepEqual(calls[0].data, {
      tenant: TENANT_ID,
      email: 'sam@example.com',
      password: 'secret',
    });
  } finally {
    (apiClient as any).post = originalPost;
    resetMemoryLocalStorage();
  }
});

test('authApi.login rethrows AuthError messages from server', async () => {
  const originalPost = apiClient.post;

  (apiClient as any).post = async () => {
    throw new AuthError('Invalid credentials', { email: 'Invalid credentials' });
  };

  try {
    resetMemoryLocalStorage();
    await assert.rejects(
      () => authApi.login({ email: 'user@example.com', password: 'wrong' }),
      (error: unknown) => {
        assert.ok(error instanceof AuthError);
        assert.equal((error as AuthError).message, 'Invalid credentials');
        return true;
      },
    );
  } finally {
    (apiClient as any).post = originalPost;
    resetMemoryLocalStorage();
  }
});
