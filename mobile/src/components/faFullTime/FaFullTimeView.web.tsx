import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { FA_HOME, frameDocument, isSnippetCode, parseFrameMessage, type FramePalette } from './frame';

interface Props {
  code?: string;
  palette: FramePalette;
  highlight?: string;
}

/** Web (PWA): the FA snippet in a sandboxed iframe that can't read the app's storage. */
export default function FaFullTimeView({ code, palette, highlight = '' }: Props) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(200);
  const [failed, setFailed] = useState(false);
  const doc = useMemo(() => (isSnippetCode(code) ? frameDocument(code, palette, highlight) : ''), [code, palette, highlight]);

  useEffect(() => {
    let ready = false;
    function onMessage(event: MessageEvent) {
      if (event.source !== ref.current?.contentWindow) return;
      const msg = parseFrameMessage(event.data);
      if (!msg) return;
      if (typeof msg.height === 'number') setHeight(Math.min(Math.max(msg.height, 80), 4000));
      if (msg.rows && msg.rows > 0) ready = true;
      if (msg.done && !ready && !msg.changed) setFailed(true);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [doc]);

  if (!doc) return null;
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
  return React.createElement('iframe', {
    ref,
    title: 'FA Full-Time',
    srcDoc: doc,
    sandbox: 'allow-scripts allow-popups allow-popups-to-escape-sandbox',
    style: { width: '100%', height, border: 0, display: 'block' },
  });
}

const styles = StyleSheet.create({
  failed: { padding: 16 },
});
