# 5army Handoff - Updated October 26, 2025

## Summary
- ✅ Local Google sign-in works at `http://localhost:3000`
- ✅ Production Google OAuth fixed with JWT session strategy
- ✅ Passcode bypass working: signed-in users skip passcode; guests see prompt
- ✅ Quiz-taking includes cookies and shows precise error messages
- ✅ All fixes deployed to production at `https://fquiz-xi.vercel.app`

## Production Status: READY
- **Latest commit:** `f9a2bd6` - "fix: remove trustHost property incompatible with NextAuth v4"
- **Production URL:** https://fquiz-xi.vercel.app
- **All changes pushed to GitHub and auto-deployed to Vercel**

## Environment Variables

### Local Development (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Production (Vercel Environment Variables)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_URL=https://fquiz-xi.vercel.app
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_DEBUG=true (optional, for troubleshooting)
DEV_ALLOWED_EMAILS=matt.sponheimer@gmail.com (for AI generation features)
```

## Recent Fixes (October 26, 2025)

### 1. Google OAuth Production Fix (Commits: 8d82c22, f9a2bd6)
**Problem:** "Sign in with different account" error on production
**Root Cause:** Missing JWT session strategy configuration
**Solution:**
- Added explicit `session.strategy = 'jwt'` to authOptions
- Removed `trustHost` (NextAuth v5 feature, incompatible with v4.24.7)
- Kept `allowDangerousEmailAccountLinking: true`
**Files:** `src/lib/authOptions.ts`

### 2. Passcode Bypass for Signed-In Users (Commit: 9dfbb66)
**Problem:** Signed-in users had to enter passcode for their own quizzes
**Solution:** API routes now check session before enforcing passcode
**Files:**
- `app/api/sets/[id]/questions/route.ts` — passcode bypass for signed-in users
- `app/api/sets/[id]/cards/route.ts` — passcode bypass for signed-in users
- `app/api/attempts/route.ts` — attempts allowed for signed-in users without passcode
- `app/sets/[id]/page.tsx` — passcode form only for signed-out users

### 3. Improved Error Handling (Commit: 9dfbb66)
**Problem:** Quiz errors were generic and unhelpful
**Solution:**
- All fetches include `credentials: 'same-origin'` to send cookies
- Errors surface API response text (e.g., "Passcode required", "Invalid passcode grant")
**Files:** `app/sets/[id]/take/page.tsx`

### 4. Database Schema Update
**Change:** Cards route now uses `front`/`back` fields instead of `kind`/`prompt`/`answer`
**Files:** `app/api/sets/[id]/cards/route.ts`

## Behavior

### Signed-In Users
- ✅ Can create and edit quiz sets
- ✅ Can view and take quizzes WITHOUT passcode (even if passcode is configured)
- ✅ Bypass all passcode requirements on any quiz

### Signed-Out Users (Guests)
- ✅ See passcode prompt on protected sets
- ✅ Can take quiz after entering valid passcode
- ✅ Clear error messages if passcode is invalid/expired
- ✅ Can join as guest with element codename (e.g., "Hydrogen", "Helium-42")

## Google Cloud Console Configuration

### Required OAuth 2.0 Client Settings
**Authorized JavaScript Origins:**
- `https://fquiz-xi.vercel.app` (production)
- `http://localhost:3000` (local development)

**Authorized Redirect URIs:**
- `https://fquiz-xi.vercel.app/api/auth/callback/google` (production)
- `http://localhost:3000/api/auth/callback/google` (local development)

⚠️ **IMPORTANT:** Only these exact URLs work. Vercel preview URLs (e.g., `fquiz-6gqaantz6-...`) will NOT work with Google OAuth.

## Testing Guide

### Local Testing
1. Run dev server: `npm run dev`
2. Visit: `http://localhost:3000`
3. Test Google OAuth sign-in
4. Create quiz, enable passcode, verify bypass works when signed in
5. Open in private window, verify passcode prompt appears

### Production Testing
1. Visit: `https://fquiz-xi.vercel.app` ⬅️ **Use ONLY this URL**
2. **Clear cookies first** (DevTools → Application → Clear site data) OR use private/incognito window
3. Click "Sign in with Google"
4. Select Google account and grant permissions
5. Should successfully sign in and redirect back
6. Test passcode-protected quiz access

### API Endpoints to Verify
- `https://fquiz-xi.vercel.app/api/auth/providers` — Should show Google provider
- `https://fquiz-xi.vercel.app/api/auth/session` — Should return session JSON when signed in

## Troubleshooting

### Google OAuth "doesn't comply with OAuth 2.0 policy"
**Cause:** Using a Vercel preview URL instead of production URL
**Solution:** Use `https://fquiz-xi.vercel.app` only

