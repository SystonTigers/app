# Onboarding Pages - Pre-Launch Issues

**Reviewed:** 2025-11-05
**Files:**
- `web/src/app/admin/onboard/page.tsx`
- `web/src/app/onboarding/page.tsx`

---

## 🚨 CRITICAL ISSUES (Must Fix Before Launch)

### 1. **Polling Race Condition** ⚠️ CRITICAL
**Location:** Both pages, `pollProvisioningStatus()` function

**Problem:**
```typescript
const pollProvisioningStatus = async () => {
  // No check if already polling!
  let attempts = 0;
  const poll = async () => { /* ... */ };
  poll(); // Starts new polling loop every time
};
```

- Multiple polling loops can start if function called twice
- No cleanup on component unmount → memory leak
- Continues making API calls even after user navigates away

**Impact:**
- Unnecessary API load
- Possible rate limiting
- Memory leaks

**Fix Required:**
- Add `isPolling` ref to track active polling
- Add cleanup effect with `useEffect` return
- Check ref before starting new poll

---

### 2. **No JWT Expiry Handling** ⚠️ CRITICAL
**Location:** All API calls in both pages

**Problem:**
- JWT issued in Step 1 with 1-year TTL
- No token refresh logic
- If token somehow expires or becomes invalid mid-flow, user gets:
  - Generic error message
  - No guidance to restart
  - Lost progress

**Impact:**
- Poor UX on auth failures
- Users stuck with cryptic errors

**Fix Required:**
- Check for 401 responses
- Show "Session expired, please start over" message
- Optionally: Auto-redirect to step 1

---

### 3. **Double-Submit in handleSubmit** ⚠️ MEDIUM
**Location:** Admin page line 156-158

**Problem:**
```typescript
} catch (err) {
  setError(message);
  setIsSubmitting(false); // ❌ Redundant
} finally {
  setIsSubmitting(false); // ✅ This runs anyway
}
```

**Impact:** Minor - just code smell, not a bug

**Fix Required:** Remove duplicate `setIsSubmitting(false)` from catch block

---

### 4. **Polling Errors Not Distinguished** ⚠️ MEDIUM
**Location:** Both pages, polling catch block

**Problem:**
```typescript
} catch (err) {
  setProvisioningStatus('failed');
  setError('Failed to check provisioning status'); // Generic!
}
```

- Network errors (transient) treated same as auth errors
- No retry mechanism for temporary failures
- User forced to refresh or abandon

**Impact:** Poor UX during network hiccups

**Fix Required:**
- Distinguish error types (network vs auth vs server)
- Add "Retry" button for retryable errors
- Auto-retry network errors with exponential backoff

---

## ⚠️ HIGH PRIORITY (Fix Before Public Launch)

### 5. **No Idempotency Protection**
**Location:** Step 3 submission in both pages

**Problem:**
- User can navigate back to step 3 and resubmit
- Frontend doesn't track "step 3 completed" state
- Relies entirely on backend idempotency

**Impact:**
- Extra API calls
- Confusion if backend returns different response
- Possible duplicate side-effects if backend idempotency fails

**Fix Required:**
- Track `step3Completed` in state
- Show "Already submitted, viewing status" if true
- Disable submit button once completed

---

### 6. **No Component Cleanup**
**Location:** Both pages

**Problem:**
- Polling continues after unmount
- setTimeout references held
- No `useEffect` cleanup

**Impact:**
- Memory leaks
- Unnecessary API calls
- setState warnings if polling finishes after unmount

**Fix Required:**
```typescript
useEffect(() => {
  return () => {
    // Cancel any active polling
    pollingRef.current = false;
  };
}, []);
```

---

### 7. **Back Button During Polling**
**Location:** User onboarding line 340

**Problem:**
```typescript
disabled={submitting || provisioningStatus === "polling"}
```
Good! But admin page handlePrev (line 110) only checks:
```typescript
if (step > 1 && !isSubmitting) setStep(step - 1);
```
Missing check for `provisioningStatus === 'polling'`

**Impact:** User can go back while polling, breaking flow

