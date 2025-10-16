import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/';

interface DividerProps {
  style?: ViewStyle;
  variant?: 'full' | 'inset' | 'middle';
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
}

export const Divider: React.FC<DividerProps> = ({
  style,
  variant = 'full',
  orientation = 'horizontal',
  thickness = 1,
}) => {
  const { theme } = useTheme();

  const marginHorizontal = {
    full: 0,
    inset: theme.spacing.md,
    middle: theme.spacing.lg,
  }[variant];

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          {
            width: thickness,
            backgroundColor: theme.colors.border,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          height: thickness,
          backgroundColor: theme.colors.border,
          marginHorizontal,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
  },
  vertical: {
    height: '100%',
  },
});
