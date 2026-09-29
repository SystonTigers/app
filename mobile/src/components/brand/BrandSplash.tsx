import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Backdrop from './Backdrop';
import { FONTS } from '../../theme/brandFonts';

export const BRAND_CYAN = '#19E3FF';
export const BRAND_INK = '#06080B';

/**
 * Full-screen launch screen: the Boost Huddle emblem glowing over the hex
 * backdrop, the club's name, and a thin loading bar.
 */
export default function BrandSplash({ clubName }: { clubName?: string | null }) {
  const { width, height } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const glow = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    const load = Animated.loop(Animated.timing(bar, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }));
    glow.start();
    load.start();
    return () => { glow.stop(); load.stop(); };
  }, [pulse, bar]);

  const size = Math.min(width * 0.62, 300);
  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel="Loading Boost Huddle">
      <Backdrop color={BRAND_CYAN} width={Math.max(width, 1)} height={Math.max(height, 1)} glowY={0.4} intensity={1.2} />
      <View style={styles.center}>
        <Animated.View pointerEvents="none" style={[styles.halo, { width: size * 1.8, height: size * 1.8, marginTop: -size * 0.4, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={BRAND_CYAN} stopOpacity={0.45} />
                <Stop offset="0.5" stopColor={BRAND_CYAN} stopOpacity={0.12} />
                <Stop offset="1" stopColor={BRAND_CYAN} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={50} cy={50} r={50} fill="url(#halo)" />
          </Svg>
        </Animated.View>
        <Image source={require('../../../assets/emblem.png')} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={styles.wordmark}>BOOST HUDDLE</Text>
        <Text style={styles.tagline}>{clubName ? clubName.toUpperCase() : 'TOP PLAY'}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] }) }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND_INK, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', top: 0 },
  wordmark: { marginTop: 18, color: '#E9F1F5', fontFamily: FONTS.display, fontSize: 40, letterSpacing: 4, textShadowColor: BRAND_CYAN, textShadowRadius: 18 },
  tagline: { marginTop: 2, color: BRAND_CYAN, fontFamily: FONTS.displaySemi, fontSize: 18, letterSpacing: 6 },
  track: { position: 'absolute', bottom: 72, width: 160, height: 3, borderRadius: 2, backgroundColor: 'rgba(25,227,255,0.15)', overflow: 'hidden' },
  fill: { width: 60, height: 3, borderRadius: 2, backgroundColor: BRAND_CYAN, alignSelf: 'center' },
});
