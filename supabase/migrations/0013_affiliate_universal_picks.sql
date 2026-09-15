-- Marks a product as eligible to fill an article's Pick slots regardless of
-- topical match, when that article has fewer than 3 approved topical
-- matches. Never bumps a real topical match -- only fills empty room.
-- Additive only -- every existing row defaults to false, nothing else changes.
alter table affiliate_products
  add column if not exists is_universal boolean not null default false;

create index if not exists affiliate_products_is_universal_idx on affiliate_products (is_universal);
