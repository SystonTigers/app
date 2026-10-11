import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const TAG = 'match-centre';

/**
 * Stops the phone's screen going off while `on` (Match Centre during a match).
 * Phone build: Expo's keep-awake. The web app uses useKeepScreenOn.web.ts.
 * Returns whether this device can keep the screen on.
 */
export function useKeepScreenOn(on: boolean): boolean {
  useEffect(() => {
    if (!on) return undefined;
    activateKeepAwakeAsync(TAG).catch(() => undefined);
    return () => { deactivateKeepAwake(TAG).catch(() => undefined); };
  }, [on]);
  return true;
}
