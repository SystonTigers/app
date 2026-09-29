import { pushApi } from './api';

/**
 * Match alerts for the installable web app (Web Push through the service
 * worker in web/sw.js). Only used when Platform.OS === 'web'.
 *
 * iPhones only allow this once the app is added to the Home Screen (iOS 16.4+),
 * and the permission prompt must come straight from a tap.
 */

export type WebPushState = 'unsupported' | 'needs-install' | 'denied' | 'default' | 'granted';

export type WebPushResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'needs-install' | 'unsupported' | 'denied' | 'not-configured' | 'failed'; message: string };

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInstalled(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function webPushState(): WebPushState {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';
  if (isIos() && !isInstalled()) return 'needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'default';
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.length) return false;
  const view = new Uint8Array(a);
  return view.every((v, i) => v === b[i]);
}

async function serviceWorker(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
  ]);
}

/**
 * Turn on match alerts in this browser. With `prompt`, asks for permission
 * (must be called from a tap); without it, only registers if already allowed.
 */
export async function subscribeWebPush(prompt: boolean): Promise<WebPushResult> {
  const state = webPushState();
  if (state === 'needs-install') {
    return { ok: false, reason: 'needs-install', message: 'On iPhone, add the app to your Home Screen first (Share → Add to Home Screen), then open it from there and turn alerts on.' };
  }
  if (state === 'unsupported') return { ok: false, reason: 'unsupported', message: "This browser can't show match alerts. Try Chrome, Edge, Firefox or Safari." };

  // The prompt has to be the first thing after the tap, or browsers ignore it
  const permission = prompt && state === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return { ok: false, reason: 'denied', message: 'Notifications are blocked for this app. Allow them in your browser or phone settings.' };

  try {
    const key = await pushApi.webPushKey();
    if (!key) return { ok: false, reason: 'not-configured', message: "Match alerts aren't switched on for the app yet." };
    const registration = await serviceWorker();
    if (!registration) return { ok: false, reason: 'failed', message: "We couldn't turn on alerts. Close and reopen the app, then try again." };

    const applicationServerKey = keyBytes(key);
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options.applicationServerKey, applicationServerKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    const token = JSON.stringify(subscription.toJSON());
    await pushApi.registerToken(token);
    return { ok: true, token };
  } catch (error) {
    console.warn('Web push registration failed', error);
    return { ok: false, reason: 'failed', message: "We couldn't turn on alerts. Please try again." };
  }
}
