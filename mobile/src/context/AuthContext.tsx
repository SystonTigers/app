import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usersApi, authApi } from '../services/api';

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

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('user_id');
      const role = await AsyncStorage.getItem('user_role');
      const firstName = await AsyncStorage.getItem('user_firstName');
      const lastName = await AsyncStorage.getItem('user_lastName');
      const email = await AsyncStorage.getItem('user_email');

      if (token && userId && role) {
        setUser({
          userId,
          role: role as User['role'],
          token,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email || undefined,
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
      // Store auth data
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_id', userId);
      await AsyncStorage.setItem('user_role', role);

      try {
        const profile = await usersApi.getProfile();
        if (profile.success && profile.user) {
          const { firstName, lastName, email } = profile.user;
          if (firstName) await AsyncStorage.setItem('user_firstName', firstName);
          if (lastName) await AsyncStorage.setItem('user_lastName', lastName);
          if (email) await AsyncStorage.setItem('user_email', email);
        }
      } catch (err) {
        console.warn('Failed to fetch user profile during login', err);
      }

      setUser({
        userId,
        role: role as User['role'],
        token,
      });
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const register = async (userId: string, role: string, token: string) => {
    // Registration is the same as login - it stores the token and sets user
    await login(userId, role, token);
  };

  const logout = async () => {
    try {
      // Clear stored auth data
      await AsyncStorage.multiRemove([
        'auth_token',
        'user_id',
        'user_role',
        'user_firstName',
        'user_lastName',
        'user_email',
      ]);

      try {
        await authApi.logout();
      } catch (err) {
        console.warn('Logout API failed', err);
      }

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
