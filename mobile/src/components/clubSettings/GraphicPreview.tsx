import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, View } from 'react-native';
import { API_BASE_URL } from '../../config';
import { authStorage } from '../../services/authStorage';
import { getTenantId } from '../../services/club';
import { clubSettingsApi } from '../../services/clubSettingsApi';
import { themedStyles, useBrandColors } from '../../theme/brand';

type Source = { uri: string; headers?: Record<string, string> };

/**
 * One sample graphic drawn by the server with the club's own name, colours,
 * badge and sponsor. The preview needs the staff login, so the web app loads
 * it as a file and the phone app sends the login with the picture request.
 * `version` changes when the badge or sponsor does, so the picture redraws.
 */
export default function GraphicPreview({ pack, sample, label, version }: { pack: string; sample: string; label: string; version: string }) {
  const c = useBrandColors();
  const styles = useStyles();
  const [source, setSource] = useState<Source | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    let objectUrl: string | null = null;
    setSource(null);
    setFailed(false);
    (async () => {
      if (Platform.OS === 'web') {
        const blob = await clubSettingsApi.previewBlob(pack, sample, version);
        objectUrl = URL.createObjectURL(blob);
        if (live) setSource({ uri: objectUrl });
        return;
      }
      const token = await authStorage.getToken();
      const uri = `${API_BASE_URL}${clubSettingsApi.previewPath(pack, sample)}?v=${encodeURIComponent(version)}`;
      if (live) setSource({ uri, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'x-tenant': getTenantId() } });
    })().catch(() => live && setFailed(true));
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pack, sample, version]);

  return (
    <View style={styles.figure}>
      <View style={styles.frame}>
        {source && !failed ? (
          <Image source={source} style={styles.image} resizeMode="cover" onError={() => setFailed(true)} accessibilityLabel={`${label} graphic in this style`} />
        ) : failed ? (
          <Text style={styles.note}>No preview</Text>
        ) : (
          <ActivityIndicator color={c.primary} />
        )}
      </View>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  figure: { width: 128, marginRight: 10 },
  frame: { width: 128, height: 160, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  note: { color: c.textLight, fontSize: 12 },
  caption: { color: c.textLight, fontSize: 12, marginTop: 4 },
}));
