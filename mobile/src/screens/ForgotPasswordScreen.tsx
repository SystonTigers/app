import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { authApi } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthBrandHeader, { AuthBackdrop } from '../components/auth/AuthBrand';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSendCode = async () => {
    // Validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "We couldn't send the email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
    <AuthBackdrop />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AuthBrandHeader
        title="Reset Password"
        subtitle={sent
          ? `If there's an account for ${email.trim()}, we've emailed it a link to set a new password.`
          : "Enter your email address and we'll send you a link to reset your password."}
      />

      {/* Form Card */}
      <Card style={styles.card}>
        <Card.Content>
          {error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            label="Email Address"
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
            onSubmitEditing={handleSendCode}
          />

          <Button
            mode="contained"
            onPress={handleSendCode}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Sending…' : sent ? 'Send it again' : 'Send reset link'}
          </Button>

          <Button
            mode="text"
            onPress={onBack}
            disabled={loading}
            style={styles.backButton}
          >
            Back to log in
          </Button>
        </Card.Content>
      </Card>

      {/* Info */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information" size={24} color={COLORS.primary} />
            <Text style={styles.infoText}>
              The email can take a few minutes to arrive, so check your spam folder too. The link works for one hour.
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,85,0.14)',
    padding: 12,
    borderRadius: 12,
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
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  backButton: {
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 18,
    elevation: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
}));
