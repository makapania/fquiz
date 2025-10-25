# FQuiz Deployment Handoff - Complete Setup Guide

**Date:** January 2025
**Status:** ✅ Successfully deployed to Vercel
**Production URL:** Your Vercel deployment URL
**Developer:** matt.sponheimer@gmail.com

---

## 🎉 Current Status

The application is **fully deployed and working** on Vercel with:
- ✅ Google OAuth authentication
- ✅ Supabase database with RLS policies
- ✅ Manual flashcard/question creation
- ✅ AI-powered content generation (for developers)
- ✅ Background music toggle
- ✅ Mobile-responsive UI

---

## 📋 Architecture Overview

### Tech Stack
- **Frontend:** Next.js 14 (App Router)
- **Authentication:** NextAuth.js (Google OAuth only)
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Deployment:** Vercel
- **AI Providers:** OpenAI, Anthropic, Google Gemini, Z.ai, OpenRouter

### Key Features
- **Flashcards:** Create, study, and manage flashcard sets
- **Quizzes:** Multiple-choice questions with instant feedback
- **AI Generation:** Developer-only AI content generation
- **Music Toggle:** Background music with localStorage preference

---

## 🔧 Environment Variables

### Required for All Environments

#### NextAuth (Authentication)
```bash
NEXTAUTH_URL=http://localhost:3004  # Local: http://localhost:3004, Prod: https://your-domain.vercel.app
NEXTAUTH_SECRET=<random-string-20+-chars>  # Generate with: openssl rand -base64 32
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
```

#### Supabase (Database)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>  # Public key
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # Secret key - CRITICAL for bypassing RLS!
```

#### Optional AI Provider Keys (for AI generation)
```bash
OPENAI_API_KEY=<optional>
ANTHROPIC_API_KEY=<optional>
GOOGLE_GENAI_API_KEY=<optional>
OPENROUTER_API_KEY=<optional>
ZAI_API_KEY=<optional>
```

### ⚠️ CRITICAL: Service Role Key
**The `SUPABASE_SERVICE_ROLE_KEY` MUST be the service role key, NOT the anon key!**

To get it:
1. Supabase Dashboard → Settings → API
2. Under "Project API keys", copy the **`service_role` secret**
3. This key bypasses Row Level Security (RLS) for server-side operations

---

## 🚀 Deployment History & Fixes

### Recent Commits (Latest to Oldest)

**`c3fff3e`** - Add error checking for missing Supabase environment variables
- Added validation for `SUPABASE_SERVICE_ROLE_KEY`
- Added clear error messages if env vars are missing
- Fixed RLS bypass configuration

**`f2c6454`** - Add MusicToggle component and audio files
- Background music toggle feature
- Fixed build error: "Module not found './components/MusicToggle'"

**`b172734`** - Remove duplicate SessionProviders causing NextAuth to fail
- Fixed Google sign-in not appearing
- Removed conflicting SessionProviders from components
- Single SessionProvider at app root level

**`8fa86f8`** - Fix NextAuth SessionProvider missing in production
- Added Providers.tsx wrapper component
- Fixed "Cannot destructure property 'data' of 'useSession()'" error

**`3d62e7a`** - Wrap useSearchParams in Suspense boundary
- Fixed Next.js prerendering error

**`9fd9733`** - Fix questions UI: add missing stem field and reorganize layout
- Added missing "Question" input field for manual question creation
- Reorganized UI to match flashcards (manual form first, AI below)

**`be21838`** - Add RLS policies for INSERT/UPDATE/DELETE operations
- Created migration `0004_rls_insert_policies.sql`
- Fixed "new row violates row-level security policy" errors

**`560cae9`** - Add missing flashcard editing state variables

**`d13d904`** - Fix missing state variables in ContentEditor component

**`51f5bfd`** - Add missing AI provider functions for Google and OpenRouter

---

## 🗄️ Database Setup

### Supabase Tables
- `sets` - Flashcard/quiz sets
- `cards` - Flashcard content
- `questions` - Quiz questions
- `users` - User accounts
- `attempts` - Quiz attempts
- `responses` - Quiz responses
- `uploads` - File uploads for AI generation
- `ai_jobs` - AI generation jobs

### RLS Policies Applied

**Migration:** `supabase/migrations/0004_rls_insert_policies.sql`

All tables have policies for:
- ✅ SELECT (read published content)
- ✅ INSERT (create new content)
- ✅ UPDATE (modify content)
- ✅ DELETE (remove content)

**How to Apply:**
1. Supabase Dashboard → SQL Editor → New Query
2. Copy contents of `supabase/migrations/0004_rls_insert_policies.sql`
3. Run the query

**Verify Policies:**
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('sets', 'cards', 'questions')
ORDER BY tablename, policyname;
```

See `VERIFY_RLS.md` for detailed verification steps.

---

## 🔐 Google OAuth Setup

