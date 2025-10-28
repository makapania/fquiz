# Development Session Handoff - October 26, 2025

## Summary
This session focused on fixing OAuth authentication issues, quiz attempts API bugs, and passcode security vulnerabilities.

---

## ✅ COMPLETED FIXES

### 1. **OAuth Local Development Port Mismatch** (CRITICAL FIX)
**Problem:** Local OAuth was redirecting to `localhost:3002` instead of `localhost:3000`, causing redirect_uri_mismatch errors.

**Root Cause:** Windows system environment variable `NEXTAUTH_URL=http://localhost:3002` was overriding `.env.local`.

**Solution:** Added runtime override in `src/lib/authOptions.ts` (lines 20-23):
```typescript
// Override NEXTAUTH_URL in development to use port 3000
if (process.env.NODE_ENV === 'development') {
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
}
```

**Status:** ✅ Working - OAuth successfully using port 3000 locally
**Files Modified:** `src/lib/authOptions.ts`

---

### 2. **Quiz Attempts API - "codename" Column Error** (CRITICAL FIX)
**Problem:** Starting a quiz failed with error: "Could not find the 'codename' column of 'attempts' in the schema cache"

**Root Cause:**
- API was trying to insert `codename` field that doesn't exist in `attempts` table
- Response format mismatch: API returned `{ id }` but client expected `{ attempt: { id } }`

**Solution:** Modified `app/api/attempts/route.ts`:
- Line 11: Removed `codename` from destructuring
- Line 48: Removed `codename: codename ?? null` from insert
- Line 56: Changed response from `{ id: attempt.id }` to `{ attempt: { id: attempt.id } }`

**Status:** ✅ Fixed - Quizzes now start successfully
**Files Modified:** `app/api/attempts/route.ts`

---

### 3. **Passcode Bypass Vulnerability** (SECURITY FIX)
**Problem:** ANY signed-in user could bypass passcode-protected quizzes, not just the owner.

**Root Cause:** Logic on line 36 of `app/sets/[id]/page.tsx`:
```typescript
const needsPass = !!set.passcode_required && !hasValidPasscode && !isSignedIn;
```
This allowed all authenticated users to bypass the passcode.

**Solution:** Modified `app/sets/[id]/page.tsx` (lines 21-30, 49):
```typescript
// Check if the signed-in user is the owner of this set
let isOwner = false;
if (isSignedIn && set.created_by) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single();
  isOwner = user?.id === set.created_by;
}

// Only bypass passcode for the owner, not all signed-in users
const needsPass = !!set.passcode_required && !hasValidPasscode && !isOwner;
```

**Status:** ✅ Fixed - Only owners bypass passcode; other users must enter it
**Files Modified:** `app/sets/[id]/page.tsx`

---

### 4. **Passcode Cookie Persistence After Sign-Out** (SECURITY FIX)
**Problem:** After signing out, users could still access passcode-protected quizzes using cached passcode cookies.

**Root Cause:** `signOut()` only cleared NextAuth session cookies, not passcode grant cookies (`set_pass_ok_*`).

**Solution:** Modified `app/components/WelcomeAuth.tsx` (lines 67-81):
```typescript
<button
  className="rounded-md bg-surface px-3 py-2"
  onClick={() => {
    // Clear all passcode grant cookies before signing out
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('set_pass_ok_')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
    signOut();
  }}
>
  Sign out
</button>
```

**Status:** ✅ Fixed - Passcode cookies cleared on sign-out
**Files Modified:** `app/components/WelcomeAuth.tsx`

---

### 5. **Accidental File Reversion** (RECOVERED)
**Problem:** `app/layout.tsx` and `app/page.tsx` were accidentally reverted to old versions in another IDE, removing navigation, sign-in, and recent sets display.

**Solution:** Used `git restore app/layout.tsx app/page.tsx` to recover working versions.

**Status:** ✅ Recovered - All functionality restored
**Files Restored:** `app/layout.tsx`, `app/page.tsx`

