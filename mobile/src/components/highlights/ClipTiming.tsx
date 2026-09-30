import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { themedStyles } from '../../theme/brand';
import { nudgeSide } from '../../utils/highlights';

interface Props {
  before: number;
  after: number;
  disabled?: boolean;
  /** Called once the manager stops tapping (so quick taps save once) */
  onChange: (next: { before: number; after: number }) => void;
}

const STEPS = [-5, -1, 1, 5];
const SAVE_AFTER_MS = 700;

/**
 * Staff: how long a clip runs before and after the moment was tapped.
 * Taps show straight away and save once the manager stops tapping.
 */
export default function ClipTiming({ before, after, disabled, onChange }: Props) {
  const styles = useStyles();
  const [value, setValue] = useState({ before, after });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);

  // The server's answer (or another clip's save) wins unless the manager is still tapping
  useEffect(() => {
    if (!pending.current) setValue({ before, after });
  }, [before, after]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const nudge = (side: 'before' | 'after', by: number) => {
    const next = nudgeSide(value[side], by);
    if (next === null) return;
    const updated = { ...value, [side]: next };
    setValue(updated);
    pending.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pending.current = false;
      onChange(updated);
    }, SAVE_AFTER_MS);
  };

  return (
    <View style={styles.box}>
      <Side label="Before the moment" seconds={value.before} disabled={disabled} onNudge={(by) => nudge('before', by)} />
      <Side label="After the moment" seconds={value.after} disabled={disabled} onNudge={(by) => nudge('after', by)} />
    </View>
  );
}

function Side({ label, seconds, disabled, onNudge }: { label: string; seconds: number; disabled?: boolean; onNudge: (by: number) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.side}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {STEPS.slice(0, 2).map((by) => <Step key={by} by={by} disabled={disabled} onPress={() => onNudge(by)} />)}
        <Text style={styles.seconds} accessibilityLabel={`${label}: ${seconds} seconds`}>{seconds}s</Text>
        {STEPS.slice(2).map((by) => <Step key={by} by={by} disabled={disabled} onPress={() => onNudge(by)} />)}
      </View>
    </View>
  );
}

function Step({ by, disabled, onPress }: { by: number; disabled?: boolean; onPress: () => void }) {
  const styles = useStyles();
  const text = by > 0 ? `+${by}` : String(by);
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${by > 0 ? 'Add' : 'Take off'} ${Math.abs(by)} seconds`} style={[styles.step, disabled ? styles.disabled : null]}>
      <Text style={styles.stepText}>{text}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((COLORS) => ({
  box: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  side: { flexGrow: 1, minWidth: 200, gap: 6 },
  label: { color: COLORS.textLight, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seconds: { color: COLORS.text, fontWeight: '900', fontSize: 16, minWidth: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
  step: { borderWidth: 1, borderColor: COLORS.textLight, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, minWidth: 40, alignItems: 'center' },
  stepText: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.5 },
}));
