import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, View } from 'react-native';
import { API_BASE_URL } from '../../config';
import { authStorage } from '../../services/authStorage';
import { getTenantId } from '../../services/club';
import { clubSettingsApi } from '../../services/clubSettingsApi';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { previewSlots } from '../../utils/previewQueue';

type Source = { uri: string; headers?: Record<string, string> };

// Web: drawn previews kept for the visit, so the full-size view and a reopened card don't redraw
const webCache = new Map<string, string>();

/**
 * Where to load one sample graphic from: drawn by the server with the club's
 * own name, colours, badge and sponsor. The preview needs the staff login, so
 * the web app fetches it as a file and the phone app sends the login with the
 * picture request. `version` changes when the badge or sponsor does, so the
 * picture redraws. Loads wait their turn (utils/previewQueue.ts) so a page of
 * styles doesn't ask the server to draw every graphic at once.
 */
export function usePreviewSource(pack: string, sample: string, version: string) {
  const key = `${pack}/${sample}/${version}`;
  const [source, setSource] = useState<Source | null>(() => (webCache.has(key) ? { uri: webCache.get(key) as string } : null));
  const [failed, setFailed] = useState(false);
  const release = useRef<(() => void) | null>(null);
  const done = () => { release.current?.(); release.current = null; };

  useEffect(() => {
    let live = true;
    setFailed(false);
    if (webCache.has(key)) { setSource({ uri: webCache.get(key) as string }); return; }
    setSource(null);
    (async () => {
      const free = await previewSlots.take();
      if (!live) { free(); return; }
      release.current = free;
      if (Platform.OS === 'web') {
        try {
          // A busy server can drop one: try once more before giving up
          const blob = await clubSettingsApi.previewBlob(pack, sample, version)
            .catch(() => new Promise<Blob>((resolve, reject) => setTimeout(() => clubSettingsApi.previewBlob(pack, sample, version).then(resolve, reject), 1500)));
          const url = URL.createObjectURL(blob);
          webCache.set(key, url);
          if (live) setSource({ uri: url });
        } finally {
          done();
        }
        return;
      }
      const token = await authStorage.getToken();
      const uri = `${API_BASE_URL}${clubSettingsApi.previewPath(pack, sample)}?v=${encodeURIComponent(version)}`;
      // The phone app's picture loader takes the slot back when the image loads or fails
      if (live) setSource({ uri, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'x-tenant': getTenantId() } });
      else done();
    })().catch(() => { done(); if (live) setFailed(true); });
    return () => { live = false; done(); };
  }, [key]);

  const retried = useRef(false);
  const onError = () => {
    done();
    if (!retried.current && source && Platform.OS !== 'web') {
      retried.current = true;
      setSource({ ...source, uri: `${source.uri}&retry=1` });
      return;
    }
    setFailed(true);
  };
  return { source, failed, onLoad: done, onError };
}

/** One sample graphic in a style. Tap it to see it full size. */
export default function GraphicPreview({ pack, sample, label, version, width = 150, onPress, spaced = true }: {
  pack: string; sample: string; label: string; version: string; width?: number; onPress?: () => void;
  /** A gap after it, for a row of previews */
  spaced?: boolean;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const { source, failed, onLoad, onError } = usePreviewSource(pack, sample, version);
  const height = Math.round(width * 1.25);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={`${label} graphic in this style${onPress ? '. Open it full size' : ''}`}
      style={({ pressed }) => [spaced ? styles.figure : null, { width }, pressed ? styles.pressed : null]}
    >
      <View style={[styles.frame, { width, height }]}>
        {source && !failed ? (
          <Image source={source} style={styles.image} resizeMode="cover" onLoad={onLoad} onError={onError} />
        ) : failed ? (
          <Text style={styles.note}>No preview</Text>
        ) : (
          <ActivityIndicator color={c.primary} />
        )}
      </View>
      <Text style={styles.caption} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((c) => ({
  figure: { marginRight: 10 },
  pressed: { opacity: 0.8 },
  frame: { borderRadius: 10, overflow: 'hidden', backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  note: { color: c.textLight, fontSize: 12 },
  caption: { color: c.textLight, fontSize: 12, marginTop: 4 },
}));
