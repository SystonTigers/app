/**
 * Match Centre's send queue, saved on the phone (see utils/liveOutbox.ts),
 * so taps made with no signal survive the app being closed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueuedTap } from '../utils/liveOutbox';

const KEY = 'match_centre_outbox_v1';

export async function loadOutbox(): Promise<QueuedTap[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((t) => t && typeof t.fixtureId === 'string' && t.event && typeof t.event.clientEventId === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveOutbox(queue: QueuedTap[]): Promise<void> {
  try {
    if (queue.length) await AsyncStorage.setItem(KEY, JSON.stringify(queue));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Storage unavailable (private browsing): the queue still works while the app is open
  }
}
