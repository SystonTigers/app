import { create } from 'zustand';
import { platformApi } from '../api/client';

interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  token: string | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  email: null,
  token: null,

  login: async (email: string) => {
    try {
      const token = await platformApi.login(email);
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_email', email);
      set({ isAuthenticated: true, email, token });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    set({ isAuthenticated: false, email: null, token: null });
  },

  checkAuth: () => {
    const token = localStorage.getItem('admin_token');
    const email = localStorage.getItem('admin_email');
    if (token && email) {
      set({ isAuthenticated: true, email, token });
    }
  },
}));
