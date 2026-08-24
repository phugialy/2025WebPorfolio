-- Affiliate marketing layer: product catalog, article matches, click log.
-- Apply via the Supabase SQL Editor (Dashboard > SQL Editor > New query > paste > Run).

create extension if not exists pgcrypto;

create table if not exists affiliate_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  network text not null default 'other' check (network in ('amazon', 'other')),
  category text,
  tags text[] not null default '{}',
  description text,
  image_url text,
  affiliate_url text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_products_tags_idx on affiliate_products using gin (tags);
create index if not exists affiliate_products_status_idx on affiliate_products (status);

create table if not exists article_affiliate_products (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  product_id uuid not null references affiliate_products(id) on delete cascade,
  match_score numeric,
  match_reason text,
  position integer not null default 0,
  approved boolean not null default false,
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz not null default now(),
  unique (article_id, product_id)
);

create index if not exists article_affiliate_products_article_idx on article_affiliate_products (article_id);
create index if not exists article_affiliate_products_approved_idx on article_affiliate_products (approved);

create table if not exists affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references affiliate_products(id) on delete set null,
  article_slug text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_clicks_product_idx on affiliate_clicks (product_id);
create index if not exists affiliate_clicks_created_idx on affiliate_clicks (created_at);

alter table affiliate_products enable row level security;
alter table article_affiliate_products enable row level security;
alter table affiliate_clicks enable row level security;

-- Public site (anon key) can only ever see active products and approved matches.
-- All writes (matcher cron, admin approval, click logging) go through the
-- service-role key, which bypasses RLS, so no public write policy is needed.
drop policy if exists "Public read active affiliate products" on affiliate_products;
create policy "Public read active affiliate products"
  on affiliate_products for select
  using (status = 'active');

drop policy if exists "Public read approved article matches" on article_affiliate_products;
create policy "Public read approved article matches"
  on article_affiliate_products for select
  using (approved = true);
