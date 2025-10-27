// components/ui/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../../theme/';

interface CardProps {
  children: React.ReactNode;
  inset?: boolean;
  style?: ViewStyle;
}

export default function Card({ children, inset = false, style }: CardProps) {
  return <View style={[styles.card, inset && styles.inset, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inset: {
    padding: 16,
  },
});
