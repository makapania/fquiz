# FQuiz Handoff — Wipe-All and Environment Setup (2025-10-27)

This handoff covers how to configure the environment, use the new Danger Zone “Wipe All Questions & Flashcards” feature, and troubleshoot the “Supabase connection not configured” error. It also includes direct SQL instructions to wipe data from Supabase if needed.

## Summary
- New endpoint: `POST /api/debug/wipe-all` deletes all `cards` and `questions` across every set.
- New UI: A Danger Zone button on `/sets` triggers the wipe and redirects back to `/sets` so the list revalidates.
- Single-set delete: Deletion logic is hardened; the API verifies the row is gone before returning success.

## Environment Setup (.env.local)
Create or update `.env.local` in the project root with:

```
# Supabase — required
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# NextAuth — recommended for sign-in
NEXTAUTH_SECRET=<random-long-string>
# Optional: Google OAuth, if you use Google sign-in
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` must be a service role key; it bypasses RLS server-side. Do not expose this key client-side.
- In development, `NEXTAUTH_URL` is forced to `http://localhost:3000` by the app, so you do not need to set it.

## Run Locally
- Start dev server: `npm run dev`
- Local URL: `http://localhost:3000`

## Wipe-All Usage
1. Sign in (top-right of the app).
2. Navigate to `/sets`.
3. In Danger Zone, click “Wipe All Questions & Flashcards”.
4. You will be redirected back to `/sets`. The page revalidates and item counts update.

Behavior:
- Endpoint returns a redirect to `/sets` and sets header `X-Wipe-Result` with `{ cardsDeleted, questionsDeleted }` (use devtools Network to inspect).
- The sets themselves remain; only their `cards` and `questions` are removed.

## Troubleshooting
- "Supabase connection not configured":
  - Ensure the three Supabase variables in `.env.local` are present and valid.
  - Restart the dev server after changes.
- Wipe-all returns 401 Unauthorized:
  - Sign in first. The endpoint requires an authenticated user.
- Wipe-all returns 500 Server Error:
  - Verify `SUPABASE_SERVICE_ROLE_KEY` is correct.
  - Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` match your Supabase project.
- Deleted items still appear:
  - Use hard refresh. The `/sets` page disables caching and re-fetches, but a stale tab can show old content.

## Single-Set Delete Behavior
- API: `DELETE /api/sets/[id]` now verifies the row actually disappeared. If the delete fails, it returns `500` instead of `200`.
- UI: The delete button sends with `credentials: 'same-origin'` and navigates back to `/sets` followed by a `router.refresh()` to revalidate.

## Direct SQL Wipe (Supabase Dashboard)
If environment is not configured locally, you can wipe data directly in Supabase SQL editor:

Order matters (respect foreign key constraints):
```
-- Remove dependent records first
DELETE FROM responses;
DELETE FROM attempts;

-- Then remove core content
DELETE FROM questions;
DELETE FROM cards;

-- Optional: touch sets so “updated_at” changes and lists re-sort
UPDATE sets SET updated_at = NOW();
```

Scope by set (optional):
```
-- Example: wipe a single set by ID
DELETE FROM responses WHERE attempt_id IN (
  SELECT id FROM attempts WHERE set_id = '<set-id>'
);
DELETE FROM attempts WHERE set_id = '<set-id>';
DELETE FROM questions WHERE set_id = '<set-id>';
DELETE FROM cards WHERE set_id = '<set-id>';
UPDATE sets SET updated_at = NOW() WHERE id = '<set-id>';
```

## Verify Auth
Useful endpoints:
- `GET /api/auth/providers` — see configured providers (e.g., Google)
- `GET /api/auth/session` — confirm current session state

## What Changed (for future reference)
- `app/api/debug/wipe-all/route.ts` — New wipe-all API with auth check and counts
- `app/sets/page.tsx` — Danger Zone button; page disables caching and re-fetches
- `app/api/sets/[id]/route.ts` — Hardened delete with post-delete verification
- `src/lib/supabaseClient.ts` — Server uses `SUPABASE_SERVICE_ROLE_KEY`; browser uses anon key

## Next Steps
- If you intend to permanently fix ownership on legacy sets, consider adding a "Claim Ownership" button that updates `sets.created_by` to the current user.
- Add metrics/logging around deletes and wipes to confirm server-level success in production.

— End of handoff —