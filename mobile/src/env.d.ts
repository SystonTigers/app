/// <reference types="node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Backend API Configuration
      EXPO_PUBLIC_API_BASE: string;
      EXPO_PUBLIC_TENANT_ID: string;

      // Supabase Configuration
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;

      // App Configuration
      EXPO_PUBLIC_APP_VERSION?: string;
      EXPO_PUBLIC_GEO_FENCE_RADIUS?: string;

      // Feature Flags
      EXPO_PUBLIC_ENABLE_OFFLINE?: string;
      EXPO_PUBLIC_DEBUG_MODE?: string;

      // HTTP Configuration
      EXPO_PUBLIC_HTTP_TIMEOUT?: string;
      EXPO_PUBLIC_HTTP_RETRY?: string;

      // Node environment
      NODE_ENV?: 'development' | 'production' | 'test';
    }
  }
}

export {};