### Local Development
**Authorized redirect URI:**
```
http://localhost:3004/api/auth/callback/google
```

### Production
**Authorized redirect URI:**
```
https://your-vercel-domain.vercel.app/api/auth/callback/google
```

### Setup Steps
1. Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs (both local and production)
4. Copy Client ID and Client Secret to environment variables
5. **Important:** The secret is shown only once during creation

---

## 🎨 UI/UX Features

### Flashcards Section
- **Manual Creation:** Add term, answer, explanation
- **AI Generation:** Generate flashcards from prompt or file upload
- **Editing:** Inline editing of existing flashcards
- **Study Mode:** Flip cards to reveal answers

### Quiz Section
- **Manual Creation:** Add question (stem), 4 choices, correct answer, explanation
- **AI Generation:** Generate MCQ questions from prompt or file upload
- **Take Quiz:** Interactive quiz with instant feedback
- **Results:** Score tracking and performance analytics

### Music Toggle
- Bottom-right corner button
- Preference saved in localStorage
- Volume: 15%, Looped playback
- Audio files: `public/audio/Game On!.mp3`, `public/audio/Web App Groove.mp3`

---

## 👨‍💻 Developer Features

### AI Generation Access
**Gated to:** `matt.sponheimer@gmail.com` with password `makapansgat`

To enable AI generation:
1. Sign in with Google (matt.sponheimer@gmail.com)
2. Enter developer password in the password field
3. "Developer mode enabled" will appear
4. AI generation buttons become active

### AI Providers Supported
- **Basic:** Uses default OpenAI key from env
- **OpenAI:** GPT-4, GPT-3.5, etc.
- **Anthropic:** Claude models
- **Google Gemini:** gemini-1.5-flash, etc.
- **Z.ai:** glm-4.6, etc.
- **OpenRouter:** Access to multiple models

### BYO API Keys
Users can provide their own API keys (stored in localStorage with "Remember my AI keys" option)

---

## 🐛 Troubleshooting Guide

### Issue: "new row violates row-level security policy"

**Cause:** `SUPABASE_SERVICE_ROLE_KEY` is missing or incorrect

**Fix:**
1. Vercel → Settings → Environment Variables
2. Verify `SUPABASE_SERVICE_ROLE_KEY` exists
3. Make sure it's the **service role key** (NOT anon key)
4. Delete and re-add if needed
5. Redeploy without cache

### Issue: Google sign-in button doesn't appear

**Cause:** NextAuth SessionProvider missing or duplicated

**Fix:**
- ✅ Should have ONE SessionProvider in `app/layout.tsx`
- ❌ Remove from individual components
- Check `app/components/Providers.tsx` exists

### Issue: "Cannot destructure property 'data' of 'useSession()'"

**Cause:** Multiple nested SessionProviders

**Fix:**
- Only one SessionProvider at app root (`app/layout.tsx`)
- Remove from `EditorWithSession.tsx` and `WelcomeWithSession.tsx`

### Issue: Module not found errors in Vercel build

**Cause:** Files exist locally but not committed to git

**Fix:**
```bash
git status  # Check for untracked files
git add <missing-files>
git commit -m "Add missing files"
git push
```

### Issue: AI generation not working

**Cause:** Developer mode not enabled or missing API keys

**Fix:**
1. Sign in with `matt.sponheimer@gmail.com`
2. Enter developer password: `makapansgat`
3. Provide API key or use env key for "basic" provider

---

## 📁 Key Files & Structure

```
fquiz/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth endpoint
│   │   └── sets/
│   │       ├── route.ts                   # Create sets
│   │       └── [id]/
│   │           ├── cards/route.ts         # CRUD cards
│   │           ├── questions/route.ts     # CRUD questions
│   │           └── generate/
│   │               ├── cards/route.ts     # AI flashcard generation
│   │               └── questions/route.ts # AI question generation
│   ├── components/
│   │   ├── Providers.tsx                  # SessionProvider wrapper
│   │   ├── MusicToggle.tsx                # Music control
│   │   └── WelcomeWithSession.tsx         # Auth UI
│   ├── sets/
│   │   ├── [id]/
│   │   │   ├── page.tsx                   # Set detail view
│   │   │   ├── ContentEditor.tsx          # Main editor component
│   │   │   └── EditorWithSession.tsx      # Session wrapper
│   │   └── new/page.tsx                   # Create new set
│   ├── layout.tsx                         # Root layout with SessionProvider
│   └── page.tsx                           # Homepage
├── src/lib/
│   ├── authOptions.ts                     # NextAuth configuration
│   ├── aiProviders.ts                     # AI generation functions
│   └── supabaseClient.ts                  # Supabase clients (browser/server)
├── supabase/migrations/
│   ├── 0001_init.sql                      # Initial schema
│   ├── 0003_rls_sets.sql                  # Initial RLS policies
│   ├── 0004_rls_insert_policies.sql       # INSERT/UPDATE/DELETE policies
│   └── README.md                          # Migration instructions
├── public/audio/
│   ├── Game On!.mp3                       # Background music
│   └── Web App Groove.mp3                 # Alternative music
├── HANDOFF_NOTES.md                       # Original handoff notes
├── VERIFY_RLS.md                          # RLS verification guide
└── DEPLOYMENT_HANDOFF.md                  # This file
```

