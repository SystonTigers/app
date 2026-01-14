# App Store Compliance Review Report

**App Name:** Field Drop / Syston Tigers
**Version:** 1.0.0
**Platform:** React Native (Expo) - iOS & Android
**Review Date:** January 14, 2026
**Reviewer:** Claude AI Compliance Audit

---

## Executive Summary

| Store | Status | Blockers |
|-------|--------|----------|
| **Apple App Store** | **NOT READY** | 8 Critical Issues |
| **Google Play Store** | **NOT READY** | 7 Critical Issues |

**Estimated time to fix critical issues:** Variable based on implementation complexity

---

## Critical Issues (Must Fix Before Submission)

### 1. Missing Privacy Policy

**Severity:** CRITICAL - WILL BE REJECTED
**Affects:** Apple App Store, Google Play Store

**Issue:** No privacy policy exists in the app or codebase. Only an archived template was found at `/archive/template/app/privacy.html`.

**Apple Guideline:** 5.1.1 - Apps must have a privacy policy and handle data in accordance with applicable laws.

**Google Policy:** User Data policy requires a privacy policy link in Play Console and in-app.

**Required Actions:**
- [ ] Create a comprehensive privacy policy covering:
  - Data collected (email, name, phone, location, videos, device info)
  - How data is used
  - Third-party sharing (Make.com, YouTube, Printify, Expo)
  - Data retention periods
  - User rights (access, deletion, portability)
  - Contact information
- [ ] Add privacy policy URL to app.json `expo.ios.privacyPolicy` and `expo.android.privacyPolicy`
- [ ] Add in-app link in Settings screen to privacy policy
- [ ] Host privacy policy at a publicly accessible URL

---

### 2. No Account Deletion Feature

**Severity:** CRITICAL - WILL BE REJECTED
**Affects:** Apple App Store (Mandatory), Google Play Store (Required)

**Issue:** Users can create accounts but cannot delete them from within the app.

**Apple Guideline:** 5.1.1(v) - "If your app supports account creation, you must also offer account deletion within the app."

**Google Policy:** As of December 2023, apps must provide account deletion functionality.

**Evidence:** Grep search for "delete.*account" returned no results.

**Required Actions:**
- [ ] Add "Delete Account" button in Settings or Profile screen
- [ ] Implement confirmation dialog with clear warning
- [ ] Create backend endpoint `DELETE /api/v1/users/account`
- [ ] Ensure all user data is deleted (KV entries, uploaded videos, profile images)
- [ ] Send confirmation email upon deletion
- [ ] Handle 30-day grace period (optional but recommended)

---

### 3. Demo Credentials in Production Code

**Severity:** CRITICAL - WILL BE REJECTED
**Affects:** Apple App Store, Google Play Store

**Issue:** Hardcoded demo accounts visible in production code at `src/screens/LoginScreen.tsx:22-27`:

```typescript
const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@systontigers.co.uk', password: 'admin123' },
  { label: 'Coach', email: 'coach@systontigers.co.uk', password: 'coach123' },
  { label: 'Player', email: 'player@systontigers.co.uk', password: 'player123' },
  { label: 'Parent', email: 'parent@systontigers.co.uk', password: 'parent123' },
];
```

Also displayed in UI (lines 196-203) with a "Demo Accounts (Development Only)" card.

**Apple Guideline:** 2.3.1 - Don't include demo credentials in production releases.

**Required Actions:**
- [ ] Remove `DEMO_ACCOUNTS` constant entirely
- [ ] Remove demo credentials card from UI
- [ ] Use environment variables for dev-only features
- [ ] Provide demo credentials in App Store Connect "Review Notes" field (not in app)
- [ ] Remove mock login logic (lines 57-69) that bypasses real authentication

---

### 4. Placeholder Bundle Identifiers

**Severity:** CRITICAL - WILL BE REJECTED
**Affects:** Apple App Store, Google Play Store

**Issue:** `app.json` contains placeholder identifiers:
```json
"android": {
  "package": "com.yourorg.fielddrop"  // NOT VALID
},
"ios": {
  "bundleIdentifier": "com.yourorg.fielddrop"  // NOT VALID
}
```

Also: `"eas": { "projectId": "dev-placeholder" }`

**Required Actions:**
- [ ] Register actual bundle ID with Apple Developer account
- [ ] Update iOS bundleIdentifier (e.g., `com.systontigers.fielddrop`)
- [ ] Update Android package name (e.g., `com.systontigers.fielddrop`)
- [ ] Create EAS project and update projectId
- [ ] Ensure package names match across all signing certificates

---

### 5. Missing Terms of Service

**Severity:** CRITICAL - WILL BE REJECTED
**Affects:** Apple App Store, Google Play Store

**Issue:** No Terms of Service / End User License Agreement found.

**Apple Guideline:** Apps with account creation or payments require Terms of Service.

