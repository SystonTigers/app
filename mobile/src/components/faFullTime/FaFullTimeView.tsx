import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { FA_HOME, FAILURES, frameDocument, isSnippetCode, parseFrameMessage, type FramePalette } from './frame';

interface Props {
  code?: string;
  palette: FramePalette;
  highlight?: string;
}

/** iOS/Android: the FA snippet in a web view sized to its content; links open in the browser. */
export default function FaFullTimeView({ code, palette, highlight = '' }: Props) {
  const [height, setHeight] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reason, setReason] = useState('timeout');
  const html = useMemo(() => (isSnippetCode(code) ? frameDocument(code, palette, highlight) : ''), [code, palette, highlight]);

  if (!html) return null;
  if (state === 'failed') {
    return (
      <View style={styles.note}>
        <Text style={{ color: palette.muted }}>
          {FAILURES[reason] ?? FAILURES.timeout}{' '}
          <Text style={{ color: palette.brand, fontWeight: '700' }} onPress={() => Linking.openURL(FA_HOME)}>Open FA Full-Time</Text>
        </Text>
      </View>
    );
  }

  function onMessage(event: WebViewMessageEvent) {
    const msg = parseFrameMessage(event.nativeEvent.data);
    if (!msg) return;
    if (typeof msg.height === 'number' && msg.height > 0) setHeight(Math.min(Math.max(msg.height, 80), 4000));
    if (msg.stage === 'script-error' || msg.stage === 'data-error') {
      setReason(msg.stage);
      setState((s) => (s === 'ready' ? s : 'failed'));
    }
    if (msg.rows && msg.rows > 0) setState('ready');
    else if (msg.done) setState((s) => (s === 'ready' || msg.changed ? 'ready' : 'failed'));
  }

  return (
    <>
      {state === 'loading' ? <View style={styles.note}><Text style={{ color: palette.muted }}>Loading from FA Full-Time…</Text></View> : null}
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://boosthuddle.app/' }}
        style={[styles.view, { height: state === 'ready' ? height : 1 }]}
        scrollEnabled={false}
        onMessage={onMessage}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith('https://boosthuddle.app/') || req.url.startsWith('about:') || req.isTopFrame === false) return true;
          Linking.openURL(req.url);
          return false;
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  view: { width: '100%', backgroundColor: 'transparent' },
  note: { padding: 16 },
});
