import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { ANSWERS, type Answer } from '../../utils/availability';

/**
 * Available / Maybe / Can't make it for one child. Tapping the chosen answer
 * again clears it. Big enough to hit on a cold touchline.
 */
export default function AnswerButtons({ value, onChange, name, disabled, compact }: {
  value: Answer | null;
  onChange: (next: Answer | null) => void;
  /** Whose answer this is, for screen readers */
  name: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const tint = (a: Answer) => (a === 'yes' ? c.success : a === 'no' ? c.error : c.warning);
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={`Can ${name} make it?`}>
      {ANSWERS.map((a) => {
        const on = value === a.value;
        return (
          <Pressable
            key={a.value}
            onPress={() => onChange(on ? null : a.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled }}
            accessibilityLabel={`${name}: ${a.label}`}
            style={({ pressed }) => [styles.button, compact ? styles.compact : null, on ? { backgroundColor: tint(a.value), borderColor: tint(a.value) } : null, pressed ? styles.pressed : null]}
          >
            <MaterialCommunityIcons name={a.icon as never} size={compact ? 16 : 18} color={on ? c.background : tint(a.value)} />
            <Text style={[styles.label, compact ? styles.labelCompact : null, on ? styles.labelOn : null]} numberOfLines={1}>{a.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  row: { flexDirection: 'row', gap: 6 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 44, paddingHorizontal: 6, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised },
  compact: { minHeight: 40 },
  pressed: { opacity: 0.8 },
  label: { color: c.text, fontWeight: '800', fontSize: 13 },
  labelCompact: { fontSize: 12 },
  labelOn: { color: c.background },
}));
