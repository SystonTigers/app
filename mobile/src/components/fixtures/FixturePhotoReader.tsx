import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, fixturePhotoApi, type PhotoFixture } from '../../services/api';
import { photoBlob } from '../../services/photoUpload';
import { formFromPhoto, type FixtureForm } from '../../utils/fixturePhoto';
import { matchDate } from '../../utils/highlights';

type Phase = 'idle' | 'reading' | 'results' | 'adding';

/**
 * Staff: take a photo of a fixture (or pick a screenshot) and it's read for
 * them. One fixture fills in the add-fixture form; a list of fixtures comes
 * back to tick and add in one go. Nothing is saved until they confirm.
 */
export default function FixturePhotoReader({ onFill, onAdded }: {
  /** One fixture found: fill in the form for checking */
  onFill: (form: FixtureForm) => void;
  /** Several fixtures were added */
  onAdded: (message: string) => void;
}) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [found, setFound] = useState<PhotoFixture[]>([]);
  const [ticked, setTicked] = useState<boolean[]>([]);

  const pick = async (camera: boolean) => {
    setError('');
    try {
      if (Platform.OS !== 'web') {
        const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setError(camera ? 'Allow the camera for this app to take a photo.' : 'Allow photos for this app to choose a picture.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setPhase('reading');
      const res = await fixturePhotoApi.read(await photoBlob(result.assets[0].uri));
      const list = res.data.fixtures;
      if (!list.length) {
        setPhase('idle');
        setError("We couldn't find a fixture in that picture. Try a clearer photo, or a screenshot of the fixture.");
        return;
      }
      if (list.length === 1 && list[0].us) {
        setPhase('idle');
        onFill(formFromPhoto(list[0], list[0].us));
        return;
      }
      setFound(list);
      setTicked(list.map((f) => f.us !== null && f.status !== 'cancelled'));
      setPhase('results');
    } catch (err) {
      setPhase('idle');
      setError(apiErrorMessage(err, "We couldn't read that picture. Check your signal and try again."));
    }
  };

  const chooseSide = (i: number, us: 'home' | 'away') => {
    setFound((list) => list.map((f, j) => (j === i ? { ...f, us, opponent: us === 'home' ? f.away : f.home } : f)));
    setTicked((t) => t.map((v, j) => (j === i ? true : v)));
  };

  const add = async () => {
    const chosen = found.filter((f, i) => ticked[i] && f.us);
    if (!chosen.length) return;
    // A single fixture goes into the form so it can be checked like any other
    if (chosen.length === 1) {
      onFill(formFromPhoto(chosen[0], chosen[0].us as 'home' | 'away'));
      reset();
      return;
    }
    setPhase('adding');
    setError('');
    try {
      const res = await fixturePhotoApi.apply(chosen);
      const { added, updated, unchanged } = res.data;
      const parts = [added ? `${added} added` : '', updated ? `${updated} updated` : '', unchanged ? `${unchanged} already there` : ''].filter(Boolean);
      reset();
      onAdded(parts.length ? `Fixtures from the photo: ${parts.join(', ')}.` : 'Those fixtures were already there.');
    } catch (err) {
      setPhase('results');
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    }
  };

  const reset = () => {
    setPhase('idle');
    setFound([]);
    setTicked([]);
  };

  const count = found.filter((f, i) => ticked[i] && f.us).length;

  return (
    <View style={styles.box}>
      <View style={styles.titleRow}>
        <MaterialCommunityIcons name="camera-document" size={20} color={COLORS.primary} />
        <Text style={styles.title}>Fill in from a photo</Text>
      </View>
      <Text style={styles.help}>
        Take a photo of a fixture or fixture list, or choose a screenshot (an FA email, Full-Time or a poster). We read it and fill in the details for you.
      </Text>
      <View style={styles.warning} accessibilityRole="text">
        <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.warning} />
        <Text style={styles.warningText}>
          Works best with a clear, straight-on photo in good light, or a screenshot. Blurry, dark or angled pictures may be read wrongly, so always check the details before saving.
        </Text>
      </View>

      {phase === 'reading' || phase === 'adding' ? (
        <View style={styles.busy}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.help}>{phase === 'reading' ? 'Reading the picture…' : 'Adding fixtures…'}</Text>
        </View>
      ) : phase === 'idle' ? (
        <View style={styles.buttons}>
          <Pressable onPress={() => pick(true)} accessibilityRole="button" style={styles.button}>
            <MaterialCommunityIcons name="camera" size={18} color={COLORS.onPrimary} />
            <Text style={styles.buttonText}>Take a photo</Text>
          </Pressable>
          <Pressable onPress={() => pick(false)} accessibilityRole="button" style={styles.ghost}>
            <MaterialCommunityIcons name="image-outline" size={18} color={COLORS.primary} />
            <Text style={styles.ghostText}>Choose a picture</Text>
          </Pressable>
        </View>
      ) : null}

      {phase === 'results' ? (
        <View style={styles.results}>
          <Text style={styles.help}>We found {found.length} fixtures. Untick any you don&apos;t want, then add them.</Text>
          {found.map((f, i) => (
            <View key={`${f.date}-${f.home}-${f.away}-${i}`} style={styles.row}>
              <Pressable
                onPress={() => f.us && setTicked((t) => t.map((v, j) => (j === i ? !v : v)))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!(ticked[i] && f.us), disabled: !f.us }}
                style={styles.rowMain}
              >
                <MaterialCommunityIcons
                  name={ticked[i] && f.us ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={f.us ? COLORS.primary : COLORS.textLight}
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{f.home} v {f.away}</Text>
                  <Text style={styles.rowSub}>
                    {matchDate(f.date)}{f.time ? ` · ${f.time}` : ''}{f.venue ? ` · ${f.venue}` : ''}{f.status !== 'scheduled' ? ` · ${f.status}` : ''}
                  </Text>
                </View>
              </Pressable>
              {!f.us ? (
                <View style={styles.sideRow}>
                  <Text style={styles.rowSub}>Which team are you?</Text>
                  <Pressable onPress={() => chooseSide(i, 'home')} accessibilityRole="button" style={styles.chip}><Text style={styles.chipText} numberOfLines={1}>{f.home}</Text></Pressable>
                  <Pressable onPress={() => chooseSide(i, 'away')} accessibilityRole="button" style={styles.chip}><Text style={styles.chipText} numberOfLines={1}>{f.away}</Text></Pressable>
                </View>
              ) : null}
            </View>
          ))}
          <View style={styles.buttons}>
            <Pressable onPress={reset} accessibilityRole="button" style={styles.ghost}><Text style={styles.ghostText}>Cancel</Text></Pressable>
            <Pressable onPress={add} disabled={!count} accessibilityRole="button" style={[styles.button, !count ? styles.disabled : null]}>
              <Text style={styles.buttonText}>{count === 1 ? 'Check and add' : `Add ${count} fixtures`}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
  box: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised, gap: 10, marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: COLORS.text, fontFamily: FONTS.display, fontSize: 18, letterSpacing: 1, textTransform: 'uppercase' },
  help: { color: COLORS.textLight, fontSize: 13, lineHeight: 18 },
  warning: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: 'rgba(245,158,11,0.10)', borderRadius: 12, padding: 10 },
  warningText: { flex: 1, color: COLORS.text, fontSize: 12, lineHeight: 17 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  buttonText: { color: COLORS.onPrimary, fontWeight: '900' },
  ghost: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  ghostText: { color: COLORS.primary, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  results: { gap: 8 },
  row: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, gap: 6 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1 },
  rowTitle: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
  rowSub: { color: COLORS.textLight, fontSize: 12 },
  sideRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginLeft: 32 },
  chip: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, maxWidth: 160 },
  chipText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  error: { color: COLORS.error },
}));
