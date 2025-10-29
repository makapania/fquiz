# Handoff: Password Reset (Deferred)

Status: Deferred until free email option is chosen. Current behavior stays unchanged: no emails are sent; if a user loses access, recovery is not available yet.

## What’s Already In Place

- Dev-only reset flow implemented for local smoke testing (no DB token columns required).
- UI shows “Forgot password?” and reset page (`/auth/forgot-password` → `/reset-password/[token]`).
- Server endpoints exist:
  - `POST /api/auth/forgot-password` — generates token (dev store fallback) and would send email when enabled.
  - `POST /api/auth/reset-password` — validates token and updates password. Supports dev fallback via `email` query.

All email sending is currently gated off. Default behavior is inert.

## Recommended Free Options (No Custom Domain)

Pick one when ready:

- Gmail SMTP (personal mailbox)
  - `EMAIL_PROVIDER=smtp`
  - `SMTP_HOST=smtp.gmail.com`
  - `SMTP_PORT=587`
  - `SMTP_USER=your@gmail.com`
  - `SMTP_PASS=app-specific-password`
  - `EMAIL_FROM=your@gmail.com`

- SendGrid Single Sender (free tier)
  - `EMAIL_PROVIDER=sendgrid`
  - `SENDGRID_API_KEY=...`
  - `EMAIL_FROM=verified-sender@example.com`

Resend (custom domain) can be added later without changing app logic.

## Feature Flag & Env Vars

- `EMAIL_ENABLED=false` (default). No emails are sent unless set to `true`.
- `NEXTAUTH_URL` — base URL used to build reset links.
- Provider-specific variables as above.

## Migration Required (when tokens move to DB)

Create `supabase/migrations/0006_password_reset.sql` with:

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON users(password_reset_token);
```

CLI: `supabase db push` or apply via Dashboard.

## Tomorrow’s Implementation Plan

1) Mail Helper (provider-agnostic)
   - Add `src/lib/mail.ts` with `sendPasswordResetEmail({ to, url })`.
   - Implement branches for `EMAIL_PROVIDER=smtp|sendgrid`.
   - Respect `EMAIL_ENABLED` gate.

2) Forgot Password API
   - If `EMAIL_ENABLED=true`, generate token (DB or dev store) and call mail helper.
   - Return generic success to avoid user enumeration.

3) Reset Password API
   - Validate token against DB tokens; dev store fallback remains for local.
   - Hash new password with `bcryptjs` and update `users.password_hash`.

4) UI + Copy
   - Keep current pages; ensure friendly messages and success states.
   - No navigation changes needed.

5) Tests & Smoke
   - Local: dev store flow.
   - With provider: set `EMAIL_ENABLED=true`, trigger a reset, and verify email receipt.

## Rollback / Safety

- Set `EMAIL_ENABLED=false` to disable sending.
- No schema or route changes break existing behavior.
- Dev fallback remains to validate flow without external services.

## Notes

- We intentionally avoid implementing recovery UX now to stick to free-only constraints.
- Once a provider is selected, this plan requires ~2–3 hours to wire up and smoke test.