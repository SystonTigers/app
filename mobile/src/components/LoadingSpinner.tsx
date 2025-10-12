import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && (
        <Text
          style={[
            styles.message,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.base,
            },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    marginTop: 16,
    textAlign: 'center',
  },
});
