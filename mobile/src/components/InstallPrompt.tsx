import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config';

/**
 * Web app only: invites people to put the app on their home screen.
 * - Android/desktop Chrome: shows an "Install" button using the browser's own prompt.
 * - iPhone/iPad Safari: explains Share → "Add to Home Screen" (Safari has no prompt).
 * Hidden once installed, or after "Not now" (remembered on this device).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'install_prompt_dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || isStandalone()) return;
    try {
      if (window.localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      // Storage blocked: still offer
    }
    if (isIos()) {
      setIos(true);
      setVisible(true);
      return;
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage blocked: hidden for this visit only
    }
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setVisible(false);
  };

  return (
    <View style={styles.banner} accessibilityRole="summary">
      <MaterialCommunityIcons name="cellphone-arrow-down" size={28} color={COLORS.primary} />
      <View style={styles.textBlock}>
        <Text style={styles.title}>Get the app on your phone</Text>
        {ios ? (
          <Text style={styles.body}>
            Tap the Share button <MaterialCommunityIcons name="export-variant" size={14} color={COLORS.text} /> then
            “Add to Home Screen”.
          </Text>
        ) : (
          <Text style={styles.body}>Install it for one-tap access, full screen and offline.</Text>
        )}
      </View>
      <View style={styles.actions}>
        {!ios && installEvent ? (
          <Pressable onPress={install} style={styles.installButton} accessibilityRole="button">
            <Text style={styles.installText}>Install</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Not now">
          <Text style={styles.dismiss}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}60`,
    backgroundColor: `${COLORS.primary}12`,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  installButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  installText: {
    color: '#000',
    fontWeight: '700',
  },
  dismiss: {
    color: COLORS.textLight,
    fontSize: 13,
  },
});
