-- Add password support for non-Google guest check-in
alter table if exists users
  add column if not exists password_hash text;

-- No index needed for password_hash; we never filter by it