import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../config';
import type { MatchDayStream } from '../../utils/matchDay';

/** Web (PWA): the match's YouTube stream in an iframe, 16:9. */
export default function LiveStreamPlayer({ stream }: { stream: MatchDayStream }) {
  if (!stream.embeddable) return <WatchOnYouTube url={stream.watchUrl} />;
  return (
    <View style={styles.frame}>
      {React.createElement('iframe', {
        title: 'Live match video',
        src: stream.embedUrl,
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        allowFullScreen: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        style: { width: '100%', height: '100%', border: 0, display: 'block' },
      })}
    </View>
  );
}

export function WatchOnYouTube({ url }: { url: string }) {
  return (
    <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="link" style={styles.outside}>
      <MaterialCommunityIcons name="youtube" size={28} color="#FF0000" />
      <Text style={styles.outsideText}>Watch on YouTube</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
  outside: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 12, borderWidth: 1, borderColor: COLORS.textLight },
  outsideText: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
});
