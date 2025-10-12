import { useState, useEffect } from 'react';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

/**
 * i18n (Internationalization) System
 *
 * This module provides a comprehensive internationalization system
 * with support for multiple languages.
 *
 * Features:
 * - Automatic device locale detection
 * - Manual language switching
 * - Persistent language preference
 * - TypeScript support with autocomplete
 * - Fallback to English for missing translations
 */

export type SupportedLocale = 'en' | 'es' | 'fr';

export interface TranslationKeys {
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    next: string;
    done: string;
    yes: string;
    no: string;
    ok: string;
    retry: string;
    refresh: string;
  };

  // Navigation
  nav: {
    home: string;
    calendar: string;
    fixtures: string;
    squad: string;
    videos: string;
    shop: string;
    settings: string;
    manage: string;
  };

  // Home Screen
  home: {
    title: string;
    nextEvent: string;
    noEvents: string;
    feed: string;
    noFeed: string;
  };

  // Calendar Screen
  calendar: {
    title: string;
    upcoming: string;
    rsvp: {
      going: string;
      maybe: string;
      notGoing: string;
    };
    eventTypes: {
      match: string;
      training: string;
      social: string;
    };
  };

  // Fixtures Screen
  fixtures: {
    title: string;
    upcoming: string;
    results: string;
    table: string;
    noFixtures: string;
    homeAway: {
      home: string;
      away: string;
    };
  };

  // Squad Screen
  squad: {
    title: string;
    players: string;
    stats: {
      goals: string;
      assists: string;
      appearances: string;
      yellowCards: string;
      redCards: string;
    };
    positions: {
      goalkeeper: string;
      defender: string;
      midfielder: string;
      forward: string;
    };
  };

  // Videos Screen
  videos: {
    title: string;
    record: string;
    select: string;
    upload: string;
    recent: string;
    noVideos: string;
  };

  // Shop Screen
  shop: {
    title: string;
    products: string;
    cart: string;
    checkout: string;
    noProducts: string;
  };

  // Settings Screen
  settings: {
    title: string;
    profile: string;
    notifications: string;
    language: string;
    theme: string;
    about: string;
    logout: string;
  };

  // Live Match
  liveMatch: {
    title: string;
    start: string;
    record: string;
    events: {
      goal: string;
      yellow: string;
      red: string;
      sub: string;
      halftime: string;
      fulltime: string;
    };
  };

  // Errors
  errors: {
    network: string;
    notFound: string;
    unauthorized: string;
    unknown: string;
  };
}

/**
 * Translation map
 */
const translations: Record<SupportedLocale, TranslationKeys> = {
  en,
  es,
  fr,
};

/**
 * Storage key for language preference
 */
const STORAGE_KEY = '@app_language';

/**
 * Get device locale
 */
export function getDeviceLocale(): SupportedLocale {
  const locales = getLocales();
  const deviceLocale = locales[0]?.languageCode || 'en';

  // Map device locale to supported locale
  if (deviceLocale.startsWith('es')) return 'es';
  if (deviceLocale.startsWith('fr')) return 'fr';
  return 'en';
}

/**
 * Load saved language preference
 */
export async function loadLanguagePreference(): Promise<SupportedLocale | null> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'en' || saved === 'es' || saved === 'fr')) {
      return saved as SupportedLocale;
    }
    return null;
  } catch (error) {
    console.error('Error loading language preference:', error);
    return null;
  }
}

/**
 * Save language preference
 */
export async function saveLanguagePreference(locale: SupportedLocale): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
}

/**
 * Get translations for a locale
 */
export function getTranslations(locale: SupportedLocale): TranslationKeys {
  return translations[locale] || translations.en;
}

/**
 * React hook for i18n
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, setLocale } = useI18n();
 *
 *   return (
 *     <View>
 *       <Text>{t.common.loading}</Text>
 *       <Button title={t.common.save} onPress={() => {}} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useI18n() {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const savedLocale = await loadLanguagePreference();
      const finalLocale = savedLocale || getDeviceLocale();
      setLocaleState(finalLocale);
      setLoading(false);
    })();
  }, []);

  const setLocale = async (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    await saveLanguagePreference(newLocale);
  };

  const t = getTranslations(locale);

  return {
    t,
    locale,
    setLocale,
    loading,
  };
}

/**
 * Get translations synchronously (uses English by default)
 */
export function t(): TranslationKeys {
  return translations.en;
}

/**
 * Export translations for direct access
 */
export { en, es, fr };

/**
 * Export supported locales
 */
export const supportedLocales: SupportedLocale[] = ['en', 'es', 'fr'];

/**
 * Get locale display name
 */
export function getLocaleDisplayName(locale: SupportedLocale): string {
  const names: Record<SupportedLocale, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
  };
  return names[locale] || names.en;
}
