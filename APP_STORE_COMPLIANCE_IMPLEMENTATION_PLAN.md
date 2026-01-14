# App Store Compliance - Implementation Plan

This document provides step-by-step implementation instructions for fixing all App Store compliance issues identified in the review.

---

## Overview

| Phase | Focus | Tasks | Priority |
|-------|-------|-------|----------|
| **Phase 1** | Security & Legal Foundation | 4 tasks | CRITICAL |
| **Phase 2** | Legal Documents & Account | 3 tasks | CRITICAL |
| **Phase 3** | Content Safety & Moderation | 3 tasks | HIGH |
| **Phase 4** | Polish & Submission Prep | 3 tasks | MEDIUM |

---

## Phase 1: Security & Legal Foundation

### Task 1.1: Migrate Tokens to SecureStore

**Why:** Auth tokens stored in plain AsyncStorage is a security vulnerability that can cause rejection.

**Files to modify:**
- `mobile/src/services/api.ts`
- `mobile/src/context/AuthContext.tsx`

**New file to create:**
- `mobile/src/services/secureStorage.ts`

**Implementation:**

```typescript
// mobile/src/services/secureStorage.ts
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_KEYS = ['auth_token', 'auth_refresh_token'];

export const SecureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (SECURE_KEYS.includes(key)) {
      await SecureStore.setItemAsync(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (SECURE_KEYS.includes(key)) {
      return await SecureStore.getItemAsync(key);
    }
    return await AsyncStorage.getItem(key);
  },

  async removeItem(key: string): Promise<void> {
    if (SECURE_KEYS.includes(key)) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  },

  async migrateFromAsyncStorage(): Promise<void> {
    for (const key of SECURE_KEYS) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          await SecureStore.setItemAsync(key, value);
          await AsyncStorage.removeItem(key);
          console.log(`Migrated ${key} to SecureStore`);
        }
      } catch (error) {
        console.error(`Failed to migrate ${key}:`, error);
      }
    }
  },

  async clearAuthData(): Promise<void> {
    for (const key of SECURE_KEYS) {
      await SecureStore.deleteItemAsync(key);
    }
    await AsyncStorage.multiRemove(['user_id', 'user_role', 'user_firstName', 'user_lastName', 'user_email']);
  }
};
```

**Changes to api.ts:**
Replace all `AsyncStorage.setItem/getItem/removeItem` for auth tokens with `SecureStorage` equivalent.

---

### Task 1.2: Remove Demo Credentials

**Why:** Hardcoded credentials in production code will cause immediate rejection.

**File to modify:** `mobile/src/screens/LoginScreen.tsx`

**Changes:**

1. **Delete lines 22-27** (DEMO_ACCOUNTS constant):
```typescript
// DELETE THIS ENTIRE BLOCK
const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@systontigers.co.uk', password: 'admin123' },
  { label: 'Coach', email: 'coach@systontigers.co.uk', password: 'coach123' },
  { label: 'Player', email: 'player@systontigers.co.uk', password: 'player123' },
  { label: 'Parent', email: 'parent@systontigers.co.uk', password: 'parent123' },
];
```

2. **Delete lines 57-69** (mock login setTimeout):
```typescript
// DELETE THIS ENTIRE BLOCK
setTimeout(() => {
  if (email === 'admin@systontigers.co.uk' && password === 'admin123') {
    onLogin('user-001', 'admin', 'mock-jwt-token-admin');
  } else if (email === 'coach@systontigers.co.uk' && password === 'coach123') {
    // ... etc
  }
  setLoading(false);
}, 1500);
```

3. **Delete lines 196-203** (demo card UI):
```typescript
// DELETE THIS ENTIRE BLOCK
<Card variant="outlined" padding="md" style={styles.demoCard}>
  <Text style={styles.demoTitle}>Demo Accounts (Development Only)</Text>
  {DEMO_ACCOUNTS.map((account) => (
    <Text key={account.label} style={styles.demoText}>
      • {account.label}: {account.email} / {account.password}
    </Text>
  ))}
</Card>
```

4. **Delete styles** for `demoCard`, `demoTitle`, `demoText` (lines 312-329)

**For App Store Review:** Add demo credentials to App Store Connect "App Review Information" > "Notes" field.

---

### Task 1.3: Update Bundle Identifiers

**Why:** Placeholder identifiers will fail during build/submission.

**File to modify:** `mobile/app.json`

**Changes:**

