import React, { createContext, useState, useContext, useEffect } from 'react';
import { usersApi, authApi, membershipApi, onUnauthorized, onWaitingForApproval, roleFromRoles, type AuthResult } from '../services/api';
import { fetchClubInfo, getTenantId, setCurrentClub } from '../services/club';
import { AUTH_STORAGE_KEYS, authStorage, type AuthStorageKey } from '../services/authStorage';
import { setCrashReportingUser } from '../services/crashReporting';
import { clubRoleFromRoles, type ClubRole } from '../utils/roles';

interface User {
  userId: string;
  role: 'admin' | 'coach' | 'player' | 'parent' | 'supporter';
  token: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  /** The role people see ("Owner", "Manager"); `role` above is what the app checks */
  clubRole?: ClubRole;
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
  /** New account the club's coaches haven't let in yet: the app shows the waiting screen */
  waiting: boolean;
  /** Ask the server again; true once the account has been let in */
  checkMembership: () => Promise<boolean>;
  /** The server let this account in and sent a new sign-in (a code from the coach) */
  adoptMemberToken: (token: string, roles: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [waiting, setWaiting] = useState(false);

  // Check for stored auth token on app startup
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Token expired or revoked server-side: drop back to signed-out state
  useEffect(() => onUnauthorized(() => { setUser(null); setWaiting(false); }), []);
  // Any call refused because the coaches haven't let this account in yet
  useEffect(() => onWaitingForApproval(() => setWaiting(true)), []);

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
        AUTH_STORAGE_KEYS.clubRole,
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
          clubRole: (map[AUTH_STORAGE_KEYS.clubRole] as ClubRole | null) || undefined,
        });
        // Signed in before the app kept the club role: look it up once, quietly
        if (!map[AUTH_STORAGE_KEYS.clubRole]) {
          usersApi
            .getProfile()
            .then(async (profile) => {
              const clubRole = profile?.success ? clubRoleFromRoles(profile.user?.roles) : null;
              if (!clubRole) return;
              await authStorage.multiSet([[AUTH_STORAGE_KEYS.clubRole, clubRole]]);
              setUser((prev) => (prev ? { ...prev, clubRole } : prev));
            })
            .catch(() => undefined);
        }
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

      let names: Pick<User, 'firstName' | 'lastName' | 'email' | 'clubRole'> = {};
      try {
        const profile = await usersApi.getProfile();
        if (profile.success && profile.user) {
          const { firstName, lastName, email } = profile.user;
          const clubRole = clubRoleFromRoles(profile.user.roles) ?? undefined;
          names = { firstName, lastName, email, clubRole };
          const profileEntries: [AuthStorageKey, string][] = [];
          if (clubRole) profileEntries.push([AUTH_STORAGE_KEYS.clubRole, clubRole]);
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

  const adoptMemberToken = async (token: string, roles: string[]) => {
    const userId = user?.userId ?? (await authStorage.getItem(AUTH_STORAGE_KEYS.userId));
    if (!userId) return;
    await login(userId, roleFromRoles(roles) ?? 'parent', token);
    setWaiting(false);
  };

  const checkMembership = async (): Promise<boolean> => {
    const m = await membershipApi.get();
    if (m.status === 'removed') {
      await logout();
      return false;
    }
    if (m.status === 'pending') {
      setWaiting(true);
      return false;
    }
    if (m.token) await adoptMemberToken(m.token, m.roles);
    setWaiting(false);
    return true;
  };

  // Each sign-in (and each start of the app): has the club let this account in?
  const signedInAs = user?.userId;
  useEffect(() => {
    if (!signedInAs) return;
    checkMembership().catch(() => undefined); // offline: the app works as before and asks again next time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedInAs]);

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
      setWaiting(false);
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
        waiting,
        checkMembership,
        adoptMemberToken,
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