**Required Actions:**
- [ ] Create Terms of Service document
- [ ] Include acceptable use policy for user-generated content
- [ ] Add link in Settings screen and during registration
- [ ] Host at publicly accessible URL

---

### 6. Insecure Token Storage

**Severity:** CRITICAL - Security Risk (May cause rejection)
**Affects:** Apple App Store, Google Play Store

**Issue:** Authentication tokens stored in unencrypted AsyncStorage despite `expo-secure-store` being installed.

**File:** `src/services/api.ts`
```typescript
// Tokens stored in plain text AsyncStorage
await AsyncStorage.setItem('auth_token', token);
await AsyncStorage.getItem('auth_token');
```

**Apple Guideline:** 2.1 - Apps must not store sensitive data insecurely.

**Google Policy:** Data Security policy requires protecting sensitive user data.

**Required Actions:**
- [ ] Replace AsyncStorage with SecureStore for token storage:
  ```typescript
  import * as SecureStore from 'expo-secure-store';
  await SecureStore.setItemAsync('auth_token', token);
  await SecureStore.getItemAsync('auth_token');
  ```
- [ ] Migrate existing stored tokens on app update
- [ ] Implement token expiration and refresh logic

---

### 7. No Content Moderation System

**Severity:** HIGH - May cause rejection or removal
**Affects:** Apple App Store, Google Play Store

**Issue:** User-generated content features (posts, comments, chat, video uploads) have no moderation:
- No profanity filter
- No user reporting mechanism
- No content review queue
- No blocking/muting functionality
- ChatScreen shows guidelines but doesn't enforce them

**Apple Guideline:** 1.2 - Apps with user-generated content must include content filtering, blocking, and reporting.

**Google Policy:** User-Generated Content policy requires moderation mechanisms.

**Required Actions:**
- [ ] Add "Report Content" button on posts, comments, and chat messages
- [ ] Create report categories (spam, harassment, inappropriate, other)
- [ ] Implement admin review queue
- [ ] Add user blocking functionality
- [ ] Consider automated content filtering (profanity filter)
- [ ] Add clear Community Guidelines accessible in-app

---

### 8. Missing Age Rating Questionnaire Preparation

**Severity:** HIGH - Submission will be blocked
**Affects:** Apple App Store, Google Play Store

**Issue:** App involves minors (youth football teams - U13, U14, etc.) but has no age-appropriate safeguards.

**Apple Update (July 2025):** New age ratings (13+, 16+, 18+) require updated questionnaire by January 31, 2026.

**Concerns:**
- App collects data about children (player profiles, photos, videos)
- Chat features accessible to minors
- No parental consent verification
- Location tracking without age consideration

**Required Actions:**
- [ ] Complete age rating questionnaire honestly
- [ ] Likely needs 4+ or 9+ rating (sports app)
- [ ] Consider COPPA compliance (if US users under 13)
- [ ] Implement parental consent for accounts created for minors
- [ ] Review data collection practices for child safety

---

## Major Issues (Should Fix Before Submission)

### 9. Missing iOS Permission Descriptions

**Severity:** MEDIUM - May cause rejection
**Affects:** Apple App Store

**Issue:** `app.json` is missing required `NSUsageDescription` keys for permissions.

**Required Actions:**
Add to `app.json` under `expo.ios.infoPlist`:
```json
{
  "NSCameraUsageDescription": "Field Drop needs camera access to record match videos and highlights.",
  "NSPhotoLibraryUsageDescription": "Field Drop needs photo library access to select videos and profile pictures.",
  "NSLocationWhenInUseUsageDescription": "Field Drop uses your location for smart match notifications when you're near venues.",
  "NSLocationAlwaysAndWhenInUseUsageDescription": "Field Drop uses background location to notify you about matches when traveling to venues.",
  "NSMicrophoneUsageDescription": "Field Drop needs microphone access to record audio with your match videos."
}
```

---

### 10. No Restore Purchases Functionality

**Severity:** MEDIUM - Will cause rejection if monetization enabled
**Affects:** Apple App Store

**Issue:** ShopScreen shows merchandise but no "Restore Purchases" button exists.

**Apple Guideline:** 3.1.1 - Apps with in-app purchases must include restore functionality.

**Note:** Current implementation uses external checkout (Printify), so this may not apply. However, if any subscription/premium features are added:

**Required Actions:**
- [ ] Add "Restore Purchases" button in Settings
- [ ] Implement purchase restoration logic
- [ ] Test restoration flow before submission

---

### 11. No Crash Reporting / Analytics

**Severity:** MEDIUM - Operational risk
**Affects:** Both stores (indirectly)

**Issue:** No crash reporting SDK found. App crashes won't be tracked.

**Recommendation:**
- [ ] Add Sentry, Bugsnag, or Firebase Crashlytics
- [ ] Implement error boundary components
- [ ] Add performance monitoring

