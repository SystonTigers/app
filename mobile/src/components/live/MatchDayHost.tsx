import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../config';
import { useClubName } from '../../context/ClubContext';
import { useMatchDay } from '../../context/MatchDayContext';
import { askLocation, currentPosition, locationPermission, type LocationPermission } from '../../services/location';
import { pushPermission, registerForPush, type PushPermission } from '../../services/push';
import { listenForNotificationTaps } from '../../services/notificationTaps';
import { openScreen } from '../../navigation/navigationRef';
import { atVenueFrom, fixtureTitle, fixtureToCheck, popupFixture } from '../../utils/matchDay';
import LiveStreamPlayer from './LiveStreamPlayer';

const DISMISSED_KEY = '@matchday_dismissed_streams';
const PROMPT_KEY = '@matchday_prompt_dismissed';
const RECHECK_MS = 5 * 60_000;
/** Screens a notification tap may open */
const OPENABLE = ['LiveMatch', 'MOTMVoting', 'MediaConsent'];

/**
 * Runs in the background of the signed-in app on match days:
 * - pops up the live video when the match starts streaming,
 * - checks (on the phone) whether you're at the ground, so alerts stay quiet there,
 * - asks once per match day to turn on alerts / location,
 * - opens Live Match when a match alert is tapped.
 */
export default function MatchDayHost() {
  const clubName = useClubName();
  const { day, setAttendance } = useMatchDay();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [promptDismissedFor, setPromptDismissedFor] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<LocationPermission>('undetermined');
  const [pushState, setPushState] = useState<PushPermission>('granted');
  const [message, setMessage] = useState('');
  const checking = useRef(false);

  useEffect(() => listenForNotificationTaps((screen) => openScreen(OPENABLE.includes(screen) ? screen : 'LiveMatch')), []);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((v) => setDismissed(v ? (JSON.parse(v) as string[]) : [])).catch(() => undefined);
    AsyncStorage.getItem(PROMPT_KEY).then(setPromptDismissedFor).catch(() => undefined);
    locationPermission().then(setLocationState);
    pushPermission().then(setPushState).catch(() => undefined);
  }, []);

  // At the ground or not: worked out here, only yes/no is sent
  const checkLocation = useCallback(async () => {
    const fixture = fixtureToCheck(day, Date.now());
    if (!fixture || !day || checking.current) return;
    checking.current = true;
    try {
      const position = await currentPosition();
      const atVenue = position ? atVenueFrom(position, fixture.venueLocation, day.radiusMeters) : null;
      if (atVenue !== null && atVenue !== fixture.attendance?.atVenue) await setAttendance(fixture.id, atVenue, 'location');
    } catch {
      // Try again on the next check
    } finally {
      checking.current = false;
    }
  }, [day, setAttendance]);

  useEffect(() => {
    if (locationState !== 'granted') return;
    checkLocation();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') checkLocation();
    }, RECHECK_MS);
    return () => clearInterval(timer);
  }, [locationState, checkLocation]);

  const closeVideo = async (videoId: string) => {
    const next = [videoId, ...dismissed].slice(0, 20);
    setDismissed(next);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const today = day?.fixtures[0]?.date ?? null;
  const promptFixture = day?.fixtures.find((f) => f.matchStatus !== 'full_time') ?? null;
  const wantsLocation = locationState === 'undetermined' && !!fixtureToCheck(day, Date.now());
  const wantsAlerts = pushState === 'undetermined' || pushState === 'needs-install';
  const showPrompt = !!promptFixture && !!today && promptDismissedFor !== today && (wantsLocation || wantsAlerts);

  const closePrompt = async () => {
    setPromptDismissedFor(today);
    if (today) await AsyncStorage.setItem(PROMPT_KEY, today).catch(() => undefined);
  };

  const turnOnAlerts = async () => {
    const result = await registerForPush({ prompt: true });
    setPushState(await pushPermission().catch(() => pushState));
    setMessage(result.ok ? '' : result.message);
  };

  const useLocation = async () => {
    const granted = await askLocation();
    setLocationState(granted ? 'granted' : 'denied');
  };

  const live = popupFixture(day, dismissed);
  return (
    <Portal>
      <Modal visible={!!live} onDismiss={() => live?.stream && closeVideo(live.stream.videoId)} contentContainerStyle={styles.sheet}>
        {live?.stream ? (
          <>
            <View style={styles.headerRow}>
              <Text style={styles.liveTag}>● LIVE NOW</Text>
              <Pressable onPress={() => closeVideo(live.stream!.videoId)} accessibilityRole="button" accessibilityLabel="Close video" hitSlop={12}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>
            <Text style={styles.title}>{fixtureTitle(live, clubName)}</Text>
            <LiveStreamPlayer stream={live.stream} />
            <Pressable
              onPress={() => { closeVideo(live.stream!.videoId); openScreen('LiveMatch'); }}
              accessibilityRole="button"
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Watch with the live score</Text>
            </Pressable>
          </>
        ) : null}
      </Modal>

      {showPrompt && !live && promptFixture ? (
        <View style={styles.prompt} accessibilityRole="alert">
          <Text style={styles.promptTitle}>Match day: {fixtureTitle(promptFixture, clubName)}{promptFixture.time ? `, ${promptFixture.time}` : ''}</Text>
          <Text style={styles.promptText}>
            Can't make it? Get goals and the score on your phone. At the ground? Alerts stay quiet. Your location never leaves your phone.
          </Text>
          {message ? <Text style={styles.promptError}>{message}</Text> : null}
          <View style={styles.promptButtons}>
            {wantsAlerts ? (
              <Pressable onPress={turnOnAlerts} accessibilityRole="button" style={styles.smallPrimary}>
                <Text style={styles.primaryText}>Turn on alerts</Text>
              </Pressable>
            ) : null}
            {wantsLocation ? (
              <Pressable onPress={useLocation} accessibilityRole="button" style={styles.smallSecondary}>
                <Text style={styles.secondaryText}>Use my location</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={closePrompt} accessibilityRole="button" style={styles.smallSecondary}>
              <Text style={styles.secondaryText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: { margin: 12, padding: 16, borderRadius: 16, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.primary, maxWidth: 720, alignSelf: 'center', width: '94%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  liveTag: { color: '#FF3B3B', fontWeight: '900', letterSpacing: 1, fontSize: 13 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase', marginBottom: 12 },
  primary: { marginTop: 14, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: COLORS.background, fontWeight: '800' },
  prompt: { position: 'absolute', left: 12, right: 12, bottom: 24, padding: 16, borderRadius: 14, backgroundColor: '#15191D', borderWidth: 1, borderColor: COLORS.primary },
  promptTitle: { color: COLORS.text, fontWeight: '900', fontSize: 15, marginBottom: 6 },
  promptText: { color: COLORS.textLight, fontSize: 14, lineHeight: 20 },
  promptError: { color: COLORS.warning, marginTop: 8 },
  promptButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallPrimary: { backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  smallSecondary: { borderWidth: 1, borderColor: COLORS.textLight, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  secondaryText: { color: COLORS.text, fontWeight: '700' },
});
