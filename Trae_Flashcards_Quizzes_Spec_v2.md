# Trae Build Spec — Flashcards & Quizzes (Paste into Builder)

## 0) TL;DR
A mobile-first web app for **flashcards** and **multiple-choice quizzes**. Share via link; users can sign in with **email**, **Google**, or **Microsoft**, or join **anonymously** (auto-assigned **codename**). Optional **passcode per set** with configurable expiry (default 24h; “never” allowed). Instructors can **upload docs** or **enter a topic** to generate **AI drafts** (reviewed by default; auto-publish optional). Prefer **academic sources** (.edu, PubMed, JSTOR); Wikipedia allowed only when **cross-checked**. Results export to **CSV**. Serve ~**400 concurrent** quiz takers in the US on **free/low-cost** infra. Store **only email + display name**; anonymous users have no PII.

---

## 1) Visual & UX
- **Theme:** Dark UI with deep greens; **flashcards are white/off-white** for readability.
- **Tokens:**
  - `--bg: #0c0f10`, `--surface: #141a17`, `--surface-2: #17201b`
  - `--text: #eaf0ea`, `--muted: #9fb2a7`, `--accent: #1c7c54`
  - **Flashcard surface:** `#ffffff` (alt `#fbfbfb`), text `#111`
- **Components & behaviors:**
  - Card grid + one-by-one study; smooth flip; big tap targets; reduced-motion toggle.
  - Quiz item with **4 choices** (optionally 5); reveal **immediately on click** or **after submit** (per-set).
  - Accessibility: **WCAG AA**, keyboard navigable, ARIA roles.

---

## 2) Roles & Flows
- **Instructor:** create sets, upload docs, run AI generation, review/approve drafts, publish, view analytics, export CSV.
- **Student (email/Google/Microsoft):** take sets/quizzes; responses tied to email.
- **Guest (anonymous):** join without email; gets auto **codename**; responses not tied to PII (still aggregated).
- **Anonymous codename algorithm:** prefer **chemical element** names (e.g., “Neon”); when exhausted, append isotopes (“Neon-21”). If simpler, allow **AnimalName** fallback. Persist for the session.

---

## 3) Passcodes
- **Scope:** per-set (flashcards or quiz), **off by default**.
- **Expiry:** creator selects **1h, 24h, 7d, 30d, or never** (default 24h).
- **Storage:** **bcrypt hash** + `passcode_expires_at`; verify server-side.

---

## 4) AI Content Ingestion & Generation
- **Inputs:** DOCX/PDF/MD/TXT uploads or **topic prompts**.
- **Pipeline:**
  1) Upload → server extracts text (DOCX/PDF parsers), normalizes/segments.
  2) Classify content (definitions / questions / expository).
  3) **AI generator (RAG-style)**:
     - From document: create **flashcards** `{term, answer, explanation?, citations[]}` and **MCQs** `{stem, choices[4], correct_index, explanation?, citations[]}`.
     - From topic: constrain to **academic sources** (.edu, PubMed, JSTOR). Wikipedia allowed **only if cross-checked** and cited.
     - **Every item must include citations**; else mark **skipped**.
  4) **Review gate:** drafts by default; instructor can bulk approve/edit/reject; optional **auto-publish** toggle.
- **Provider policy:** “Bring your own key” for OpenAI/Anthropic/Google; include one **free/low-cost** default (smaller open model) labeled “basic quality”; premium models labeled “**higher quality**.”

**System prompt core:**
> Prefer .edu, PubMed, JSTOR; Wikipedia allowed only if cross-checked. Provide citations per item (URL/DOI or “Uploaded: p.X”). Explanations 1–3 sentences. If unsure, skip. Avoid speculation.

**Model output contract (JSON):**
```json
{
  "flashcards": [
    {"term":"", "answer":"", "explanation":"", "citations":["doi:...","Uploaded: p.212"]}
  ],
  "questions": [
    {"stem":"", "choices":["A","B","C","D"], "correct_index":2, "explanation":"", "citations":["https://...","doi:..."]}
  ],
  "skipped_notes":""
}
```

---

