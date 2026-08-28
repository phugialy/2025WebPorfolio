-- Track bot/crawler hits on affiliate redirect links instead of silently
-- discarding them -- keeps them visible (crawler activity is itself useful
-- signal) while excluding them from real-engagement reporting and the
-- rank_score formula.
alter table affiliate_clicks
  add column if not exists is_bot boolean not null default false;
create index if not exists affiliate_clicks_is_bot_idx on affiliate_clicks (is_bot);