```json
{
  "expo": {
    "name": "Field Drop",
    "slug": "field-drop",
    "scheme": "fielddrop",
    "version": "1.0.0",
    "icon": "./assets/icon.png",

    "android": {
      "package": "com.systontigers.fielddrop",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0B1220"
      }
    },

    "ios": {
      "bundleIdentifier": "com.systontigers.fielddrop",
      "buildNumber": "1.0.0",
      "supportsTablet": false,
      "infoPlist": {
        "NSCameraUsageDescription": "Field Drop needs camera access to record match videos and highlights.",
        "NSPhotoLibraryUsageDescription": "Field Drop needs photo library access to select videos and profile pictures.",
        "NSPhotoLibraryAddUsageDescription": "Field Drop saves highlight videos to your photo library.",
        "NSLocationWhenInUseUsageDescription": "Field Drop uses your location for smart match notifications when you're near venues.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Field Drop uses background location to notify you about matches when traveling to venues.",
        "NSMicrophoneUsageDescription": "Field Drop needs microphone access to record audio with your match videos."
      }
    },

    "extra": {
      "eas": {
        "projectId": "your-actual-eas-project-id"
      }
    }
  }
}
```

**Action Required:** Run `eas init` to get a real project ID.

---

### Task 1.4: Add iOS Permission Descriptions

**Why:** Apple requires user-facing descriptions for all permissions. Missing descriptions = rejection.

**Already included in Task 1.3 above** - the `infoPlist` section.

---

## Phase 2: Legal Documents & Account Management

### Task 2.1: Create Privacy Policy Screen

**New file:** `mobile/src/screens/PrivacyPolicyScreen.tsx`

```typescript
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS } from '../config';

const PRIVACY_POLICY_URL = 'https://fielddrop.app/privacy';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: PRIVACY_POLICY_URL }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webview: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
```

**Dependencies:** Add `react-native-webview` to package.json:
```bash
npx expo install react-native-webview
```

**Navigation:** Add to drawer/stack navigator and Settings screen.

---

### Task 2.2: Create Terms of Service Screen

**New file:** `mobile/src/screens/TermsOfServiceScreen.tsx`

Same pattern as PrivacyPolicyScreen but with `TERMS_URL = 'https://fielddrop.app/terms'`

---

### Task 2.3: Implement Account Deletion

**Why:** Apple Guideline 5.1.1(v) - mandatory since 2022.

**New file:** `mobile/src/components/DeleteAccountModal.tsx`

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Modal, Portal, Text, TextInput, Button } from 'react-native-paper';
import { COLORS } from '../config';
import { authApi } from '../services/api';

interface DeleteAccountModalProps {
  visible: boolean;
  onDismiss: () => void;
  onDeleted: () => void;
}

export default function DeleteAccountModal({ visible, onDismiss, onDeleted }: DeleteAccountModalProps) {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const canProceed = step === 1 || (step === 2 && confirmText === 'DELETE');

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm');
      return;
    }

    setLoading(true);
    try {
      await authApi.deleteAccount(password);
      Alert.alert(
        'Account Deleted',
        'Your account has been scheduled for deletion. You will receive a confirmation email.',
        [{ text: 'OK', onPress: onDeleted }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete account. Please check your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setStep(1);
    setPassword('');
    setConfirmText('');
    onDismiss();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={handleDismiss} contentContainerStyle={styles.modal}>
        <Text style={styles.title}>Delete Account</Text>

        {step === 1 && (
          <>
            <Text style={styles.warning}>
              This action is permanent and cannot be undone. All your data will be deleted including:
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>• Your profile and settings</Text>
              <Text style={styles.listItem}>• All posts and comments</Text>
              <Text style={styles.listItem}>• Chat messages</Text>
              <Text style={styles.listItem}>• Uploaded videos and photos</Text>
              <Text style={styles.listItem}>• RSVP history</Text>
            </View>

            <TextInput
              label="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.buttons}>
              <Button mode="outlined" onPress={handleDismiss} style={styles.button}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleNext}
                disabled={!password}
                buttonColor={COLORS.error}
                style={styles.button}
              >
                Continue
              </Button>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.warning}>
              To confirm deletion, type DELETE below:
            </Text>

            <TextInput
              label="Type DELETE to confirm"
              value={confirmText}
              onChangeText={setConfirmText}
              mode="outlined"
              autoCapitalize="characters"
              style={styles.input}
            />

            <View style={styles.buttons}>
              <Button mode="outlined" onPress={() => setStep(1)} style={styles.button}>
                Back
              </Button>
              <Button
                mode="contained"
                onPress={handleDelete}
                disabled={confirmText !== 'DELETE' || loading}
                loading={loading}
                buttonColor={COLORS.error}
                style={styles.button}
              >
                Delete Forever
              </Button>
            </View>
          </>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: 16,
  },
  warning: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
  },
  list: {
    marginBottom: 16,
  },
  listItem: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  input: {
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});
```

**Add to SettingsScreen.tsx** (after Account section ~line 643):

```typescript
// Add state
const [showDeleteModal, setShowDeleteModal] = useState(false);

