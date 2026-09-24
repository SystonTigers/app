import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Club,
  LOCKED_CLUB_SLUG,
  getCurrentClub,
  loadStoredClub,
  setCurrentClub,
  subscribeToClub,
} from '../services/club';

interface ClubContextType {
  club: Club | null;
  /** True until the saved club has been read at start-up. */
  isLoading: boolean;
  /** True when this build only ever shows one club. */
  isLocked: boolean;
  chooseClub: (club: Club) => Promise<void>;
  /** Forget the club (used by "Switch club"); not allowed on a locked build. */
  clearClub: () => Promise<void>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const ClubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [club, setClub] = useState<Club | null>(getCurrentClub());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToClub(setClub);
    loadStoredClub().finally(() => setIsLoading(false));
    return unsubscribe;
  }, []);

  const value: ClubContextType = {
    club,
    isLoading,
    isLocked: !!LOCKED_CLUB_SLUG,
    chooseClub: (next) => setCurrentClub(next),
    clearClub: async () => {
      if (!LOCKED_CLUB_SLUG) await setCurrentClub(null);
    },
  };

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
};

export function useClub(): ClubContextType {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}

/** The club's display name, with a neutral fallback. */
export function useClubName(): string {
  return useClub().club?.name || 'your club';
}
