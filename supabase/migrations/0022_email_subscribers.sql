-- Daily email digest: subscribers and send log.
-- Run in the Supabase SQL Editor. Safe to run more than once.
-- ADR: docs/decisions/daily-email-digest.md
--
-- Both tables have row level security ON and NO policies, so the public anon
-- key can neither read nor write them. All access goes through server routes
-- using the service-role key (which bypasses RLS), same as thread_articles.

-- One row per email address.
--   pending       -> confirmation email sent, link not yet clicked (never gets the digest)
--   active        -> confirmed (double opt-in), receives the digest
--   unsubscribed  -> clicked unsubscribe; kept (not deleted) so we never re-add them
--   bounced       -> the address failed; skipped on send
create table if not exists email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'unsubscribed', 'bounced')),

  -- Unguessable one-time-use links (two random UUIDs, hyphens removed = 64 hex chars).
  confirm_token text not null
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  unsubscribe_token text not null
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),

  -- Where the signup came from (campaign attribution).
  source text,           -- surface: bar | inline | end-of-article | footer
  source_slug text,      -- page or article slug it was captured on
  utm_source text,
  utm_medium text,
  utm_campaign text,

  consented_at timestamptz not null default now(),
  confirm_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Emails are stored lowercased so the unique index really is unique.
  constraint email_subscribers_email_lowercase check (email = lower(email)),
  constraint email_subscribers_email_length check (char_length(email) between 3 and 254)
);

create unique index if not exists email_subscribers_email_key on email_subscribers (email);
create unique index if not exists email_subscribers_confirm_token_key on email_subscribers (confirm_token);
create unique index if not exists email_subscribers_unsubscribe_token_key on email_subscribers (unsubscribe_token);
create index if not exists email_subscribers_status_idx on email_subscribers (status);
create index if not exists email_subscribers_campaign_idx on email_subscribers (utm_campaign, source);

alter table email_subscribers enable row level security;

-- One row per digest run, so a rerun can never send the same day's digest twice.
-- A dry run, a test send and a live send each get their own row for the same date.
create table if not exists digest_runs (
  id uuid primary key default gen_random_uuid(),
  digest_date date not null,
  mode text not null default 'dry_run' check (mode in ('dry_run', 'test', 'live')),
  status text not null default 'running'
    check (status in ('running', 'sent', 'skipped', 'failed')),
  subject text,
  article_count integer not null default 0,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (digest_date, mode)
);

alter table digest_runs enable row level security;