## 5) Non-Functional Requirements
- **Performance:** handle ~**400 concurrent** quiz takers (US); p95 < **300 ms** for `POST /responses` under load.
- **Scalability path:** stateless API; queue AI jobs; DB indexes on hot paths.
- **Privacy:** store only **email + display name**; guests have no PII.
- **Cost:** free tiers preferred; **<$10/mo** OK if needed.

---

## 6) Data Retention & Backups
- **Attempts/responses retention:** configurable; default **7 days** (instructor can choose **48h**, **7d**, **30d**, **120d/semester max**).
- **Access logs retention:** same as attempts.
- **Exports:** generate on-demand; **do not persist** after delivery.
- **Backups:** rely on managed DB’s free snapshots if available; otherwise skip paid add-ons.

---

## 7) Tech Stack (low-cost)
- **Frontend:** Next.js (App Router), Tailwind, Headless UI; PWA; deploy on **Vercel** (free tier).
- **Auth:** NextAuth (Email magic link + Google + Microsoft) or **Clerk** (free tier).
- **DB/Storage/Realtime:** **Supabase (Postgres)** free tier (US region) — or **Neon** Postgres + S3-compatible storage.
- **AI layer:** provider-agnostic; BYO keys for OpenAI/Anthropic/Google; include one free/open endpoint for basic gen.

---

## 8) Data Model (Postgres)
```sql
-- Core tables (DDL sketch; implement as migrations in Trae)
users(
  id uuid PK default gen_random_uuid(),
  email text null unique,
  display_name text null,
  codename text null,
  role text check (role in ('instructor','student')) default 'student',
  created_at timestamptz default now(),
  last_seen_at timestamptz
);

sets(
  id uuid PK default gen_random_uuid(),
  type text check (type in ('flashcards','quiz')) not null,
  title text not null,
  description text,
  is_published boolean default false,
  passcode_required boolean default false,
  passcode_hash text null,
  passcode_expires_at timestamptz null,
  options jsonb default '{}'::jsonb, -- {reveal:'immediate'|'deferred', choices:4|5, retention_days:int}
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

cards(
  id uuid PK default gen_random_uuid(),
  set_id uuid references sets(id) on delete cascade,
  kind text check (kind in ('term','question')) not null,
  prompt text not null,
  answer text not null,
  explanation text,
  citations jsonb default '[]'::jsonb,
  status text check (status in ('draft','approved','published')) default 'draft'
);

questions(
  id uuid PK default gen_random_uuid(),
  set_id uuid references sets(id) on delete cascade,
  stem text not null,
  choices jsonb not null, -- array of 4 or 5 strings
  correct_index int not null check (correct_index between 0 and 4),
  explanation text,
  citations jsonb default '[]'::jsonb,
  status text check (status in ('draft','approved','published')) default 'draft'
);

attempts(
  id uuid PK default gen_random_uuid(),
  set_id uuid references sets(id) on delete cascade,
  user_id uuid references users(id), -- nullable for guests
  is_guest boolean default false,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  device jsonb
);

responses(
  id uuid PK default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  chosen_index int,
  correct boolean,
  time_spent_ms int,
  created_at timestamptz default now()
);

set_access_log(
  id uuid PK default gen_random_uuid(),
  set_id uuid references sets(id) on delete cascade,
  user_id uuid references users(id), -- nullable for guests
  is_guest boolean default false,
  entered_at timestamptz default now(),
  passcode_used boolean default false,
  ip_hash text
);

uploads(
  id uuid PK default gen_random_uuid(),
  user_id uuid references users(id),
  file_name text,
  mime text,
  storage_url text,
  parsed_text text,
  created_at timestamptz default now()
);

ai_jobs(
  id uuid PK default gen_random_uuid(),
  user_id uuid references users(id),
  mode text check (mode in ('from_doc','from_topic')) not null,
  source_upload_id uuid references uploads(id),
  provider text,
  model text,
  prompt jsonb,
  output jsonb,
  status text check (status in ('queued','succeeded','failed')) default 'queued',
  created_at timestamptz default now()
);

-- Hot-path indexes
create index if not exists idx_attempts_set on attempts(set_id);
create index if not exists idx_responses_q on responses(question_id);
create index if not exists idx_users_email on users(email);
create index if not exists idx_sets_published on sets(is_published, type);
```

---

