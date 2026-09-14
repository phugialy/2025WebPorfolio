-- Marks a small number of affiliate products as real partnerships worth a
-- dedicated spotlight on /resources, distinct from the regular catalog grid.
-- Additive only -- every existing row defaults to false, nothing else changes.
alter table affiliate_products
  add column if not exists is_partner boolean not null default false;

create index if not exists affiliate_products_is_partner_idx on affiliate_products (is_partner);
