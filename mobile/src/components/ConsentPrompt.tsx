import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config';
import { consentApi } from '../services/api';
import { awaitingAnswer, nameList } from '../utils/consent';

/**
 * Home screen, parents: asks for photo and video consent until they've
 * answered for each of their children. Hidden for staff and once answered.
 */
export default function ConsentPrompt({ onOpen }: { onOpen: () => void }) {
  const [waiting, setWaiting] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    consentApi.get()
      .then((res) => {
        if (!cancelled && !res.data.canEditAll) setWaiting(awaitingAnswer(res.data.players));
      })
      .catch(() => undefined); // Optional: never blocks the home screen
    return () => { cancelled = true; };
  }, []);

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

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: '#14181C' },
  text: { flex: 1, gap: 4 },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 15 },
  body: { color: COLORS.textLight },
  link: { color: COLORS.primary, fontWeight: '800', marginTop: 4 },
});
