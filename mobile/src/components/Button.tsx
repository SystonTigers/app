import React, { ReactNode } from 'react';
import { Text, StyleSheet, Pressable, ViewStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/';

interface ButtonProps {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
}) => {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return theme.colors.borderLight;

    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'danger':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textDisabled;

    switch (variant) {
      case 'primary':
      case 'danger':
        return theme.colors.textInverse;
      case 'secondary':
        return theme.colors.text;
      case 'outline':
      case 'ghost':
        return theme.colors.primary;
      default:
        return theme.colors.textInverse;
    }
  };

  const padding = {
    small: { paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm },
    medium: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
    large: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
  }[size];

  const fontSize = {
    small: theme.typography.fontSize.sm,
    medium: theme.typography.fontSize.base,
    large: theme.typography.fontSize.lg,
  }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderRadius: theme.borderRadius.md,
          ...padding,
          ...(variant === 'outline' && {
            borderWidth: 2,
            borderColor: theme.colors.primary,
          }),
          ...(fullWidth && { width: '100%' }),
        },
        pressed && !disabled && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
              fontSize,
              fontWeight: theme.typography.fontWeight.semibold,
            },
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // iOS recommended touch target
  },
  text: {
    textAlign: 'center',
  },
});