**Fix Required:** Add polling check to handlePrev

---

## 📋 MEDIUM PRIORITY (Fix Soon After Launch)

### 8. **No Focus Management**
**Problem:**
- When step changes, focus stays on clicked button
- Screen reader users don't know step changed
- No automatic focus on first input of new step

**Fix Required:**
- Focus first input of new step
- Announce step change to screen readers

---

### 9. **Missing aria-live Regions**
**Problem:**
- Status updates don't announce to screen readers
- Polling status changes silently

**Fix Required:**
```typescript
<div aria-live="polite" aria-atomic="true">
  {status && <p>{status}</p>}
</div>
```

---

### 10. **No Keyboard Navigation Hints**
**Problem:**
- Users don't know they can use Tab/Enter
- No visual keyboard focus indicators (might be CSS)

**Fix Required:**
- Add keyboard shortcuts (Enter to continue)
- Ensure focus outlines visible

---

### 11. **Plan Selection Not Keyboard Accessible**
**Location:** Both pages, plan selector buttons

**Problem:**
- Buttons work with keyboard ✅
- But no arrow key navigation
- No role="radiogroup" semantic

**Fix Required:**
- Wrap in `<div role="radiogroup">`
- Add arrow key listeners
- Mark selected with `aria-checked`

---

## 🔧 LOW PRIORITY (Nice to Have)

### 12. **No Progress Persistence**
**Problem:** If user refreshes during signup, all progress lost

**Fix:** Store JWT + step in sessionStorage

---

### 13. **No Loading Skeleton**
**Problem:** During API calls, form just freezes

**Fix:** Add skeleton loaders or spinners

---

### 14. **Error Messages Not Specific Enough**
**Problem:** Generic "Failed to create tenant" doesn't help user

**Fix:** Parse backend error codes:
- SLUG_TAKEN → "That slug is already in use. Try: [suggestion]"
- EMAIL_EXISTS → "Account already exists. Log in instead?"
- INVALID_WEBHOOK_HOST → "Webhook must be from Make.com or Integromat"

---

### 15. **No Rate Limit Feedback**
**Problem:** If user hits rate limit, gets 429 but no retry-after guidance

**Fix:** Parse retry-after header, show countdown timer

---

## 🎯 Accessibility Audit Summary

| Issue | Admin Page | User Page | Priority |
|-------|-----------|-----------|----------|
| role="alert" on errors | ✅ | ❌ | High |
| role="status" on success | ✅ | ❌ | High |
| aria-live regions | ❌ | ❌ | Medium |
| Focus management | ❌ | ❌ | Medium |
| Keyboard navigation | ⚠️ Partial | ⚠️ Partial | Medium |
| Color contrast | ⚠️ Unknown | ⚠️ Unknown | High |
| Screen reader labels | ⚠️ Partial | ⚠️ Partial | Medium |

---

## 📝 Recommended Fix Order

**Before Launch (Today):**
1. Fix polling race condition + cleanup
2. Add JWT expiry handling
3. Fix error distinction + retry mechanism
4. Add step 3 idempotency protection
5. Fix admin page Back button during polling
6. Remove duplicate setIsSubmitting

**Week 1 Post-Launch:**
7. Add focus management
8. Add aria-live regions
9. Improve error messages
10. Add rate limit handling

**Month 1:**
11. Progress persistence
12. Loading skeletons
13. Full accessibility audit
14. E2E tests

---

## 🚀 Quick Win Fixes (< 30 min total)

These can be fixed immediately:

1. Remove duplicate `setIsSubmitting(false)` (30 seconds)
2. Add `provisioningStatus` check to handlePrev (30 seconds)
3. Add `role="alert"` to user page errors (30 seconds)
4. Add `role="status"` to user page status (30 seconds)
5. Disable form inputs during submission (2 minutes)

Total: ~5 minutes

---

## 💡 Code Smell Notes

- Mixing inline styles with className (inconsistent)
- formData vs form naming inconsistency between pages
- Color values should be CSS variables
- generateSlug duplicated in both pages (should be util)
- Magic numbers (40 attempts, 3000ms) should be constants