// Add in Account Card, after Logout button:
<Button
  mode="outlined"
  onPress={() => setShowDeleteModal(true)}
  style={styles.deleteButton}
  buttonColor="transparent"
  textColor={COLORS.error}
  icon="delete-forever"
>
  Delete Account
</Button>

// Add modal at end of component:
<DeleteAccountModal
  visible={showDeleteModal}
  onDismiss={() => setShowDeleteModal(false)}
  onDeleted={() => {
    setShowDeleteModal(false);
    logout();
  }}
/>
```

**Backend endpoint needed:** `POST /api/v1/auth/delete-account`

---

## Phase 3: Content Safety & Moderation

### Task 3.1: Create ReportButton Component

**New file:** `mobile/src/components/ReportButton.tsx`

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { IconButton, Modal, Portal, Text, RadioButton, TextInput, Button } from 'react-native-paper';
import { COLORS } from '../config';
import api from '../services/api';

interface ReportButtonProps {
  contentType: 'post' | 'comment' | 'message' | 'video';
  contentId: string;
  size?: number;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'violence', label: 'Violence or dangerous content' },
  { value: 'other', label: 'Other' },
];

export default function ReportButton({ contentType, contentId, size = 20 }: ReportButtonProps) {
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Error', 'Please select a reason');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/v1/content/report', {
        contentType,
        contentId,
        reason,
        details: details || undefined,
      });

      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. We will review this content.',
        [{ text: 'OK', onPress: () => setVisible(false) }]
      );
      setReason('');
      setDetails('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IconButton
        icon="flag-outline"
        iconColor={COLORS.textLight}
        size={size}
        onPress={() => setVisible(true)}
      />

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.title}>Report Content</Text>
          <Text style={styles.subtitle}>Why are you reporting this {contentType}?</Text>

          <RadioButton.Group onValueChange={setReason} value={reason}>
            {REPORT_REASONS.map((r) => (
              <RadioButton.Item
                key={r.value}
                label={r.label}
                value={r.value}
                style={styles.radioItem}
              />
            ))}
          </RadioButton.Group>

          {reason === 'other' && (
            <TextInput
              label="Please describe the issue"
              value={details}
              onChangeText={setDetails}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          )}

          <View style={styles.buttons}>
            <Button mode="outlined" onPress={() => setVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={!reason || loading}
              buttonColor={COLORS.error}
            >
              Submit Report
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  radioItem: {
    paddingVertical: 4,
  },
  input: {
    marginTop: 12,
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
});
```

**Usage in HomeScreen.tsx** (add to post card actions):
```typescript
import ReportButton from '../components/ReportButton';

// In post card actions area:
<ReportButton contentType="post" contentId={post.id} />
```

---

### Task 3.2: AI Consent Modal

**New file:** `mobile/src/components/AIConsentModal.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, Checkbox } from 'react-native-paper';
import { COLORS } from '../config';
import { SecureStorage } from '../services/secureStorage';

interface AIConsentModalProps {
  visible: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

const CONSENT_KEY = 'ai_processing_consent';

export default function AIConsentModal({ visible, onConsent, onDecline }: AIConsentModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConsent = async () => {
    if (dontShowAgain) {
      await SecureStorage.setItem(CONSENT_KEY, 'granted');
    }
    onConsent();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDecline} contentContainerStyle={styles.modal}>
        <Text style={styles.title}>AI Video Processing</Text>

        <Text style={styles.body}>
          Your video will be processed by our AI system to automatically detect highlights
          such as goals, near-misses, and key moments.
        </Text>

        <Text style={styles.section}>What we process:</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Video content and audio</Text>
          <Text style={styles.listItem}>• Metadata (duration, format)</Text>
          <Text style={styles.listItem}>• Timestamps of detected events</Text>
        </View>

        <Text style={styles.section}>How we use it:</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Create highlight clips</Text>
          <Text style={styles.listItem}>• Generate thumbnails</Text>
          <Text style={styles.listItem}>• Improve detection accuracy</Text>
        </View>

        <Text style={styles.privacy}>
          See our Privacy Policy for full details on data handling.
        </Text>

        <View style={styles.checkbox}>
          <Checkbox
            status={dontShowAgain ? 'checked' : 'unchecked'}
            onPress={() => setDontShowAgain(!dontShowAgain)}
          />
          <Text style={styles.checkboxLabel}>Don't show this again</Text>
        </View>

        <View style={styles.buttons}>
          <Button mode="outlined" onPress={onDecline}>
            Cancel Upload
          </Button>
          <Button mode="contained" onPress={handleConsent} buttonColor={COLORS.primary}>
            I Agree, Continue
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

// Helper to check if consent is needed
export async function needsAIConsent(): Promise<boolean> {
  const consent = await SecureStorage.getItem(CONSENT_KEY);
  return consent !== 'granted';
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 16,
    lineHeight: 20,
  },
  section: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  list: {
    marginBottom: 12,
  },
  listItem: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  privacy: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
```

