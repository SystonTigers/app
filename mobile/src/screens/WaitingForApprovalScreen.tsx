import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { useAuth } from '../context/AuthContext';
import { useClubName } from '../context/ClubContext';
import LinkChildCard from '../components/consent/LinkChildCard';

const CHECK_EVERY_MS = 30_000;

/**
 * A new account the club's coaches haven't let in yet. Fixtures, training,
 * grounds and times stay hidden until they do (the server refuses with
 * WAITING_FOR_APPROVAL). A code from the coach for their child lets a parent
 * straight in. We check again every 30 seconds and when the app comes back.
 */
export default function WaitingForApprovalScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const clubName = useClubName();
  const { user, checkMembership, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');
  const busy = useRef(false);

  const check = useCallback(async (byHand: boolean) => {
    if (busy.current) return;
    busy.current = true;
    if (byHand) { setChecking(true); setNote(''); }
    try {
      const inNow = await checkMembership();
      if (!inNow && byHand) setNote("Not yet. We'll let you know as soon as they do.");
    } catch {
      if (byHand) setNote("We couldn't check just now. Check your signal and try again.");
    } finally {
      busy.current = false;
      if (byHand) setChecking(false);
    }
  }, [checkMembership]);

  useEffect(() => {
    const timer = setInterval(() => check(false), CHECK_EVERY_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(false); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [check]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="shield-account-outline" size={44} color={c.primary} />
          <Text style={styles.title} accessibilityRole="header">NEARLY THERE{user?.firstName ? `, ${user.firstName.toUpperCase()}` : ''}</Text>
          <Text style={styles.body}>
            {clubName}&apos;s coaches need to let you in before you can see fixtures, training and match details. It keeps our players safe.
          </Text>
          <Text style={styles.body}>We&apos;ve told them you&apos;re waiting. You&apos;ll get in as soon as one of them says yes.</Text>
          <Button mode="contained" icon="refresh" onPress={() => check(true)} loading={checking} disabled={checking}>Check again</Button>
          {note ? <Text style={styles.note} accessibilityRole="alert">{note}</Text> : null}
        </View>

        <LinkChildCard prominent onLinked={() => undefined} />

        <Button mode="text" onPress={() => logout().catch(() => undefined)}>Log out</Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, gap: 16, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 18, gap: 12, alignItems: 'flex-start' },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 28, letterSpacing: 1 },
  body: { color: c.text, lineHeight: 21 },
  note: { color: c.textLight },
}));
