# Google Authentication Fix Guide

## Summary of Changes Made

### 1. Enhanced NextAuth Configuration (`src/lib/authOptions.ts`)
- ✅ Added comprehensive debug logging for all auth callbacks
- ✅ Added Google OAuth authorization parameters (prompt, access_type, response_type)
- ✅ Implemented redirect callback to ensure staying on localhost:3000
- ✅ Added event handlers for sign-in, sign-out, and session events
- ✅ Enabled debug mode in development

### 2. Strengthened Security (`.env.local`)
- ✅ Generated cryptographically strong NEXTAUTH_SECRET
- ✅ Verified NEXTAUTH_URL is set to `http://localhost:3000`

### 3. Configuration Verification
- ✅ All environment variables present and correct
- ✅ No duplicate dev servers running on port 3004

## Critical Step: Update Google OAuth Console

**You MUST do this manually:**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID: `525411355695-0f01ar2pak0to4s6m5jakjoea35scj2r`
3. Click "Edit" on the client
4. Under **Authorized JavaScript origins**, ensure you have:
   ```
   http://localhost:3000
   ```
   (Remove any entries for `http://localhost:3004` if present - use `http://localhost:3000` instead)

5. Under **Authorized redirect URIs**, ensure you have:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   (Remove any entries for port 3004 if present)

6. Click **Save**

## Testing the Fix

### Step 1: Clear Browser State
Before testing, clear browser cache and cookies for localhost:3000:
- Chrome: DevTools → Application → Storage → Clear site data
- Or use Incognito/Private window

### Step 2: Restart Dev Server
```bash
# Stop any running dev server (Ctrl+C)
npm run dev
```

### Step 3: Test Authentication Flow
1. Navigate to: `http://localhost:3000/api/auth/signin`
2. Click "Sign in with Google"
3. Select your Google account
4. Watch the terminal for `[NextAuth]` debug logs

### Expected Behavior
- URL should stay on `localhost:3000` throughout (never jump to 3004)
- After account selection, should redirect to `http://localhost:3000/api/auth/callback/google`
- Terminal should show:
  ```
  [NextAuth] signIn callback triggered
  [NextAuth] User: your-email@gmail.com
  [NextAuth] Provider: google
  [NextAuth] Redirect callback
  [NextAuth] Session callback
  ```
- Should redirect to homepage with authenticated session

### If It Still Fails
Check terminal for specific error messages:
- "redirect_uri_mismatch" → Google Console settings don't match
- "can't reach this page" → Port mismatch issue
- No logs at all → NextAuth not receiving the callback

## Debugging Commands

### Check session after login
```bash
curl http://localhost:3000/api/auth/session
```

### Check available providers
```bash
curl http://localhost:3000/api/auth/providers
```

### Verify no processes on port 3004
```bash
netstat -ano | findstr :3004
```

## Common Issues & Solutions

### Issue: "redirect_uri_mismatch" error
**Solution:** Google Console redirect URI doesn't match. Must be exactly:
`http://localhost:3000/api/auth/callback/google`

### Issue: Browser redirects to port 3004
**Solution:**
- Clear browser cache/cookies
- Ensure no dev server running on 3004
- Close all browser tabs for localhost

### Issue: "Configuration" error in NextAuth
**Solution:**
- Restart dev server after any `.env.local` changes
- Verify NEXTAUTH_SECRET is set and not empty

### Issue: Callback succeeds but no session created
**Solution:**
- Check terminal logs for errors in session callback
- Verify browser accepts cookies (not in strict privacy mode)

## Next Steps After Auth Works

Once Google login works locally:

1. ✅ Test passcode gating flow on `/sets/[id]`
2. ✅ Verify dynamic routes work correctly
3. 🔄 Configure production environment (Vercel/deployment)
   - Update NEXTAUTH_URL to production domain
   - Add production redirect URI to Google Console
   - Ensure NEXTAUTH_SECRET is set in production env vars

## Files Modified
- `src/lib/authOptions.ts` - Enhanced with debug logging and better OAuth config
- `.env.local` - Strengthened NEXTAUTH_SECRET
- `test-auth-config.js` - New verification script (can run anytime with `node test-auth-config.js`)
