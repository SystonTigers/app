import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTS } from '../../theme/brandFonts';
import { initials } from './homeUtils';

/** A club badge: the uploaded crest, or the club's initials in a hexagon of its colour. */
export default function Crest({ name, color, badgeUrl, size = 48 }: { name: string; color: string; badgeUrl?: string | null; size?: number }) {
  if (badgeUrl) {
    return <Image source={{ uri: badgeUrl }} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel={`${name} badge`} />;
  }
  const r = 48;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  });
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${name} badge`}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Path d={`M${pts.join('L')}Z`} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={4} />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.text, { color, fontSize: size * 0.4 }]}>{initials(name)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: FONTS.display, letterSpacing: 1 },
});
