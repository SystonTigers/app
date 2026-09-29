import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_WEB_URL } from '../config';

/**
 * Invite codes that link a parent to their child. The manager shares a link
 * like https://<app>/?club=syston-tigers&link=K7QM-3XRD; the web app keeps
 * the code until the parent is signed in, then offers to link.
 */
const KEY = 'pendingChildInvite';
const CODE = /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/;

/** Web app: take the `link` code from the address bar (once) and keep it. */
export async function captureInviteFromLink(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('link')?.trim();
    if (!code) return;
    url.searchParams.delete('link');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (CODE.test(code)) await AsyncStorage.setItem(KEY, code.toUpperCase());
  } catch {
    // A bad link just isn't used
  }
}

export async function pendingInvite(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function clearPendingInvite(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing to clear
  }
}

/** The message staff send to a family (WhatsApp, text, email). */
export function inviteMessage(clubName: string, childName: string, code: string, clubSlug: string | null): string {
  const link = `${APP_WEB_URL}/?${clubSlug ? `club=${encodeURIComponent(clubSlug)}&` : ''}link=${encodeURIComponent(code)}`;
  const first = childName.split(' ')[0];
  return `Hi! Link your account to ${first} in the ${clubName} app: open ${link} and sign in (or create an account), or go to Photo & Video Consent in the app and enter code ${code}. The code works for 30 days.`;
}
