import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button, Modal, Portal } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, cutoutsApi } from '../../services/api';
import CutoutPreview from './CutoutPreview';
import { looksLikeCutout, NOT_A_CUTOUT, type CutoutMakerProps } from './types';

type Stage = 'pick' | 'working' | 'preview';

/**
 * Web app, staff: give a player a cut-out for the goal graphics. Pick any
 * photo and the background is removed on this device (services/cutout.web.ts),
 * or pick a PNG that's already cut out. Check it, then save.
 */
export default function CutoutMaker({ player, onClose, onSaved }: CutoutMakerProps) {
  const c = useBrandColors();
  const styles = useStyles();
  const [stage, setStage] = useState<Stage>('pick');
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const urlRef = useRef<string | null>(null);

  const setPreview = (next: { blob: Blob; url: string } | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next?.url ?? null;
    setResult(next);
  };

  // Start fresh each time it opens; tidy up the preview when it closes
  useEffect(() => {
    setStage('pick'); setError(''); setSaving(false); setPreview(null);
  }, [player?.playerId]);
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const pick = (accept: string, then: (file: File) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) then(file);
    };
    input.click();
  };

  const fromPhoto = () => pick('image/*', async (file) => {
    setError(''); setStage('working');
    try {
      // Only loaded when making a cut-out, so the app stays quick to open
      const { makeCutout } = await import('../../services/cutout.web');
      const made = await makeCutout(file);
      setPreview({ blob: made.blob, url: made.url });
      setStage('preview');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "We couldn't remove the background. Try another photo.");
      setStage('pick');
    }
  });

  const readyMade = () => pick('image/png', async (file) => {
    setError('');
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    if (!looksLikeCutout(head)) { setError(NOT_A_CUTOUT); return; }
    if (file.size > 4 * 1024 * 1024) { setError('That picture is too big (4 MB at most).'); return; }
    setPreview({ blob: file, url: URL.createObjectURL(file) });
    setStage('preview');
  });

  const save = async () => {
    if (!player || !result) return;
    setSaving(true); setError('');
    try {
      const url = await cutoutsApi.save(player.playerId, result.blob);
      onSaved(player.playerId, url);
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Check your signal and try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={!!player} onDismiss={saving ? undefined : onClose} contentContainerStyle={styles.modal}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title} accessibilityRole="header">CUT-OUT: {player?.name.toUpperCase()}</Text>

          {stage === 'pick' ? (
            <>
              <Text style={styles.body}>Choose a photo of {player?.name.split(' ')[0] ?? 'them'} and we&apos;ll take the background out on this phone. Nothing is sent until you save it.</Text>
              <View style={styles.tips}>
                <Text style={styles.tip}>• On their own, in the club kit</Text>
                <Text style={styles.tip}>• Head to at least the waist, not cut off at the top</Text>
                <Text style={styles.tip}>• A plain, uncluttered background works best</Text>
              </View>
              {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
              <Button mode="contained" icon="image-plus" onPress={fromPhoto} style={styles.wide}>Choose a photo</Button>
              <Button mode="text" icon="file-png-box" onPress={readyMade} style={styles.wide}>Use a cut-out I already have (PNG)</Button>
            </>
          ) : null}

          {stage === 'working' ? (
            <View style={styles.working} accessibilityLiveRegion="polite">
              <ActivityIndicator color={c.primary} size="large" />
              <Text style={styles.body}>Taking the background out…</Text>
              <Text style={styles.meta}>The first one takes a little longer while the app downloads what it needs.</Text>
            </View>
          ) : null}

          {stage === 'preview' && result ? (
            <>
              <CutoutPreview uri={result.url} height={340} label={`${player?.name ?? 'Player'} cut out`} />
              <Text style={styles.meta}>This is how they&apos;ll stand in your graphics. If bits of the background are left, or part of them is missing, try another photo.</Text>
              {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
              <View style={styles.actions}>
                <Button mode="text" onPress={() => { setPreview(null); setStage('pick'); }} disabled={saving}>Try another photo</Button>
                <Button mode="contained" icon="check" onPress={save} loading={saving} disabled={saving}>Save cut-out</Button>
              </View>
            </>
          ) : null}

          {stage !== 'working' ? <Button mode="text" onPress={onClose} disabled={saving} style={styles.close}>Close</Button> : null}
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, margin: 12, borderRadius: 18, borderWidth: 1, borderColor: c.border, maxHeight: '92%', maxWidth: 520, width: '94%', alignSelf: 'center' },
  content: { padding: 16, gap: 12 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 22, letterSpacing: 1 },
  body: { color: c.text, lineHeight: 21 },
  meta: { color: c.textLight, fontSize: 13, lineHeight: 18 },
  tips: { gap: 4, backgroundColor: c.surfaceRaised, borderRadius: 12, padding: 12 },
  tip: { color: c.text, lineHeight: 20 },
  error: { color: c.error, fontWeight: '700', lineHeight: 20 },
  working: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  wide: { alignSelf: 'stretch' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
  close: { alignSelf: 'center' },
}));