---

## 🔍 INVESTIGATED ISSUES

### API Key Storage Location
**Question:** Where are AI provider API keys stored when "Remember my key on this device" is checked?

**Answer:** Stored in browser `localStorage` at key pattern: `fquiz:${email}:keys`
- Example: `fquiz:matt.sponheimer@gmail.com:keys`
- Format: JSON object like `{ openai: "sk-...", anthropic: "sk-...", zai: "..." }`
- Scoped per user email
- User explicitly opts in via checkbox

**Security Assessment:** ⚠️ Moderate risk
- Keys stored in plain text in localStorage (accessible to any JavaScript on the domain)
- Better than cookies (no automatic transmission to server)
- User-controlled opt-in
- **Recommendation:** Consider encryption or move to secure httpOnly cookies

**Implementation Location:** `app/sets/[id]/ContentEditor.tsx` (lines 15, 104-105, 495-499, 699-703)

---

## 📊 GIT STATUS

### Committed Changes (Ready to Push)
**Commit:** `0083bc6` - "fix: resolve local OAuth port mismatch and quiz attempts API issues"
- `src/lib/authOptions.ts` - OAuth port override
- `app/api/attempts/route.ts` - Removed codename column, fixed response format

### Uncommitted Changes (Need to Commit)
- `app/sets/[id]/page.tsx` - Passcode owner-only bypass
- `app/components/WelcomeAuth.tsx` - Clear passcode cookies on sign-out

### Untracked Files
- `.env` - Created during troubleshooting (should NOT commit - add to .gitignore if not already)
- `funkyhom.png` - Mascot image for future branding feature
- `HANDOFF_SESSION_2025-10-26.md` - This document

---

## 🚀 READY TO IMPLEMENT (From Detailed Plan)

### Phase 1: COMPLETED ✅
- OAuth fix
- Attempts API fix
- Passcode security fixes

### Phase 2: User Management (HIGH PRIORITY)
**Feature:** "My Sets" page with delete capability

**Requirements:**
- View only sets created by logged-in user
- Delete own sets with confirmation
- Filter by type (All/Quizzes/Flashcards)
- Sort by date

**Implementation:**
1. Create `app/my-sets/page.tsx`
   - Fetch sets where `created_by = current_user_id`
   - Display grid with set info (title, type, status, count, date)
   - Add delete button with confirmation dialog

2. Create `app/api/sets/[id]/route.ts` DELETE handler
   - Verify user is signed in
   - Verify user owns the set
   - Delete set (CASCADE handles related data)

3. Update navigation
   - Add "My Sets" link in header (when signed in)
   - Place between "Sets" and user menu

**Why Needed:**
- Users can't currently delete old/unwanted sets
- Finding your own sets becomes difficult with 100+ sets in database
- Essential for user content management

### Phase 3: Branding (MEDIUM PRIORITY)
**Feature:** Integrate `funkyhom.png` mascot

**Welcome Page** (`app/page.tsx`):
```tsx
<div className="flex items-center gap-3">
  <Image src="/funkyhom.png" width={48} height={48} alt="FQuiz mascot" />
  <h1 className="text-4xl font-bold">FQuiz</h1>
</div>
```

**Quiz Results** (`app/sets/[id]/take/page.tsx`, lines 255-348):
- **100% score:** Full color, large (120x120), pulse animation, "TOO COOL FOR SCHOOL! 😎"
- **<100% score:** Grayscale, small (80x80), muted, "SUBOPTIMAL"

**Implementation:**
1. Copy `funkyhom.png` to `public/funkyhom.png`
2. Update welcome page with small logo
3. Modify quiz results section with conditional rendering
4. Test different score scenarios

---

## 🔧 DEVELOPMENT ENVIRONMENT

### Server Status
- **Port:** http://localhost:3000
- **Status:** Running (PID varies)
- **Dev Server:** Multiple background bash sessions running (can be cleaned up)

