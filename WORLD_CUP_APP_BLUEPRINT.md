# World Cup Information App Blueprint

## Product Goal

Build an information-first World Cup app that can change daily without confusing users. The app should answer three fast questions:

- What is happening now or next?
- Why does this match/team/player matter?
- What changed since I last checked?

The app does not need live-second data on day one. It does need trustworthy historical capture, clean source attribution, and a UI that makes updates feel understandable instead of noisy.

## Database Choice

Use Supabase/Postgres instead of Convex.

This app is strongly relational: tournaments have teams, teams have squads, matches have venues, standings, events, predictions, source snapshots, and corrections. Postgres gives us cleaner joins, strong constraints, analytics-friendly history, SQL views, materialized summaries, geospatial options later, and easier reporting.

Recommended split:

- Public read-heavy data: Postgres tables queried through server routes or Supabase.
- Admin imports/refreshes: server-only Supabase service role client.
- Media: Supabase Storage or static/public CDN.
- Daily jobs: Vercel Cron or Supabase scheduled jobs.
- Optional live updates later: Supabase Realtime for match status only.

## Tournament Context

For the 2026 FIFA World Cup, plan around 48 teams, 12 groups of 4, and 104 matches across 16 host cities in Canada, Mexico, and the United States. Keep the schema tournament-agnostic so it can also support future World Cups.

## SQL Schema Draft

Use `uuid` primary keys, `timestamptz` for real dates, `jsonb` for flexible provider payloads, and `updated_at` triggers on canonical tables.

### tournaments

```sql
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  fifa_id text,
  name text not null,
  slug text not null unique,
  year int not null,
  host_countries text[] not null default '{}',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  team_count int not null,
  group_count int not null,
  matches_count int not null,
  group_stage_advancement text,
  status text not null check (status in ('scheduled', 'active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tournaments_year_idx on public.tournaments (year);
create index tournaments_status_idx on public.tournaments (status);
```

### teams

```sql
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  fifa_code text not null,
  name text not null,
  short_name text not null,
  country text not null,
  confederation text not null,
  flag_url text,
  badge_url text,
  group_code text,
  current_rank int,
  coach text,
  captain text,
  qualification_path text,
  status text not null check (status in ('qualified', 'eliminated', 'champion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, fifa_code)
);

create index teams_tournament_idx on public.teams (tournament_id);
create index teams_group_idx on public.teams (tournament_id, group_code);
```

### team_history

```sql
create table public.team_history (
  id uuid primary key default gen_random_uuid(),
  team_code text not null,
  tournament_id uuid references public.tournaments(id) on delete set null,
  appearances int not null default 0,
  best_finish text,
  titles int not null default 0,
  finals int not null default 0,
  last_appearance_year int,
  notable_moments jsonb not null default '[]'::jsonb,
  rivalries text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index team_history_team_code_idx on public.team_history (team_code);
create index team_history_tournament_idx on public.team_history (tournament_id);
```

### venues

```sql
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  slug text not null,
  host_city text not null,
  region text,
  country text not null,
  timezone text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  capacity int,
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, slug)
);

create index venues_tournament_idx on public.venues (tournament_id);
create index venues_city_idx on public.venues (host_city);
```

### fixtures

```sql
create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_number int not null,
  stage text not null check (
    stage in ('group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final')
  ),
  group_code text,
  venue_id uuid not null references public.venues(id),
  home_team_id uuid references public.teams(id),
  away_team_id uuid references public.teams(id),
  home_placeholder text,
  away_placeholder text,
  starts_at timestamptz not null,
  status text not null check (status in ('scheduled', 'live', 'completed', 'postponed', 'cancelled')),
  minute int,
  home_score int,
  away_score int,
  home_penalty_score int,
  away_penalty_score int,
  winner_team_id uuid references public.teams(id),
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, match_number)
);

create index fixtures_tournament_idx on public.fixtures (tournament_id);
create index fixtures_start_idx on public.fixtures (starts_at);
create index fixtures_stage_idx on public.fixtures (tournament_id, stage);
create index fixtures_status_start_idx on public.fixtures (status, starts_at);
create index fixtures_venue_start_idx on public.fixtures (venue_id, starts_at);
create index fixtures_home_team_idx on public.fixtures (home_team_id);
create index fixtures_away_team_idx on public.fixtures (away_team_id);
```

### players

```sql
create table public.players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  slug text not null,
  position text not null,
  shirt_number int,
  birth_date date,
  club text,
  image_url text,
  status text not null check (status in ('squad', 'injured', 'suspended', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, team_id, slug)
);

create index players_team_idx on public.players (team_id);
create index players_tournament_idx on public.players (tournament_id);
```

### match_events

```sql
create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  team_id uuid references public.teams(id),
  player_id uuid references public.players(id),
  event_type text not null,
  minute int,
  stoppage_minute int,
  title text not null,
  description text,
  importance int not null default 1 check (importance between 1 and 5),
  created_at timestamptz not null default now()
);

create index match_events_fixture_idx on public.match_events (fixture_id);
create index match_events_fixture_minute_idx on public.match_events (fixture_id, minute);
create index match_events_importance_idx on public.match_events (importance);
```

