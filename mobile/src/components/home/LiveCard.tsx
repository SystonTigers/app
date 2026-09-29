import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../../theme/brandFonts';

const LIVE_RED = '#FF3B4A';

/** A match that's on now: pulsing LIVE, the clock, the score and a link to follow it. */
export default function LiveCard({ status, home, away, homeScore, awayScore, video, color, onPress }: {
  status: string; home: string; away: string; homeScore: number | null; awayScore: number | null; video: boolean; color: string; onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.25, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scored = homeScore !== null && awayScore !== null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Live: ${home} ${homeScore ?? ''}, ${away} ${awayScore ?? ''}. ${video ? 'Watch and follow' : 'Follow'} live`}
      style={({ pressed }) => [styles.card, { borderColor: `${LIVE_RED}88` }, pressed ? styles.pressed : null]}>
      <View style={styles.top}>
        <Animated.View style={[styles.dot, { opacity: pulse }]} />
        <Text style={styles.live}>LIVE</Text>
        <Text style={styles.status}>{status}{video ? ' · ▶ VIDEO' : ''}</Text>
      </View>
      <View style={styles.score}>
        <Text style={styles.team} numberOfLines={2}>{home.toUpperCase()}</Text>
        <Text style={styles.goals}>{scored ? `${homeScore}–${awayScore}` : 'v'}</Text>
        <Text style={[styles.team, styles.right]} numberOfLines={2}>{away.toUpperCase()}</Text>
      </View>
      <Text style={[styles.link, { color }]}>{video ? 'Watch and follow live →' : 'Follow live →'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 18, borderWidth: 1.5, backgroundColor: '#1A0E11' },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: LIVE_RED },
  live: { color: LIVE_RED, fontFamily: FONTS.display, fontSize: 15, letterSpacing: 2 },
  status: { color: 'rgba(242,245,247,0.7)', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  score: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  team: { flex: 1, color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 18, lineHeight: 19 },
  right: { textAlign: 'right' },
  goals: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 40, lineHeight: 42 },
  link: { marginTop: 8, fontWeight: '800' },
});
