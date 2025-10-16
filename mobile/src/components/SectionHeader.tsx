import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useTheme } from '../theme/';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  icon?: ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'large' | 'small';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  style,
  variant = 'default',
}) => {
  const { theme } = useTheme();

  const titleSize = {
    large: theme.typography.fontSize['3xl'],
    default: theme.typography.fontSize.xl,
    small: theme.typography.fontSize.lg,
  }[variant];

  const subtitleSize = {
    large: theme.typography.fontSize.base,
    default: theme.typography.fontSize.sm,
    small: theme.typography.fontSize.xs,
  }[variant];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontSize: titleSize,
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
                  fontSize: subtitleSize,
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text
            style={[
              styles.actionText,
              {
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    marginTop: 2,
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
