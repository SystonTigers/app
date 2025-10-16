// components/ui/Pills.tsx
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, radii, spacing, fonts } from '../../theme/';

interface PillsProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}

export function Pills({ items, value, onChange }: PillsProps) {
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          style={({ pressed }) => [
            styles.pill,
            value === item && styles.pillActive,
            pressed && styles.pillPressed,
          ]}
        >
          <Text style={[styles.text, value === item && styles.textActive]}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing(1),
    flexWrap: 'wrap',
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.xl,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.brand.yellow,
    borderColor: colors.brand.yellow,
  },
  pillPressed: {
    opacity: 0.85,
  },
  text: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
  },
  textActive: {
    color: '#111',
    fontWeight: '700',
  },
});
