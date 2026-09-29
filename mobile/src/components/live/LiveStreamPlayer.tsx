import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../config';
import { playerDocument, type MatchDayStream } from '../../utils/matchDay';

/**
 * iOS/Android: the match's YouTube stream, 16:9, playing inside the app.
 * Links out of the player open in the YouTube app or browser.
 */
export default function LiveStreamPlayer({ stream }: { stream: MatchDayStream }) {
  const html = useMemo(() => playerDocument(stream.embedUrl), [stream.embedUrl]);

  if (!stream.embeddable) return <WatchOnYouTube url={stream.watchUrl} />;
  return (
    <View style={styles.frame}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://boosthuddle.app/' }}
        style={styles.video}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith('https://boosthuddle.app/') || req.url.startsWith('about:') || req.isTopFrame === false) return true;
          Linking.openURL(req.url);
          return false;
        }}
      />
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
  video: { flex: 1, backgroundColor: '#000' },
  outside: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 12, borderWidth: 1, borderColor: COLORS.textLight },
  outsideText: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
});
