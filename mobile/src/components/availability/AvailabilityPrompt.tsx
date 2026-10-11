import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { availabilityApi } from '../../services/api';
import { promptLine } from '../../utils/availability';
import { useIsAdultTeam } from '../../context/ClubContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Home screen, families: "Can Ava make v Anstey on Sat 11 Oct?" while any of
 * their children has something coming up they haven't answered. Hidden once
 * everything's answered, and never blocks the home screen if it can't load.
 */
export default function AvailabilityPrompt({ onOpen }: { onOpen: () => void }) {
  const c = useBrandColors();
  const styles = useStyles();
  const [line, setLine] = useState<string | null>(null);
  // Players (and everyone at an adult team) answer for themselves
  const { user } = useAuth();
  const self = useIsAdultTeam() || user?.role === 'player';

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    availabilityApi.overview()
      .then((res) => { if (!cancelled) setLine(promptLine(res.items, self)); })
      .catch(() => { if (!cancelled) setLine(null); });
    return () => { cancelled = true; };
  }, [self]));

  if (!line) return null;
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${line} Answer now`} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <MaterialCommunityIcons name="calendar-check" size={28} color={c.primary} />
      <View style={styles.text}>
        <Text style={styles.title}>{self ? 'Can you make it?' : 'Can they make it?'}</Text>
        <Text style={styles.body}>{line}</Text>
        <Text style={styles.link}>Answer now →</Text>
      </View>
    </Pressable>
  );
}

const useStyles = themedStyles((c) => ({
  card: { flexDirection: 'row', gap: 12, marginTop: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: c.primary, backgroundColor: c.surface },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 4 },
  title: { color: c.text, fontWeight: '900', fontSize: 15 },
  body: { color: c.textLight },
  link: { color: c.primary, fontWeight: '800', marginTop: 4 },
}));
