import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { clipEmbedUrl, readPlayerMessage } from '../../utils/highlights';

interface Props {
  videoId: string;
  /** Play just this part of the video; null plays the whole video */
  clip: { start: number; end: number } | null;
  onEnded?: () => void;
  /** Where the video is up to, a few times a second while playing */
  onTime?: (seconds: number) => void;
}

/**
 * Web (PWA): one clip of the match's YouTube video. A new clip reloads the
 * player; YouTube's own messages tell us when it ends and where it's up to.
 */
export default function ClipPlayer({ videoId, clip, onEnded, onTime }: Props) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const handlers = useRef({ onEnded, onTime });
  handlers.current = { onEnded, onTime };
  const src = clipEmbedUrl(videoId, clip, typeof window !== 'undefined' ? window.location.origin : undefined);

  useEffect(() => {
    let ended = false;
    function onMessage(event: MessageEvent) {
      if (event.source !== ref.current?.contentWindow) return;
      const msg = readPlayerMessage(event.data);
      if (!msg) return;
      if (msg.currentTime !== undefined) handlers.current.onTime?.(msg.currentTime);
      if (msg.ended && !ended) {
        ended = true;
        handlers.current.onEnded?.();
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [src]);

  // Ask the player to send us its state (the YouTube iframe API handshake)
  const listen = () => {
    const win = ref.current?.contentWindow;
    if (!win) return;
    const hello = JSON.stringify({ event: 'listening', id: 1, channel: 'widget' });
    win.postMessage(hello, 'https://www.youtube-nocookie.com');
    setTimeout(() => win.postMessage(hello, 'https://www.youtube-nocookie.com'), 1000);
  };

  return (
    <View style={styles.frame}>
      {React.createElement('iframe', {
        key: src,
        ref,
        title: 'Match highlights',
        src,
        onLoad: listen,
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        allowFullScreen: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        style: { width: '100%', height: '100%', border: 0, display: 'block' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
});
