-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text null unique,
  display_name text null,
  codename text null,
  role text check (role in ('instructor','student')) default 'student',
  created_at timestamptz default now(),
  last_seen_at timestamptz
);

-- Sets
create table if not exists sets (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('flashcards','quiz')) not null,
  title text not null,
  description text,
  is_published boolean default false,
  passcode_required boolean default false,
  passcode_hash text null,
  passcode_expires_at timestamptz null,
  options jsonb default '{}'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cards
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references sets(id) on delete cascade,
  kind text check (kind in ('term','question')) not null,
  prompt text not null,
  answer text not null,
  explanation text,
  citations jsonb default '[]'::jsonb,
  status text check (status in ('draft','approved','published')) default 'draft'
);

-- Questions
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references sets(id) on delete cascade,
  stem text not null,
  choices jsonb not null,
  correct_index int not null check (correct_index between 0 and 4),
  explanation text,
  citations jsonb default '[]'::jsonb,
  status text check (status in ('draft','approved','published')) default 'draft'
);

-- Attempts
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references sets(id) on delete cascade,
  user_id uuid references users(id),
  is_guest boolean default false,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  device jsonb
);

-- Responses
create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  chosen_index int,
  correct boolean,
  time_spent_ms int,
  created_at timestamptz default now()
);

-- Access log
create table if not exists set_access_log (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references sets(id) on delete cascade,
  user_id uuid references users(id),
  is_guest boolean default false,
  entered_at timestamptz default now(),
  passcode_used boolean default false,
  ip_hash text
);

-- Uploads
create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  file_name text,
  mime text,
  storage_url text,
  parsed_text text,
  created_at timestamptz default now()
);

-- AI jobs
create table if not exists ai_jobs (
  id uuid primary key default gen_random_uuid(),
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

-- Indexes
create index if not exists idx_attempts_set on attempts(set_id);
create index if not exists idx_responses_q on responses(question_id);
create index if not exists idx_users_email on users(email);
create index if not exists idx_sets_published on sets(is_published, type);