import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, IconButton } from 'react-native-paper';
import { COLORS, TENANT_ID } from '../config';
import { submitLogin } from './authController';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card } from '../components';
import { useTheme } from '../theme';
import type { Theme } from '../theme';
import { APP_VERSION, TENANT_ID } from '../config';

interface LoginScreenProps {
  onLogin: (userId: string, role: string, token: string) => void;
  onNavigateToRegister: () => void;
  onForgotPassword?: () => void;
}

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@systontigers.co.uk', password: 'admin123' },
  { label: 'Coach', email: 'coach@systontigers.co.uk', password: 'coach123' },
  { label: 'Player', email: 'player@systontigers.co.uk', password: 'player123' },
  { label: 'Parent', email: 'parent@systontigers.co.uk', password: 'parent123' },
];

export default function LoginScreen({
  onLogin,
  onNavigateToRegister,
  onForgotPassword,
}: LoginScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const brandTitle = theme.metadata.brandName ?? 'Field Drop';

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      setTimeout(() => {
        if (email === 'admin@systontigers.co.uk' && password === 'admin123') {
          onLogin('user-001', 'admin', 'mock-jwt-token-admin');
        } else if (email === 'coach@systontigers.co.uk' && password === 'coach123') {
          onLogin('user-002', 'coach', 'mock-jwt-token-coach');
        } else if (email === 'player@systontigers.co.uk' && password === 'player123') {
          onLogin('user-003', 'player', 'mock-jwt-token-player');
        } else if (email === 'parent@systontigers.co.uk' && password === 'parent123') {
          onLogin('user-004', 'parent', 'mock-jwt-token-parent');
        } else {
          setError('Invalid email or password');
        }
        setLoading(false);
      }, 1500);
      const outcome = await submitLogin({
        email: email.trim().toLowerCase(),
        password,
      });

      if ('error' in outcome) {
        setError(outcome.error);
      } else {
        onLogin(outcome.result.user.id, outcome.result.user.role, outcome.result.token);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Unable to sign in. Please try again.');
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons
              name="shield-account"
              size={36}
              color={theme.ramps.primary['600']}
            />
          </View>
          <Text style={styles.title}>{brandTitle}</Text>
          <Text style={styles.subtitle}>
            Sign in to manage fixtures, comms, and player availability.
          </Text>
        </View>

        <Card variant="elevated" padding="lg" style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Join the control room for {TENANT_ID}.</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer} accessibilityRole="alert">
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color={theme.ramps.error['600']}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fieldStack}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              left={<TextInput.Icon icon="email" />}
              style={styles.input}
              disabled={loading}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
              textColor={theme.colors.text}
              selectionColor={theme.ramps.primary['200']}
              theme={{
                colors: {
                  primary: theme.colors.primary,
                  onSurface: theme.colors.text,
                  onSurfaceVariant: theme.colors.textSecondary,
                  outline: theme.colors.border,
                  surfaceVariant: theme.colors.surface,
                  background: theme.colors.surface,
                  placeholder: theme.colors.placeholder,
                },
              }}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword((prev) => !prev)}
                />
              }
              style={styles.input}
              disabled={loading}
              onSubmitEditing={handleLogin}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
              textColor={theme.colors.text}
              selectionColor={theme.ramps.primary['200']}
              theme={{
                colors: {
                  primary: theme.colors.primary,
                  onSurface: theme.colors.text,
                  onSurfaceVariant: theme.colors.textSecondary,
                  outline: theme.colors.border,
                  surfaceVariant: theme.colors.surface,
                  background: theme.colors.surface,
                  placeholder: theme.colors.placeholder,
                },
              }}
            />
          </View>

          <Button
            variant="ghost"
            size="small"
            onPress={
              onForgotPassword || (() => alert('Password reset feature coming soon!'))
            }
            style={styles.forgotButton}
            disabled={loading}
          >
            Forgot password?
          </Button>

          <Button
            variant="primary"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
            fullWidth
          >
            {loading ? 'Signing In…' : 'Sign In'}
          </Button>
        </Card>

        <Card variant="outlined" padding="md" style={styles.demoCard}>
          <Text style={styles.demoTitle}>Demo Accounts (Development Only)</Text>
          {DEMO_ACCOUNTS.map((account) => (
            <Text key={account.label} style={styles.demoText}>
              • {account.label}: {account.email} / {account.password}
            </Text>
          ))}
        </Card>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don&apos;t have an account?</Text>
          <Button
            variant="ghost"
            size="small"
            onPress={onNavigateToRegister}
            style={styles.registerButton}
            disabled={loading}
          >
            Sign Up
          </Button>
        </View>

        <Text style={styles.footer}>Version {APP_VERSION} • {TENANT_ID}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: Theme) {
  const spacing = theme.spacingScale;
  const colors = theme.colors;
  const borderRadius = theme.borderRadius;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing['3xl'],
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing['2xl'],
    },
    iconBadge: {
      width: spacing['4xl'],
      height: spacing['4xl'],
      borderRadius: spacing['4xl'] / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.ramps.primary['50'],
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: theme.typographyScale.headline.fontSize,
      lineHeight: theme.typographyScale.headline.lineHeight,
      fontWeight: theme.typography.fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: spacing['2xs'],
      fontSize: theme.typographyScale.body.fontSize,
      lineHeight: theme.typographyScale.body.lineHeight,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    card: {
      marginBottom: spacing.lg,
    },
    cardHeader: {
      marginBottom: spacing.md,
    },
    cardTitle: {
      fontSize: theme.typographyScale.title.fontSize,
      lineHeight: theme.typographyScale.title.lineHeight,
      fontWeight: theme.typography.fontWeight.semibold,
      color: colors.text,
    },
    cardSubtitle: {
      marginTop: spacing['2xs'],
      fontSize: theme.typographyScale.bodySm.fontSize,
      lineHeight: theme.typographyScale.bodySm.lineHeight,
      color: colors.textSecondary,
    },
    fieldStack: {
      marginBottom: spacing.md,
    },
    input: {
      marginBottom: spacing.sm,
      backgroundColor: colors.surfaceSecondary,
    },
    forgotButton: {
      alignSelf: 'flex-end',
      marginBottom: spacing.sm,
    },
    loginButton: {
      marginTop: spacing.xs,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.ramps.error['50'],
      borderWidth: 1,
      borderColor: theme.ramps.error['200'],
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing['2xs'],
      marginBottom: spacing.md,
    },
    errorText: {
      flex: 1,
      color: theme.ramps.error['700'],
      fontSize: theme.typographyScale.bodySm.fontSize,
      lineHeight: theme.typographyScale.bodySm.lineHeight,
      marginLeft: spacing.xs,
    },
    demoCard: {
      backgroundColor: theme.ramps.primary['50'],
      borderColor: theme.ramps.primary['200'],
      marginBottom: spacing.lg,
    },
    demoTitle: {
      fontSize: theme.typographyScale.body.fontSize,
      lineHeight: theme.typographyScale.body.lineHeight,
      fontWeight: theme.typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing['2xs'],
    },
    demoText: {
      fontSize: theme.typographyScale.bodySm.fontSize,
      lineHeight: theme.typographyScale.bodySm.lineHeight,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      marginBottom: spacing['2xs'],
    },
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    registerText: {
      fontSize: theme.typographyScale.bodySm.fontSize,
      lineHeight: theme.typographyScale.bodySm.lineHeight,
      color: colors.textSecondary,
      marginRight: spacing['2xs'],
    },
    registerButton: {
      paddingHorizontal: spacing.xs,
    },
    footer: {
      marginTop: spacing['2xl'],
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: theme.typographyScale.caption.fontSize,
      lineHeight: theme.typographyScale.caption.lineHeight,
    },
  });
}
