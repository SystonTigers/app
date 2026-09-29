import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';

/**
 * The app's display face: Barlow Condensed (SIL Open Font License, the same
 * files the server uses for match graphics). Body text stays the system font.
 */
export const FONTS = {
  display: 'BarlowCondensed-ExtraBold',
  displaySemi: 'BarlowCondensed-SemiBold',
} as const;

/** True once the fonts are ready, or after a short wait (never blocks the app on a slow connection). */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({
    [FONTS.display]: require('../../assets/fonts/BarlowCondensed-ExtraBold.ttf'),
    [FONTS.displaySemi]: require('../../assets/fonts/BarlowCondensed-SemiBold.ttf'),
  });
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), 2500);
    return () => clearTimeout(t);
  }, []);
  return loaded || !!error || gaveUp;
}