---

### 12. AI Service Data Disclosure

**Severity:** MEDIUM - New requirement
**Affects:** Apple App Store

**Issue:** App uses AI video processing but doesn't disclose this to users.

**Apple Guideline (Nov 2025):** Apps using external AI services must show consent modal specifying provider and data types.

**Required Actions:**
- [ ] Add consent modal before video upload explaining AI processing
- [ ] Specify what data is sent (video file, metadata)
- [ ] Allow users to opt-out of AI processing
- [ ] Update privacy policy with AI processing details

---

## Minor Issues (Recommended Fixes)

### 13. Console.log Statements in Production

**Severity:** LOW
**Affects:** Both stores (code quality)

**Issue:** Debug logging visible in codebase:
```typescript
console.log('Push notification token registered:', this.token);
```

**Required Actions:**
- [ ] Remove or conditionally disable console.log statements
- [ ] Use `__DEV__` flag for development-only logging

---

### 14. No App Icons Configured

**Severity:** LOW - Must be added
**Affects:** Both stores

**Issue:** `app.json` has no icon configuration:
```json
"splash": {
  "resizeMode": "contain",
  "backgroundColor": "#0B1220"
}
// No "icon" field
```

**Required Actions:**
- [ ] Create 1024x1024 app icon
- [ ] Add adaptive icon for Android
- [ ] Configure splash screen properly

---

### 15. Missing App Store Screenshots

**Severity:** LOW - Required for submission
**Affects:** Both stores

**Required Actions:**
- [ ] Create screenshots for all required device sizes:
  - iPhone 6.9" (iPhone 16 Pro Max)
  - iPhone 6.7" (iPhone 14 Plus, 15 Plus)
  - iPhone 6.5" (iPhone 11 Pro Max, XS Max)
  - iPhone 5.5" (iPhone 8 Plus)
  - iPad Pro 12.9" (if supporting tablets)
- [ ] Create feature graphic for Google Play (1024x500)

---

## Compliance Checklist Summary

| Requirement | Apple | Google | Status |
|-------------|-------|--------|--------|
| Privacy Policy | Required | Required | MISSING |
| Terms of Service | Required | Recommended | MISSING |
| Account Deletion | Required | Required | MISSING |
| Secure Data Storage | Required | Required | FAILING |
| Content Moderation | Required | Required | MISSING |
| Permission Descriptions | Required | N/A | MISSING |
| Age Rating | Required | Required | INCOMPLETE |
| Bundle ID | Required | Required | PLACEHOLDER |
| App Icon | Required | Required | MISSING |
| Screenshots | Required | Required | NOT CREATED |
| Demo Account Handling | App Review Notes | N/A | IN CODE |
| Restore Purchases | If applicable | N/A | MISSING |
| AI Disclosure | Required (Nov 2025) | N/A | MISSING |

---

## Recommended Submission Timeline

### Phase 1: Critical Fixes (Blockers)
1. Create and host Privacy Policy
2. Create and host Terms of Service
3. Implement Account Deletion feature
4. Remove demo credentials from code
5. Update bundle identifiers
6. Migrate to SecureStore for tokens
7. Add content moderation (report button minimum)
8. Complete age rating questionnaire

### Phase 2: Pre-Submission
1. Add iOS permission descriptions
2. Create app icons
3. Create screenshots
4. Add AI processing consent modal
5. Remove console.log statements
6. Test on physical devices

### Phase 3: Submission
1. Apple: Submit via App Store Connect with demo credentials in Review Notes
2. Google: Submit via Play Console with privacy policy link
3. Monitor review feedback
4. Be prepared for 2-3 revision cycles

---

## Resources

### Apple
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)

### Google
- [Google Play Developer Policy Center](https://play.google/developer-content-policy/)
- [Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Material Design Guidelines](https://material.io/design)

---

## Files Requiring Changes

| File | Changes Required |
|------|-----------------|
| `mobile/app.json` | Bundle IDs, icons, permissions, privacy policy URL |
| `mobile/src/screens/LoginScreen.tsx` | Remove demo credentials |
| `mobile/src/services/api.ts` | Switch to SecureStore |
| `mobile/src/screens/SettingsScreen.tsx` | Add account deletion, privacy/terms links |
| `mobile/src/screens/ProfileScreen.tsx` | Add account deletion option |
| `mobile/src/screens/VideoScreen.tsx` | Add AI consent modal |
| `mobile/src/components/` | Add ReportButton component |
| **NEW** `mobile/src/screens/PrivacyPolicyScreen.tsx` | In-app privacy policy viewer |
| **NEW** `mobile/src/screens/TermsScreen.tsx` | In-app terms viewer |

---

**Report Generated:** January 14, 2026
**Next Review:** After critical fixes implemented
