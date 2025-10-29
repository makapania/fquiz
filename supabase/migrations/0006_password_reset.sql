-- Add password reset support: token and expiry columns
alter table if exists users
  add column if not exists password_reset_token text,
  add column if not exists password_reset_expires timestamptz;

create index if not exists idx_password_reset_token on users(password_reset_token);