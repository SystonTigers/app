import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style,
}) => {
  const { theme } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: theme.colors.successLight,
          text: theme.colors.successDark,
        };
      case 'warning':
        return {
          bg: theme.colors.warningLight,
          text: theme.colors.warningDark,
        };
      case 'error':
        return {
          bg: theme.colors.errorLight,
          text: theme.colors.errorDark,
        };
      case 'info':
        return {
          bg: theme.colors.infoLight,
          text: theme.colors.infoDark,
        };
      default:
        return {
          bg: theme.colors.primaryLight,
          text: theme.colors.primaryDark,
        };
    }
  };

  const colors = getColors();

  const padding = {
    small: { paddingVertical: 2, paddingHorizontal: 6 },
    medium: { paddingVertical: 4, paddingHorizontal: 8 },
    large: { paddingVertical: 6, paddingHorizontal: 12 },
  }[size];

  const fontSize = {
    small: theme.typography.fontSize.xs,
    medium: theme.typography.fontSize.sm,
    large: theme.typography.fontSize.base,
  }[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderRadius: theme.borderRadius.sm,
          ...padding,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize,
            fontWeight: theme.typography.fontWeight.semibold,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  text: {
    textAlign: 'center',
  },
});
