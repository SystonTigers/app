import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { FA_HOME, FAILURES, frameDocument, isSnippetCode, parseFrameMessage, type FrameMessage, type FrameOptions, type FramePalette } from './frame';

interface Props {
  code?: string;
  palette: FramePalette;
  highlight?: string;
  /** Team taps and filtering (frame.ts) */
  options?: FrameOptions;
  /** Every message from the frame (team taps, our row, a team's matches) */
  onMessage?: (msg: FrameMessage) => void;
  /** Load it out of sight, only for its data: no loading or failure notes */
  hidden?: boolean;
}

/** Web (PWA): the FA snippet in a sandboxed iframe that can't read the app's storage. */
export default function FaFullTimeView({ code, palette, highlight = '', options, onMessage, hidden = false }: Props) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reason, setReason] = useState('timeout');
  const filter = options?.filter ?? '';
  const taps = options?.teamTaps ?? false;
  const doc = useMemo(() => (isSnippetCode(code) ? frameDocument(code, palette, highlight, { filter, teamTaps: taps }) : ''), [code, palette, highlight, filter, taps]);
  const listener = useRef(onMessage);
  listener.current = onMessage;

  useEffect(() => {
    setState('loading');
    function onMessage(event: MessageEvent) {
      if (event.source !== ref.current?.contentWindow) return;
      const msg = parseFrameMessage(event.data);
      if (!msg) return;
      listener.current?.(msg);
      if (typeof msg.height === 'number' && msg.height > 0) setHeight(Math.min(Math.max(msg.height, 80), 4000));
      if (msg.stage === 'script-error' || msg.stage === 'data-error') {
        setReason(msg.stage);
        setState((s) => (s === 'ready' ? s : 'failed'));
      }
      if (msg.rows && msg.rows > 0) setState('ready');
      else if (msg.done) setState((s) => (s === 'ready' || msg.changed ? 'ready' : 'failed'));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [doc]);

  if (!doc) return null;
  if (hidden) {
    return React.createElement('iframe', {
      ref, title: 'FA Full-Time', srcDoc: doc, 'aria-hidden': true, tabIndex: -1,
      sandbox: 'allow-scripts',
      style: { position: 'absolute', width: 360, height: 1, opacity: 0, border: 0, pointerEvents: 'none' },
    });
  }
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
  return (
    <>
      {state === 'loading' ? <View style={styles.note}><Text style={{ color: palette.muted }}>Loading from FA Full-Time…</Text></View> : null}
      {React.createElement('iframe', {
        ref,
        title: 'FA Full-Time',
        srcDoc: doc,
        sandbox: 'allow-scripts allow-popups allow-popups-to-escape-sandbox',
        style: { width: '100%', height: state === 'ready' ? height : 0, border: 0, display: 'block' },
      })}
    </>
  );
}

const styles = StyleSheet.create({
  note: { padding: 16 },
});