### predictions

```sql
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  fixture_id uuid references public.fixtures(id) on delete cascade,
  prediction_type text not null,
  subject_type text not null,
  subject_id text,
  predicted_team_id uuid references public.teams(id),
  predicted_player_id uuid references public.players(id),
  probability numeric(5, 4) check (probability >= 0 and probability <= 1),
  label text not null,
  rationale text,
  model_version text,
  source text not null check (source in ('editorial', 'model', 'community')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create index predictions_tournament_idx on public.predictions (tournament_id);
create index predictions_fixture_idx on public.predictions (fixture_id);
create index predictions_type_idx on public.predictions (prediction_type);
create index predictions_valid_idx on public.predictions (valid_from, valid_until);
```

### updates

This is the daily-change feed. It lets the app tell users what changed instead of making them rediscover the whole tournament.

```sql
create table public.updates (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  update_type text not null,
  title text not null,
  summary text not null,
  before_data jsonb,
  after_data jsonb,
  source_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index updates_tournament_time_idx on public.updates (tournament_id, published_at desc);
create index updates_entity_idx on public.updates (entity_type, entity_id);
```

### source_snapshots

Stores imported provider/FIFA/source records for auditability and late corrections.

```sql
create table public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  source_name text not null,
  source_url text not null,
  payload_hash text not null,
  payload jsonb not null,
  imported_at timestamptz not null default now(),
  unique (source_name, payload_hash)
);

create index source_snapshots_tournament_source_idx on public.source_snapshots (tournament_id, source_name);
create index source_snapshots_imported_at_idx on public.source_snapshots (imported_at desc);
```

## Access Model

Enable RLS on public tables before exposing them through Supabase APIs.

- Public users can read published tournament data.
- Admin users can insert/update/delete via service role server routes.
- Predictions from community users should be separate from editorial/model predictions if user accounts are added.
- Raw source snapshots should be admin-only because payloads may contain provider metadata or licensing-sensitive fields.

Start simple by querying from Next.js server routes with the service role or server-side read client. Expose narrow endpoints to the frontend instead of letting every table become a public free-for-all.

## Delivery Strategy

Start with scheduled ingest, not real-time.

- Phase 1: Manual/admin CSV or JSON import for teams, venues, fixtures, and history.
- Phase 2: Daily cron refresh that creates `updates` rows for changed data.
- Phase 3: Matchday refresh every 5-15 minutes for fixture status and scores.
- Phase 4: Optional Supabase Realtime for score/status changes only.

Use server-rendered pages for public information pages and focused client components for filters, match expansion, map interaction, and prediction charts. Heavily cache static tournament facts. Keep live-changing parts small: status chips, score lines, update feed, and prediction deltas.

## UI Direction

### Information Architecture

Main surfaces:

- Today: live/upcoming matches, change digest, match cards by time zone.
- Fixtures: filterable schedule by date, stage, group, team, venue.
- Teams: group table, team profile, squad, history, form, key players.
- Map: host cities and upcoming matches by location.
- Predictions: winner, MVP, match probabilities, confidence changes over time.
- Turning Points: editorial timeline of major events and why they mattered.

### Psychological UI Principles

- Use progressive disclosure: show the score, kickoff, venue, and stakes first; hide deep stats behind tabs or drawers.
- Make change visible: users should see "what changed today" before browsing everything again.
- Reduce anxiety with status clarity: scheduled, live, completed, delayed, corrected.
- Use familiar sports mental models: fixtures, group tables, bracket, team cards, match center.
- Make predictions feel transparent: always show confidence, rationale, and last updated time.
- Design for return visits: "since last visit" and compact update summaries matter more than giant hero sections.

### Interaction Ideas

- Sticky tournament command bar with date, team, group, stage, and venue filters.
- Match cards that expand into timeline, venue, context, prediction, and related team history.
- Horizontal "today rail" for now/next matches.
- Map-to-list sync: selecting a city filters the fixture list.
- Prediction slider: show how winner/MVP probabilities changed over time.
- Team comparison drawer for head-to-head context.
- "Explain this match" button that summarizes stakes and historical context.

## Scaling Notes

- Index around the common user flows: upcoming fixtures, team pages, venue pages, tournament updates.
- Avoid loading all fixtures, teams, predictions, and timelines into the first page.
- Use route-level pages for durable SEO: `/world-cup`, `/world-cup/fixtures`, `/world-cup/teams/[team]`, `/world-cup/matches/[matchNumber]`.
- Store snapshots and updates separately from canonical tables so corrections do not erase history.
- Prefer server rendering, route cache, and compact JSON endpoints for read-heavy views.
- Keep interactive client state local to filters and expanded rows.

## MVP Build Order

1. Add Supabase migration and seed/import script.
2. Build `/world-cup` today dashboard.
3. Build fixtures list with filters and match detail route.
4. Build team profile pages with history.
5. Build venues/map page.
6. Add predictions and daily change feed.
7. Add admin import/refresh tools.

