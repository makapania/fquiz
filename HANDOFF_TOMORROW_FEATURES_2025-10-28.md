# Handoff — Features to Implement Tomorrow (2025‑10‑28)

This document summarizes the requested features to implement next, with clear acceptance criteria, technical approach, file touchpoints, and risks. It is scoped for incremental delivery so we can ship useful pieces while larger items (like multiplayer) are designed.

## Executive Summary
- Add “Your Sets” button on the Welcome page Recent Sets area; shows only the owner’s sets when signed in; hidden/disabled when not signed in.
- Add search bar to the All Sets page to find quizzes/sets by title.
- Make the set list item (green bar) fully clickable with hover/active brightness and keyboard focus.
- Design and plan “Kahoot‑style” live multiplayer quiz experience (up to 200 concurrent participants).
- Add AI conversion tools: Flashcards → MCQs and MCQs → Flashcards.
- Add AI model selection UI (no typing); support BYO API keys with secure server-side storage option.
- Add email+password auth alongside Google and Guest; ensure secure password storage and UX.
- Fix Google sign‑in profile image rendering on Welcome section.

---

## 1) Welcome Page — “Your Sets” Button
**UX**
- Location: Welcome page (`/`) in the “Recent Sets” header row.
- If signed in: show a button `Your Sets` that navigates to a filtered view (only owner’s sets).
- If not signed in: either hide the button or show a disabled variant with tooltip “Sign in to view your sets”.

**Acceptance Criteria**
- Signed‑in users can click `Your Sets` and see only sets they own.
- Signed‑out users do not see active `Your Sets` (hidden or disabled).

**Tech Plan**
- Read session with `getServerSession(authOptions)`.
- Route: `GET /sets?mine=1` or a dedicated `GET /sets/mine` page.
- Query Supabase for sets owned by the user (e.g., by `owner_id` or `created_by`). If the field is missing, add an `owner_id uuid` referencing your auth users or email mapping.
- Keep page dynamic (`dynamic='force-dynamic'`, `noStore()`, `revalidate=0`).

**Touchpoints**
- `app/page.tsx` — add the button and session check.
- `app/sets/page.tsx` — handle `mine` filter.
- `src/lib/authOptions.ts` — ensure session contains needed identifiers (email/user id).

**Risks/Notes**
- If the `sets` schema lacks a stable owner field, we must add one and backfill.

---

## 2) All Sets — Search Bar
**UX**
- Add a search input at top of `/sets` page to filter by title (and optionally type).
- Debounced input; pressing Enter or pausing updates URL query `?q=...`.

**Acceptance Criteria**
- Typing a query filters sets server‑side; results update without stale data.
- Clearing the query returns full list.

**Tech Plan**
- Read `q` from `searchParams` in `app/sets/page.tsx`.
- Supabase query: `.ilike('title', '%<term>%')` and/or filter by `type`.
- Keep SSR dynamic. Optional progressive enhancement with client input component.

**Touchpoints**
- `app/sets/page.tsx` — adjust query and UI.

**Risks/Notes**
- Large result sets: add pagination (cursor or offset) later.

---

## 3) Clickable “Green Bar” Set Item
**UX**
- Entire set item row becomes clickable (not just the small link).
- Hover: brightness increases (`hover:brightness-110`). Active: slightly dim (`active:brightness-95`).
- Keyboard: focus ring visible; Enter activates.

**Acceptance Criteria**
- Clicking anywhere on the item opens the set.
- Accessible via keyboard (tab, enter/space).

**Tech Plan**
- Wrap each item in a block-level `<Link>` or use a button role with `onClick` and `tabIndex`.
- Tailwind classes for hover/active/focus.

**Touchpoints**
- `app/sets/page.tsx` — markup and classes.

**Risks/Notes**
- Ensure nested interactive elements don’t conflict; prefer one primary Click target.

---

## 4) Kahoot‑Style Live Multiplayer (Up to 200)
**Scope**
- Host creates a live session for a set; participants join via share code.
- Real‑time question pacing, answer submission, scoring, leaderboard.

**Acceptance Criteria (Phase 1)**
- Host can start a session; participants join and answer; scoreboard updates live.
- Handles 200 concurrent participants in a single session.

**Tech Plan (High‑Level)**
- Realtime transport: Supabase Realtime (Postgres changes + broadcast channels) or dedicated WebSocket service (e.g. `socket.io` on a Node server). Supabase Realtime is likely sufficient for 200 with careful payloads.
- Data model:
  - `live_sessions(id, set_id, host_user_id, status, created_at)`
  - `live_players(id, session_id, user_id/null, codename, joined_at)`
  - `live_questions(id, session_id, question_id, index)`
  - `live_answers(id, session_id, player_id, question_index, choice_index, correct)`
- Flow: Host publishes current question index via a channel; clients submit answers; server tallies and emits leaderboard.
- Performance: minimize payload size; batched updates; server authoritative scoring.
- Anti‑abuse: throttle, per‑IP/session limits, host controls.

**Touchpoints**
- New API routes and client pages (`/live/[sessionId]`).
- DB migrations for `live_*` tables.

**Risks/Notes**
- Latency variance; careful UX for countdowns.
- Requires thoughtful testing with synthetic loads.

---

## 5) AI Conversion — Flashcards ↔ Questions
**Scope**
- Convert a set of flashcards to MCQs (generate plausible distractors).
- Convert MCQs back to flashcards.

**Acceptance Criteria**
- User can select a source set and target type; conversion produces a new set with correct links to original.
- Error handling for model failures; partial saves guarded.

