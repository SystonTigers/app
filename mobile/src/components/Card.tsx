import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '../theme/';
import { createElevation } from '../theme/utils';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  elevation?: number;
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevation = 2,
  onPress,
  variant = 'default',
  padding = 'md',
}) => {
  const { theme } = useTheme();

  const paddingValue = {
    none: 0,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
  }[padding];

  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: paddingValue,
    ...styles.card,
    ...(variant === 'elevated' && createElevation(elevation)),
    ...(variant === 'outlined' && {
      borderWidth: 1,
      borderColor: theme.colors.border,
    }),
    ...style,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && { opacity: 0.8 },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
