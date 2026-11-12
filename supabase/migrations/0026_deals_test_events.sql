-- The temporary non-tech product test on the Deals pages (Nov 12 2026 - Jan 3 2027).
-- One row per thing the daily job does: it put a product on the shelf, took one
-- off, let one graduate into the normal catalog, or measured real-world demand.
-- The job reads this to know how long each product has been on the shelf.
--
-- `product_id` is empty for a 'demand' row; its `note` holds the JSON of that
-- week's search-interest ratios. Safe to drop when the test is over.
create table if not exists deals_test_events (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  event text not null check (event in ('activated', 'retired', 'graduated', 'demand')),
  product_id uuid references affiliate_products (id) on delete set null,
  category text,
  impressions integer,
  clicks integer,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists deals_test_events_day_idx on deals_test_events (day desc);
create index if not exists deals_test_events_product_idx on deals_test_events (product_id);
create index if not exists deals_test_events_event_idx on deals_test_events (event);

alter table deals_test_events enable row level security;
-- No public policy: only the daily job and the admin pages (service-role key) touch it.
