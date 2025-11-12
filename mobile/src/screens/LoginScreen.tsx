import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { TextInput, Button, Card, IconButton } from 'react-native-paper';
import { COLORS, TENANT_ID, APP_VERSION } from '../config';
import { submitLogin } from './authController';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const brandTitle = 'Syston Tigers';

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
              color={COLORS.primary}
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
                color={COLORS.error}
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

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 40,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    iconBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${COLORS.primary}15`,
      marginBottom: 12,
    },
    title: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: 'bold',
      color: COLORS.text,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 8,
      fontSize: 16,
      lineHeight: 24,
      color: COLORS.textLight,
      textAlign: 'center',
    },
    card: {
      marginBottom: 16,
    },
    cardHeader: {
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600',
      color: COLORS.text,
    },
    cardSubtitle: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: COLORS.textLight,
    },
    fieldStack: {
      marginBottom: 12,
    },
    input: {
      marginBottom: 12,
      backgroundColor: COLORS.surface,
    },
    forgotButton: {
      alignSelf: 'flex-end',
      marginBottom: 12,
    },
    loginButton: {
      marginTop: 8,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${COLORS.error}15`,
      borderWidth: 1,
      borderColor: `${COLORS.error}50`,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
    },
    errorText: {
      flex: 1,
      color: COLORS.error,
      fontSize: 14,
      lineHeight: 20,
      marginLeft: 8,
    },
    demoCard: {
      backgroundColor: `${COLORS.primary}15`,
      borderColor: `${COLORS.primary}50`,
      marginBottom: 16,
    },
    demoTitle: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: 8,
    },
    demoText: {
      fontSize: 14,
      lineHeight: 20,
      color: COLORS.textLight,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      marginBottom: 8,
    },
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    registerText: {
      fontSize: 14,
      lineHeight: 20,
      color: COLORS.textLight,
      marginRight: 8,
    },
    registerButton: {
      paddingHorizontal: 8,
    },
    footer: {
      marginTop: 24,
      textAlign: 'center',
      color: COLORS.textLight,
      fontSize: 12,
      lineHeight: 16,
    },
  });
