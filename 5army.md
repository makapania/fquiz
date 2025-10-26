# 5army Handoff

## Summary
- Local Google sign-in works and the dev server runs at `http://localhost:3000`.
- Quiz access rules corrected: signed-in users bypass passcode; signed-out users see the passcode prompt.
- Quiz-taking fetches include cookies and show precise error messages when something fails.

## Environment
- `.env.local` includes:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXTAUTH_URL=http://localhost:3000`
  - `NEXTAUTH_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Dev server: `npm run dev` from repo root (`fquiz`).

## Recent Changes
- Passcode bypass for signed-in users:
  - `GET /api/sets/[id]/questions` enforces passcode only when signed out.
  - `GET /api/sets/[id]/cards` enforces passcode only when signed out.
  - `POST /api/attempts` allows signed-in users to create attempts without passcode.
- UI gating:
  - `app/sets/[id]/page.tsx` shows passcode form only when signed out; signed-in users see Start Quiz.
- Quiz-taking page improvements:
  - All fetches send cookies via `credentials: 'same-origin'`.
  - Errors surface response text (e.g., “Passcode required”, “Invalid passcode grant”, “Passcode expired”).

## Behavior
- Signed-in users can view and take their quizzes even when a passcode is configured.
- Signed-out users are challenged for a passcode on the set page if required; after a valid passcode, they can start the quiz.
- If a passcode is expired or missing for guests, the error is clear and shown on-screen.

## Test Plan
- Auth verification:
  - Visit `http://localhost:3000/api/auth/providers` and `http://localhost:3000/api/auth/session` to confirm Google provider and session status.
- Signed-in flow:
  - Open `http://localhost:3000/sets/<id>`; confirm Start Quiz is visible.
  - Start Quiz, answer questions, submit; observe the results summary.
- Signed-out flow (with passcode enabled):
  - Visit the same set page; confirm passcode prompt appears.
  - Enter passcode; Start Quiz appears; proceed and complete the quiz.
- Error visibility:
  - If any request fails, the page shows the specific error text returned by the API.

## Production Prep
- Set `NEXTAUTH_URL` to your production domain (e.g., `https://yourdomain.com`) and ensure `NEXTAUTH_SECRET` is strong.
- In Google Cloud Console, add production OAuth URLs:
  - Authorized origin: your production domain.
  - Authorized redirect: `https://yourdomain.com/api/auth/callback/google`.
- Apply Supabase migrations and confirm RLS policies match `supabase/migrations`.
- Verify production environment variables match `.env.local`.

## Security Notes
- Passcode grant uses a signed cookie keyed per set; the API verifies the grant and expiry server-side.
- The Supabase server client uses `SUPABASE_SERVICE_ROLE_KEY` for inserts (bypasses RLS for writes while keeping explicit server checks).
- Signed-in bypass is broad (any authenticated user bypasses passcode). Prefer owner-only bypass if stricter control is needed.

## Troubleshooting
- Start Quiz not visible:
  - Ensure the set is published and has questions.
- Passcode prompt missing when signed out:
  - Confirm `passcode_required=true` and `passcode_expires_at` is not in the past.
- Quiz APIs return 403:
  - As a guest, enter the passcode on the set page first.
  - Look for “Passcode expired”; update passcode expiry if needed.
- Google sign-in fails:
  - Reconfirm `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and OAuth URLs.
  - Check `http://localhost:3000/api/auth/session` for session details.

## Next Enhancements
- Owner-only bypass:
  - Add `created_by` to `sets` and compare against the authenticated user when enforcing passcode.
- Passcode UX:
  - Inline passcode prompt on the take page with seamless retry instead of redirect.
- Session robustness:
  - Guard against stale sessions; prompt re-auth gracefully.

## Files Touched
- `app/api/sets/[id]/questions/route.ts` — passcode bypass for signed-in users.
- `app/api/sets/[id]/cards/route.ts` — passcode bypass for signed-in users.
- `app/api/attempts/route.ts` — attempts allowed for signed-in users without passcode.
- `app/sets/[id]/page.tsx` — passcode form only for signed-out users.
- `app/sets/[id]/take/page.tsx` — cookies on fetches; improved error messaging.