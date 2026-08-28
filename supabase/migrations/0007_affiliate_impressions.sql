-- Pick impressions: one row per time a Pick card actually renders on a
-- page, separate from affiliate_clicks (outbound link clicks). Together
-- they let CTR be computed per product/article instead of only knowing
-- click volume in isolation -- needed before deciding whether to expand
-- affiliate coverage further.
create table if not exists affiliate_impressions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references affiliate_products(id) on delete set null,
  article_slug text,
  is_bot boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_impressions_product_idx on affiliate_impressions (product_id);
create index if not exists affiliate_impressions_slug_idx on affiliate_impressions (article_slug);
create index if not exists affiliate_impressions_is_bot_idx on affiliate_impressions (is_bot);

alter table affiliate_impressions enable row level security;
-- Same as affiliate_clicks: no public read/write policy -- all access goes
-- through the service-role key, which bypasses RLS.
