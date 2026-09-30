import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Lets code outside a screen (notification taps, the match day pop-up) move
 * around the app. Passed to the NavigationContainer in App.tsx.
 */
export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();

/** Go to a screen in the signed-in app, waiting briefly if the app is still starting. */
export function openScreen(name: string, attempt = 0): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never);
    return;
  }
  if (attempt < 20) setTimeout(() => openScreen(name, attempt + 1), 250);
}

// Screenshot and journey tests (web builds made with EXPO_PUBLIC_E2E=1 only)
if (process.env.EXPO_PUBLIC_E2E === '1' && typeof window !== 'undefined') {
  (window as unknown as { __openScreen?: typeof openScreen }).__openScreen = openScreen;
}
