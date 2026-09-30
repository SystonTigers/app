// components/ui/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { themedStyles } from '../../theme/brand';

interface CardProps {
  children: React.ReactNode;
  inset?: boolean;
  style?: ViewStyle;
}

export default function Card({ children, inset = false, style }: CardProps) {
  const styles = useStyles();
  return <View style={[styles.card, inset && styles.inset, style]}>{children}</View>;
}

const useStyles = themedStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inset: {
    padding: 16,
  },
}));
