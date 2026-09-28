import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { FA_HOME, frameDocument, isSnippetCode, parseFrameMessage, type FramePalette } from './frame';

interface Props {
  code?: string;
  palette: FramePalette;
  highlight?: string;
}

/** iOS/Android: the FA snippet in a web view sized to its content; links open in the browser. */
export default function FaFullTimeView({ code, palette, highlight = '' }: Props) {
  const [height, setHeight] = useState(200);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => (isSnippetCode(code) ? frameDocument(code, palette, highlight) : ''), [code, palette, highlight]);

  if (!html) return null;
  if (failed) {
    return (
      <View style={styles.failed}>
        <Text style={{ color: palette.muted }}>
          FA Full-Time didn't load just now.{' '}
          <Text style={{ color: palette.brand, fontWeight: '700' }} onPress={() => Linking.openURL(FA_HOME)}>Open FA Full-Time</Text>
        </Text>
      </View>
    );
  }

  function onMessage(event: WebViewMessageEvent) {
    const msg = parseFrameMessage(event.nativeEvent.data);
    if (!msg) return;
    if (typeof msg.height === 'number') setHeight(Math.min(Math.max(msg.height, 80), 4000));
    if (msg.rows && msg.rows > 0) setReady(true);
    if (msg.done && !ready && !msg.rows && !msg.changed) setFailed(true);
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://boosthuddle.app/' }}
      style={[styles.view, { height }]}
      scrollEnabled={false}
      onMessage={onMessage}
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={(req) => {
        if (req.url.startsWith('https://boosthuddle.app/') || req.url.startsWith('about:') || req.isTopFrame === false) return true;
        Linking.openURL(req.url);
        return false;
      }}
    />
  );
}

const styles = StyleSheet.create({
  view: { width: '100%', backgroundColor: 'transparent' },
  failed: { padding: 16 },
});
