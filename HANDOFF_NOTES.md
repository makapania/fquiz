# FQuiz Handoff Notes

## Overview
- Next.js 14 app with NextAuth (Google-only sign-in)
- AI generation endpoints gated to a developer email/password header
- Supabase for persistence (cards, questions, uploads)

## Latest Changes (main)
- Commit `e0b2c8f`: moved `authOptions` to `src/lib/authOptions.ts`, updated NextAuth route to export only `GET`/`POST`, fixed imports in generate routes.
- Generate routes now import `authOptions` from `@/lib/authOptions` and use valid aiProviders symbols.

## Required Environment Variables
- Common
  - `NEXTAUTH_URL` – local: `http://localhost:3004`, prod: `https://<your-domain>`
  - `NEXTAUTH_SECRET` – strong random string (do not commit)
  - `GOOGLE_CLIENT_ID` – OAuth Client ID (Web)
  - `GOOGLE_CLIENT_SECRET` – OAuth Client Secret (do not commit)
  - `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key
- Optional AI keys (BYO): `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_GENAI_API_KEY`

## Google OAuth Setup
- Local client (Web): Authorized redirect URI: `http://localhost:3004/api/auth/callback/google`
- Production client (Web): Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
- Client Secret note: Google shows the secret only on creation; if the JSON shows an empty `client_secret` but a token appears after the JSON block, that appended token is the actual secret. Always configure secrets via environment variables.

## Vercel Deployment
1. Connect GitHub repo and import the project.
2. Project → Settings → Domains: add production domain.
3. Project → Settings → Environment Variables (Production): set all envs listed above.
4. Redeploy to apply environment changes.

## Key Files
- `app/api/auth/[...nextauth]/route.ts` – exports `GET`/`POST`; imports `authOptions` from `@/lib/authOptions`
- `src/lib/authOptions.ts` – shared NextAuth options (Google provider only)
- `src/lib/aiProviders.ts` – AI generation functions for questions and flashcards
- `app/api/sets/[id]/generate/{questions|cards}/route.ts` – developer-gated AI endpoints

## Testing Checklist
- Auth: Sign in with Google on local and prod; ensure redirect returns to app.
- AI generation: Non-dev users get `403`. Dev email + `x-dev-password` header allows generation.
- DB writes: Verify inserted rows in Supabase for cards/questions.

## Troubleshooting
- Route export error: Ensure `app/api/auth/[...nextauth]/route.ts` only exports `GET`/`POST`.
- Import errors: Use `@/lib/*` for `src` alias; avoid `@/app/*`.
- ESLint deprecation warnings: informational; upgrade later if desired.

## Security
- Never commit secrets or JSON credential files.
- Rotate `NEXTAUTH_SECRET` and OAuth secrets if exposure is suspected.

## Runbook
- Rotate secrets: update in Vercel → redeploy; update local `.env.local` for development.
- Staging option: set a fixed staging domain, create a separate Google OAuth client, and configure `NEXTAUTH_URL` + redirect URI for staging.