## 9) API Sketch
- **Auth**
  - `POST /auth/magic-link`
  - `GET /auth/oauth/google` / `.../microsoft`
- **Sets**
  - `POST /sets` | `PATCH /sets/{id}` | `POST /sets/{id}/publish`
  - `POST /sets/{id}/passcode` (set/clear + expiry)
  - `GET /sets/{id}` (published only for non-owners)
- **Content**
  - `POST /uploads` → returns `upload_id`
  - `POST /ai/generate` `{ mode, upload_id?, topic?, provider, model, options }`
- **Run**
  - `POST /attempts` → `{attempt_id}`
  - `POST /responses` (batched or streaming)
  - `POST /attempts/{id}/submit`
- **Analytics/Exports**
  - `GET /analytics/sets/{id}`
  - `GET /exports/sets/{id}.csv` (stream; do not persist)

---

## 10) CSV Schemas
**Attempts/Responses:**
```
attempt_id,set_id,set_title,user_email,codename,is_guest,started_at,submitted_at,duration_ms,device_type,question_id,stem,chosen_index,correct_index,correct,time_spent_ms,citations_count
```
**Flashcards usage:**
```
set_id,user_email,codename,is_guest,flips,know_count,dont_know_count,avg_time_ms
```

---

## 11) Concurrency & Load Targets
- **Goal:** 400 concurrent users on one quiz (20 items) over ~15 minutes.
- **Targets:** p95 API latency < **300 ms** for `POST /responses`; no data loss.
- **Tactics:** stateless API; DB connection pooling; indexed writes; instructor dashboard polls every **5–10s** (or use Supabase Realtime with coarse aggregates).

---

## 12) Acceptance Tests
- **Load test:** pass scenario above.
- **Parsing test:** DOCX with 20 terms + 10 MCQs → ≥95% become viable drafts.
- **AI quality:** With academic PDFs, ≥90% drafts approved without edits.
- **CSV:** opens cleanly in Excel/Sheets; headers exactly as spec.
- **Access:** emails listed for signed-in users; guests listed by codename; no PII beyond email/display name.

---

## 13) Implementation Notes
- **Codenames:** see SQL below (idempotent seed + concurrency-safe claim).
- **Passcode middleware:** if `passcode_required`, check hash + `now() <= passcode_expires_at` (unless “never”).
- **Retention job:** daily cron deletes `attempts/responses/access_log` older than `sets.options.retention_days` (min 2, max 120).
- **AI safety:** block publish if `citations.length == 0` or unverified provenance.
- **Exports:** stream on demand; do not store after download.

---

## 14) Postgres Seed & Helpers

### 14.1 Codenames table + seed (118 elements)
```sql
-- Table for anonymous codenames
create table if not exists codenames (
  name text primary key,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

-- Seed with 118 IUPAC element names (idempotent)
do $$
declare
  elems text[] := array[
    'Hydrogen','Helium','Lithium','Beryllium','Boron','Carbon','Nitrogen','Oxygen','Fluorine','Neon',
    'Sodium','Magnesium','Aluminium','Silicon','Phosphorus','Sulfur','Chlorine','Argon','Potassium','Calcium',
    'Scandium','Titanium','Vanadium','Chromium','Manganese','Iron','Cobalt','Nickel','Copper','Zinc',
    'Gallium','Germanium','Arsenic','Selenium','Bromine','Krypton','Rubidium','Strontium','Yttrium','Zirconium',
    'Niobium','Molybdenum','Technetium','Ruthenium','Rhodium','Palladium','Silver','Cadmium','Indium','Tin',
    'Antimony','Tellurium','Iodine','Xenon','Cesium','Barium','Lanthanum','Cerium','Praseodymium','Neodymium',
    'Promethium','Samarium','Europium','Gadolinium','Terbium','Dysprosium','Holmium','Erbium','Thulium','Ytterbium',
    'Lutetium','Hafnium','Tantalum','Tungsten','Rhenium','Osmium','Iridium','Platinum','Gold','Mercury',
    'Thallium','Lead','Bismuth','Polonium','Astatine','Radon','Francium','Radium','Actinium','Thorium',
    'Protactinium','Uranium','Neptunium','Plutonium','Americium','Curium','Berkelium','Californium','Einsteinium','Fermium',
    'Mendelevium','Nobelium','Lawrencium','Rutherfordium','Dubnium','Seaborgium','Bohrium','Hassium','Meitnerium','Darmstadtium',
    'Roentgenium','Copernicium','Nihonium','Flerovium','Moscovium','Livermorium','Tennessine','Oganesson'
  ];
  e text;
begin
  foreach e in array elems loop
    insert into codenames(name, used) values (e, false)
    on conflict (name) do nothing;
  end loop;
end $$;
```

