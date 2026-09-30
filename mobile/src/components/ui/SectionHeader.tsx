// components/ui/SectionHeader.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, spacing } from '../../theme/';
import { TEXT, TEXT_MUTED } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';

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
    color: TEXT,
    fontSize: 22,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sub: {
    color: TEXT_MUTED,
    marginTop: 4,
    fontSize: fonts.fontSize.sm,
  },
});