---

### Task 3.3: Age Verification in Registration

**Update:** `mobile/src/screens/RegisterScreen.tsx`

Add date of birth field and age verification logic. If user is under 13, show parental consent requirement.

---

## Phase 4: Polish & Submission Prep

### Task 4.1: Add Crash Reporting (Sentry)

**Install:**
```bash
npx expo install @sentry/react-native
```

**New file:** `mobile/src/services/crashReporting.ts`

```typescript
import * as Sentry from '@sentry/react-native';

export function initCrashReporting() {
  if (!__DEV__) {
    Sentry.init({
      dsn: 'YOUR_SENTRY_DSN_HERE',
      environment: 'production',
      enableAutoSessionTracking: true,
    });
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (!__DEV__) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('Error captured:', error, context);
  }
}

export function setUser(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

export function clearUser() {
  Sentry.setUser(null);
}
```

**Update App.tsx:**
```typescript
import { initCrashReporting } from './src/services/crashReporting';

// At top of App component or before
initCrashReporting();
```

---

### Task 4.2: Create Logger Utility

**New file:** `mobile/src/utils/logger.ts`

```typescript
import { captureException } from '../services/crashReporting';

export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) {
      console.log('[LOG]', ...args);
    }
  },

  warn: (...args: any[]) => {
    if (__DEV__) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (error: Error | string, context?: Record<string, any>) => {
    const err = typeof error === 'string' ? new Error(error) : error;
    console.error('[ERROR]', err.message, context);
    captureException(err, context);
  },

  debug: (...args: any[]) => {
    if (__DEV__) {
      console.debug('[DEBUG]', ...args);
    }
  },
};
```

**Then:** Replace all `console.log` with `logger.log` across the codebase.

---

### Task 4.3: Configure App Icons

**Create assets:**
- `mobile/assets/icon.png` (1024x1024)
- `mobile/assets/adaptive-icon.png` (1024x1024)
- `mobile/assets/splash.png` (1284x2778)

**Update app.json** (already included in Task 1.3)

---

## New Files Summary

| File | Purpose |
|------|---------|
| `src/services/secureStorage.ts` | Secure token storage wrapper |
| `src/screens/PrivacyPolicyScreen.tsx` | Privacy policy WebView |
| `src/screens/TermsOfServiceScreen.tsx` | Terms of service WebView |
| `src/components/DeleteAccountModal.tsx` | Account deletion confirmation |
| `src/components/ReportButton.tsx` | Content reporting |
| `src/components/AIConsentModal.tsx` | AI processing consent |
| `src/services/crashReporting.ts` | Sentry integration |
| `src/utils/logger.ts` | Conditional logging |

---

## Dependencies to Add

```bash
npx expo install react-native-webview @sentry/react-native
```

---

## Backend Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/delete-account` | POST | Delete user account |
| `/api/v1/content/report` | POST | Report content |

---

## External Requirements

1. **Privacy Policy** - Host at `https://fielddrop.app/privacy`
2. **Terms of Service** - Host at `https://fielddrop.app/terms`
3. **Sentry Account** - Create project and get DSN
4. **App Icons** - Design 1024x1024 icon and splash screen
5. **EAS Project** - Run `eas init` to get real project ID
6. **Apple Developer Account** - Register bundle ID
7. **Google Play Console** - Register package name

---

## Estimated Implementation Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1 | 4 | Medium |
| Phase 2 | 3 | Medium-High |
| Phase 3 | 3 | Medium |
| Phase 4 | 3 | Low-Medium |

**Total new files:** 8
**Total files to modify:** ~10
**New dependencies:** 2

---

## Quick Start

To begin implementation, run these commands:

```bash
cd /home/user/app/mobile

# Install new dependencies
npx expo install react-native-webview @sentry/react-native

# Create new directories if needed
mkdir -p src/utils

# Then follow the implementation tasks in order
```

Would you like me to start implementing these changes?
