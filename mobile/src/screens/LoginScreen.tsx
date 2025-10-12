import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, IconButton } from 'react-native-paper';
import { COLORS, TENANT_ID } from '../config';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LoginScreenProps {
  onLogin: (userId: string, role: string, token: string) => void;
  onNavigateToRegister: () => void;
  onForgotPassword?: () => void;
}

export default function LoginScreen({ onLogin, onNavigateToRegister, onForgotPassword }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // Basic validation
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
      // TODO: Replace with real API call
      // const response = await api.post('/api/v1/auth/login', {
      //   tenant: TENANT_ID,
      //   email: email.trim().toLowerCase(),
      //   password,
      // });
      //
      // if (response.data.success) {
      //   const { userId, role, token } = response.data.data;
      //   await AsyncStorage.setItem('auth_token', token);
      //   await AsyncStorage.setItem('user_id', userId);
      //   await AsyncStorage.setItem('user_role', role);
      //   onLogin(userId, role, token);
      // } else {
      //   setError(response.data.error?.message || 'Login failed');
      // }

      // Mock login for development
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
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="shield-account" size={80} color={COLORS.primary} />
          <Text style={styles.title}>Syston Tigers</Text>
          <Text style={styles.subtitle}>Team Management Platform</Text>
        </View>

        {/* Login Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Sign In</Text>

            {error ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email Input */}
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

            {/* Password Input */}
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
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
              disabled={loading}
              onSubmitEditing={handleLogin}
            />

            {/* Forgot Password */}
            <Button
              mode="text"
              onPress={onForgotPassword || (() => alert('Password reset feature coming soon!'))}
              style={styles.forgotButton}
              labelStyle={styles.forgotButtonText}
              disabled={loading}
            >
              Forgot Password?
            </Button>

            {/* Login Button */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
              buttonColor={COLORS.primary}
              textColor="#000"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Card.Content>
        </Card>

        {/* Demo Accounts */}
        <Card style={styles.demoCard}>
          <Card.Content>
            <Text style={styles.demoTitle}>Demo Accounts (Development Only)</Text>
            <Text style={styles.demoText}>• Admin: admin@systontigers.co.uk / admin123</Text>
            <Text style={styles.demoText}>• Coach: coach@systontigers.co.uk / coach123</Text>
            <Text style={styles.demoText}>• Player: player@systontigers.co.uk / player123</Text>
            <Text style={styles.demoText}>• Parent: parent@systontigers.co.uk / parent123</Text>
          </Card.Content>
        </Card>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <Button
            mode="text"
            onPress={onNavigateToRegister}
            labelStyle={styles.registerButtonText}
            disabled={loading}
          >
            Sign Up
          </Button>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Version 1.0.0 • {TENANT_ID}</Text>
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    elevation: 4,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}15`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginLeft: 8,
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: COLORS.background,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotButtonText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  loginButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  demoCard: {
    backgroundColor: `${COLORS.primary}10`,
    elevation: 0,
    marginBottom: 16,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  demoText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  registerText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  registerButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  footer: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 24,
  },
});
