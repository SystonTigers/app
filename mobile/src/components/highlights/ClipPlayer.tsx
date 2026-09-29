import React, { useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { clipEmbedUrl, readPlayerMessage } from '../../utils/highlights';

interface Props {
  videoId: string;
  clip: { start: number; end: number } | null;
  onEnded?: () => void;
  onTime?: (seconds: number) => void;
}

/**
 * iOS/Android: one clip of the match's YouTube video in a web view. The page
 * passes YouTube's player messages (clip ended, current time) back to the app.
 */
export default function ClipPlayer({ videoId, clip, onEnded, onTime }: Props) {
  const html = useMemo(() => {
    const src = clipEmbedUrl(videoId, clip, 'https://boosthuddle.app').replace(/"/g, '&quot;');
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin">`
      + `<style>html,body{margin:0;height:100%;background:#000}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head>`
      + `<body><iframe id="p" src="${src}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
      + `<script>var f=document.getElementById('p');function hi(){f.contentWindow.postMessage(JSON.stringify({event:'listening',id:1,channel:'widget'}),'*');}`
      + `f.addEventListener('load',function(){hi();setTimeout(hi,1000);});`
      + `window.addEventListener('message',function(e){if(e.source===f.contentWindow&&window.ReactNativeWebView)window.ReactNativeWebView.postMessage(typeof e.data==='string'?e.data:JSON.stringify(e.data));});</script>`
      + `</body></html>`;
  }, [videoId, clip?.start, clip?.end]);

  const onMessage = (event: WebViewMessageEvent) => {
    const msg = readPlayerMessage(event.nativeEvent.data);
    if (!msg) return;
    if (msg.currentTime !== undefined) onTime?.(msg.currentTime);
    if (msg.ended) onEnded?.();
  };

  return (
    <View style={styles.frame}>
      <WebView
        key={html}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://boosthuddle.app/' }}
        style={styles.video}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith('https://boosthuddle.app/') || req.url.startsWith('about:') || req.isTopFrame === false) return true;
          Linking.openURL(req.url);
          return false;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
  video: { flex: 1, backgroundColor: '#000' },
});
