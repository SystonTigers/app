/**
 * Web app: when someone taps a match alert, the service worker (web/sw.js)
 * either messages the open app or opens it with ?open=<screen>.
 */
export function listenForNotificationTaps(onOpen: (screen: string) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const url = new URL(window.location.href);
  const initial = url.searchParams.get('open');
  if (initial) {
    url.searchParams.delete('open');
    window.history.replaceState(window.history.state, '', url.toString());
    onOpen(initial);
  }

  if (!('serviceWorker' in navigator)) return () => undefined;
  const onMessage = (event: MessageEvent) => {
    const msg = event.data as { type?: unknown; screen?: unknown } | null;
    if (msg?.type === 'open-screen' && typeof msg.screen === 'string') onOpen(msg.screen);
  };
  navigator.serviceWorker.addEventListener('message', onMessage);
  return () => navigator.serviceWorker.removeEventListener('message', onMessage);
}