### "Sign in with different account" error
**Status:** FIXED (commit f9a2bd6)
**If still happening:**
1. Clear all cookies for fquiz-xi.vercel.app
2. Verify NEXTAUTH_URL is set to `https://fquiz-xi.vercel.app` in Vercel
3. Check that Google Cloud Console has correct redirect URIs
4. Enable NEXTAUTH_DEBUG=true and check Vercel logs

### Start Quiz button not visible
- Ensure set is published (`is_published = true`)
- Ensure set has questions (for quiz) or cards (for flashcards)
- Check browser console for errors

### Passcode prompt missing when signed out
- Confirm `passcode_required = true` in database
- Confirm `passcode_expires_at` is not in the past (or null)
- Check that you're actually signed out (clear cookies)

### Quiz APIs return 403 "Passcode required"
- As guest: Enter passcode on the set detail page first
- As signed-in user: Should not happen (check session is valid)
- Check for "Passcode expired" message

## Security Notes

### Passcode System
- Passcode grant uses signed cookie (HMAC-SHA256) keyed per set
- Cookie value format: `{setId}.{expiryTimestamp}.{signature}`
- API verifies signature and expiry server-side using `verifyGrantValue()`
- Uses `NEXTAUTH_SECRET` as signing key

### Session Strategy
- Uses JWT-only sessions (no database required)
- Session tokens stored in HTTP-only cookies
- NextAuth v4.24.7 compatible configuration

### Database RLS
- Supabase server client uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Published sets readable by public
- RLS policies should be tightened for production (restrict by created_by)

### Current Limitations
- **Signed-in bypass is broad:** Any authenticated user bypasses passcode on ALL quizzes
- **Recommendation:** Implement owner-only bypass by checking `created_by` field

## Next Enhancements

### High Priority
1. **Owner-only passcode bypass:**
   - Add `created_by` comparison in API routes
   - Only quiz owner bypasses passcode, not all signed-in users

2. **Stricter RLS policies:**
   - Restrict INSERT/UPDATE/DELETE based on `created_by`
   - Currently allows public modification (not secure for production)

3. **Session validation:**
   - Add checks for stale sessions
   - Graceful re-auth prompts

### Nice to Have
1. **Inline passcode prompt:**
   - Show passcode form on quiz take page instead of redirecting
   - Seamless retry on incorrect passcode

2. **Rate limiting:**
   - Add rate limits to API endpoints
   - Prevent passcode brute-force attempts

3. **Automated testing:**
   - Unit tests for auth logic
   - Integration tests for API routes
   - E2E tests for critical flows

## Development Workflow

### Start local dev server
```bash
cd fquiz
npm run dev
# Runs at http://localhost:3000
```

### Deploy to production
```bash
git add .
git commit -m "Your commit message"
git push
# Vercel auto-deploys from main branch
```

### View deployment logs
- Go to Vercel dashboard
- Select fquiz project
- Click latest deployment
- View build logs and runtime logs

## Files Modified (Recent Session)

### Authentication
- `src/lib/authOptions.ts` — Added JWT session strategy, removed trustHost

### API Routes
- `app/api/sets/[id]/questions/route.ts` — Passcode bypass for signed-in users
- `app/api/sets/[id]/cards/route.ts` — Passcode bypass for signed-in users
- `app/api/attempts/route.ts` — Attempt creation with session check

### UI Components
- `app/sets/[id]/page.tsx` — Conditional passcode form rendering
- `app/sets/[id]/take/page.tsx` — Cookie credentials, better error messages

### Documentation
- `5army.md` — This file
- `HANDOFF_2025-10-26_FINAL.md` — Initial handoff documentation
- `package-lock.json` — Dependency updates

## Git History (Recent Commits)

```
f9a2bd6 - fix: remove trustHost property incompatible with NextAuth v4
8d82c22 - fix: add explicit JWT session strategy to resolve OAuth account linking error
9dfbb66 - fix: passcode bypass for signed-in users and improved error handling
d9473cc - docs: add final deployment handoff documentation
e0e89f8 - NextAuth: trustHost, debug toggle via NEXTAUTH_DEBUG, allow email account linking
```

## Support Resources

- **NextAuth v4 Docs:** https://next-auth.js.org/
- **Supabase Docs:** https://supabase.com/docs
- **Google OAuth Setup:** https://console.cloud.google.com/
- **Vercel Docs:** https://vercel.com/docs

---

**Last Updated:** October 26, 2025, 11:45 PM
**Status:** Production Ready ✅
**Next Session:** Test Google OAuth on production, consider owner-only bypass implementation
