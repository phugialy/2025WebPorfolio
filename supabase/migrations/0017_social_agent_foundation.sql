-- Social media manager agent -- foundation schema (Phase 0 of
-- docs/research/social-media-manager-agent.md). Seven tables, the doc's
-- six-layer memory model (tenant, run/state, signals, content/brand,
-- audience, operator-as-columns) plus social_post_metrics for the
-- retrospective performance layer. Nothing here is applied by this
-- migration alone -- the actual pipeline (Strategist/Writer/Guardrail
-- Critic), the cron routes, and the admin UI are later phases; this is
-- schema only, written ahead of them per the Phased build plan's
-- Phase 0 scope.
--
-- Every table below except social_accounts is account_id-scoped from day
-- one, per the doc's confirmed multi-tenant requirement ("operator, social
-- audience, and future Zernio end-users all need to be modeled, not just
-- the site owner's own accounts"). RLS is enabled on every table with no
-- public policy -- all access goes through the service-role key, same as
-- every other cron/admin table in this project (cron_runs, affiliate
-- tables, projects, etc.).
--
-- Apply via the Supabase SQL Editor (Dashboard > SQL Editor > New query >
-- paste > Run).

-- 1. Tenant. One row per managed brand -- a tenant with several connected
-- platform accounts is still one profile on Zernio's side (see the
-- Platform layer: Zernio section of the research doc), so this does not
-- reimplement OAuth or per-platform account storage; it just holds the
-- Zernio profile id once Phase 1 provisions one. zernio_profile_id stays
-- nullable through Phase 0-2 since no real Zernio account exists yet.
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zernio_profile_id text,
  status text not null default 'pending' check (status in ('pending', 'active', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists social_accounts_zernio_profile_idx
  on social_accounts (zernio_profile_id)
  where zernio_profile_id is not null;

-- 2. Run/state. Per-tick log, same shape and purpose as cron_runs
-- (0008_cron_runs.sql) but account-scoped, since one tick can act across
-- several tenants. `job` names the pipeline step (e.g. 'signal-scan',
-- 'strategist', 'writer', 'guardrail', 'publish', 'performance-sync',
-- 'retro', 'engagement'), matching the per-step failure isolation this
-- doc requires -- one step's row logs independently of the others.
create table if not exists social_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references social_accounts(id) on delete cascade,
  job text not null,
  ok boolean not null,
  summary jsonb,
  created_at timestamptz not null default now()
);

create index if not exists social_runs_account_idx on social_runs (account_id);
create index if not exists social_runs_job_created_idx on social_runs (job, created_at desc);

-- 3. Signals. Scored RSS/GSC deltas feeding the Strategist. `source`
-- includes 'operator' as a first-class value, not just an afterthought --
-- the external review's weakness #1 mitigation (an operator who personally
-- knows something worth posting about shouldn't have to wait for RSS/GSC
-- to surface it) is a `source = 'operator'` row the Strategist reads
-- exactly like any other signal, so it has to be a valid value from day
-- one, not bolted on later.
create table if not exists social_signals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references social_accounts(id) on delete cascade,
  source text not null check (source in ('rss', 'gsc', 'operator')),
  keyword text,
  summary text,
  relevance_score numeric,
  raw_payload jsonb,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists social_signals_account_idx on social_signals (account_id);
create index if not exists social_signals_unconsumed_idx on social_signals (account_id, consumed_at) where consumed_at is null;

