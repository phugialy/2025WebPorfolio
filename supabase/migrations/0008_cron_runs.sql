-- Lets cron routes record their own outcome so it can be verified via a
-- normal service-role REST query, without ever needing the CRON_SECRET that
-- gates the routes themselves. Vercel injects that secret automatically on
-- scheduled invocations -- this table is the observability layer on top,
-- not a change to how the routes are authorized.
create table if not exists cron_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  ok boolean not null,
  summary jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cron_runs_job_created_idx on cron_runs (job, created_at desc);

alter table cron_runs enable row level security;
-- No public policy -- all access goes through the service-role key, which
-- bypasses RLS, same as every other cron/admin table in this project.
