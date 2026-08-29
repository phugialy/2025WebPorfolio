-- Field Notes could only ever link to one article (threads.article_id).
-- Replaces that with a proper many-to-many join table so one note can
-- reference several related articles.
create table if not exists thread_articles (
  thread_id uuid not null references threads(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, article_id)
);

create index if not exists thread_articles_article_idx on thread_articles (article_id);

-- Preserve the one existing single-article link (if any) before dropping
-- the old column.
insert into thread_articles (thread_id, article_id)
select id, article_id from threads where article_id is not null
on conflict do nothing;

alter table threads drop column if exists article_id;

alter table thread_articles enable row level security;
-- No public policy -- all access goes through the service-role key, same
-- as every other admin-managed table in this project.
