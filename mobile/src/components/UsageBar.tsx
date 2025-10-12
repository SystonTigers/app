import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface UsageBarProps {
  current: number;
  max: number | undefined; // undefined = unlimited
  label: string;
  unit?: string;
  style?: ViewStyle;
  showPercentage?: boolean;
  colorThresholds?: {
    warning: number; // percentage at which to show warning color
    danger: number; // percentage at which to show danger color
  };
}

export const UsageBar: React.FC<UsageBarProps> = ({
  current,
  max,
  label,
  unit = '',
  style,
  showPercentage = true,
  colorThresholds = { warning: 75, danger: 90 },
}) => {
  const { theme } = useTheme();

  // Calculate percentage
  const percentage = max ? Math.min((current / max) * 100, 100) : 0;
  const isUnlimited = max === undefined;

  // Determine bar color based on usage
  const getBarColor = () => {
    if (isUnlimited) return theme.colors.success;
    if (percentage >= colorThresholds.danger) return theme.colors.error;
    if (percentage >= colorThresholds.warning) return theme.colors.warning;
    return theme.colors.primary;
  };

  const barColor = getBarColor();

  return (
    <View style={[styles.container, style]}>
      {/* Header with label and values */}
      <View style={styles.header}>
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
            },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.value,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
            },
          ]}
        >
          {isUnlimited ? (
            'Unlimited'
          ) : (
            <>
              {current.toLocaleString()}
              {max && ` / ${max.toLocaleString()}`}
              {unit && ` ${unit}`}
            </>
          )}
        </Text>
      </View>

      {/* Progress bar */}
      {!isUnlimited && (
        <View
          style={[
            styles.barBackground,
            {
              backgroundColor: theme.colors.border,
              borderRadius: theme.borderRadius.sm,
            },
          ]}
        >
          <View
            style={[
              styles.barFill,
              {
                width: `${percentage}%`,
                backgroundColor: barColor,
                borderRadius: theme.borderRadius.sm,
              },
            ]}
          />
        </View>
      )}

      {/* Percentage display */}
      {showPercentage && !isUnlimited && (
        <Text
          style={[
            styles.percentage,
            {
              color: barColor,
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
            },
          ]}
        >
          {percentage.toFixed(0)}% used
        </Text>
      )}

      {/* Warning message if near limit */}
      {!isUnlimited && percentage >= colorThresholds.warning && (
        <Text
          style={[
            styles.warningText,
            {
              color: percentage >= colorThresholds.danger ? theme.colors.error : theme.colors.warning,
              fontSize: theme.typography.fontSize.xs,
            },
          ]}
        >
          {percentage >= colorThresholds.danger
            ? 'Limit almost reached! Consider upgrading.'
            : 'Approaching limit'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    flex: 1,
  },
  value: {
    marginLeft: 8,
  },
  barBackground: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  percentage: {
    marginTop: 4,
    textAlign: 'right',
  },
  warningText: {
    marginTop: 4,
    textAlign: 'center',
  },
});
