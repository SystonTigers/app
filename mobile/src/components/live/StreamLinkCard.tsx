import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { COLORS } from '../../config';
import { useTheme } from '../../theme/useTheme';
import { apiErrorMessage, matchDayApi } from '../../services/api';
import { askLocation, currentPosition } from '../../services/location';
import type { MatchDayFixture } from '../../utils/matchDay';

/** A reading must be at least this precise to say where the ground is. */
const GROUND_ACCURACY_M = 100;

/**
 * Match Centre (staff): the match's live video and where the ground is.
 * Paste the YouTube link from the camera's stream (Share → Copy link), unless
 * the club's YouTube channel is connected on the website, which finds it itself.
 */
export default function StreamLinkCard({ fixture, onChanged }: { fixture: MatchDayFixture; onChanged: () => void }) {
  const accent = useTheme().theme.colors.primary;
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async (work: () => Promise<string>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setMessage(await work());
      onChanged();
    } catch (err) {
      // Our own checks explain themselves; server errors carry the server's message
      const local = err instanceof Error && !(err as { response?: unknown }).response;
      setError(local ? (err as Error).message : apiErrorMessage(err, "That didn't work. Check your signal and try again."));
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(async () => {
    await matchDayApi.setStream(fixture.id, link.trim());
    setLink('');
    return "Video added. Everyone who isn't at the ground gets a 'Live now' alert.";
  });

  const remove = () => run(async () => {
    await matchDayApi.clearStream(fixture.id);
    return 'Video removed from the app.';
  });

  const groundHere = () => run(async () => {
    if (!(await askLocation())) throw new Error('Allow location for this app to set the ground.');
    const position = await currentPosition();
    if (!position) throw new Error("Couldn't get your location. Try again in a moment.");
    if ((position.accuracy ?? Infinity) > GROUND_ACCURACY_M) throw new Error("Your phone isn't sure enough where it is. Step into the open and try again.");
    await matchDayApi.setVenue(fixture.id, position.lat, position.lng);
    return 'Ground set. Parents here get no alerts; everyone else does.';
  });

  const stream = fixture.stream;
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Live video</Text>
      {stream ? (
        <View style={styles.row}>
          <Text style={[styles.status, { color: accent }]}>
            {stream.status === 'live' ? '● In the app now' : 'Stream ended (still watchable)'}{stream.source === 'youtube' ? ' · found on your YouTube channel' : ''}
          </Text>
          <Pressable onPress={remove} disabled={busy} accessibilityRole="button">
            <Text style={[styles.link, { color: accent }]}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.help}>Streaming from the camera? Paste the YouTube link here and it pops up for parents in the app.</Text>
      )}
      <View style={styles.inputRow}>
        <TextInput
          mode="outlined"
          dense
          value={link}
          onChangeText={setLink}
          placeholder="https://youtube.com/live/…"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel="YouTube link for this match"
        />
        <Pressable onPress={save} disabled={busy || !link.trim()} accessibilityRole="button" style={[styles.button, { backgroundColor: accent }, (busy || !link.trim()) && styles.disabled]}>
          <Text style={styles.buttonText}>{stream ? 'Change' : 'Add'}</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Text style={styles.help}>{fixture.venueLocation ? 'Ground location set.' : "Ground location not set, so everyone gets alerts."}</Text>
        <Pressable onPress={groundHere} disabled={busy} accessibilityRole="button">
          <Text style={[styles.link, { color: accent }]}>The ground is here</Text>
        </Pressable>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#12161B', borderRadius: 18, padding: 14, marginBottom: 16 },
  heading: { color: COLORS.text, fontWeight: '900', fontSize: 15, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  status: { color: COLORS.primary, fontWeight: '700', flex: 1 },
  help: { color: COLORS.textLight, fontSize: 13, flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  input: { flex: 1, backgroundColor: 'transparent' },
  button: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#06080B', fontWeight: '900' },
  link: { color: COLORS.primary, fontWeight: '700' },
  message: { color: COLORS.text, marginTop: 10 },
  error: { color: COLORS.error, marginTop: 10 },
});
