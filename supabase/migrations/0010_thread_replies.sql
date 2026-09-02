-- Field Notes discussion layer. Identity comes from the site's existing
-- NextAuth + Google sign-in (not a new auth system) -- replies are keyed by
-- email rather than a Supabase auth.users id, since this project doesn't use
-- Supabase Auth. Moderation status is tracked separately since a NextAuth
-- session doesn't carry it.
--
-- Discussion is opt-in per Field Note (replies_enabled defaults false on
-- every existing and new thread), and only Phugialy can start a thread --
-- this only adds the ability to reply under one, not open forum posting.
-- Apply via the Supabase SQL Editor (Dashboard > SQL Editor > New query > paste > Run).

create extension if not exists pgcrypto;

alter table threads
  add column if not exists replies_enabled boolean not null default false;

create table if not exists thread_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  parent_reply_id uuid references thread_replies(id) on delete cascade,
  author_email text not null,
  author_name text not null,
  author_image text,
  body text not null,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  moderated_by text,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists thread_replies_thread_idx on thread_replies (thread_id);
create index if not exists thread_replies_author_idx on thread_replies (author_email);
create index if not exists thread_replies_created_idx on thread_replies (created_at desc);

-- One row per user who's ever been muted/banned -- absence of a row means
-- 'active' (the default), so an ordinary commenter never needs a row
-- written for them just to leave a reply.
create table if not exists field_note_user_status (
  email text primary key,
  status text not null default 'active' check (status in ('active', 'muted', 'banned')),
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table thread_replies enable row level security;
alter table field_note_user_status enable row level security;

-- Public (anon key) can read visible replies. All writes (posting a reply,
-- moderation actions) go through the service-role key from API routes,
-- which check replies_enabled / user status themselves before writing --
-- same pattern as every other write path in this project.
drop policy if exists "Public read visible replies" on thread_replies;
create policy "Public read visible replies"
  on thread_replies for select
  using (status = 'visible');

-- No public policy on field_note_user_status -- only the service-role key
-- (admin moderation actions, and the reply-creation check) touches it.
