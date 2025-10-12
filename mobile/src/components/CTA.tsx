import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { createElevation } from '../theme/utils';

interface CTAProps {
  title: string;
  subtitle?: string;
  buttonLabel: string;
  onPress: () => void;
  icon?: ReactNode;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
}

export const CTA: React.FC<CTAProps> = ({
  title,
  subtitle,
  buttonLabel,
  onPress,
  icon,
  style,
  variant = 'primary',
  size = 'medium',
}) => {
  const { theme } = useTheme();

  const backgroundColor = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    success: theme.colors.success,
    warning: theme.colors.warning,
  }[variant];

  const textColor = variant === 'primary' || variant === 'warning'
    ? theme.colors.textInverse
    : theme.colors.text;

  const padding = {
    small: theme.spacing.sm,
    medium: theme.spacing.md,
    large: theme.spacing.lg,
  }[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding,
          ...createElevation(2),
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor,
            borderRadius: theme.borderRadius.md,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            {
              color: textColor,
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
            },
          ]}
        >
          {buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  content: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 4,
  },
  button: {
    minWidth: 120,
  },
  buttonText: {
    textAlign: 'center',
  },
});
