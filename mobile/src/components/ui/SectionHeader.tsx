// components/ui/SectionHeader.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../../theme/';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: fonts.fontSize.lg,
    fontFamily: fonts.fontFamily.regular,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sub: {
    color: colors.textTertiary,
    marginTop: 4,
    fontSize: fonts.fontSize.sm,
  },
});
