-- What shoppers type into the Deals search, and whether we had an answer.
-- One row per settled search (the page waits until they stop typing). This is the
-- site's first-party demand signal: a term with tier 'none' is something people
-- want that the catalog does not carry. Read by /admin/deals today, and by the
-- stream radar later.
--
-- No identifiers are stored: no user id, no address, no browser string. The term
-- is lowercased text of up to 60 characters; the endpoint refuses anything that
-- looks like an email address or a link.
create table if not exists deals_search_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null check (char_length(term) between 2 and 60),
  tier text not null check (tier in ('exact', 'close', 'none')),
  result_count integer not null default 0 check (result_count >= 0),
  is_bot boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists deals_search_terms_created_idx on deals_search_terms (created_at desc);
create index if not exists deals_search_terms_term_idx on deals_search_terms (term);
create index if not exists deals_search_terms_tier_idx on deals_search_terms (tier);

alter table deals_search_terms enable row level security;
-- No public read or write policy: the endpoint and the admin page use the
-- service-role key, which bypasses RLS.
