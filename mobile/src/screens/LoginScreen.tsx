import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { TextInput, IconButton } from 'react-native-paper';
import { Button } from '../components/Button';
import Card from '../components/ui/Card';
import { COLORS, APP_VERSION } from '../config';
import { submitLogin } from './authController';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AuthResult } from '../services/api';
import { useClub } from '../context/ClubContext';

interface LoginScreenProps {
  onLogin: (result: AuthResult) => void;
  onNavigateToRegister: () => void;
  onForgotPassword?: () => void;
  /** Go back to "Find your club" (hidden on single-club builds). */
  onSwitchClub?: () => void;
}

export default function LoginScreen({
  onLogin,
  onNavigateToRegister,
  onForgotPassword,
  onSwitchClub,
}: LoginScreenProps) {
  const { club, isLocked } = useClub();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clubChoices, setClubChoices] = useState<{ id: string; name: string; slug: string }[]>([]);

  const brandTitle = club?.name || 'Welcome back';

  const handleLogin = async (clubId?: string) => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const outcome = await submitLogin({
        email: email.trim().toLowerCase(),
        password,
        clubId,
      });

      if (outcome.success) {
        setClubChoices([]);
        onLogin(outcome.result);
      } else if (outcome.clubs) {
        setClubChoices(outcome.clubs);
        setError(outcome.error);
      } else {
        setError(outcome.error);
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
            Fixtures, results, team news and match videos in one place.
          </Text>
        </View>

        <Card inset style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>
              {club ? `Log in to ${club.name}.` : 'Log in with the email you joined your club with.'}
            </Text>
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
              onSubmitEditing={() => handleLogin()}
            />
          </View>

          {onForgotPassword ? (
          <Button
            variant="ghost"
            size="small"
            onPress={onForgotPassword}
            style={styles.forgotButton}
            disabled={loading}
          >
            Forgot password?
          </Button>
          ) : null}

          <Button
            variant="primary"
            onPress={() => handleLogin()}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
            fullWidth
          >
            {loading ? 'Signing In…' : 'Sign In'}
          </Button>
        </Card>

        {clubChoices.length > 0 ? (
          <Card inset style={styles.card}>
            <Text style={styles.cardTitle}>Choose your club</Text>
            {clubChoices.map((choice) => (
              <Button
                key={choice.id}
                variant="secondary"
                onPress={() => handleLogin(choice.id)}
                disabled={loading}
                style={styles.clubChoice}
                fullWidth
              >
                {choice.name}
              </Button>
            ))}
          </Card>
        ) : null}

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>New to {club?.name || 'your club'} here?</Text>
          <Button
            variant="ghost"
            size="small"
            onPress={onNavigateToRegister}
            style={styles.registerButton}
            disabled={loading}
          >
            Create an account
          </Button>
        </View>

        {!isLocked && onSwitchClub ? (
          <Button variant="ghost" size="small" onPress={onSwitchClub} disabled={loading} style={styles.switchClub}>
            {club ? 'Not your club? Find another' : 'Find your club'}
          </Button>
        ) : null}

        <Text style={styles.footer}>Version {APP_VERSION}</Text>
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
  cardContent: {
    padding: 16,
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
    width: '100%',
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
  clubChoice: {
    marginTop: 8,
  },
  switchClub: {
    alignSelf: 'center',
    marginTop: 16,
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