-- 4. Content/brand -- the core state machine table. `status` is the
-- pipeline's state machine (signal_gathered -> briefed -> drafted ->
-- guardrail_pending -> approved -> publishing -> published, or rejected /
-- publish_failed at any gate) -- see "Pipeline architecture" in the
-- research doc. Every tick's job is "find rows stuck in an actionable
-- status," never "decide what to do from scratch."
--
-- guardrail_review stores the full SocialGuardrailReview JSON contract
-- (decision, per-dimension checks, disclosure flags, budgetOk,
-- repetitionRisk, escalate, reasoning) rather than flattening it into
-- columns -- same discipline as this project's existing JSON-contract
-- patterns (lib/content-agent-protocols.ts's CriticReview), since the
-- contract is still expected to grow (see External review's Decision
-- Engine expansion) and flattening now would mean a migration per field
-- added later.
--
-- edited_before_approval + approved_by + rejection_reason are the
-- "operator" memory layer -- not a separate table, columns here (and on
-- social_inbox_items below), per the doc's memory-layer #6.
create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references social_accounts(id) on delete cascade,
  signal_id uuid references social_signals(id) on delete set null,
  platform text not null check (platform in ('instagram', 'facebook', 'linkedin', 'x')),
  status text not null default 'signal_gathered' check (status in (
    'signal_gathered', 'briefed', 'drafted', 'guardrail_pending', 'approved',
    'publishing', 'published', 'rejected', 'publish_failed'
  )),
  -- jsonb, not text: the Strategist's ContentBrief is a structured object
  -- (topic/angle/keyPoints/constraints/sourceSignalIds), stored whole here
  -- the same way guardrail_review below stores the full contract rather
  -- than flattening it -- a revise-loop pass appends to `constraints`
  -- in place (see social-agent/pipeline/state-machine.ts), which only
  -- works if the column round-trips the real object.
  brief jsonb,
  draft_text text,
  -- Writer-step output the guardrail step needs to reconstruct the full
  -- draft on a later tick without re-calling the Writer (see the pipeline
  -- code's own comment on this); added once Phase 2's actual field usage
  -- was reconciled against this migration.
  draft_hashtags text[],
  draft_ready_for_review boolean,
  final_text text,
  disclosure_required boolean not null default false,
  disclosure_present boolean not null default false,
  guardrail_review jsonb,
  rejection_reason text,
  approved_by text,
  edited_before_approval boolean not null default false,
  -- Revise-loop pass counter, capped by MAX_REVISION_PASSES in
  -- social-agent/pipeline/guardrail.ts (mirrors the article pipeline's
  -- 2-pass cap) -- added during the same reconciliation as draft_hashtags.
  revision_count integer not null default 0,
  pipeline_version text,
  scheduled_for timestamptz,
  published_at timestamptz,
  platform_post_id text,
  publish_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_posts_account_idx on social_posts (account_id);
create index if not exists social_posts_status_idx on social_posts (status);
create index if not exists social_posts_account_status_idx on social_posts (account_id, status);

-- 4b. Brand/self-model. One row per account. The weekly Retro proposes
-- edits as a pending diff (pending_diff / pending_diff_proposed_at) that
-- an operator must approve -- never auto-applied, same guardrail
-- discipline as everything else this system produces (see "Slow drift" in
-- Operational reliability). Applying an approved diff means writing it
-- into the main columns and clearing pending_diff; that write path is
-- pipeline/admin-UI work for a later phase, not this migration.
create table if not exists social_brand_profile (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references social_accounts(id) on delete cascade,
  voice_description text,
  -- text[], not text: the pipeline's SocialBrandProfile.toneRules is a list
  -- of discrete rules, not one paragraph -- reconciled against actual
  -- pipeline usage alongside banned_topics below.
  tone_guidelines text[],
  banned_topics text[],
  disclosure_template text,
  pending_diff jsonb,
  pending_diff_proposed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Audience. DMs/comments from the Zernio inbox webhook. PII handling
-- note from the research doc's memory-layer #5, carried into the schema
-- rather than left as a doc-only caveat: retention_expires_at gives this
-- real, personal data from strangers a stated retention window instead of
-- being logged indefinitely by default -- the actual purge job is later
-- (reliability/Phase 7) work, but the column exists now so that job has
-- something to act on.
--
-- requires_permanent_review flags the categories the external review
-- named as never graduating out of manual review regardless of how long
-- the system has run (pricing/terms, complaints, legal-adjacent topics) --
-- distinct from the guardrail_review JSON's per-reply verdict, since this
-- is a standing category flag, not a one-time decision.
create table if not exists social_inbox_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references social_accounts(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'linkedin', 'x')),
  platform_message_id text,
  from_handle text,
  message_text text,
  received_at timestamptz not null default now(),
  draft_reply text,
  guardrail_review jsonb,
  requires_permanent_review boolean not null default false,
  sent boolean not null default false,
  sent_at timestamptz,
  retention_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists social_inbox_items_account_idx on social_inbox_items (account_id);
create index if not exists social_inbox_items_unsent_idx on social_inbox_items (account_id, sent) where sent = false;
-- Zernio webhook deliveries carry a dedup event id (X-Zernio-Event-Id);
-- platform_message_id is nullable (a manually-injected or malformed
-- delivery might not have one yet), so the uniqueness only applies once
-- both platform and platform_message_id are known.
create unique index if not exists social_inbox_items_platform_message_idx
  on social_inbox_items (platform, platform_message_id)
  where platform_message_id is not null;

-- 6. Retrospective performance, synced daily from Zernio's analytics API
-- (GA4 referral sessions attributed separately via UTM). One row per sync,
-- not an upsert-in-place, so this is a real time series per post rather
-- than only ever showing the latest number -- needed for the performance
-- dashboard's trend view (Phase 6) and the weekly Retro's before/after
-- comparisons (Phase 8).
--
-- sync_failed / sync_error exist because the research doc's own prior-art
-- review found Facebook and X analytics verified-broken on Zernio's side
-- as of Feb 2026 (post-v18.0 Graph API deprecation, X usage-cap 429s) --
-- the performance-sync step is designed to tolerate a per-platform
-- analytics failure gracefully rather than assume uniform reliability, and
-- these columns are where that per-sync failure gets recorded instead of
-- silently dropped.
create table if not exists social_post_metrics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references social_accounts(id) on delete cascade,
  post_id uuid not null references social_posts(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'linkedin', 'x')),
  impressions integer,
  link_clicks integer,
  likes integer,
  comments integer,
  shares integer,
  ga4_referral_sessions integer,
  sync_failed boolean not null default false,
  sync_error text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists social_post_metrics_account_idx on social_post_metrics (account_id);
create index if not exists social_post_metrics_post_idx on social_post_metrics (post_id, synced_at desc);

alter table social_accounts enable row level security;
alter table social_runs enable row level security;
alter table social_signals enable row level security;
alter table social_posts enable row level security;
alter table social_brand_profile enable row level security;
alter table social_inbox_items enable row level security;
alter table social_post_metrics enable row level security;

-- No public policy on any social_* table -- every read/write (cron
-- pipeline steps, admin approval queue, webhook handler) goes through the
-- service-role key via the Store adapter (app/social-agent-adapters/store.ts),
-- which bypasses RLS, same as every other admin-only table in this
-- project. Unlike the article/affiliate tables, nothing here is meant to
-- ever be readable by the public anon key -- this is operator- and
-- audience-PII-bearing data, not public content.
