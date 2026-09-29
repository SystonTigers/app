import * as Location from 'expo-location';
import type { Position } from '../utils/matchDay';

/**
 * The phone's location, used only on match days to decide "at the ground or
 * not" on the phone itself. Coordinates are never sent to the server (except
 * by staff setting where the ground is).
 */

export type LocationPermission = 'granted' | 'denied' | 'undetermined';

export async function locationPermission(): Promise<LocationPermission> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/** Ask (shows the phone's permission prompt). Call from a button tap. */
export async function askLocation(): Promise<boolean> {
  try {
    return (await Location.requestForegroundPermissionsAsync()).status === 'granted';
  } catch {
    return false;
  }
}

/** Where the phone is now, or null (no permission, no fix within 15 seconds). */
export async function currentPosition(): Promise<Position | null> {
  if ((await locationPermission()) !== 'granted') return null;
  try {
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
    ]);
    if (!fix) return null;
    return { lat: fix.coords.latitude, lng: fix.coords.longitude, accuracy: fix.coords.accuracy ?? null };
  } catch {
    return null;
  }
}
