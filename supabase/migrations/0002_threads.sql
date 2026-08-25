-- Threads: short, owner-written posts (statements, tips, tool mentions).
-- Broadcast only -- no visitor posting, no comments. A human-voice
-- complement to the AI-generated article pipeline. Optionally references a
-- catalog resource, for "here's a tool I'm actually using and why" posts.
-- Apply via the Supabase SQL Editor (Dashboard > SQL Editor > New query > paste > Run).

create extension if not exists pgcrypto;

create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text not null,
  tags text[] not null default '{}',
  resource_id uuid references affiliate_products(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists threads_status_idx on threads (status);
create index if not exists threads_published_idx on threads (published_at desc);

alter table threads enable row level security;

-- Public site (anon key) can only ever see published threads. All writes
-- (the admin composer) go through the service-role key, which bypasses RLS.
drop policy if exists "Public read published threads" on threads;
create policy "Public read published threads"
  on threads for select
  using (status = 'published');
