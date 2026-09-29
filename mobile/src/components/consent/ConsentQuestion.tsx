import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../config';

/** "Photos: Yes / No" with the current answer highlighted. */
export default function ConsentQuestion({ label, value, busy, onAnswer }: { label: string; value: boolean | null; busy: boolean; onAnswer: (v: boolean) => void }) {
  return (
    <View style={styles.question}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        <Choice text="Yes" selected={value === true} onPress={() => onAnswer(true)} disabled={busy} />
        <Choice text="No" selected={value === false} onPress={() => onAnswer(false)} disabled={busy} danger />
      </View>
      {value === null ? <Text style={styles.notAsked}>Not answered yet</Text> : null}
    </View>
  );
}

function Choice({ text, selected, onPress, disabled, danger }: { text: string; selected: boolean; onPress: () => void; disabled: boolean; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || selected}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      style={[styles.choice, selected ? (danger ? styles.no : styles.yes) : null]}
    >
      <Text style={[styles.choiceText, selected ? styles.selectedText : null]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  question: { gap: 6 },
  label: { color: COLORS.textLight, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, borderWidth: 1, borderColor: COLORS.textLight, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  yes: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  no: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  choiceText: { color: COLORS.text, fontWeight: '800' },
  selectedText: { color: COLORS.background },
  notAsked: { color: '#F5C400', fontSize: 12, fontWeight: '700' },
});
