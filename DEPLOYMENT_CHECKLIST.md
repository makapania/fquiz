# Production Deployment Checklist

## Critical: Environment Variables

Your production deployment **MUST** have these environment variables set, or the app won't work:

### Required for Authentication (Login Button to Appear)
```bash
NEXTAUTH_URL=https://your-production-domain.vercel.app
NEXTAUTH_SECRET=<strong-random-secret>  # Use the same one from .env.local or generate new
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

**Note:** Copy the actual values from your `.env.local` file. Don't commit secrets to git!

### Required for Database
```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

**Note:** Copy the actual values from your `.env.local` file.

### Required for AI Features
```bash
OPENROUTER_API_KEY=<your-openrouter-key>
GOOGLE_GENAI_API_KEY=<your-google-genai-key>
```

**Note:** Copy the actual values from your `.env.local` file.

### Optional
```bash
APP_NAME=FQuiz
```

---

## Google OAuth Console Setup for Production

**CRITICAL:** You must update Google Cloud Console with production URLs:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client (the one matching your GOOGLE_CLIENT_ID)
3. Click "Edit"
4. **Add** to Authorized JavaScript origins:
   ```
   https://your-production-domain.vercel.app
   ```
   Keep `http://localhost:3000` for local dev

5. **Add** to Authorized redirect URIs:
   ```
   https://your-production-domain.vercel.app/api/auth/callback/google
   ```
   Keep `http://localhost:3000/api/auth/callback/google` for local dev

6. Click **SAVE**

---

## Why Login Button Won't Appear in Production

The login button only appears if:
1. `GOOGLE_CLIENT_ID` is set ✓
2. `GOOGLE_CLIENT_SECRET` is set ✓
3. NextAuth can initialize the Google provider ✓

**If the button is missing in production:**
- Check environment variables are set in your hosting platform (Vercel/etc)
- Check browser console for errors
- Visit `/api/auth/providers` to see if Google is listed

---

## Deployment Steps (Vercel Example)

### 1. Push to GitHub
```bash
git add .
git commit -m "Fix: Google OAuth and passcode verification"
git push origin main
```

### 2. In Vercel Dashboard
1. Go to your project → Settings → Environment Variables
2. Add ALL variables from the "Required" sections above
3. **Important:** Set `NEXTAUTH_URL` to your production domain
4. Redeploy

### 3. Update Google OAuth Console
- Add production URLs (see section above)

### 4. Test Production
1. Visit your production site
2. Check login button appears
3. Test Google sign-in flow
4. Check browser console for errors

---

## Troubleshooting Production Issues

### Issue: Login button missing
**Cause:** Missing `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` in production env vars
**Fix:** Add them in hosting platform settings and redeploy

### Issue: "Configuration Error" after clicking login
**Cause:** Missing `NEXTAUTH_SECRET` or wrong `NEXTAUTH_URL`
**Fix:** Verify both are set correctly in production

### Issue: "redirect_uri_mismatch" error
**Cause:** Google OAuth Console doesn't have production redirect URI
**Fix:** Add `https://your-domain.com/api/auth/callback/google` to Google Console

### Issue: Login works but database queries fail
**Cause:** Missing Supabase environment variables
**Fix:** Add all Supabase keys to production env vars

### Issue: AI generation doesn't work
**Cause:** Missing AI API keys
**Fix:** Add `OPENROUTER_API_KEY` or `GOOGLE_GENAI_API_KEY` to production

---

## Verification Endpoints

After deployment, test these URLs (replace with your domain):

```bash
# Should return Google provider
https://your-domain.com/api/auth/providers

# Should return session (after login)
https://your-domain.com/api/auth/session

# Should load homepage
https://your-domain.com/
```

---

## Security Notes

1. **NEXTAUTH_SECRET** must be a strong random string (at least 32 characters)
2. Never commit secrets to git (they're in `.env.local` which is gitignored)
3. Use different `NEXTAUTH_SECRET` for production vs development (recommended)
4. Keep `SUPABASE_SERVICE_ROLE_KEY` secure - it has admin access

---

## Post-Deployment

After successful deployment:
1. Test Google login on production
2. Test passcode-protected sets
3. Test quiz/flashcard creation and taking
4. Check that AI generation works (if you use it)
5. Monitor error logs in hosting platform
