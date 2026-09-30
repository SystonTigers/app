import React from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Backdrop from '../brand/Backdrop';
import Crest from '../home/Crest';
import { FONTS } from '../../theme/brandFonts';
import { useBrandColors } from '../../theme/brand';
import { useClub } from '../../context/ClubContext';

/** The brand backdrop filling the whole sign-in screen, behind everything else. */
export function AuthBackdrop() {
  const { width, height } = useWindowDimensions();
  const c = useBrandColors();
  return <Backdrop color={c.primary} width={Math.max(width, 1)} height={Math.max(height, 1)} glowY={0.18} />;
}

/**
 * The top of a sign-in screen (these have no navigation bar): the club's crest
 * and name when a club is chosen, otherwise the Boost Huddle emblem and wordmark,
 * then an optional line underneath.
 */
export default function AuthBrandHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { club } = useClub();
  const c = useBrandColors();
  const heading = (title || club?.name || 'Boost Huddle').toUpperCase();
  return (
    <View style={styles.wrap}>
      {club ? (
        <Crest name={club.name} color={c.primary} badgeUrl={club.badgeUrl} size={76} />
      ) : (
        <Image
          source={require('../../../assets/emblem.png')}
          style={styles.emblem}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel="Boost Huddle"
        />
      )}
      <Text style={[styles.title, { color: c.text, textShadowColor: c.primary }]} accessibilityRole="header">
        {heading}
      </Text>
      <View style={[styles.underline, { backgroundColor: c.primary }]} />
      {subtitle ? <Text style={[styles.subtitle, { color: c.textLight }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 24 },
  emblem: { width: 96, height: 96 },
  title: {
    marginTop: 12,
    fontFamily: FONTS.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowRadius: 14,
  },
  underline: { width: 56, height: 3, borderRadius: 2, marginTop: 8 },
  subtitle: { marginTop: 12, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 360 },
});
