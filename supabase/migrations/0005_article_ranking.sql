-- Daily-computed relevance score for homepage ordering (recency + engagement
-- + editorial curation), replacing pure reverse-chronological display on the
-- homepage's curated sections. /blog's archive stays chronological -- this
-- column doesn't touch that.
alter table articles
  add column if not exists rank_score numeric not null default 0;
create index if not exists articles_rank_score_idx on articles (rank_score desc);
