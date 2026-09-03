-- Registration required before replying. Google sign-in alone used to be
-- enough to post a reply -- this adds a real, separate registration step
-- (pick a nickname) between "signed in" and "allowed to reply," and gives
-- users a profile to actually own/edit later.
--
-- Supersedes field_note_user_status from 0010_thread_replies.sql -- that
-- table shipped minutes ago with zero rows written to it, so it's replaced
-- outright rather than migrated. profiles is still keyed by email, not a
-- Supabase auth.users id, for the same reason as before: this project's
-- user identity comes from NextAuth + Google, not Supabase Auth.
-- Apply via the Supabase SQL Editor (Dashboard > SQL Editor > New query > paste > Run).

create table if not exists profiles (
  email text primary key,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'muted', 'banned')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop table if exists field_note_user_status;

alter table profiles enable row level security;

-- No public policy -- profile reads/writes are always scoped to "the
-- current signed-in user's own row" or an admin action, both of which go
-- through the service-role key from an API route that checks the session
-- itself, same pattern as every other write path in this project.
