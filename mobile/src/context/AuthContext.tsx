import React, { createContext, useState, useContext, useEffect } from 'react';
import { usersApi, authApi, onUnauthorized, type AuthResult } from '../services/api';
import { fetchClubInfo, getTenantId, setCurrentClub } from '../services/club';
import { AUTH_STORAGE_KEYS, authStorage, type AuthStorageKey } from '../services/authStorage';
import { setCrashReportingUser } from '../services/crashReporting';

interface User {
  userId: string;
  role: 'admin' | 'coach' | 'player' | 'parent';
  token: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userId: string, role: string, token: string) => Promise<void>;
  /** Sign in with the result of login or registration (also switches to the user's club). */
  signIn: (result: AuthResult) => Promise<void>;
  logout: () => Promise<void>;
  register: (userId: string, role: string, token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored auth token on app startup
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Token expired or revoked server-side: drop back to signed-out state
  useEffect(() => onUnauthorized(() => setUser(null)), []);

  // Tag crash reports with the user id only (no names/emails)
  useEffect(() => {
    setCrashReportingUser(user?.userId ?? null);
  }, [user?.userId]);

  const checkAuthStatus = async () => {
    try {
      const entries = await authStorage.multiGet([
        AUTH_STORAGE_KEYS.token,
        AUTH_STORAGE_KEYS.userId,
        AUTH_STORAGE_KEYS.role,
        AUTH_STORAGE_KEYS.firstName,
        AUTH_STORAGE_KEYS.lastName,
        AUTH_STORAGE_KEYS.email,
      ]);
      const map = Object.fromEntries(entries) as Record<string, string | null>;

      const token = map[AUTH_STORAGE_KEYS.token] || null;
      const userId = map[AUTH_STORAGE_KEYS.userId] || null;
      const role = map[AUTH_STORAGE_KEYS.role] || null;

      if (token && userId && role) {
        setUser({
          userId,
          role: role as User['role'],
          token,
          firstName: map[AUTH_STORAGE_KEYS.firstName] || undefined,
          lastName: map[AUTH_STORAGE_KEYS.lastName] || undefined,
          email: map[AUTH_STORAGE_KEYS.email] || undefined,
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userId: string, role: string, token: string) => {
    try {
      await authStorage.multiSet([
        [AUTH_STORAGE_KEYS.token, token],
        [AUTH_STORAGE_KEYS.userId, userId],
        [AUTH_STORAGE_KEYS.role, role],
      ]);

      let names: Pick<User, 'firstName' | 'lastName' | 'email'> = {};
      try {
        const profile = await usersApi.getProfile();
        if (profile.success && profile.user) {
          const { firstName, lastName, email } = profile.user;
          names = { firstName, lastName, email };
          const profileEntries: [AuthStorageKey, string][] = [];
          if (firstName) profileEntries.push([AUTH_STORAGE_KEYS.firstName, firstName]);
          if (lastName) profileEntries.push([AUTH_STORAGE_KEYS.lastName, lastName]);
          if (email) profileEntries.push([AUTH_STORAGE_KEYS.email, email]);
          if (profileEntries.length > 0) await authStorage.multiSet(profileEntries);
        }
      } catch (err) {
        console.warn('Failed to fetch user profile during login', err);
      }

      setUser({
        userId,
        role: role as User['role'],
        token,
        ...names,
      });
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const signIn = async ({ token, user: account }: AuthResult) => {
    // Logging in without choosing a club first: open the club the account belongs to
    if (account.clubSlug && account.clubSlug !== getTenantId()) {
      try {
        const club = await fetchClubInfo(account.clubSlug);
        if (club) await setCurrentClub(club);
      } catch (err) {
        console.warn('Could not load the club for this account', err);
      }
    }

    const names: [AuthStorageKey, string][] = [];
    if (account.firstName) names.push([AUTH_STORAGE_KEYS.firstName, account.firstName]);
    if (account.lastName) names.push([AUTH_STORAGE_KEYS.lastName, account.lastName]);
    if (account.email) names.push([AUTH_STORAGE_KEYS.email, account.email]);
    if (names.length > 0) await authStorage.multiSet(names);

    await login(account.id, account.role, token);
    setUser((prev) =>
      prev
        ? {
            ...prev,
            firstName: prev.firstName ?? account.firstName,
            lastName: prev.lastName ?? account.lastName,
            email: prev.email ?? account.email,
          }
        : prev,
    );
  };

  const register = async (userId: string, role: string, token: string) => {
    // Registration is the same as login - it stores the token and sets user
    await login(userId, role, token);
  };

  const logout = async () => {
    try {
      // Revoke on the server first, while we still have the token to authenticate with
      try {
        await authApi.logout({ revokeRemote: true });
      } catch (err) {
        // Non-fatal: the local session is cleared below regardless.
        console.warn('Remote session revocation failed', err);
      }

      await authStorage.clear();

      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signIn,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
