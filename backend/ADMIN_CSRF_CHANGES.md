# CSRF Protection Changes for admin.ts

## Step 1: Add Import (Line 8)

**After this line:**
```typescript
import { logJSON } from "../lib/log";
```

**Add:**
```typescript
import { withCsrfProtection } from "../middleware/csrf";
```

---

## Step 2: Update Function Implementations

### Function: updateTenant (Line 131-188)

**BEFORE:**
```typescript
export async function updateTenant(...) {
  try {
    await requireAdmin(req, env);
    const body = await req.json().catch(() => ({}));
    const UpdateSchema = z.object({...});
    const data = parse(UpdateSchema, body);
    // ... rest of function
```

**AFTER:**
```typescript
export async function updateTenant(...) {
  try {
    const claims = await requireAdmin(req, env);
    const body = await req.json().catch(() => ({}));
    
    // ✅ CSRF Protection
    await withCsrfProtection(req, env, body, claims.userId);
    
    const UpdateSchema = z.object({...});
    const data = parse(UpdateSchema, body);
    // ... rest of function
```

---

### Function: createPromoCode (Line 212-262)

**BEFORE:**
```typescript
export async function createPromoCode(...) {
  try {
    await requireAdmin(req, env);
    const body = await req.json();
    // ... validation
```

**AFTER:**
```typescript
export async function createPromoCode(...) {
  try {
    const claims = await requireAdmin(req, env);
    const body = await req.json();
    
    // ✅ CSRF Protection
    await withCsrfProtection(req, env, body, claims.userId);
    
    // ... validation
```

---

### Function: deactivateTenant (Line 264-290)

**BEFORE:**
```typescript
export async function deactivateTenant(...) {
  try {
    await requireAdmin(req, env);
    // ... deactivation logic
```

**AFTER:**
```typescript
export async function deactivateTenant(...) {
  try {
    const claims = await requireAdmin(req, env);
    
    // ✅ CSRF Protection  
    await withCsrfProtection(req, env, undefined, claims.userId);
    
    // ... deactivation logic
```

---

### Function: deleteTenant (Line 292-327)

**BEFORE:**
```typescript
export async function deleteTenant(...) {
  try {
    await requireAdmin(req, env);
    // ... deletion logic
```

**AFTER:**
```typescript
export async function deleteTenant(...) {
  try {
    const claims = await requireAdmin(req, env);
    
    // ✅ CSRF Protection
    await withCsrfProtection(req, env, undefined, claims.userId);
    
    // ... deletion logic
```

---

### Function: deactivatePromoCode (Line 329-351)

**BEFORE:**
```typescript
export async function deactivatePromoCode(...) {
  try {
    await requireAdmin(req, env);
    // ... deactivation logic
```

**AFTER:**
```typescript
export async function deactivatePromoCode(...) {
  try {
    const claims = await requireAdmin(req, env);
    
    // ✅ CSRF Protection
    await withCsrfProtection(req, env, undefined, claims.userId);
    
    // ... deactivation logic
```

---

### Function: upsertPromoCode (Line 476-end)

**BEFORE:**
```typescript
export async function upsertPromoCode(...) {
  try {
    await requireAdmin(req, env);
    const body = await req.json();
    // ... validation
```

**AFTER:**
```typescript
export async function upsertPromoCode(...) {
  try {
    const claims = await requireAdmin(req, env);
    const body = await req.json();
    
    // ✅ CSRF Protection
    await withCsrfProtection(req, env, body, claims.userId);
    
    // ... validation
```

---

## Summary of Changes

**Total changes:** 7
- 1 import added
- 6 functions protected with CSRF

**Functions protected:**
1. ✅ updateTenant
2. ✅ createPromoCode
3. ✅ deactivateTenant
4. ✅ deleteTenant
5. ✅ deactivatePromoCode
6. ✅ upsertPromoCode

**Functions that don't need CSRF (read-only):**
- listTenants (GET)
- getTenant (GET)
- listPromoCodes (GET)
- getAdminStats (GET)
- listUsers (GET)

---

## Testing After Changes

1. **Build check:**
   ```bash
   cd backend
   npm run build
   ```

2. **Lint check:**
   ```bash
   npm run lint
   ```

3. **Manual test:**
   - Try updating a tenant without CSRF token → Should get 403
   - Try with valid CSRF token → Should succeed

---

## Implementation Time

Estimated: 10-15 minutes of careful editing

Or use automated script (next section)
