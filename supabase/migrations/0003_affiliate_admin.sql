-- Deactivate/reactivate a live match without losing its history (score,
-- reason, who approved it) the way a hard delete would. Independent of
-- `approved`: approved=false is still "pending review"; approved=true with
-- is_active=false is "was live, now turned off."
alter table article_affiliate_products
  add column if not exists is_active boolean not null default true;

drop policy if exists "Public read approved article matches" on article_affiliate_products;
create policy "Public read approved article matches"
  on article_affiliate_products for select
  using (approved = true and is_active = true);

-- Groundwork for promo-code-based affiliate deals (e.g. "20% off with code
-- X"), distinct from a plain tracked link. Freeform/nullable since no real
-- promo-code partnership exists yet -- just reserving the shape.
alter table affiliate_products
  add column if not exists promo_code text,
  add column if not exists promo_details text;
