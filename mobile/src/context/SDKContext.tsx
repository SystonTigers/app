import React, { createContext, useContext } from 'react';
import { TeamSDK } from '@team-platform/sdk';

// Initialize SDK with backend URL
const BASE_URL = 'https://syston-postbus.team-platform-2025.workers.dev';
const TENANT = 'syston-tigers';

const sdk = new TeamSDK({
  baseURL: BASE_URL,
  tenant: TENANT,
});

interface SDKContextValue {
  sdk: TeamSDK;
}

const SDKContext = createContext<SDKContextValue | undefined>(undefined);

export function SDKProvider({ children }: { children: React.ReactNode }) {
  return (
    <SDKContext.Provider value={{ sdk }}>
      {children}
    </SDKContext.Provider>
  );
}

export function useSDK() {
  const context = useContext(SDKContext);
  if (!context) {
    throw new Error('useSDK must be used within SDKProvider');
  }
  return context;
}