### Key Environment Variables
- `NEXTAUTH_URL` - Now properly set to `http://localhost:3000` in development
- `NEXTAUTH_SECRET` - Set in `.env.local`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth configured
- Google Cloud Console has both port 3000 and 3002 redirect URIs (3002 can be removed)

### Database
- Supabase hosted
- `sets.created_by` - UUID reference to `users.id`
- `attempts` table - Does NOT have `codename` column
- `users` table - Has `email` column for lookups

---

## ⚠️ IMPORTANT NOTES

### User Ownership Lookup Pattern
When checking if a user owns a set:
```typescript
// Session only has email, need to lookup user ID
const { data: user } = await supabase
  .from('users')
  .select('id')
  .eq('email', session.user.email)
  .single();
const isOwner = user?.id === set.created_by;
```

### Passcode Cookie Naming
- Pattern: `set_pass_ok_${setId}`
- Helper: `grantCookieName(setId)` from `@/lib/passcodeGrant`
- Signed with NEXTAUTH_SECRET
- Contains expiration timestamp

### NextAuth Session Structure
```typescript
session.user.email // Available ✅
session.user.name  // Available ✅
session.user.id    // NOT available ❌ (need to lookup from email)
```

---

## 📝 NEXT STEPS

### Immediate (Before Push)
1. ✅ Test passcode fix with multiple user accounts
2. ✅ Test sign-out cookie clearing
3. ⏳ Commit passcode fixes
4. ⏳ Push all commits to GitHub
5. ⏳ Test deployed version on Vercel

### Short-term
1. Implement "My Sets" page with delete functionality
2. Add funkyhom.png branding
3. Clean up multiple background dev server processes
4. Remove port 3002 from Google Cloud Console redirect URIs (no longer needed)

### Future Considerations
1. Encrypt API keys in localStorage or move to secure httpOnly cookies
2. Add user ID to NextAuth session to avoid database lookups
3. Implement proper role-based access control (owner vs admin)
4. Add set sharing/collaboration features

---

## 🐛 KNOWN ISSUES

**None currently!** All critical bugs have been fixed.

---

## 📚 KEY FILES REFERENCE

### Authentication
- `src/lib/authOptions.ts` - NextAuth configuration
- `app/api/auth/[...nextauth]/route.ts` - Auth API route
- `app/components/WelcomeAuth.tsx` - Sign in/out UI

### Passcode System
- `src/lib/passcodeGrant.ts` - Cookie signing/verification
- `app/api/sets/[id]/passcode/route.ts` - Passcode validation API
- `app/sets/[id]/PasscodeForm.tsx` - Passcode entry form

### Quiz/Flashcard Sets
- `app/sets/[id]/page.tsx` - Set detail page (owner check, passcode logic)
- `app/api/attempts/route.ts` - Create quiz attempt
- `app/sets/[id]/take/page.tsx` - Quiz taking interface

### AI Generation
- `app/api/sets/[id]/generate/questions/route.ts` - Generate quiz questions
- `app/api/sets/[id]/generate/cards/route.ts` - Generate flashcards
- `app/sets/[id]/ContentEditor.tsx` - API key storage UI

---

## 💡 TIPS FOR NEXT SESSION

1. **Starting Dev Server:** Kill existing processes first to avoid port conflicts
   ```bash
   netstat -ano | findstr :3000
   taskkill //F //PID <pid>
   npm run dev
   ```

2. **Testing Passcode Logic:**
   - Owner account: matt.sponheimer@gmail.com (bypasses passcode)
   - Other accounts: Must enter passcode
   - Logged out: Must enter passcode

3. **Checking Commits:**
   ```bash
   git log --oneline -5
   git status
   git diff
   ```

4. **Avoiding File Reverts:** Be careful with multiple IDEs open on same project!

---

**End of Handoff Document**
*All critical bugs fixed and tested. Ready for "My Sets" feature implementation.*
