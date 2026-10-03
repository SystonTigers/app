import React, { useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { Button, IconButton, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { apiErrorMessage } from '../../services/api';
import { addLink, removeLink } from '../../services/drillsStore';
import { looksLikeVideoLink, PLATFORM_ICONS, PLATFORM_LABELS, type DrillLink } from '../../utils/drills';

/**
 * Videos for a drill: links to TikTok, Instagram or YouTube (the videos stay
 * on those sites and open there). Staff paste a link to add one.
 */
export default function DrillVideos({ drillRef, links, staff, onMessage }: {
  drillRef: string; links: DrillLink[]; staff: boolean; onMessage: (text: string) => void;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const add = async () => {
    const text = url.trim();
    if (!looksLikeVideoLink(text)) return setError('Paste a TikTok, Instagram or YouTube video link. In the app, tap Share → Copy link.');
    setAdding(true);
    setError('');
    try {
      await addLink(drillRef, text);
      setUrl('');
      onMessage('Video added.');
    } catch (err) {
      setError(apiErrorMessage(err, "The video didn't save. Please try again."));
    } finally {
      setAdding(false);
    }
  };

  const remove = async (link: DrillLink) => {
    try {
      await removeLink(link);
      onMessage('Video removed.');
    } catch (err) {
      onMessage(apiErrorMessage(err, "The video wasn't removed. Please try again."));
    }
  };

  if (!links.length && !staff) return null;
  return (
    <View testID="drill-videos">
      {links.map((link) => (
        <Pressable
          key={link.id}
          onPress={() => Linking.openURL(link.url).catch(() => onMessage("That video couldn't open."))}
          accessibilityRole="link"
          accessibilityLabel={`Watch on ${PLATFORM_LABELS[link.platform]}${link.title ? `: ${link.title}` : ''}`}
          style={({ pressed }) => [styles.link, pressed ? { opacity: 0.85 } : null]}
        >
          {link.thumbnailUrl ? (
            <Image source={{ uri: link.thumbnailUrl }} style={styles.thumb} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : (
            <View style={[styles.thumb, styles.noThumb]}>
              <MaterialCommunityIcons name={PLATFORM_ICONS[link.platform] as never} size={30} color={c.primary} />
            </View>
          )}
          <View style={styles.linkText}>
            <Text style={styles.platform}>{PLATFORM_LABELS[link.platform].toUpperCase()}{link.author ? ` · ${link.author}` : ''}</Text>
            <Text style={styles.title} numberOfLines={2}>{link.title || `Watch on ${PLATFORM_LABELS[link.platform]}`}</Text>
            <Text style={[styles.open, { color: c.primary }]}>Opens in {PLATFORM_LABELS[link.platform]}</Text>
          </View>
          {staff ? <IconButton icon="close" size={18} onPress={() => remove(link)} accessibilityLabel="Remove this video" /> : null}
        </Pressable>
      ))}
      {staff ? (
        <View style={styles.add}>
          <TextInput
            mode="outlined"
            dense
            label="Add a TikTok, Instagram or YouTube link"
            accessibilityLabel="Video link"
            value={url}
            onChangeText={(t) => { setUrl(t); setError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
            onSubmitEditing={add}
          />
          <Button mode="contained-tonal" onPress={add} loading={adding} disabled={adding || !url.trim()}>Add</Button>
        </View>
      ) : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, marginBottom: 8, borderRadius: 14, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border },
  thumb: { width: 64, height: 86, borderRadius: 10, backgroundColor: c.background },
  noThumb: { alignItems: 'center', justifyContent: 'center' },
  linkText: { flex: 1, minWidth: 0 },
  platform: { color: c.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  title: { color: c.text, fontSize: 14, fontWeight: '600', marginTop: 2 },
  open: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  input: { flex: 1 },
  error: { color: c.error, marginTop: 6, fontSize: 13 },
}));
