-- Replaces the Convex-backed projects/repoAccessRequests tables (portfolio
-- showcase + GitHub sync, admin-managed at /admin/github, public at /work).
-- `id` here is a real uuid; `slug` carries over Convex's old string `id`
-- field (e.g. "phugialy-my-repo") as a stable, human-readable lookup key
-- for GitHub-sync dedup and any existing links.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  tags text[] not null default '{}',
  year text not null,
  type text not null check (type in ('case-study', 'repository', 'live-app', 'side-project')),
  status text not null check (status in ('featured', 'active', 'archived', 'in-progress')),
  visible boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 9999,
  image_url text,
  -- case-study fields
  role text,
  duration text,
  metrics text[],
  -- repository fields
  github_url text,
  repo_access text not null default 'public' check (repo_access in ('public', 'private', 'request-access')),
  hide_repo_button boolean not null default false,
  stars integer,
  language text,
  -- live-app fields
  demo_url text,
  app_url text,
  -- side-project fields
  external_link text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_visible_idx on projects (visible);
create index if not exists projects_featured_idx on projects (featured);
create index if not exists projects_type_idx on projects (type);
create index if not exists projects_sort_order_idx on projects (sort_order);

create table if not exists project_access_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  email text not null,
  name text not null,
  company text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_access_requests_project_idx on project_access_requests (project_id);

alter table projects enable row level security;
alter table project_access_requests enable row level security;

-- Public (anon key) can read visible projects for /work -- everything else
-- (admin CRUD, GitHub sync, access-request submission) goes through the
-- service-role key, which bypasses RLS.
drop policy if exists "Public read visible projects" on projects;
create policy "Public read visible projects"
  on projects for select
  using (visible = true);
