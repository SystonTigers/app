import { useEffect } from 'react';

interface Sentinel { released: boolean; release(): Promise<void> }
type WakeLockNavigator = Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } };

/** True when this browser can keep the screen on (Chrome on Android, Safari on iOS 16.4+). */
export function canKeepScreenOn(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as WakeLockNavigator).wakeLock;
}

/**
 * Stops the phone's screen going off while `on` (Match Centre during a match),
 * using the browser's Screen Wake Lock. The browser drops the lock whenever the
 * page is hidden (another app, a notification pulled down, the screen locked),
 * so it's asked for again each time the app comes back into view.
 * Returns whether this device can keep the screen on.
 */
export function useKeepScreenOn(on: boolean): boolean {
  const supported = canKeepScreenOn();
  useEffect(() => {
    if (!on || !supported) return undefined;
    let lock: Sentinel | null = null;
    let stopped = false;
    const take = async () => {
      if (stopped || document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        lock = await (navigator as WakeLockNavigator).wakeLock!.request('screen');
        if (stopped) lock.release().catch(() => undefined);
      } catch {
        // Refused (battery saver, or the page wasn't in view): tried again next time it shows
      }
    };
    const onShow = () => { if (document.visibilityState === 'visible') take(); };
    take();
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', onShow);
      lock?.release().catch(() => undefined);
    };
  }, [on, supported]);
  return supported;
}
