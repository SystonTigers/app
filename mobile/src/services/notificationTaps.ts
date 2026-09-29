import * as Notifications from 'expo-notifications';

/**
 * Phone app: when someone taps a match alert, tell the app which screen to
 * open (the server sends { screen, fixtureId } with each alert).
 */
export function listenForNotificationTaps(onOpen: (screen: string) => void): () => void {
  const open = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data as { screen?: unknown } | undefined;
    if (typeof data?.screen === 'string') onOpen(data.screen);
  };
  // The tap that launched the app
  Notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}
