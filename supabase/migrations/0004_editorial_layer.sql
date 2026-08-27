-- Admin-curated editorial layer: a manual judgment dimension over the frozen
-- article generator. All nullable/additive -- an article with none of these
-- set renders exactly as it does today.
alter table articles
  add column if not exists editorial_lens text,
  add column if not exists phugialy_take text,
  add column if not exists what_wed_do text,
  add column if not exists commercial_relevance_note text;

-- Optional link from a Field Note (threads table) back to the article it
-- comments on. Threads stay broadcast-only -- this is not a comments system.
alter table threads
  add column if not exists article_id uuid references articles(id) on delete set null;
create index if not exists threads_article_idx on threads (article_id);

-- Phugialy Picks reframe: "we'd buy this if / skip this if" per product.
alter table affiliate_products
  add column if not exists buy_if text,
  add column if not exists skip_if text;

-- Per-placement (not per-product) note on why this asset is recommended on
-- this specific article -- the same asset can be placed on different
-- articles for different reasons.
alter table article_affiliate_products
  add column if not exists context_note text;
