# Field Notes discussion — design spec (not built)

Status: **design only, not started.** Logged 2026-08-28 per explicit
decision: spec this now so it's ready to build, but don't ship until the
site's Phase 1 (presentation) and Phase 2 (measurement) actually validate
that people are engaging enough to justify an accounts system — see
`PHASE_ROADMAP.md`'s "Separately tracked" section for the pointer, and the
"Phugialy roadmap" business-strategy conversation this descends from (its
own "Phase 3 — Audience" is a different numbering scheme than this file's
phase checklist; don't conflate the two).

## What this is

Field Notes today are broadcast-only: Phugialy writes a short note, readers
read it, no reply mechanism. This spec adds a **moderated discussion layer**
on top — real user accounts, persistent identity, users can reply to a
Field Note, but **only Phugialy can start a thread**. No user-initiated
topics, no channels beyond what's attached to a Field Note, no DMs.

The mental model: an AMA/guided-discussion format, not an open forum. You
seed the conversation; the community discusses underneath it; you moderate.

## Data model

Supabase Auth (`auth.users`) provides the account primitive — don't build
custom auth. Additions:

```sql
-- One row per authenticated user, extends what auth.users can't hold.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  status text not null default 'active', -- 'active' | 'muted' | 'banned'
  created_at timestamptz not null default now()
);

-- Existing `threads` table (Field Notes) gains discussion controls.
alter table threads
  add column if not exists replies_enabled boolean not null default false,
  add column if not exists reply_count integer not null default 0;

-- The reply layer itself.
create table thread_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  parent_reply_id uuid references thread_replies(id) on delete cascade,
  body text not null,
  status text not null default 'visible', -- 'visible' | 'hidden' | 'removed'
  moderated_by uuid references profiles(id),
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);
```

`replies_enabled` defaults `false` on every existing and new Field Note —
discussion is opt-in per note, not automatic. `parent_reply_id` allows one
level of threaded replies (reply-to-a-reply); don't build deeper nesting for
v1, it's a UI complexity trap for little payoff at this scale.

## Auth approach

Supabase Auth, **magic link / email OTP only** for v1 — no password to
reset, no OAuth app registration to maintain for a solo operator. A visitor
clicks "Sign in to reply," enters email, clicks the link, lands back on the
thread already signed in. First sign-in prompts for a `display_name` (no
real-name requirement, no profile fields beyond that for v1).

## Permission model

| Actor | Can do |
|---|---|
| Signed-out visitor | Read the Field Note and all `visible` replies. Sees "Sign in to reply" instead of a composer. |
| Signed-up user (`active`) | Reply under any thread with `replies_enabled = true`. Cannot create a new top-level thread. Cannot see `hidden`/`removed` replies (except their own, greyed out). |
| Signed-up user (`muted`) | Can read everything; reply composer disabled with a plain explanation, not a silent failure. |
| Signed-up user (`banned`) | Treated as signed-out for write actions. |
| Admin (you) | Everything above, plus: toggle `replies_enabled` per Field Note, hide/remove any reply, set a user's `status`. |

## UI/UX flow

- **Field Note page** (`/threads/[id]`): existing note body unchanged. Below
  it, if `replies_enabled`, a "Discussion" section: reply list (oldest
  first, one level of nesting), a composer at the bottom (or "Sign in to
  reply" for logged-out visitors).
- **Sign-in**: a single lightweight page/modal — email field, "send link,"
  done. No dedicated marketing copy needed; this is utility, not a landing
  page.
- **Admin moderation**: one new tab in the existing admin nav — a flat feed
  of recent replies across all threads (newest first), each with hide/remove
  and a link to mute/ban that reply's author. Don't build a separate
  per-thread moderation view for v1; a single global feed is enough at
  expected volume.

## Anti-abuse (v1 minimum, not exhaustive)

- Rate limit: cap replies per user per hour (e.g. 10) at the API layer —
  cheap insurance, not a full spam-detection system.
- No profanity/spam filtering in v1 — admin hide/remove is the only lever.
  Revisit only if actual abuse shows up; building a filter for a problem
  that doesn't exist yet is the same mistake as the original Field Notes
  build being underused.
- No reporting/flagging UI for v1 — with admin-seeded threads only and a
  single moderation feed, volume should stay low enough to self-moderate by
  just reading it.

## Explicitly out of scope for v1

- User-initiated threads or channels.
- Direct messages between users.
- @mentions, notifications, email digests of replies.
- Real-time/websocket updates — a page refresh or on-focus poll (same
  pattern already used by the homepage's live article feed) is enough;
  this is a discussion under an article, not a live chat app.
- Rich text/markdown, edit history, reactions/upvotes on replies.
- OAuth sign-in (Google/GitHub/etc.) — magic link only.

## Rollout gate

Do not build any of this until Phase 1 (presentation: article/homepage
redesign, curated flagship articles) and Phase 2 (measurement: GSC actually
reporting, click-through/return-visitor data flowing) have run long enough
to show real engagement. Building accounts infrastructure now, before
there's evidence anyone would use it, repeats the exact mistake the honest
audit found with the original editorial-lens/Field-Notes build: infrastructure
at 0% utilization. This spec exists so that decision, when it's made, isn't
also a design decision made under time pressure.
