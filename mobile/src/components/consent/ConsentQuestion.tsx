import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { themedStyles } from '../../theme/brand';

/** "Photos: Yes / No" with the current answer highlighted. */
export default function ConsentQuestion({ label, value, busy, onAnswer }: { label: string; value: boolean | null; busy: boolean; onAnswer: (v: boolean) => void }) {
  const styles = useStyles();
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
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || selected}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      style={[styles.choice, selected ? (danger ? styles.no : styles.yes) : null]}
    >
      <Text style={[styles.choiceText, selected ? (danger ? styles.noText : styles.yesText) : null]}>{text}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((COLORS) => ({
  question: { gap: 6 },
  label: { color: COLORS.textLight, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceRaised, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  yes: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  no: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  choiceText: { color: COLORS.text, fontWeight: '800' },
  yesText: { color: COLORS.onPrimary },
  noText: { color: '#FFFFFF' },
  notAsked: { color: COLORS.warning, fontSize: 12, fontWeight: '700' },
}));
