-- Card facts for the Deals pages: what each product is, who it is for, the catch.
-- Run in the Supabase SQL Editor. Safe to run more than once.
--
-- Why: only a few percent of products carry any "good if / skip if" text, and the
-- big-ticket picks carry none, so the Top 10 pages show a name and a photo. The
-- holiday guide engine already reads reviews for every guide it writes (verdict,
-- what reviewers liked, what they did not, who it suits). This table is where it
-- stores that per product, so a card can show it without opening the guide.
-- Rubric and field limits: docs/research/holiday-top10-shopper-rubric.md.
--
-- The site reads this table server-side with the service-role key (like
-- deals_catalog). If it is missing or empty the cards fall back to the product's
-- own buy_if / skip_if, so running this migration late changes nothing visible.
-- Row level security is ON with NO policies: the public key cannot read or write.
--
-- No dollar amounts and no star ratings belong here. Amazon only allows prices
-- and review ratings from its own API with a timestamp, and the site has no such
-- feed. price_class is a coarse label (value / mainstream / premium) and stays
-- hidden on the site until the owner turns it on (SHOW_PRICE_CLASS in
-- lib/deals-core.ts).

create table if not exists deals_product_facts (
  product_id uuid primary key references affiliate_products(id) on delete cascade,
  what_it_is text check (what_it_is is null or char_length(what_it_is) <= 140),   -- one plain line: "34-inch curved ultrawide for work and games"
  best_for text check (best_for is null or char_length(best_for) <= 80),          -- the reader this suits: "Gamers who also work on it"
  buy_if text check (buy_if is null or char_length(buy_if) <= 200),
  skip_if text check (skip_if is null or char_length(skip_if) <= 200),
  strengths text[] not null default '{}' check (cardinality(strengths) <= 3),      -- what reviewers praised, each one short and specific
  caveats text[] not null default '{}' check (cardinality(caveats) <= 2),          -- what reviewers criticised; at least one for a recommended product
  key_specs text[] not null default '{}' check (cardinality(key_specs) <= 4),      -- "34-inch 3440x1440", "180 Hz", never prices
  price_class text check (price_class is null or price_class in ('value', 'mainstream', 'premium')),
  verdict text check (verdict is null or verdict in ('recommended', 'recommended_with_caveats', 'not_enough_evidence')),
  confidence text check (confidence is null or confidence in ('high', 'medium', 'low')),
  evidence_count integer check (evidence_count is null or evidence_count >= 0),    -- independent sources read
  evidence_newest date,                                                            -- date of the newest source
  verified_at timestamptz,                                                         -- when the engine last checked this card
  guide_slug text,                                                                 -- the guide that goes deeper, if any
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table deals_product_facts enable row level security;
