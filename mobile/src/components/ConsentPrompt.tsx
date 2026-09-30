import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { consentApi } from '../services/api';
import { awaitingAnswer, nameList } from '../utils/consent';
import { pendingInvite } from '../services/inviteLink';
import { useAuth } from '../context/AuthContext';

/**
 * Home screen, parents: asks them to link their account to their child (when
 * they have an invite code or aren't linked yet), then for photo and video
 * consent until they've answered. Hidden for staff and once answered.
 */
export default function ConsentPrompt({ onOpen }: { onOpen: () => void }) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const { user } = useAuth();
  const [waiting, setWaiting] = useState<string[]>([]);
  const [needsLink, setNeedsLink] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([consentApi.get(), pendingInvite()])
      .then(([res, code]) => {
        if (cancelled || res.data.canEditAll) return;
        setWaiting(awaitingAnswer(res.data.players));
        setNeedsLink(!!code || (user?.role === 'parent' && !res.data.players.length));
      })
      .catch(() => undefined); // Optional: never blocks the home screen
    return () => { cancelled = true; };
  }, [user?.role]);

  if (needsLink) {
    return (
      <Pressable onPress={onOpen} accessibilityRole="button" style={styles.card}>
        <MaterialCommunityIcons name="account-child" size={28} color={COLORS.primary} />
        <View style={styles.text}>
          <Text style={styles.title}>Link your child</Text>
          <Text style={styles.body}>Enter the code from the manager to see your child's details and answer photo and video consent.</Text>
          <Text style={styles.link}>Link now →</Text>
        </View>
      </Pressable>
    );
  }
  if (!waiting.length) return null;
  const names = nameList(waiting.map((n) => n.split(' ')[0]));
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" style={styles.card}>
      <MaterialCommunityIcons name="camera-lock" size={28} color={COLORS.primary} />
      <View style={styles.text}>
        <Text style={styles.title}>Photo & video consent</Text>
        <Text style={styles.body}>Can the club use {names}'s photo and video on social media and match highlights? It takes a few seconds.</Text>
        <Text style={styles.link}>Answer now →</Text>
      </View>
    </Pressable>
  );
}

const useStyles = themedStyles((COLORS) => ({
  card: { flexDirection: 'row', gap: 12, marginTop: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  text: { flex: 1, gap: 4 },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 15 },
  body: { color: COLORS.textLight },
  link: { color: COLORS.primary, fontWeight: '800', marginTop: 4 },
}));