### 14.2 Concurrency-safe claim/release
```sql
-- Claim the next available codename.
-- 1) Try an unused element name (FOR UPDATE SKIP LOCKED).
-- 2) If none left, mint a unique "Element-###" isotope codename.
create or replace function claim_codename() returns text
language plpgsql as $$
declare
  picked text;
  base text;
  try_isotope text;
  attempt int := 0;
begin
  select name into picked
  from codenames
  where used = false
  order by name
  for update skip locked
  limit 1;

  if picked is not null then
    update codenames
      set used = true, claimed_at = now()
    where name = picked;
    return picked;
  end if;

  select name into base from codenames order by name limit 1 offset (floor(random()*117))::int;
  if base is null then base := 'Element'; end if;

  while attempt < 50 loop
    try_isotope := base || '-' || (10 + (random()*300))::int; -- e.g., "Neon-21"
    begin
      insert into codenames(name, used, claimed_at) values (try_isotope, true, now());
      return try_isotope;
    exception when unique_violation then
      attempt := attempt + 1;
    end;
  end loop;

  try_isotope := base || '-' || left(replace(gen_random_uuid()::text,'-',''), 6);
  insert into codenames(name, used, claimed_at) values (try_isotope, true, now());
  return try_isotope;
end $$;

-- Optional: release codename (reusable after sessions end)
create or replace function release_codename(p_name text) returns void
language sql as $$
  update codenames set used = false, claimed_at = null where name = p_name;
$$;
```

### 14.3 Admin view (counts)
```sql
create or replace view codename_stats as
select
  count(*) filter (where used=false) as available,
  count(*) filter (where used=true)  as claimed,
  count(*) as total
from codenames;
```
---

## 15) Optional: Purge Old Data Helpers

### 15.1 Purge by set-specific `retention_days` (in `sets.options`)
```sql
-- Delete old attempts/responses/access logs older than each set's retention_days.
-- Defaults to 7 days if not provided; bounded [2, 120].
create or replace function purge_expired_data() returns void
language plpgsql as $$
declare
  r record;
  days int;
begin
  for r in select id, coalesce( (options->>'retention_days')::int, 7 ) as rd from sets loop
    days := greatest(2, least(r.rd, 120));

    delete from responses
    using attempts a
    where responses.attempt_id = a.id
      and a.set_id = r.id
      and a.started_at < now() - (days || ' days')::interval;

    delete from attempts
    where set_id = r.id
      and started_at < now() - (days || ' days')::interval;

    delete from set_access_log
    where set_id = r.id
      and entered_at < now() - (days || ' days')::interval;
  end loop;
end $$;
```

---

## 16) Example: Guest Join (claim codename) handlers

### 16.1 Using Supabase (RPC)
```ts
// supabaseClient.rpc('claim_codename') to get a unique codename for a guest
import { createClient } from '@supabase/supabase-js';

export async function getGuestCodename() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.rpc('claim_codename');
  if (error) throw error;
  return data as string; // e.g., "Neon" or "Neon-21"
}
```

### 16.2 Using node-postgres (direct Postgres)
```ts
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function getGuestCodename() {
  const { rows } = await pool.query('select claim_codename() as name');
  return rows[0].name as string;
}
```

---

## 17) Performance Notes (practical)
- **Codename claim** is safe under high concurrency via `FOR UPDATE SKIP LOCKED`.
- **400 concurrent users:** Indexed writes + stateless API keep p95 sub-300ms for `POST /responses` at typical quiz click rates on free Postgres tiers.
- **Live dashboards:** Poll every **5–10s** or use coarse Supabase Realtime aggregates, not per-click streaming.
- **Costs:** Vercel + Supabase free tiers usually suffice; temporary <$10 bump covers peak exams; purge old data to stay lean.
