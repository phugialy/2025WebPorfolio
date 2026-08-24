-- Recreates the live schema (introspected from the old project's PostgREST
-- OpenAPI spec) on the NEW Supabase project (ggohmlweseblwxmukvnk), plus the
-- affiliate-layer tables from 0001_affiliate_layer.sql.
-- Apply via the NEW project's Supabase SQL Editor before running the data
-- migration script.

create extension if not exists pgcrypto;

do $$ begin
  create type public.article_status as enum
    ('draft', 'new', 'reviewed', 'approved', 'scheduled', 'published', 'rejected', 'archived');
exception
  when duplicate_object then null;
end $$;

create table if not exists article_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  source_type text not null default 'rss',
  enabled boolean not null default true,
  max_items_per_run integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null,
  ingest_endpoint text not null,
  shared_secret_name text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  content text not null,
  excerpt text,
  canonical_url text,
  source_id uuid references article_sources(id),
  source_name text,
  author text,
  tags text[] not null default '{}',
  status public.article_status not null default 'draft',
  quality_score numeric,
  notes text,
  ai_summary text,
  ai_score numeric,
  read_time integer,
  views integer not null default 0,
  publish_at timestamptz,
  published_at timestamptz,
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  portfolio_lane text,
  editorial_score integer,
  editorial_framework text,
  hero_image_url text,
  image_prompts jsonb not null default '[]',
  image_assets jsonb not null default '[]',
  info_cards jsonb not null default '[]'
);

create unique index if not exists articles_slug_key on articles (slug);

create table if not exists article_publications (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id),
  site_id uuid not null references sites(id),
  status text not null default 'pending',
  response_status integer,
  response_body text,
  last_attempt_at timestamptz,
  published_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists article_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  items_seen integer not null default 0,
  items_created integer not null default 0,
  items_updated integer not null default 0,
  error text,
  metadata jsonb not null default '{}'
);

-- Storage buckets (files copied separately by the migration script, but the
-- buckets themselves need to exist first with the same public/mime settings).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-images', 'article-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-video-assets', 'ai-video-assets', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
