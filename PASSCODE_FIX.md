# Passcode Gating Bug Fix

## Problem Description

Two related issues with passcode gating:

1. **When logged in**: Got "invalid passcode" error when trying to access quiz content
2. **When logged out with passcode enabled**: No passcode challenge appeared, making quiz impossible to access

## Root Cause

In `app/sets/[id]/page.tsx`, the passcode validation was **checking if the cookie existed** but **not verifying the cryptographic signature**.

```typescript
// OLD CODE (BUGGY)
const passCookie = cookies().get(`set_pass_ok_${params.id}`);
const needsPass = !!set.passcode_required && (!passCookie || isExpired);
// Only checked if cookie exists, didn't verify signature!
```

**Why this caused issues:**
- When `NEXTAUTH_SECRET` changed (which we just did for security), all existing cookies became **invalid** because they were signed with the old secret
- The page saw the old cookie and thought "passcode OK" ✓
- But the API routes properly verified the signature and rejected it ✗
- Result: Page showed content, but API calls failed with 403

**The second issue (no challenge when logged out):**
- Same root cause - if an invalid/old cookie existed, the page thought passcode was satisfied
- Never showed the PasscodeForm

## The Fix

Updated `app/sets/[id]/page.tsx` to properly verify the signed cookie value:

```typescript
// NEW CODE (FIXED)
import { grantCookieName, verifyGrantValue } from '@/lib/passcodeGrant';

// ...

const cookieName = grantCookieName(params.id);
const passCookie = cookies().get(cookieName);

let hasValidPasscode = false;
if (passCookie) {
  const verification = verifyGrantValue(passCookie.value, params.id);
  hasValidPasscode = verification.ok && !verification.expired;
}

const isExpired = !!set.passcode_expires_at && new Date(set.passcode_expires_at) < new Date();
const needsPass = !!set.passcode_required && !hasValidPasscode;
```

**Changes:**
1. Import `grantCookieName` and `verifyGrantValue` from passcodeGrant library
2. Use `grantCookieName()` to get consistent cookie name
3. **Verify the signature** using `verifyGrantValue()`
4. Check both `verification.ok` (signature valid) and `!verification.expired` (not expired)
5. Only skip passcode challenge if cookie is valid

## Testing Steps

1. **Clear all cookies** for localhost:3000 (old invalid cookies will cause issues)
2. **Restart dev server** to pick up changes
3. **Test logged out flow:**
   - Navigate to a set with passcode enabled
   - Should see PasscodeForm
   - Enter incorrect passcode → should show error
   - Enter correct passcode → should unlock content
   - Refresh page → should remain unlocked (cookie still valid)
4. **Test logged in flow:**
   - Sign in with Google
   - Navigate to passcode-protected set
   - Should NOT see passcode challenge (can skip for authenticated users if desired)
   - Should be able to access quiz/study without errors

## Files Modified

- `app/sets/[id]/page.tsx` - Added proper cookie signature verification

## Related Files (Already Working Correctly)

- `app/api/sets/[id]/questions/route.ts` - Already verified signatures ✓
- `app/api/sets/[id]/cards/route.ts` - Already verified signatures ✓
- `src/lib/passcodeGrant.ts` - Cryptographic functions ✓
- `app/api/sets/[id]/passcode/route.ts` - Sets the signed cookie ✓

## Important Note

**Always clear cookies after changing `NEXTAUTH_SECRET`** because:
- All existing signed cookies become invalid
- The signature verification will fail
- Old cookies will prevent new passcode challenges from appearing