**Tech Plan**
- Use existing providers in `src/lib/aiProviders.ts` to generate MCQs/flashcards.
- Server action or route: `/api/ai/convert` with parameters `{ sourceSetId, targetType, provider, model }`.
- For flashcards→MCQ: build distractors from corpus/context; enforce 4 choices and valid `correct_index`.
- For MCQ→flashcards: pick stem → term; correct choice → answer; carry explanation if exists.

**Touchpoints**
- `src/lib/aiProviders.ts` (already has generators for OpenAI/Anthropic/Google/ZAI/OpenRouter and “Basic”).
- New server route + UI flow on set pages.

**Risks/Notes**
- Model variability; add validation and repair heuristics.

---

## 6) Model Selection UI & BYO Keys (Secure Storage)
**UX**
- Provider dropdown (OpenAI, Anthropic, Google, OpenRouter, ZAI, Basic).
- Model dropdown populated with popular defaults; no free‑text typing required.
- BYO API key input with checkbox “Save this key to my account”.

**Acceptance Criteria**
- User can choose provider+model without typing.
- If “save key” is enabled, future sessions use stored key server‑side.

**Tech Plan**
- Central registry of curated models per provider (static list; optional dynamic fetch from provider APIs in future).
- Server endpoint/server action to persist key per user.
- Storage plan: server‑side only, never exposed to client JS.
  - Table: `user_api_keys(user_id uuid, provider text, encrypted_key text, created_at timestamptz)` with RLS: only owner can read/write.
  - Encryption: AES‑GCM or libsodium sealed box using a server secret (e.g., `KEY_ENCRYPTION_SECRET`). Keys encrypted at rest; decrypted only for outbound server calls.
  - Do not log keys.

**Answering “Is it real/secure?”**
- Today: BYO keys likely passed ad‑hoc; not stored.
- Plan: yes, we will implement real storage, server‑side encrypted, protected by RLS; never sent to client after storage. For production‑grade security, consider a managed secret service (AWS KMS/Secrets Manager, GCP Secret Manager) for envelope encryption and rotation.

**Touchpoints**
- New UI component for provider/model selection.
- New server action for saving/retrieving keys.
- Update generation flows to use saved keys when present.

**Risks/Notes**
- Secret rotation; migration strategy if changing encryption key.

---

## 7) Email + Password Auth (Credentials Provider)
**UX**
- On Welcome sign‑in area: insert “Sign in with Email” (email + password) between Google and Guest.
- Include “Create account” and “Forgot password” flows.

**Acceptance Criteria**
- Users can register/sign in with email+password; passwords never stored in plaintext.
- Session integrates with existing NextAuth flow; user identity aligns with Google logins.

**Tech Plan**
- Add NextAuth Credentials provider.
- DB table: `local_users(id uuid, email text unique, password_hash text, created_at)`.
- Hashing: bcrypt (`10–12` rounds) or argon2.
- Password reset tokens table; email delivery via SMTP provider.
- Session callback merges identities (same email → one logical user).

**Touchpoints**
- `src/lib/authOptions.ts` (add provider, callbacks).
- New API routes/pages: register, login, reset.
- UI components for forms and validation.

**Risks/Notes**
- Email deliverability; add rate limiting.

---

## 8) Google Profile Image Rendering
**Issue**
- After Google sign‑in, profile picture does not show.

**Acceptance Criteria**
- When signed in via Google, the user’s `image` displays next to name/email.

**Tech Plan**
- Ensure `authOptions` session callback includes `user.image`.
- Update `WelcomeWithSession` to read `session.user.image` and render `<img>`/`<Image>` with alt text and fallback.

**Touchpoints**
- `src/lib/authOptions.ts` — session callback.
- `app/components/WelcomeWithSession.tsx` — render avatar.

**Risks/Notes**
- Some providers return null image; add fallback initials.

---

## File Pointers (Current)
- `app/page.tsx` — Welcome page (recent sets, sign‑in area).
- `app/sets/page.tsx` — All sets listing.
- `app/components/WelcomeAuth.tsx` and `WelcomeWithSession.tsx` — sign‑in and session UI.
- `src/lib/authOptions.ts` — NextAuth config.
- `src/lib/aiProviders.ts` — AI provider integrations and defaults.

---

## Delivery Plan & Milestones
- Day 1:
  - Your Sets button (with mine filter) + basic search bar on `/sets`.
  - Clickable set items with hover/active/focus states.
  - Google profile image fix.
- Day 2:
  - Model selection UI + BYO key save (encrypted).
  - Initial AI conversion (flashcards → MCQs) UI + server route.
- Day 3–4:
  - MCQs → flashcards conversion.
  - Email+password auth (register, login, reset), QA.
- Week Sprint:
  - Multiplayer design doc + prototype (host/participant flows, realtime channels, scoreboard).

---

## Acceptance Checklists
**Your Sets**
- [ ] Hidden/disabled for signed‑out
- [ ] Filters owner’s sets correctly
- [ ] Navigation works on mobile/desktop

**Search**
- [ ] Filters by title
- [ ] Query in URL; back/forward preserved
- [ ] No stale data

**Clickable Items**
- [ ] Full‑row click
- [ ] Hover/active/focus accessible

**Google Image**
- [ ] `session.user.image` present in UI
- [ ] Fallback avatar on null

**AI & Keys**
- [ ] Model dropdowns (no typing)
- [ ] Keys stored encrypted server‑side
- [ ] No client exposure of secrets

**Email+Password**
- [ ] Hashing verified
- [ ] Reset flow works
- [ ] Session merges with Google

---

## Notes & Dependencies
- Ensure `sets` have an owner field; if absent, add `owner_id` and backfill from `created_by`/audit trail.
- Supabase RLS must allow owners to see/edit their sets; public can see published sets.
- Security posture for secrets: prefer managed secret service in production.

— End of handoff —