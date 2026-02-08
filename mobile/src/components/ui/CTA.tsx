// components/ui/CTA.tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radii, shadow, spacing, fonts } from '../../theme/';

interface CTAProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function CTA({ label, onPress, variant = 'primary', disabled = false }: CTAProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.text, variant === 'secondary' && styles.textSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '700',
    fontSize: fonts.fontSize.base,
    color: '#111',
  },
  textSecondary: {
    color: colors.text,
  },
});