---

## 🔄 Deployment Workflow

### For Code Changes:

1. **Make changes locally**
2. **Test locally:**
   ```bash
   npm run dev
   # Visit http://localhost:3004
   ```
3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```
4. **Vercel auto-deploys** from main branch
5. **Check deployment:** Vercel Dashboard → Deployments

### For Environment Variable Changes:

1. **Update in Vercel:**
   - Vercel Dashboard → Settings → Environment Variables
   - Add/Edit/Delete as needed
2. **Redeploy:**
   - Deployments → Latest → ⋯ → Redeploy
   - **Uncheck** "Use existing Build Cache"

### For Database Schema Changes:

1. **Write migration SQL** in `supabase/migrations/`
2. **Apply in Supabase:**
   - Supabase Dashboard → SQL Editor
   - Run migration SQL
3. **Test thoroughly** before deploying code changes
4. **Commit migration file** to git for documentation

---

## 📊 Testing Checklist

### Authentication
- [ ] Local: Sign in with Google works
- [ ] Production: Sign in with Google works
- [ ] Session persists across page reloads
- [ ] Sign out works correctly

### Flashcards
- [ ] Create new flashcard set
- [ ] Add flashcards manually
- [ ] Edit existing flashcards
- [ ] Delete flashcards
- [ ] Study mode works (flip cards)

### Quizzes
- [ ] Create new quiz set
- [ ] Add questions manually (all fields visible)
- [ ] Edit existing questions
- [ ] Delete questions
- [ ] Take quiz and see results

### AI Generation (Developer Only)
- [ ] Sign in with matt.sponheimer@gmail.com
- [ ] Enter developer password
- [ ] Generate flashcards from prompt
- [ ] Generate questions from prompt
- [ ] Upload file and generate content

### UI/UX
- [ ] Music toggle appears and works
- [ ] Responsive design on mobile
- [ ] No console errors
- [ ] All navigation links work

---

## 🔒 Security Notes

### Secrets Management
- ✅ All secrets in `.env.local` (gitignored)
- ✅ All secrets configured in Vercel Environment Variables
- ❌ Never commit `.env.local` or credentials to git
- ❌ Never expose service role key in client-side code

### Developer Access
- AI generation gated to `matt.sponheimer@gmail.com`
- Password: `makapansgat` (hardcoded in `ContentEditor.tsx:12`)
- Consider moving to environment variable for easier rotation

### RLS Security
- Public can read published sets
- Server-side operations use service role key (bypasses RLS)
- Consider restricting INSERT/UPDATE/DELETE policies based on user auth in future

---

## 🎯 Future Improvements

### Short Term
- [ ] Add user authentication-based RLS policies
- [ ] Move developer password to environment variable
- [ ] Add error boundary components
- [ ] Improve mobile navigation

### Medium Term
- [ ] Add user dashboard
- [ ] Track quiz scores and progress
- [ ] Add spaced repetition for flashcards
- [ ] Support for multiple AI models per user

### Long Term
- [ ] Multi-user collaboration on sets
- [ ] Public set sharing
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)

---

## 📞 Support & Resources

### Documentation
- **Next.js:** https://nextjs.org/docs
- **NextAuth:** https://next-auth.js.org
- **Supabase:** https://supabase.com/docs
- **Vercel:** https://vercel.com/docs

### Helpful Commands
```bash
# Local development
npm run dev

# Build for production
npm run build

# Type checking
npx tsc --noEmit

# Generate random secret
openssl rand -base64 32

# Check git status
git status

# View recent commits
git log --oneline -10
```

---

## ✅ Final Verification

After reading this document, verify:

1. **Environment Variables:**
   - [ ] All 7 required variables set in Vercel
   - [ ] SUPABASE_SERVICE_ROLE_KEY is service role (not anon)
   - [ ] NEXTAUTH_URL matches production domain

2. **Database:**
   - [ ] All migrations applied
   - [ ] RLS policies exist (run verify query)
   - [ ] Can create sets/cards/questions without errors

3. **Authentication:**
   - [ ] Google OAuth configured for production URL
   - [ ] Can sign in successfully
   - [ ] Session works across pages

4. **Deployment:**
   - [ ] Latest code pushed to GitHub
   - [ ] Vercel auto-deployment working
   - [ ] Production site accessible

---

**Handoff Complete!** 🎉

All code is committed to: `https://github.com/makapania/fquiz`
Latest commit: `c3fff3e` (or newer)

For questions or issues, refer to this document and the troubleshooting section.
