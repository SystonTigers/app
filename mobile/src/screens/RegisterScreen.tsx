import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, RadioButton, Chip } from 'react-native-paper';
import { COLORS, TENANT_ID } from '../config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { submitRegistration } from './authController';

interface RegisterScreenProps {
  onRegister: (userId: string, role: string, token: string) => void;
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({ onRegister, onNavigateToLogin }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'parent', // parent, player, coach
    phone: '',
    playerName: '', // Only if role is parent
    promoCode: '', // Optional promo code
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // First name
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    // Last name
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Phone
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    // Player name (if parent)
    if (formData.role === 'parent' && !formData.playerName.trim()) {
      newErrors.playerName = 'Player name is required for parents';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const outcome = await submitRegistration({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone,
        playerName: formData.role === 'parent' ? formData.playerName : undefined,
        promoCode: formData.promoCode,
      });

      if ('error' in outcome) {
        const fieldErrors = { ...((outcome.fieldErrors as Record<string, string> | undefined) ?? {}) };
        if (!fieldErrors.form) {
          fieldErrors.form = outcome.error;
        }
        setErrors(fieldErrors);
      } else {
        onRegister(outcome.result.user.id, outcome.result.user.role, outcome.result.token);
      }
    } catch (err) {
      if (err instanceof Error) {
        setErrors({ form: err.message || 'Registration failed. Please try again.' });
      } else {
        setErrors({ form: 'Registration failed. Please try again.' });
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="account-plus" size={64} color={COLORS.primary} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Syston Tigers</Text>
        </View>

        {/* Registration Card */}
        <Card style={styles.card}>
          <Card.Content>
            {errors.form ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{errors.form}</Text>
              </View>
            ) : null}

            {/* Role Selection */}
            <Text style={styles.sectionTitle}>I am a...</Text>
            <View style={styles.roleContainer}>
              <Chip
                selected={formData.role === 'parent'}
                onPress={() => updateField('role', 'parent')}
                style={[styles.roleChip, formData.role === 'parent' && styles.roleChipSelected]}
                textStyle={formData.role === 'parent' && styles.roleChipTextSelected}
                icon="account-child"
              >
                Parent
              </Chip>
              <Chip
                selected={formData.role === 'player'}
                onPress={() => updateField('role', 'player')}
                style={[styles.roleChip, formData.role === 'player' && styles.roleChipSelected]}
                textStyle={formData.role === 'player' && styles.roleChipTextSelected}
                icon="account"
              >
                Player
              </Chip>
              <Chip
                selected={formData.role === 'coach'}
                onPress={() => updateField('role', 'coach')}
                style={[styles.roleChip, formData.role === 'coach' && styles.roleChipSelected]}
                textStyle={formData.role === 'coach' && styles.roleChipTextSelected}
                icon="whistle"
              >
                Coach
              </Chip>
            </View>

            {/* First Name */}
            <TextInput
              label="First Name *"
              value={formData.firstName}
              onChangeText={(text) => updateField('firstName', text)}
              mode="outlined"
              autoCapitalize="words"
              autoCorrect={false}
              left={<TextInput.Icon icon="account" />}
              style={styles.input}
              error={!!errors.firstName}
              disabled={loading}
            />
            {errors.firstName ? <Text style={styles.fieldError}>{errors.firstName}</Text> : null}

            {/* Last Name */}
            <TextInput
              label="Last Name *"
              value={formData.lastName}
              onChangeText={(text) => updateField('lastName', text)}
              mode="outlined"
              autoCapitalize="words"
              autoCorrect={false}
              left={<TextInput.Icon icon="account" />}
              style={styles.input}
              error={!!errors.lastName}
              disabled={loading}
            />
            {errors.lastName ? <Text style={styles.fieldError}>{errors.lastName}</Text> : null}

            {/* Email */}
            <TextInput
              label="Email *"
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              left={<TextInput.Icon icon="email" />}
              style={styles.input}
              error={!!errors.email}
              disabled={loading}
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

            {/* Phone */}
            <TextInput
              label="Phone Number *"
              value={formData.phone}
              onChangeText={(text) => updateField('phone', text)}
              mode="outlined"
              keyboardType="phone-pad"
              autoComplete="tel"
              left={<TextInput.Icon icon="phone" />}
              style={styles.input}
              error={!!errors.phone}
              disabled={loading}
            />
            {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

            {/* Player Name (only for parents) */}
            {formData.role === 'parent' && (
              <>
                <TextInput
                  label="Player Name *"
                  value={formData.playerName}
                  onChangeText={(text) => updateField('playerName', text)}
                  mode="outlined"
                  autoCapitalize="words"
                  autoCorrect={false}
                  left={<TextInput.Icon icon="soccer" />}
                  style={styles.input}
                  error={!!errors.playerName}
                  disabled={loading}
                  placeholder="Your child's name"
                />
                {errors.playerName ? <Text style={styles.fieldError}>{errors.playerName}</Text> : null}
              </>
            )}

            {/* Password */}
            <TextInput
              label="Password *"
              value={formData.password}
              onChangeText={(text) => updateField('password', text)}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
              error={!!errors.password}
              disabled={loading}
            />
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}

            {/* Confirm Password */}
            <TextInput
              label="Confirm Password *"
              value={formData.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              mode="outlined"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="lock-check" />}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
              style={styles.input}
              error={!!errors.confirmPassword}
              disabled={loading}
              onSubmitEditing={handleRegister}
            />
            {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}

            {/* Promo Code (Optional) */}
            <View style={styles.promoContainer}>
              <Text style={styles.promoLabel}>Have a promo code?</Text>
              <TextInput
                label="Promo Code (Optional)"
                value={formData.promoCode}
                onChangeText={(text) => updateField('promoCode', text.toUpperCase())}
                mode="outlined"
                autoCapitalize="characters"
                autoCorrect={false}
                left={<TextInput.Icon icon="ticket-percent" />}
                style={styles.input}
                disabled={loading}
                placeholder="SYSTON-PRO-2025"
              />
              <Text style={styles.promoHint}>
                Get free upgrades or discounts with a promo code!
              </Text>
            </View>

            {/* Register Button */}
            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.registerButton}
              buttonColor={COLORS.primary}
              textColor="#000"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            {/* Terms */}
            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </Card.Content>
        </Card>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Button
            mode="text"
            onPress={onNavigateToLogin}
            labelStyle={styles.loginButtonText}
            disabled={loading}
          >
            Sign In
          </Button>
        </View>
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
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    elevation: 4,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  roleChip: {
    backgroundColor: COLORS.background,
  },
  roleChipSelected: {
    backgroundColor: COLORS.primary,
  },
  roleChipTextSelected: {
    color: '#000',
  },
  input: {
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  fieldError: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 12,
  },
  promoContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  promoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  promoHint: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 12,
    fontStyle: 'italic',
  },
  registerButton: {
    marginTop: 16,
    paddingVertical: 6,
  },
  termsText: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  loginButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
