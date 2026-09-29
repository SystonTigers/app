import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { matchDayApi } from '../services/api';
import { pollInterval, type MatchDay } from '../utils/matchDay';

/**
 * Today's matches (live video, where the ground is, whether I'm there),
 * refreshed every minute on match days while the app is open.
 * Shared by the live video pop-up, Live Match and Match Centre.
 */

interface MatchDayContextValue {
  day: MatchDay | null;
  refresh: () => Promise<void>;
  /** Record at the ground yes/no for a match; manual choices beat the phone's location. */
  setAttendance: (fixtureId: string, atVenue: boolean, source: 'location' | 'manual') => Promise<void>;
  /** Let the phone decide again */
  clearAttendance: (fixtureId: string) => Promise<void>;
}

const MatchDayContext = createContext<MatchDayContextValue | null>(null);

export function MatchDayProvider({ children }: { children: React.ReactNode }) {
  const [day, setDay] = useState<MatchDay | null>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await matchDayApi.get();
      setDay(res.data);
    } catch {
      // Keep what we had: a missed refresh just waits for the next one
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);

  // Re-arms when the interval changes (a match day starts or ends), not on every refresh
  const interval = pollInterval(day);
  useEffect(() => {
    if (!active) return;
    refresh();
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [active, refresh, interval]);

  const setAttendance = useCallback(async (fixtureId: string, atVenue: boolean, source: 'location' | 'manual') => {
    const res = await matchDayApi.setAttendance(fixtureId, atVenue, source);
    setDay((d) => d && { ...d, fixtures: d.fixtures.map((f) => (f.id === fixtureId ? { ...f, attendance: res.data } : f)) });
  }, []);

  const clearAttendance = useCallback(async (fixtureId: string) => {
    await matchDayApi.clearAttendance(fixtureId);
    setDay((d) => d && { ...d, fixtures: d.fixtures.map((f) => (f.id === fixtureId ? { ...f, attendance: null } : f)) });
  }, []);

  const value = useMemo(() => ({ day, refresh, setAttendance, clearAttendance }), [day, refresh, setAttendance, clearAttendance]);
  return <MatchDayContext.Provider value={value}>{children}</MatchDayContext.Provider>;
}

/** Match day data; outside the signed-in app it's always empty. */
export function useMatchDay(): MatchDayContextValue {
  return useContext(MatchDayContext) ?? {
    day: null,
    refresh: async () => undefined,
    setAttendance: async () => undefined,
    clearAttendance: async () => undefined,
  };
}
