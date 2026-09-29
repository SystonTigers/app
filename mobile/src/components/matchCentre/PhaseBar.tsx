import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FONTS } from '../../theme/brandFonts';
import { PHASE_STEPS, phasesDone, type PhaseStep } from './phase';

/**
 * Kick off → Half time → 2nd half KO → Full time, with the next step as one
 * big button (hidden before kick-off, where each fixture has its own button).
 */
export default function PhaseBar({ next, color, disabled, onPress, onEndEarly }: {
  next: PhaseStep | null; color: string; disabled?: boolean; onPress?: (step: PhaseStep) => void; onEndEarly?: () => void;
}) {
  const done = phasesDone(next);
  const nextStep = PHASE_STEPS.find((s) => s.id === next);
  return (
    <View style={styles.wrap}>
      <View style={styles.steps} accessibilityRole="progressbar" accessibilityLabel={`Match: ${done} of 4 steps done`}>
        {PHASE_STEPS.map((s, i) => {
          const isDone = i < done;
          const isNext = s.id === next;
          return (
            <React.Fragment key={s.id}>
              {i > 0 ? <View style={[styles.line, { backgroundColor: i <= done ? color : 'rgba(255,255,255,0.14)' }]} /> : null}
              <View style={styles.step}>
                <View style={[styles.dot, isDone ? { backgroundColor: color, borderColor: color } : isNext ? { borderColor: color } : null]}>
                  {isDone ? <MaterialCommunityIcons name="check" size={13} color="#06080B" /> : isNext ? <View style={[styles.inner, { backgroundColor: color }]} /> : null}
                </View>
                <Text style={[styles.stepText, isDone || isNext ? styles.stepTextOn : null, isNext ? { color } : null]} numberOfLines={1}>{s.short}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
      {nextStep && next !== 'kick_off' && onPress ? (
        <Pressable
          onPress={() => onPress(nextStep.id)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={nextStep.button}
          style={({ pressed }) => [styles.button, next === 'full_time' ? styles.buttonEnd : { backgroundColor: color }, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}
        >
          <MaterialCommunityIcons name={next === 'full_time' ? 'flag-checkered' : 'whistle'} size={22} color={next === 'full_time' ? '#FFFFFF' : '#06080B'} />
          <Text style={[styles.buttonText, next === 'full_time' ? styles.buttonTextEnd : null]}>{nextStep.button}</Text>
        </Pressable>
      ) : null}
      {next === 'half_time' && onEndEarly ? (
        <Pressable onPress={onEndEarly} disabled={disabled} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.early}>No second half? End the match (full time)</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 14 },
  steps: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { alignItems: 'center', width: 64 },
  line: { flex: 1, height: 2, marginTop: 11, borderRadius: 1 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  inner: { width: 10, height: 10, borderRadius: 5 },
  stepText: { marginTop: 5, color: 'rgba(242,245,247,0.4)', fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 0.5 },
  stepTextOn: { color: '#F2F5F7' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16 },
  buttonEnd: { backgroundColor: '#E5334B' },
  buttonText: { color: '#06080B', fontFamily: FONTS.display, fontSize: 24, letterSpacing: 2 },
  buttonTextEnd: { color: '#FFFFFF' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.4 },
  early: { color: 'rgba(242,245,247,0.55)', textAlign: 'center', textDecorationLine: 'underline', fontSize: 13 },
});
