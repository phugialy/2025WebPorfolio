-- Visibility flags for the affiliate product lifecycle (rotation/archive
-- review/market-intelligence plan). Never auto-changes `status` -- these
-- columns only surface a reason in the admin assets board so a human
-- decides whether to archive, same two-gate review pattern already used
-- for article_affiliate_products.approved.
alter table affiliate_products
  add column if not exists flag_reason text,
  add column if not exists flagged_at timestamptz;
